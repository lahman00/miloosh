import { NextResponse, type NextRequest } from "next/server";
import { classifyRequest } from "@/lib/analytics/bot-filter";
import { CTA_COPY_EXPERIMENT_ID } from "@/lib/experiments/cta-copy-experiment";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { validEventId } from "@/lib/analytics/event-id";
import { recordFirstPartyEvent } from "@/lib/analytics/events";
import { analyticsPath, sanitizeAcquisition } from "@/lib/analytics/acquisition";
import { normalizeCtaLocation } from "@/lib/analytics/cta-locations";
import { resolveVendorLinkUrl } from "@/lib/revenue/outbound-destination";
import { isCrossOriginEvent, isNonProductionEvent, readEventBody } from "@/lib/analytics/ingest";
import { trackSoftwareCtaClick, trackVendorLinkClick } from "@/lib/revenue/click-tracker";
import { resolveOutboundSourcePage } from "@/lib/revenue/source-page";
import { WIX_CONTEXTS, getWixAffiliateUrl, type WixFunnelContext } from "@/lib/wix-funnels";

/**
 * Sprint 9 Task 6 — the only entry point components/TrackedCtaLink.tsx
 * talks to. The actual destination URL and whether it's an affiliate link
 * are recomputed from server-side data rather than accepted from the body.
 * Source-page attribution prefers a same-origin Referer and only falls back
 * to a restricted local pathname from the client. `wixContext` is validated
 * against the known context list before use. Recording itself is a no-op
 * unless NEXT_PUBLIC_REVENUE_TRACKING_ENABLED=true.
 */

type OutboundClickBody = {
  eventId?: unknown;
  acquisition?: unknown;
  previousPath?: unknown;
  slug?: unknown;
  kind?: unknown;
  sourcePage?: unknown;
  ctaLocation?: unknown;
  wixContext?: unknown;
  visitorId?: unknown;
  sessionId?: unknown;
  isTest?: unknown;
  experimentId?: unknown;
  variant?: unknown;
};

export type SafeOutboundObservation = {
  softwareSlug: string;
  sourcePage: string;
  ctaLocation: string | undefined;
  destination: "affiliate" | "official";
  testMarker: "test" | "explicit_non_test" | "unknown";
  sinks: { legacy: "FAILED" | "RECORDED" | "DISABLED"; firstParty: "FAILED" | "RECORDED" | "DISABLED" };
};

/**
 * Privacy-safe production observability for the revenue handoff.
 * Deliberately excludes visitor/session IDs, acquisition data, destination
 * URLs, referrers and event IDs. Vercel's own log timestamp supplies time.
 */
export function safeOutboundObservation(input: {
  softwareSlug: string;
  sourcePage: string;
  ctaLocation: string | undefined;
  destination: "affiliate" | "official";
  isTest: boolean | undefined;
  sinks: SafeOutboundObservation["sinks"];
}): SafeOutboundObservation {
  return {
    softwareSlug: input.softwareSlug,
    sourcePage: input.sourcePage,
    ctaLocation: input.ctaLocation,
    destination: input.destination,
    testMarker: input.isTest === true ? "test" : input.isTest === false ? "explicit_non_test" : "unknown",
    sinks: input.sinks,
  };
}

function isWixContext(value: unknown): value is WixFunnelContext {
  return typeof value === "string" && (WIX_CONTEXTS as readonly string[]).includes(value);
}

/**
 * MILOOSH CRITICAL MONETIZATION CLOSEOUT (2026-08-29) P1-2: the finite,
 * real set of ctaLocation values this codebase actually sends -- swept
 * directly from every literal `ctaLocation="..."` in components/app (6
 * commercial CTA surfaces) plus the 9 fixed vendor-link labels
 * components/VendorLinksBlock.tsx hardcodes (never user input, so this
 * list is exhaustive by construction, not a guess) plus the
 * `pricing-source-link` editorial surface and the `vendor-link` fallback
 * used when a vendor-link click carries no specific location. A client
 * could still send an arbitrary string here (this endpoint is public),
 * so anything outside this set is normalized to a single bounded
 * sentinel rather than stored verbatim -- unbounded arbitrary strings
 * must never become unbounded analytics cardinality.
 */

