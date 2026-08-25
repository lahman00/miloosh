import { NextResponse, type NextRequest } from "next/server";
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

type SoftwareRecord = NonNullable<ReturnType<typeof getSoftware>>;

/**
 * Direct vendor links may target a specific server-verified subpage rather
 * than the vendor homepage. Resolve those destinations from the canonical
 * software record and the finite ctaLocation vocabulary, never from a URL
 * supplied by the browser. Unknown locations fail safely to the homepage.
 */
function resolveVendorLinkUrl(software: SoftwareRecord, ctaLocation?: string): string {
  switch (ctaLocation) {
    case "pricing-source-link":
      return software.pricing?.officialSource ?? software.website;
    case "vendor-link-pricing":
      return software.links?.pricing ?? software.website;
    case "vendor-link-free-trial":
      return software.links?.trial ?? software.website;
    case "vendor-link-documentation":
      return software.links?.docs ?? software.website;
    case "vendor-link-support":
      return software.links?.support ?? software.website;
    case "vendor-link-integrations":
      return software.links?.integrations ?? software.website;
    case "vendor-link-status-page":
      return software.links?.status ?? software.website;
    case "vendor-link-community":
      return software.links?.community ?? software.website;
    case "vendor-link-current-deals":
      return software.links?.deals ?? software.website;
    case "vendor-link-enterprise-contact":
      return software.links?.enterprise ?? software.website;
    default:
      return software.website;
  }
}

export async function POST(request: NextRequest) {
  let body: OutboundClickBody;

  try {
    body = (await request.json()) as OutboundClickBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { slug, kind, ctaLocation, wixContext } = body;

  if (typeof slug !== "string") {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const software = getSoftware(slug);
  if (!software) {
    return NextResponse.json({ error: "unknown software slug" }, { status: 404 });
  }

  const sourcePage = resolveOutboundSourcePage(request.headers.get("referer"), request.nextUrl.origin, body.sourcePage);
  const resolvedCtaLocation = typeof ctaLocation === "string" ? ctaLocation : undefined;
  const visitorId = typeof body.visitorId === "string" ? body.visitorId : "v_anon";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "s_anon";
  // Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) Phase
  // 11: propagated to both the legacy outbound-click pipeline and first-party
  // analytics, so a synthetic QA click never gets counted as a real conversion.
  const isTest = body.isTest === true;
  // Experiment labels are descriptive only and never branch destination logic.
  const experimentId = typeof body.experimentId === "string" ? body.experimentId : undefined;
  const variant = typeof body.variant === "string" ? body.variant : undefined;
  const experimentFields = experimentId && variant ? { experimentId, variant } : {};

  if (kind === "vendor-link") {
    const url = resolveVendorLinkUrl(software, resolvedCtaLocation);
    await trackVendorLinkClick(software, url, sourcePage, isTest);

    const { recordFirstPartyEvent } = await import("@/lib/analytics/events");
    await recordFirstPartyEvent({
      type: "outbound_click",
      softwareSlug: software.slug,
      destination: "official",
      url,
      ctaLocation: resolvedCtaLocation || "vendor-link",
      path: sourcePage,
      visitorId,
      sessionId,
      timestamp: new Date().toISOString(),
      isTest,
      ...experimentFields,
    });
  } else {
    const url = slug === "wix" && isWixContext(wixContext) ? getWixAffiliateUrl(wixContext) : getSoftwareCtaUrl(software);
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
      isTest,
      ...experimentFields,
    });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}

export const __test__ = { resolveVendorLinkUrl };
