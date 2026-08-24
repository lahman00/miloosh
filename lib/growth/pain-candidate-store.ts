import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { PainCandidate, PainAction } from "./pain-radar";

/**
 * MILOOSH OVERNIGHT MONSTER mission (2026-08-24) — persistent storage for
 * the Pain Radar. Same convention as lib/newsletter/leads.ts and
 * lib/revenue/events.ts: one private Vercel Blob object per record when
 * BLOB_READ_WRITE_TOKEN is present, a local JSON-array fallback
 * otherwise. Keyed by a deterministic hash of the candidate's canonical
 * source URL (deriveCandidateId), not a random UUID -- like a newsletter
 * lead and unlike an anonymous analytics event, a pain candidate has a
 * real natural key: the same underlying post/page discovered twice
 * should update one record, not create a duplicate the clustering layer
 * would then have to de-duplicate again.
 *
 * This module only persists and mutates lifecycle state. It does not
 * discover, score, or verify anything -- see pain-radar.ts for scoring
 * and pain-clustering.ts for grouping/velocity, both of which operate on
 * arrays returned by getAllPainCandidates() rather than owning storage
 * themselves.
 */

export type PainVerificationState = "UNVERIFIED" | "VERIFIED_TRUE" | "VERIFIED_FALSE" | "NOT_APPLICABLE";
export type PainRemedyState = "NONE_SELECTED" | "SELECTED" | "BUILT" | "PUBLISHED";
export type PainDistributionState = "NOT_DISTRIBUTED" | "QUEUED" | "DISTRIBUTED";

/** Reuses pain-forecast.ts's painClasses() vocabulary so a candidate and a forecast can be compared/joined on the same normalized classes. */
export type NormalizedPainClass =
  | "price-pressure"
  | "loss-of-free-access"
  | "billing-unpredictability"
  | "forced-migration"
  | "support-degradation"
  | "buyer-anxiety"
  | "unclassified";

export type PainAttributedOutcome = {
  classifiedHumanSessions: number;
  ctaClicks: number;
  leads: number;
  affiliateClicks: number;
  lastMeasuredAt: string;
};

/** The durable record. Wraps pain-radar.ts's scoring-input PainCandidate rather than duplicating its fields. */
export type PersistedPainCandidate = PainCandidate & {
  vendor?: string;
  normalizedPainClass: NormalizedPainClass;
  clusterId?: string;
  verificationState: PainVerificationState;
  remedyState: PainRemedyState;
  remedyAction?: PainAction | "NO_ACTION";
  distributionState: PainDistributionState;
  attributedOutcome?: PainAttributedOutcome;
  createdAt: string;
  updatedAt: string;
};

const BLOB_PREFIX = "pain-candidates/";
const LOCAL_FALLBACK_PATH = path.join(process.cwd(), "var", "pain-candidates.json");
const MAX_STORED_LOCAL_CANDIDATES = 20_000;

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * MILOOSH P0 FIRST REAL PAIN RADAR SIGNAL mission (2026-08-24) --
 * normalizes a source URL before it becomes a dedup key, so the same
 * real page discovered twice with cosmetic differences (trailing slash,
 * a tracking query param, a `www.` prefix, mixed case) collapses onto
 * one candidate instead of silently duplicating. Falls back to a plain
 * trim+lowercase of the raw string if the URL doesn't even parse --
 * still deterministic, just without the structural normalization.
 */
export function normalizeSourceUrl(sourceUrl: string): string {
  const raw = sourceUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw.toLowerCase();
  }
  const host = parsed.host.toLowerCase().replace(/^www\./, "");
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  // Query params are near-universally tracking/session noise (utm_*, ref,
  // context, share) for the kinds of pages this store indexes -- dropped
  // entirely rather than allowlisted, since two different discovery runs
  // hitting the identical page with different tracking params must
  // collapse to the same candidate.
  return `${host}${pathname}`.toLowerCase();
}

/** Deterministic id from the canonical (normalized) source URL -- the same real post/page always maps to the same record regardless of trailing slash, www, or query-string noise. */
export function deriveCandidateId(sourceUrl: string): string {
  return createHash("sha256").update(normalizeSourceUrl(sourceUrl)).digest("hex").slice(0, 24);
}