export async function POST(request: NextRequest) {
  if (isCrossOriginEvent(request)) return NextResponse.json({ error: "cross-origin event rejected" }, { status: 403 });
  if (classifyRequest(request.headers).kind !== "PASS") {
    return NextResponse.json({ ok: true, recorded: false }, { status: 202 });
  }
  const input = await readEventBody(request);
  if (!input.ok) return NextResponse.json({ error: input.reason }, { status: input.status });
  const body = input.body as OutboundClickBody;

  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { slug, kind, ctaLocation, wixContext } = body;

  if (kind !== undefined && kind !== "cta" && kind !== "vendor-link") {
    return NextResponse.json({ error: "unknown click kind" }, { status: 400 });
  }
  if (body.eventId !== undefined && !validEventId(body.eventId)) {
    return NextResponse.json({ error: "invalid event id" }, { status: 400 });
  }
  const eventId = validEventId(body.eventId) ? body.eventId : undefined;

  if (typeof slug !== "string") {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const software = getSoftware(slug);
  if (!software) {
    return NextResponse.json({ error: "unknown software slug" }, { status: 404 });
  }

  const sourcePage = resolveOutboundSourcePage(request.headers.get("referer"), request.nextUrl.origin, body.sourcePage);
  const resolvedCtaLocation = normalizeCtaLocation(typeof ctaLocation === "string" ? ctaLocation : undefined);
  const visitorId = typeof body.visitorId === "string" && /^v_[a-zA-Z0-9_-]{1,62}$/.test(body.visitorId) ? body.visitorId : "v_anon";
  const sessionId = typeof body.sessionId === "string" && /^s_[a-zA-Z0-9_-]{1,62}$/.test(body.sessionId) ? body.sessionId : "s_anon";
  // Preserve unknown markers in both sinks, never manufacture explicit false.
  const isTest = isNonProductionEvent(request) ? true : typeof body.isTest === "boolean" ? body.isTest : undefined;
  // Experiment labels are descriptive only and never branch destination logic.
  const experimentId = body.experimentId === CTA_COPY_EXPERIMENT_ID ? body.experimentId : undefined;
  const variant = body.variant === "control" || body.variant === "treatment" ? body.variant : undefined;
  const experimentFields = experimentId && variant ? { experimentId, variant } : {};
  const context = {
    visitorId, sessionId,
    acquisition: sanitizeAcquisition(body.acquisition, sessionId),
    previousPath: analyticsPath(body.previousPath),
  };

  const vendor = kind === "vendor-link";
  const location = vendor ? resolvedCtaLocation || "vendor-link" : resolvedCtaLocation;
  const pricingIntent = location === "pricing-section-cta" || location === "money-page-decision-card" ||
    location === "money-page-sticky-cta" || location === "vendor-link-pricing";
  const url = vendor ? resolveVendorLinkUrl(software, location) :
    slug === "wix" && isWixContext(wixContext) ? getWixAffiliateUrl(wixContext) : getSoftwareCtaUrl(software, pricingIntent ? "pricing" : undefined);

  // Independent sinks start together. A rejected/slow legacy write must not
  // prevent the identity-bearing event from being attempted (or vice versa).
  // 202 means the tracking request was handled, NOT that a merchant loaded.
  const results = await Promise.allSettled([
    vendor ? trackVendorLinkClick(software, url, sourcePage, location, isTest, eventId, context) :
      trackSoftwareCtaClick(software, url, sourcePage, location, isTest, eventId, context),
    recordFirstPartyEvent({
      eventId,
      ...context,
      type: "outbound_click",
      softwareSlug: software.slug,
      destination: !vendor && shouldShowAffiliateDisclosure(software) ? "affiliate" : "official",
      url,
      ctaLocation: location,
      path: sourcePage,
      timestamp: new Date().toISOString(),
      isTest,
      ...experimentFields,
    }),
  ]);
  const state = (result: PromiseSettledResult<boolean | undefined>): SafeOutboundObservation["sinks"]["legacy"] =>
    result.status === "rejected" || result.value === false ? "FAILED" :
      result.value === true ? "RECORDED" : "DISABLED";
  const sinks: SafeOutboundObservation["sinks"] = { legacy: state(results[0]), firstParty: state(results[1]) };

  if (process.env.VERCEL_ENV === "production") {
    const destination = !vendor && shouldShowAffiliateDisclosure(software) ? "affiliate" : "official";
    console.info("[outbound-observation]", safeOutboundObservation({
      softwareSlug: software.slug,
      sourcePage,
      ctaLocation: location,
      destination,
      isTest,
      sinks,
    }));
  }

  return NextResponse.json({ ok: true, recorded: sinks.firstParty === "RECORDED", sinks }, { status: 202 });
}
