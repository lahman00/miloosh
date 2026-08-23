import { NextResponse, type NextRequest } from "next/server";
import { classifyRequest } from "@/lib/analytics/bot-filter";
import { recordFirstPartyEvent, type FirstPartyEvent, type FirstPartyEventType } from "@/lib/analytics/events";

/**
 * Analytics Zero-Drop Production Proof Mega Mission (2026-08-21).
 *
 * Response `classification` values (Phase 3 — the states this route must
 * not silently collapse into each other):
 *   BOT                 — user-agent matched a known bot/crawler pattern. Discarded, not stored.
 *   INTERNAL_INFRA       — Vercel platform/prefetch noise, not a real request. Discarded, not stored.
 *   REJECTED_VALIDATION — malformed/missing/oversized payload, or an engaged_view whose claimed
 *                         durationSeconds is implausibly below the 10-second dwell threshold
 *                         (see components/FirstPartyAnalytics.tsx's 2026-08-22 header — a real,
 *                         reproducible-in-theory browser behavior, not a guessed edge case: tab
 *                         duplication copies sessionStorage but not the in-memory dwell timer).
 *                         Discarded, not stored.
 *   FAILED_STORAGE       — passed every check, but the write itself failed. User experience unaffected either way.
 *   SYNTHETIC_QA         — passed every check, isTest:true, STORED (excluded from real-human reports by default).
 *   REAL_OR_UNKNOWN_HUMAN — passed every check, isTest not set, STORED as ordinary traffic.
 *
 * The `reason` field is deliberately generic/coarse in the public response
 * (never leaks the exact bot pattern or infra header matched) — the
 * specific one is only in the server-side console.warn/error line, which
 * is where a real investigation should look (`vercel logs`).
 */

const MAX_PAYLOAD_BYTES = 8192; // generous for this event shape; guards against abuse, not legitimate use
const VALID_EVENT_TYPES: readonly FirstPartyEventType[] = [
  "page_view", "engaged_view", "software_view", "comparison_view", "category_view", "guide_view",
  "recommend_use", "outbound_click", "internal_cta_click", "recommend_started", "recommend_need_selected",
  "recommend_completed", "recommend_result_viewed", "recommend_product_open", "recommend_comparison_open",
  "cta_impression", "newsletter_signup",
];

export async function POST(request: NextRequest) {
  const classification = classifyRequest(request.headers);
  if (classification.kind !== "PASS") {
    console.warn(`[analytics] ${classification.kind}: ${classification.reason}`);
    return NextResponse.json({ recorded: false, classification: classification.kind });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    console.warn(`[analytics] REJECTED_VALIDATION: payload too large (${rawBody.length} bytes)`);
    return NextResponse.json({ recorded: false, classification: "REJECTED_VALIDATION" }, { status: 413 });
  }

  let body: Partial<FirstPartyEvent>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ recorded: false, classification: "REJECTED_VALIDATION", reason: "invalid_json" }, { status: 400 });
  }

  if (
    typeof body.type !== "string" ||
    !VALID_EVENT_TYPES.includes(body.type as FirstPartyEventType) ||
    typeof body.visitorId !== "string" || body.visitorId.length === 0 ||
    typeof body.sessionId !== "string" || body.sessionId.length === 0 ||
    typeof body.path !== "string"
  ) {
    return NextResponse.json({ recorded: false, classification: "REJECTED_VALIDATION", reason: "missing_or_invalid_fields" }, { status: 400 });
  }

  // Defense-in-depth: the client now sends the real elapsed time (see
  // components/FirstPartyAnalytics.tsx), but a modified/replayed/scripted
  // client could still claim any value. An engaged_view genuinely cannot
  // occur before the app's own 10-second dwell timer — allow a small
  // margin for clock/timer slop, not for a fabricated fast value.
  if (body.type === "engaged_view") {
    const claimed = (body as { durationSeconds?: unknown }).durationSeconds;
    if (typeof claimed !== "number" || claimed < 8) {
      console.warn(`[analytics] REJECTED_VALIDATION: engaged_view claimed durationSeconds=${String(claimed)}, below the 10s dwell floor`);
      return NextResponse.json({ recorded: false, classification: "REJECTED_VALIDATION", reason: "implausible_engagement_timing" }, { status: 400 });
    }
  }

  const isTest = body.isTest === true;
  // Phase 5: qaRun is re-validated server-side, never trusted from the
  // client alone, and — same rule as the client enforces — can only ever
  // be present on an isTest:true event. A spoofed isTest:false + qaRun
  // combination silently drops the qaRun rather than storing it.
  const rawQaRun = typeof body.qaRun === "string" ? body.qaRun.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) : undefined;
  const qaRun = isTest && rawQaRun ? rawQaRun : undefined;

  const sanitizedEvent: FirstPartyEvent = {
    ...body,
    timestamp: new Date().toISOString(),
    path: String(body.path).slice(0, 300),
    visitorId: String(body.visitorId).slice(0, 64),
    sessionId: String(body.sessionId).slice(0, 64),
    isTest,
    qaRun,
  } as FirstPartyEvent;

  const stored = await recordFirstPartyEvent(sanitizedEvent);
  if (!stored) {
    // recordFirstPartyEvent already logged the specific error — this is
    // just the response-shape signal. The client never sees this as a
    // failure it needs to react to (best-effort, fire-and-forget).
    return NextResponse.json({ recorded: false, classification: "FAILED_STORAGE" });
  }

  return NextResponse.json({ recorded: true, classification: isTest ? "SYNTHETIC_QA" : "REAL_OR_UNKNOWN_HUMAN" });
}
