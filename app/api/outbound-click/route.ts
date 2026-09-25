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
const KNOWN_CTA_LOCATIONS = new Set([
  "software-page-cta",
  "buyer-checklist-cta",
  "pricing-section-cta",
  "alternative-decision-guide",
  "compare-page-choose-card",
  "role-guide-card-cta",
  "role-guide-summary-table",
  "money-page-decision-card",
  "money-page-sticky-cta",
  "pricing-source-link",
  "vendor-link-pricing",
  "vendor-link-free-trial",
  "vendor-link-documentation",
  "vendor-link-support",
  "vendor-link-integrations",
  "vendor-link-status-page",
  "vendor-link-community",
  "vendor-link-current-deals",
  "vendor-link-enterprise-contact",
  "vendor-link",
]);

function normalizeCtaLocation(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return KNOWN_CTA_LOCATIONS.has(value) ? value : "unknown-cta-location";
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

export const __test__ = { resolveVendorLinkUrl, normalizeCtaLocation, KNOWN_CTA_LOCATIONS };
