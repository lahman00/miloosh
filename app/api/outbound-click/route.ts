import { resolveVendorLinkUrl, normalizeCtaLocation } from "@/lib/revenue/outbound-route-policy";
import { canMutate, readOnlyResponse } from "@/lib/deployment/mutation-policy";
import { NextResponse, type NextRequest } from "next/server";
import { classifyRequest } from "@/lib/analytics/bot-filter";
import { CTA_COPY_EXPERIMENT_ID } from "@/lib/experiments/cta-copy-experiment";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaUrl } from "@/lib/affiliate";
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

function isWixContext(value: unknown): value is WixFunnelContext {
  return typeof value === "string" && (WIX_CONTEXTS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  if (!(await canMutate())) return readOnlyResponse();
  if (classifyRequest(request.headers).kind !== "PASS") {
    return NextResponse.json({ ok: true, recorded: false }, { status: 202 });
  }
  let body: OutboundClickBody;

  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 8192) return NextResponse.json({ error: "payload too large" }, { status: 413 });
    body = JSON.parse(raw) as OutboundClickBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { slug, kind, ctaLocation, wixContext } = body;

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
  const isTest = typeof body.isTest === "boolean" ? body.isTest : undefined;
  const firstPartyIsTest = typeof body.isTest === "boolean" ? body.isTest : undefined;
  // Experiment labels are descriptive only and never branch destination logic.
  const experimentId = body.experimentId === CTA_COPY_EXPERIMENT_ID ? body.experimentId : undefined;
  const variant = body.variant === "control" || body.variant === "treatment" ? body.variant : undefined;
  const experimentFields = experimentId && variant ? { experimentId, variant } : {};

  if (kind === "vendor-link") {
    const url = resolveVendorLinkUrl(software, resolvedCtaLocation);
    const vendorLinkCtaLocation = resolvedCtaLocation || "vendor-link";
    await trackVendorLinkClick(software, url, sourcePage, vendorLinkCtaLocation, isTest);

    const { recordFirstPartyEvent } = await import("@/lib/analytics/events");
    await recordFirstPartyEvent({
      type: "outbound_click",
      softwareSlug: software.slug,
      destination: "official",
      url,
      ctaLocation: vendorLinkCtaLocation,
      path: sourcePage,
      visitorId,
      sessionId,
      timestamp: new Date().toISOString(),
      isTest: firstPartyIsTest,
      ...experimentFields,
    });
  } else {
    const pricingIntent = resolvedCtaLocation === "pricing-section-cta" ||
      resolvedCtaLocation === "money-page-decision-card" || resolvedCtaLocation === "money-page-sticky-cta" ||
      resolvedCtaLocation === "vendor-link-pricing";
    const url = slug === "wix" && isWixContext(wixContext) ? getWixAffiliateUrl(wixContext) : getSoftwareCtaUrl(software, pricingIntent ? "pricing" : undefined);
    await trackSoftwareCtaClick(software, url, sourcePage, resolvedCtaLocation, isTest);

    const { recordFirstPartyEvent } = await import("@/lib/analytics/events");
    const { shouldShowAffiliateDisclosure } = await import("@/lib/affiliate");
    const isAffiliate = shouldShowAffiliateDisclosure(software);

    await recordFirstPartyEvent({
      type: "outbound_click",
      softwareSlug: software.slug,
      destination: isAffiliate ? "affiliate" : "official",
      url,
      ctaLocation: resolvedCtaLocation,
      path: sourcePage,
      visitorId,
      sessionId,
      timestamp: new Date().toISOString(),
      isTest: firstPartyIsTest,
      ...experimentFields,
    });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
