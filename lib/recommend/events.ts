import fs from "node:fs";
import path from "node:path";
import { isOutboundTrackingEnabled } from "@/lib/revenue/events";

/**
 * Sprint 10 Phase 7 — recommendation analytics. Reuses the same
 * off-by-default switch as outbound-click tracking
 * (NEXT_PUBLIC_REVENUE_TRACKING_ENABLED, see lib/revenue/events.ts) so
 * there's one privacy toggle for all first-party product analytics on
 * this site, but writes to its own log file so the two concerns (revenue
 * clicks vs. recommendation usage) stay easy to report on separately.
 * Same local-JSON-file sink, same limitations, as documented in
 * docs/revenue.md and docs/recommendation-engine.md.
 *
 * Recommend Engine Rebuild (2026-08-21) production incident: this file's
 * write path had no try/catch, so on deployed Vercel serverless functions
 * (read-only filesystem outside /tmp) every call threw ENOENT and 500'd
 * the entire /recommend/results page. This is the exact bug
 * lib/revenue/events.ts's own header already documents fixing on
 * 2026-08-19 — this file never picked up that lesson. Fixed the same way:
 * the write path must never throw. (Not migrated to Blob storage here —
 * a real future improvement, but out of scope for "never crash the page
 * over best-effort analytics.")
 */

export type RecommendationEventType =
  | "recommendation_generated"
  | "recommendation_shown"
  | "recommendation_result_click";

export type RecommendationEvent = {
  type: RecommendationEventType;
  /** Present for "shown"/"result_click"; absent for "generated" (which isn't about one product). */
  softwareSlug?: string;
  /** 1-3, present for "shown"/"result_click". */
  rank?: number;
  /** The matchPercent at the time this was recorded, present for "shown"/"result_click". */
  matchPercent?: number;
  /** Compact, human-readable summary of the answers that produced this — for audit, not analytics dimensions. */
  answersSummary: string;
};

export type StoredRecommendationEvent = RecommendationEvent & {
  timestamp: string;
};

const LOG_FILE = path.join(process.cwd(), "var", "recommendation-events.json");
const MAX_STORED_EVENTS = 5000;

function readLog(): StoredRecommendationEvent[] {
  try {
    const contents = fs.readFileSync(LOG_FILE, "utf-8");
    const parsed: unknown = JSON.parse(contents);
    return Array.isArray(parsed) ? (parsed as StoredRecommendationEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLog(events: StoredRecommendationEvent[]): void {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(events, null, 2));
}

/**
 * Never throws: a persistence failure (read-only production filesystem,
 * disk hiccup, anything) must never break the page that called this — the
 * recommendation was already computed and rendered regardless of whether
 * Miloosh managed to log it. Same discipline as
 * lib/revenue/events.ts's recordOutboundEvent.
 */
export function recordRecommendationEvent(event: RecommendationEvent): void {
  if (!isOutboundTrackingEnabled()) {
    return;
  }

  try {
    const events = readLog();
    events.push({ ...event, timestamp: new Date().toISOString() });
    writeLog(events.slice(-MAX_STORED_EVENTS));
  } catch {
    // Read-only production filesystem or other transient error — this is
    // best-effort analytics, not a critical path. Never let it 500 the page.
  }
}

/** Full event log, most recent first. Powers the /internal/recommendations report. */
export function getRecommendationEvents(): StoredRecommendationEvent[] {
  return [...readLog()].reverse();
}

/** Legacy file-only telemetry is not a durable production data source. */
export function readRecommendationEventsDetailed(): { status: "available" | "unavailable"; events: StoredRecommendationEvent[]; note: string } {
  if (process.env.VERCEL === "1") return { status: "unavailable", events: [], note: "UNKNOWN: the legacy recommendation log is local-file-only, not durable on Vercel. Use the first-party analytics report for production recommendation interactions." };
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
    if (!Array.isArray(parsed)) throw Error("invalid log");
    return { status: "available", events: (parsed as StoredRecommendationEvent[]).slice().reverse(), note: "Local diagnostic observations only; not verified human traffic or complete production totals." };
  } catch {
    return { status: "unavailable", events: [], note: "UNKNOWN: the local recommendation log is missing, unreadable or invalid; no zero inferred." };
  }
}

export type RecommendationSummaryRow = {
  softwareSlug: string;
  timesShown: number;
  timesClicked: number;
};

/** How often each product was recommended vs. actually clicked through — sorted most-shown first. */
export function summarizeRecommendationEventsByProduct(
  events: StoredRecommendationEvent[]
): RecommendationSummaryRow[] {
  const bySlug = new Map<string, RecommendationSummaryRow>();

  for (const event of events) {
    if (!event.softwareSlug) continue;

    const row = bySlug.get(event.softwareSlug) ?? {
      softwareSlug: event.softwareSlug,
      timesShown: 0,
      timesClicked: 0,
    };

    if (event.type === "recommendation_shown") row.timesShown += 1;
    else if (event.type === "recommendation_result_click") row.timesClicked += 1;

    bySlug.set(event.softwareSlug, row);
  }

  return [...bySlug.values()].sort((a, b) => b.timesShown - a.timesShown);
}
