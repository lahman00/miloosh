import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Sprint 8 Phase 4 (architecture) / Sprint 9 Task 6 (real sink) / Phase 11
 * Blob migration (2026-08-19) — Outbound Event abstraction. Defines the
 * shape of a revenue-relevant outbound interaction (a click toward a
 * vendor's site) and a single choke point for recording one. Gated behind
 * NEXT_PUBLIC_REVENUE_TRACKING_ENABLED (unset — off), following the same
 * env-var-gate convention as lib/analytics.ts, so this stays a no-op
 * until someone deliberately turns it on. See the Privacy Policy's
 * "Outbound link tracking" section — the prerequisite for turning it on
 * in production.
 *
 * Storage backend: one private Vercel Blob object per event
 * (`outbound-clicks/{uuid}.json`) when BLOB_READ_WRITE_TOKEN is present —
 * same store this project already uses for lib/revenue/affiliate-
 * pipeline.ts. Deliberately NOT one shared mutable JSON blob (the
 * pipeline's own pattern): that's a read-modify-write over a single
 * object, safe for a low-traffic internal dashboard touched by one human
 * at a time, but a real lost-update race under concurrent public clicks —
 * two requests could both read the same array, both append, and the
 * second write would silently discard the first click. One immutable
 * object per event has no shared mutable state to race over: every write
 * is independent, so concurrent clicks can never collide or clobber each
 * other. The read side (getOutboundEvents) pays for this with a list +
 * N gets instead of one read — an acceptable, honestly-documented
 * tradeoff at this project's real traffic scale, same "simple and
 * plain about its limits" philosophy as the rest of this module.
 *
 * Falls back to the same local-file, single-JSON-array pattern used
 * before (var/outbound-clicks.json, gitignored) only when the Blob token
 * isn't set — local dev without `vercel env pull`, or the test suite.
 * Tests never need real network access to a blob store, and the
 * read-modify-write race doesn't matter there: a single Node process
 * running tests serially, not concurrent public traffic.
 *
 * 2026-08-19 production finding: the previous version of this file wrote
 * to `path.join(process.cwd(), "var", "outbound-clicks.json")`
 * unconditionally. That path is read-only on deployed Vercel serverless
 * functions (only /tmp is writable there), so enabling tracking in
 * production made every single outbound click 500. Confirmed by a real
 * controlled test against the live API route before this fix, and by the
 * fact this never surfaced locally — dev and tests both run on an
 * ordinary writable filesystem, so the bug was invisible until a real
 * production request hit it.
 */

export type OutboundEventType = "official_site_click" | "affiliate_link_click" | "vendor_link_click";

export type OutboundEvent = {
  type: OutboundEventType;
  /** The software entry this click relates to. */
  softwareSlug: string;
  /** Where the click actually points. */
  destination: "official" | "affiliate";
  url: string;
  /**
   * 2026-08-17 — multi-funnel affiliate attribution (Wix's four Impact.com
   * funnels were the first real case needing this). All optional and
   * non-personal: which affiliate network's program this is
   * (e.g. "impact"), which specific funnel/campaign within that program
   * (e.g. "headless" for Wix), the network's own campaign identifier, and
   * where on the page the click originated (e.g. "software-page-cta",
   * "compare-page-choose-card"). Every value here is resolved server-side
   * from real config (lib/wix-funnels.ts, the request's own route), never
   * taken as-is from the client — same trust boundary as the fields above.
   */
  affiliateProgram?: string;
  affiliateFunnel?: string;
  campaignId?: string;
  network?: string;
  ctaLocation?: string;
  /**
   * Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) —
   * Phase 11: the legacy outbound-click pipeline never carried the
   * isTest marker the first-party pipeline uses, so a synthetic QA click
   * here couldn't be told apart from a real one. Never fabricates a real
   * vendor-side click for QA purposes — see components/TrackedCtaLink.tsx
   * and app/api/outbound-click/route.ts for how this stays a safe,
   * internal-only marker rather than an actual outbound navigation.
   */
  isTest?: boolean;
};

export type StoredOutboundEvent = OutboundEvent & {
  /** The Miloosh page the click happened on, e.g. "/software/notion". */
  sourcePage: string;
  /** Server-assigned, ISO 8601 — never trusts a client-supplied clock. */
  timestamp: string;
};

const BLOB_PREFIX = "outbound-clicks/";
const LOCAL_FALLBACK_PATH = path.join(process.cwd(), "var", "outbound-clicks.json");
/** Read-side safety cap — the most recent events a single list() call will pull. See the module header for why "most recent" is best-effort, not guaranteed, once total volume exceeds this. */
const MAX_STORED_EVENTS = 5000;

/**
 * Off unless NEXT_PUBLIC_REVENUE_TRACKING_ENABLED=true is set (see
 * .env.example) — matches lib/analytics.ts's convention of a single
 * explicit opt-in flag rather than inferring "on" from partial config.
 */
export function isOutboundTrackingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED === "true";
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function readLocalFallback(): StoredOutboundEvent[] {
  try {
    const contents = fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8");
    const parsed: unknown = JSON.parse(contents);
    return Array.isArray(parsed) ? (parsed as StoredOutboundEvent[]) : [];
  } catch {
    // No log yet — the default, expected state until the first real click.
    return [];
  }
}

function appendLocalFallback(event: StoredOutboundEvent): void {
  const events = readLocalFallback();
  events.push(event);
  fs.mkdirSync(path.dirname(LOCAL_FALLBACK_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_FALLBACK_PATH, JSON.stringify(events.slice(-MAX_STORED_EVENTS), null, 2));
}

/**
 * The one place an outbound click gets recorded. A no-op unless tracking
 * is explicitly enabled. `sourcePage` is supplied by the caller (the
 * click-tracking API route), which reads it from the request itself, not
 * from anything the browser could spoof into a different shape.
 *
 * Never throws: a persistence failure (network blip, misconfigured
 * store, anything) must never break the API route that called this —
 * the visitor's actual click and navigation already happened in their
 * browser regardless of whether Miloosh managed to log it. Same "never
 * crash on a transient storage problem" discipline as
 * affiliate-pipeline.ts's readAffiliatePipeline(), applied here to the
 * write side instead of the read side.
 */
export async function recordOutboundEvent(event: OutboundEvent, sourcePage: string): Promise<void> {
  if (!isOutboundTrackingEnabled()) {
    return;
  }

  const stored: StoredOutboundEvent = {
    ...event,
    sourcePage,
    timestamp: new Date().toISOString(),
  };

  if (!hasBlobToken()) {
    try {
      appendLocalFallback(stored);
    } catch {
      // Local dev/test filesystem hiccup — never crash the caller over it.
    }
    return;
  }

  try {
    const { put } = await import("@vercel/blob");
    await put(`${BLOB_PREFIX}${randomUUID()}.json`, JSON.stringify(stored), {
      access: "private",
      addRandomSuffix: false,
      // A fresh random UUID should never collide with an existing object;
      // refusing to overwrite is a cheap extra guard against silently
      // clobbering a different event if it somehow did.
      allowOverwrite: false,
      contentType: "application/json",
    });
  } catch {
    // Store unreachable/misconfigured/transient error — this is
    // best-effort analytics, not a critical path. Never let it 500 the
    // route that's supposed to just be forwarding a click.
  }
}

/**
 * Full event log, most recent first. Powers the /internal/outbound-clicks
 * report. One list() call plus one get() per listed blob — see the module
 * header for why this trades read cost for write-side safety. A single
 * unreadable/corrupt blob is skipped, not fatal to the whole report.
 */
export async function getOutboundEvents(): Promise<StoredOutboundEvent[]> {
  if (!hasBlobToken()) {
    return [...readLocalFallback()].reverse();
  }

  try {
    const { list, get } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: MAX_STORED_EVENTS });

    const events = await Promise.all(
      blobs.map(async (blob): Promise<StoredOutboundEvent | null> => {
        try {
          const result = await get(blob.pathname, { access: "private", useCache: false });
          if (!result) return null;
          const text = await new Response(result.stream).text();
          return JSON.parse(text) as StoredOutboundEvent;
        } catch {
          return null;
        }
      })
    );

    return events
      .filter((event): event is StoredOutboundEvent => event !== null)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    // Store not yet initialized (first write hasn't happened) or a transient error — never crash a read.
    return [];
  }
}

export type OutboundClickSummaryRow = {
  softwareSlug: string;
  officialClicks: number;
  affiliateClicks: number;
  vendorLinkClicks: number;
  totalClicks: number;
  testClicks: number;
};

/**
 * MILOOSH REVENUE WAR MISSION (2026-08-24) — real gap fixed: this
 * function never excluded isTest events, so QA verification clicks
 * (this codebase's own established ?qa=1 discipline for live-browser
 * testing) counted identically to a real human affiliate click in the
 * one internal report meant to answer "did a real click happen." A real
 * first conversion could have gone unnoticed inside routine QA noise.
 *
 * Test events are never discarded — testClicks reports the real count
 * transparently — they're just excluded from officialClicks/
 * affiliateClicks/vendorLinkClicks/totalClicks, which now mean "real,
 * non-test clicks only," matching every other "real" metric in this
 * codebase (isSyntheticOrTestEvent, the human-classification buckets).
 */
export function summarizeOutboundEventsByProduct(events: StoredOutboundEvent[]): OutboundClickSummaryRow[] {
  const bySlug = new Map<string, OutboundClickSummaryRow>();

  for (const event of events) {
    const row = bySlug.get(event.softwareSlug) ?? {
      softwareSlug: event.softwareSlug,
      officialClicks: 0,
      affiliateClicks: 0,
      vendorLinkClicks: 0,
      totalClicks: 0,
      testClicks: 0,
    };

    if (event.isTest) {
      row.testClicks += 1;
    } else {
      if (event.type === "affiliate_link_click") row.affiliateClicks += 1;
      else if (event.type === "vendor_link_click") row.vendorLinkClicks += 1;
      else row.officialClicks += 1;
      row.totalClicks += 1;
    }

    bySlug.set(event.softwareSlug, row);
  }

  return [...bySlug.values()].sort((a, b) => b.totalClicks - a.totalClicks);
}