function readLocalFallback(): PersistedPainCandidate[] {
  try {
    const contents = fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8");
    const parsed: unknown = JSON.parse(contents);
    return Array.isArray(parsed) ? (parsed as PersistedPainCandidate[]) : [];
  } catch {
    return [];
  }
}

function writeLocalFallback(candidates: PersistedPainCandidate[]): void {
  fs.mkdirSync(path.dirname(LOCAL_FALLBACK_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_FALLBACK_PATH, JSON.stringify(candidates.slice(-MAX_STORED_LOCAL_CANDIDATES), null, 2));
}

export type NewPainCandidateInput = Omit<PainCandidate, "id"> & {
  id?: string;
  vendor?: string;
  normalizedPainClass?: NormalizedPainClass;
};

/**
 * Records a new candidate, or merges onto an existing one at the same
 * derived id (re-discovering the same URL refreshes discovery metadata
 * without resetting lifecycle state that's already progressed).
 */
export async function recordPainCandidate(input: NewPainCandidateInput): Promise<PersistedPainCandidate> {
  const id = input.id ?? deriveCandidateId(input.sourceUrl);
  const existing = await getPainCandidate(id);
  const now = new Date().toISOString();

  const candidate: PersistedPainCandidate = {
    ...input,
    id,
    normalizedPainClass: input.normalizedPainClass ?? existing?.normalizedPainClass ?? "unclassified",
    verificationState: existing?.verificationState ?? "UNVERIFIED",
    remedyState: existing?.remedyState ?? "NONE_SELECTED",
    remedyAction: existing?.remedyAction,
    distributionState: existing?.distributionState ?? "NOT_DISTRIBUTED",
    clusterId: existing?.clusterId,
    attributedOutcome: existing?.attributedOutcome,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await persist(candidate);
  return candidate;
}

async function persist(candidate: PersistedPainCandidate): Promise<void> {
  if (!hasBlobToken()) {
    try {
      const candidates = readLocalFallback().filter((c) => c.id !== candidate.id);
      candidates.push(candidate);
      writeLocalFallback(candidates);
    } catch {
      // Local dev/test filesystem hiccup -- never crash the caller over it.
    }
    return;
  }

  try {
    const { put } = await import("@vercel/blob");
    await put(`${BLOB_PREFIX}${candidate.id}.json`, JSON.stringify(candidate), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch {
    // Store unreachable/misconfigured/transient error -- best-effort, matches leads.ts/events.ts discipline.
  }
}

export async function getPainCandidate(id: string): Promise<PersistedPainCandidate | null> {
  if (!hasBlobToken()) {
    return readLocalFallback().find((c) => c.id === id) ?? null;
  }
  try {
    const { head, get } = await import("@vercel/blob");
    const pathname = `${BLOB_PREFIX}${id}.json`;
    await head(pathname);
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return JSON.parse(await new Response(result.stream).text()) as PersistedPainCandidate;
  } catch {
    return null;
  }
}

export async function getAllPainCandidates(): Promise<PersistedPainCandidate[]> {
  if (!hasBlobToken()) {
    return readLocalFallback();
  }
  try {
    const { list, get } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const results = await Promise.all(
      blobs.map(async (blob) => {
        try {
          const result = await get(blob.pathname, { access: "private", useCache: false });
          if (!result || result.statusCode !== 200) return null;
          return JSON.parse(await new Response(result.stream).text()) as PersistedPainCandidate;
        } catch {
          return null;
        }
      }),
    );
    return results.filter((c): c is PersistedPainCandidate => c !== null);
  } catch {
    return [];
  }
}

/**
 * Merge-patches lifecycle state onto an existing candidate (verification,
 * remedy, distribution, clustering, or measured outcome). Never touches
 * the discovery/scoring fields -- those only change via a fresh
 * recordPainCandidate() call from a real re-discovery.
 */
export async function updatePainCandidateState(
  id: string,
  patch: Partial<
    Pick<
      PersistedPainCandidate,
      "verificationState" | "remedyState" | "remedyAction" | "distributionState" | "clusterId" | "attributedOutcome" | "normalizedPainClass"
    >
  >,
): Promise<PersistedPainCandidate | null> {
  const existing = await getPainCandidate(id);
  if (!existing) return null;
  const updated: PersistedPainCandidate = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  await persist(updated);
  return updated;
}
