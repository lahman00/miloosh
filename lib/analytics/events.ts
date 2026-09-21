import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { analyticsLocalPath } from "@/lib/analytics/local-store-path";
import type { EcommerceSituation } from "@/lib/recommend/types";

/**
 * First-party privacy-respecting analytics event definitions and storage.
 *
 * Privacy model:
 * - NO names or emails.
 * - NO IP addresses stored in events.
 * - NO browser fingerprinting.
 * - Anonymous, ephemeral client-generated visitor ID (`visitorId`) and session ID (`sessionId`).
 * - Storage: Private Vercel Blob object per event or local fallback.
 */

export type FirstPartyEventType =
  | "page_view"
  | "engaged_view"
  | "software_view"
  | "comparison_view"
  | "category_view"
  | "guide_view"
  | "recommend_use"
  | "outbound_click"
  | "internal_cta_click"
  | "recommend_started"
  | "recommend_step_viewed"
  | "recommend_need_selected"
  | "recommend_ecommerce_situation_selected"
  | "recommend_completed"
  | "recommend_result_viewed"
  | "recommend_product_open"
  | "recommend_comparison_open"
  | "cta_impression"
  | "newsletter_signup";

export interface BaseAnalyticsEvent {
  type: FirstPartyEventType;
  visitorId: string;
  sessionId: string;
  timestamp: string;
  path: string;
  isTest?: boolean;
  /**
   * Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) Phase 5:
   * an operator-supplied run identifier for one specific QA session, so its
   * events can be found unambiguously in storage. Only ever present when
   * isTest is true — enforced server-side in app/api/analytics/event/route.ts,
   * never trusted from the client alone. Not PII: a short opaque string the
   * operator chose, sanitized to [a-zA-Z0-9_-] before storage.
   */
  qaRun?: string;
}

export interface PageViewEvent extends BaseAnalyticsEvent {
  type: "page_view";
  /**
   * Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) Phase 8:
   * a hostname only (e.g. "www.google.com") — never the full referrer URL,
   * which can carry a sensitive query string from the referring page. See
   * lib/analytics/attribution.ts's extractReferrerHost.
   */
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /**
   * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) — the queue
   * entry ID a social post's link is tagged with at publish time
   * (lib/social/utm.ts), captured so real visitors can be attributed to
   * the specific post that brought them, not just a coarse source bucket.
   */
  utmContent?: string;
  /** Normalized via lib/analytics/attribution.ts — never computed ad hoc elsewhere. */
  trafficSource?: "organic_search" | "social" | "referral" | "direct" | "unknown";
}

export interface EngagedViewEvent extends BaseAnalyticsEvent {
  type: "engaged_view";
  durationSeconds: number;
}

export interface SoftwareViewEvent extends BaseAnalyticsEvent {
  type: "software_view";
  softwareSlug: string;
}

export interface ComparisonViewEvent extends BaseAnalyticsEvent {
  type: "comparison_view";
  comparisonSlug: string;
}

export interface CategoryViewEvent extends BaseAnalyticsEvent {
  type: "category_view";
  categorySlug: string;
}

export interface GuideViewEvent extends BaseAnalyticsEvent {
  type: "guide_view";
  guideSlug: string;
}

export interface RecommendUseEvent extends BaseAnalyticsEvent {
  type: "recommend_use";
  queryOrCategory?: string;
}

export interface OutboundClickEvent extends BaseAnalyticsEvent {
  type: "outbound_click";
  softwareSlug: string;
  destination: "official" | "affiliate";
  url: string;
  ctaLocation?: string;
  isTest?: boolean;
  /**
   * MILOOSH CTA CONVERSION OPTIMIZATION MISSION (2026-08-23) — present only
   * when this click came from a CTA under active experimentation (see
   * lib/experiments/cta-copy-experiment.ts). Absent for every other CTA
   * click, including ones on the same page location before/after an
   * experiment ran — never inferred, only ever set by the experiment's own
   * assignment logic.
   */
  experimentId?: string;
  variant?: string;
}

export interface InternalCtaClickEvent extends BaseAnalyticsEvent {
  type: "internal_cta_click";
  targetPath: string;
  ctaName?: string;
}

/**
 * Recommend Engine Integrity Patch (2026-08-21) — Phase 7's "minimal
 * useful set" of Recommend-specific interaction events, deferred by the
 * prior mission. Same privacy model as every other event here: safe
 * enums/IDs only (a RecommendDomain value, a real product/comparison
 * slug, a confidence level) — never free-text answers.
 */
export interface RecommendStartedEvent extends BaseAnalyticsEvent {
  type: "recommend_started";
}

export interface RecommendStepViewedEvent extends BaseAnalyticsEvent {
  type: "recommend_step_viewed";
  /** 1-based wizard step; bounded server-side to the four current steps. */
  rank: number;
  /** Stable non-free-text step key, e.g. "your_team". */
  source: string;
}

export interface RecommendNeedSelectedEvent extends BaseAnalyticsEvent {
  type: "recommend_need_selected";
  /** A RecommendDomain value, or "not_sure" for the explicit "Not sure yet" option. */
  domain: string;
}

export interface RecommendCompletedEvent extends BaseAnalyticsEvent {
  type: "recommend_completed";
  domain: string;
}

export interface RecommendEcommerceSituationSelectedEvent extends BaseAnalyticsEvent {
  type: "recommend_ecommerce_situation_selected";
  situation: EcommerceSituation;
}

export interface RecommendResultViewedEvent extends BaseAnalyticsEvent {
  type: "recommend_result_viewed";
  domain: string;
  confidence: "high" | "low" | "none";
  resultCount: number;
}

