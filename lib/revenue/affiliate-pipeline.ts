import fs from "node:fs";
import path from "node:path";
import { AGENTS_DIR } from "@/lib/agents/paths";

/**
 * Affiliate Revenue Engine (2026-08-14) — persistent application-pipeline
 * state, separate from data/revenue/affiliate-programs.ts on purpose:
 * that file is static RESEARCH (what we know about a program, rarely
 * changes, lives in git) while this is RUNTIME PIPELINE STATE (where we
 * are in applying, changes constantly).
 *
 * Storage backend (Completion Pass, 2026-08-14): a private Vercel Blob
 * store (`miloosh-affiliate`, linked to this project) when
 * BLOB_READ_WRITE_TOKEN is present — this is what actually survives
 * deployments and is readable from the deployed /internal/affiliate-pipeline
 * dashboard, unlike the gitignored var/agents/*.json files every other
 * agent report in this codebase uses. Falls back to that same local-file
 * pattern only when the token isn't set (local dev without `vercel env
 * pull`, or the test suite) — tests never need real network access to a
 * blob store to verify state-machine logic.
 */

export type AffiliatePipelineStatus =
  | "unresearched"
  | "program_found"
  | "verified"
  | "ready_to_apply"
  | "application_in_progress"
  | "submitted"
  | "pending_review"
  | "approved"
  | "rejected"
  | "affiliate_link_received"
  | "activated"
  | "earning"
  | "no_program"
  | "program_closed"
  | "needs_owner_action"
  | "needs_more_research"
  /** Individual program can't be applied to yet because it's gated behind a network-level relationship (e.g. a PartnerStack "Network Profile") that's itself pending_review — see lib/revenue/affiliate-network-status.ts. Distinct from needs_owner_action: there's nothing left for the owner to do on THIS program until the network responds. */
  | "waiting_on_network";

export type AffiliatePipelineEntry = {
  slug: string;
  status: AffiliatePipelineStatus;
  /** Free-text reason, required whenever status is needs_owner_action or rejected — why a human needs to look, or why it was turned down. */
  ownerActionRequired: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  affiliateUrl: string | null;
  trackingId: string | null;
  notes: string | null;
  /** Append-only audit trail — every transition, never rewritten. */
  history: Array<{ status: AffiliatePipelineStatus; at: string; note: string | null }>;
};

const BLOB_PATHNAME = "affiliate-pipeline/state.json";
const LOCAL_FALLBACK_PATH = path.join(AGENTS_DIR, "affiliate-pipeline.json");

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const VALID_TRANSITIONS: Record<AffiliatePipelineStatus, AffiliatePipelineStatus[]> = {
  unresearched: ["program_found", "no_program", "needs_more_research"],
  program_found: ["verified", "needs_more_research", "no_program"],
  verified: ["ready_to_apply", "program_closed", "needs_owner_action", "waiting_on_network"],
  ready_to_apply: ["application_in_progress", "needs_owner_action"],
  application_in_progress: ["submitted", "needs_owner_action"],
  submitted: ["pending_review", "needs_owner_action"],
  pending_review: ["approved", "rejected", "needs_owner_action"],
  approved: ["affiliate_link_received", "needs_owner_action"],
  rejected: ["needs_more_research", "ready_to_apply"], // some programs allow reapplying later
  affiliate_link_received: ["activated"],
  activated: ["earning"],
  earning: [],
  no_program: ["needs_more_research"], // re-check later — programs launch
  program_closed: ["needs_more_research"],
  needs_owner_action: [
    "verified",
    "ready_to_apply",
    "application_in_progress",
    "submitted",
    "pending_review",
    "approved",
    "affiliate_link_received",
    "waiting_on_network",
  ], // resumes wherever it was once the owner acts — not a strict single next state
  needs_more_research: ["program_found", "no_program", "verified"],
  waiting_on_network: ["ready_to_apply", "needs_owner_action", "no_program"], // network approves -> ready_to_apply; network rejects/closes -> needs_owner_action to decide next step
};

export function isValidTransition(from: AffiliatePipelineStatus, to: AffiliatePipelineStatus): boolean {
  if (from === to) return true; // re-recording the same status (e.g. adding a note) is always allowed
  return VALID_TRANSITIONS[from].includes(to);
}

function readLocalFallback(): AffiliatePipelineEntry[] {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8")) as AffiliatePipelineEntry[];
  } catch {
    return [];
  }
}

function writeLocalFallback(entries: AffiliatePipelineEntry[]): void {
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_FALLBACK_PATH, JSON.stringify(entries, null, 2));
}

export async function readAffiliatePipeline(): Promise<AffiliatePipelineEntry[]> {
  if (!hasBlobToken()) return readLocalFallback();
  try {
    const { get } = await import("@vercel/blob");
    // useCache: false is required here — the CDN cache otherwise serves a
    // stale copy on a read immediately following a write (discovered when
    // setPipelineStatus() chained two transitions back-to-back and the
    // second one saw the pre-write status, throwing a false "invalid
    // transition" error). Every read in this module needs the real
    // current state, never a cached one.
    const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return [];
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as AffiliatePipelineEntry[];
  } catch {
    // Store not yet initialized (first write hasn't happened) or a transient error — never crash a read.
    return [];
  }
}

async function writeAffiliatePipeline(entries: AffiliatePipelineEntry[]): Promise<void> {
  if (!hasBlobToken()) {
    writeLocalFallback(entries);
    return;
  }
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, JSON.stringify(entries, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function getPipelineEntry(slug: string): Promise<AffiliatePipelineEntry | undefined> {
  return (await readAffiliatePipeline()).find((e) => e.slug === slug);
}

/**
 * Turns a pipeline read into an O(1)-lookup map keyed by slug — the
 * building block for reading the Blob store once per request instead of
 * once per product. See lib/revenue/affiliate-priority.ts, whose ranking
 * functions used to call getPipelineEntry() (a full readAffiliatePipeline()
 * Blob read) separately for each of the ~217 software products — ~219
 * Blob reads for a single dashboard page load, enough to exhaust the
 * Hobby plan's 10K/period simple-operations limit in well under a day.
 * Fetch once, build this map, look up from it.
 */
export function buildPipelineMap(entries: AffiliatePipelineEntry[]): Map<string, AffiliatePipelineEntry> {
  return new Map(entries.map((e) => [e.slug, e]));
}

function blankEntry(slug: string): AffiliatePipelineEntry {
  return {
    slug,
    status: "unresearched",
    ownerActionRequired: null,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    affiliateUrl: null,
    trackingId: null,
    notes: null,
    history: [],
  };
}

/**
 * Moves one program to a new status. Throws on an invalid transition
 * (real guard, not just documentation) rather than silently allowing the
 * pipeline to skip states in a way that would misrepresent real progress.
 * `now` is injectable for tests.
 */
export async function setPipelineStatus(
  slug: string,
  status: AffiliatePipelineStatus,
  options: { note?: string; affiliateUrl?: string; trackingId?: string; ownerActionRequired?: string } = {},
  now: string = new Date().toISOString()
): Promise<AffiliatePipelineEntry> {
  const entries = await readAffiliatePipeline();
  const existingIndex = entries.findIndex((e) => e.slug === slug);
  const entry = existingIndex >= 0 ? entries[existingIndex]! : blankEntry(slug);

  if (!isValidTransition(entry.status, status)) {
    throw new Error(`Invalid affiliate pipeline transition for ${slug}: ${entry.status} -> ${status}`);
  }

  const updated: AffiliatePipelineEntry = {
    ...entry,
    status,
    ownerActionRequired:
      status === "needs_owner_action"
        ? (options.ownerActionRequired ?? entry.ownerActionRequired ?? "See notes.")
        : status === "rejected"
          ? entry.ownerActionRequired
          : null,
    submittedAt: status === "submitted" ? now : entry.submittedAt,
    approvedAt: status === "approved" ? now : entry.approvedAt,
    rejectedAt: status === "rejected" ? now : entry.rejectedAt,
    affiliateUrl: options.affiliateUrl ?? entry.affiliateUrl,
    trackingId: options.trackingId ?? entry.trackingId,
    notes: options.note ?? entry.notes,
    history: [...entry.history, { status, at: now, note: options.note ?? null }],
  };

  if (existingIndex >= 0) {
    entries[existingIndex] = updated;
  } else {
    entries.push(updated);
  }
  await writeAffiliatePipeline(entries);
  return updated;
}

/**
 * Corrects the free-text `ownerActionRequired` reason on an entry that is
 * already `needs_owner_action`, without a status transition — for cases
 * where re-verified research (e.g. a network correction) makes the
 * previously-recorded reason factually wrong, but the entry still
 * genuinely needs owner action, just for a different concrete reason.
 * `setPipelineStatus` can't do this alone: `needs_owner_action ->
 * needs_owner_action` isn't a listed transition, since normally the status
 * itself would change. Records the correction in history for audit.
 */
export async function correctOwnerActionReason(slug: string, newReason: string, historyNote: string): Promise<AffiliatePipelineEntry> {
  const entries = await readAffiliatePipeline();
  const existingIndex = entries.findIndex((e) => e.slug === slug);
  if (existingIndex < 0) throw new Error(`No pipeline entry for ${slug}`);
  const entry = entries[existingIndex]!;
  if (entry.status !== "needs_owner_action") {
    throw new Error(`correctOwnerActionReason is only for needs_owner_action entries; ${slug} is ${entry.status}`);
  }
  const now = new Date().toISOString();
  const updated: AffiliatePipelineEntry = {
    ...entry,
    ownerActionRequired: newReason,
    history: [...entry.history, { status: entry.status, at: now, note: historyNote }],
  };
  entries[existingIndex] = updated;
  await writeAffiliatePipeline(entries);
  return updated;
}

/**
 * Chains a confirmed program straight through to `submitted` in one call,
 * recording every intermediate state in the real audit trail rather than
 * lying about an instant multi-step transition. Used by the dashboard's
 * "Mark submitted" button: for anything already in data/revenue/affiliate-
 * programs.ts with `programExists: "yes"`, program_found/verified are
 * already true in substance (that's what the static research established)
 * — this just records the pipeline catching up to that reality instead of
 * making the owner click through four redundant states for data that's
 * already known.
 */
export async function fastTrackToSubmitted(slug: string, note?: string): Promise<AffiliatePipelineEntry> {
  const current = await getPipelineEntry(slug);
  const status = current?.status ?? "unresearched";
  const chain: AffiliatePipelineStatus[] = [
    "program_found",
    "verified",
    "ready_to_apply",
    "application_in_progress",
    "submitted",
  ];
  const startIndex = chain.indexOf(status);
  const remaining = startIndex === -1 ? chain : chain.slice(startIndex + 1);
  let result: AffiliatePipelineEntry | undefined = current;
  for (const next of remaining) {
    const isLast = next === "submitted";
    result = await setPipelineStatus(
      slug,
      next,
      isLast
        ? { note: note ?? "Marked submitted from the affiliate pipeline dashboard; program already confirmed in data/revenue/affiliate-programs.ts, intermediate states fast-tracked." }
        : { note: "Fast-tracked: program already confirmed in data/revenue/affiliate-programs.ts." }
    );
  }
  return result!;
}

/**
 * Chains a program straight through to `approved` in one call, recording
 * every intermediate state in the real audit trail — same discipline as
 * fastTrackToSubmitted, extended two steps further. Exists for the real
 * case where a program was approved outside this pipeline's own tracked
 * flow (e.g. the owner applied and got approved before this dashboard's
 * "Mark submitted" button was ever clicked for it): the network-level
 * blocker being resolved and the owner's own click-through on PartnerStack
 * are both real, already-true facts, so this just lets the pipeline catch
 * up to reality in one action instead of forcing four redundant clicks
 * for states that already happened. `affiliateUrl` is required — approving
 * a program without recording the real link it was approved for would
 * leave nothing for the site's affiliate-activation resolver to use.
 */
export async function fastTrackToApproved(
  slug: string,
  options: { affiliateUrl: string; note?: string }
): Promise<AffiliatePipelineEntry> {
  const current = await getPipelineEntry(slug);
  const status = current?.status ?? "unresearched";
  const chain: AffiliatePipelineStatus[] = [
    "program_found",
    "verified",
    "ready_to_apply",
    "application_in_progress",
    "submitted",
    "pending_review",
    "approved",
  ];
  const startIndex = chain.indexOf(status);
  const remaining = startIndex === -1 ? chain : chain.slice(startIndex + 1);
  let result: AffiliatePipelineEntry | undefined = current;
  for (const next of remaining) {
    const isLast = next === "approved";
    result = await setPipelineStatus(
      slug,
      next,
      isLast
        ? { affiliateUrl: options.affiliateUrl, note: options.note ?? "Marked approved from the affiliate pipeline dashboard; affiliate URL recorded, intermediate states fast-tracked to reflect real-world progress." }
        : { note: "Fast-tracked: real-world approval already happened outside this pipeline's tracked flow." }
    );
  }
  return result!;
}

/**
 * Accepts an already-fetched `entries` array to avoid a second Blob read
 * when the caller (e.g. the dashboard page) already has one from the same
 * request — falls back to its own readAffiliatePipeline() call only when
 * used standalone (CLI scripts, tests).
 */
export async function countByPipelineStatus(entries?: AffiliatePipelineEntry[]): Promise<Record<AffiliatePipelineStatus, number>> {
  const counts = {} as Record<AffiliatePipelineStatus, number>;
  for (const status of Object.keys(VALID_TRANSITIONS) as AffiliatePipelineStatus[]) counts[status] = 0;
  const list = entries ?? (await readAffiliatePipeline());
  for (const entry of list) counts[entry.status] += 1;
  return counts;
}