export interface RecommendProductOpenEvent extends BaseAnalyticsEvent {
  type: "recommend_product_open";
  softwareSlug: string;
  rank: number;
  /** Flippa + Recommend Expansion mission (2026-08-21) Phase 26 — lets the funnel report break product opens down by domain. */
  domain?: string;
}

export interface RecommendComparisonOpenEvent extends BaseAnalyticsEvent {
  type: "recommend_comparison_open";
  comparisonSlug: string;
  domain?: string;
}

/**
 * WAR MODE mission (2026-08-22) Phase 21 — CTA exposure telemetry. Fired
 * once per CTA element per page view, the first time it becomes visible
 * in the viewport (see components/TrackedCtaLink.tsx's IntersectionObserver).
 * Exists so the funnel can measure a real click-through rate on a CTA
 * (clicks / people who actually saw it) instead of only (clicks / people
 * who loaded the page, whether or not the CTA was ever on-screen) — the
 * previous funnel had no way to distinguish "nobody saw it" from "people
 * saw it and declined to click."
 */
export interface CtaImpressionEvent extends BaseAnalyticsEvent {
  type: "cta_impression";
  softwareSlug: string;
  ctaLocation?: string;
  /** See OutboundClickEvent's experimentId/variant doc — same meaning, same mission. */
  experimentId?: string;
  variant?: string;
}

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23) — the behavioral marker that a
 * newsletter signup happened, joinable to the rest of the funnel by
 * visitorId/sessionId. Deliberately carries NO email address or any
 * other PII — the real email lives only in lib/newsletter/leads.ts's
 * separate, explicitly-consented store. `source` is which page/surface
 * captured the signup (e.g. "saas-cost-calculator"), purely descriptive,
 * same category as CtaImpressionEvent's ctaLocation.
 */
export interface NewsletterSignupEvent extends BaseAnalyticsEvent {
  type: "newsletter_signup";
  source: string;
}

export type FirstPartyEvent =
  | PageViewEvent
  | EngagedViewEvent
  | SoftwareViewEvent
  | ComparisonViewEvent
  | CategoryViewEvent
  | GuideViewEvent
  | RecommendUseEvent
  | OutboundClickEvent
  | InternalCtaClickEvent
  | RecommendStartedEvent
  | RecommendStepViewedEvent
  | RecommendNeedSelectedEvent
  | RecommendEcommerceSituationSelectedEvent
  | RecommendCompletedEvent
  | RecommendResultViewedEvent
  | RecommendProductOpenEvent
  | RecommendComparisonOpenEvent
  | CtaImpressionEvent
  | NewsletterSignupEvent;

const BLOB_PREFIX = "first-party-analytics/";
const LOCAL_FALLBACK_PATH = analyticsLocalPath("first-party-analytics.json");
const MAX_STORED_EVENTS = 10000;

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function readLocalFallback(): FirstPartyEvent[] {
  try {
    const contents = fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8");
    const parsed: unknown = JSON.parse(contents);
    return Array.isArray(parsed) ? (parsed as FirstPartyEvent[]) : [];
  } catch {
    return [];
  }
}

function appendLocalFallback(event: FirstPartyEvent): void {
  const events = readLocalFallback();
  events.push(event);
  fs.mkdirSync(path.dirname(LOCAL_FALLBACK_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_FALLBACK_PATH, JSON.stringify(events.slice(-MAX_STORED_EVENTS), null, 2));
}

/**
 * Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) — Phase
 * 10: "never throw" must not mean "silently disappear." This still never
 * throws (a storage hiccup must never break the page/API route that
 * called it), but now returns whether the write actually succeeded and
 * logs a failure via console.error — a single, non-recursive structured
 * line (never calls itself or any other analytics recorder), observable
 * in `vercel logs` — instead of swallowing the error with a bare comment.
 */
export async function recordFirstPartyEvent(event: FirstPartyEvent): Promise<boolean> {
  if (!hasBlobToken()) {
    try {
      appendLocalFallback(event);
      return true;
    } catch (error) {
      console.error(`[analytics] local fallback write failed for event type "${event.type}":`, error);
      return false;
    }
  }

  try {
    const { put } = await import("@vercel/blob");
    const datePrefix = event.timestamp.slice(0, 10); // YYYY-MM-DD
    await put(`${BLOB_PREFIX}${datePrefix}/${randomUUID()}.json`, JSON.stringify(event), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
    });
    return true;
  } catch (error) {
    console.error(`[analytics] Blob write failed for event type "${event.type}":`, error);
    return false;
  }
}

export async function getAllFirstPartyEvents(): Promise<FirstPartyEvent[]> {
  if (!hasBlobToken()) {
    return [...readLocalFallback()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  const { list, get } = await import("@vercel/blob");
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: BLOB_PREFIX, limit: 1000, cursor });
    paths.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
    if (page.hasMore && !cursor) throw new Error("Analytics listing is incomplete: missing continuation cursor.");
  } while (cursor);

  const events: FirstPartyEvent[] = [];
  let next = 0;
  let failures = 0;
  // Bounded reads avoid the request bursts that silently lost events in the
  // previous reader. A partial read must never masquerade as a complete report.
  await Promise.all(Array.from({ length: Math.min(8, paths.length) }, async () => {
    while (next < paths.length) {
      const pathname = paths[next++];
      let loaded = false;
      for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
        try {
          const response = await get(pathname, { access: "private", useCache: false });
          if (!response) throw new Error("Analytics event unavailable");
          const event = JSON.parse(await new Response(response.stream).text()) as FirstPartyEvent;
          if (!event.type || !event.timestamp || !event.sessionId) throw new Error("Invalid analytics event");
          events.push(event);
          loaded = true;
        } catch {
          if (attempt === 2) failures++;
        }
      }
    }
  }));
  if (failures) throw new Error(`Analytics read incomplete: ${failures} of ${paths.length} events could not be read.`);
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
