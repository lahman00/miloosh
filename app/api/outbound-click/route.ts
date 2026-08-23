import { NextResponse, type NextRequest } from "next/server";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaUrl } from "@/lib/affiliate";
import { trackSoftwareCtaClick, trackVendorLinkClick } from "@/lib/revenue/click-tracker";
import { WIX_CONTEXTS, getWixAffiliateUrl, type WixFunnelContext } from "@/lib/wix-funnels";

/**
 * Sprint 9 Task 6 — the only entry point components/TrackedCtaLink.tsx
 * talks to. Deliberately trusts nothing the client sends except which
 * software, which page, which UI location, and (for Wix) which funnel
 * context — the actual destination URL and whether it's an affiliate
 * link are recomputed here from server-side data (lib/affiliate.ts,
 * lib/wix-funnels.ts), not taken from the request body. `wixContext` is
 * validated against the known context list before use, so a malformed
 * or spoofed value can never route to an unintended URL — it just falls
 * through to the safe default. Recording itself is a no-op unless
 * NEXT_PUBLIC_REVENUE_TRACKING_ENABLED=true.
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
  let body: OutboundClickBody;

  try {
    body = (await request.json()) as OutboundClickBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { slug, kind, sourcePage, ctaLocation, wixContext } = body;

  if (typeof slug !== "string" || typeof sourcePage !== "string") {
    return NextResponse.json({ error: "slug and sourcePage are required strings" }, { status: 400 });
  }

  const software = getSoftware(slug);
  if (!software) {
    return NextResponse.json({ error: "unknown software slug" }, { status: 404 });
  }

  const resolvedCtaLocation = typeof ctaLocation === "string" ? ctaLocation : undefined;
  const visitorId = typeof body.visitorId === "string" ? body.visitorId : "v_anon";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "s_anon";
  // Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) Phase
  // 11: propagated to both the legacy outbound-click pipeline (lib/revenue/
  // events.ts) and first-party analytics, so a synthetic QA click never
  // gets counted as a real conversion in either system.
  const isTest = body.isTest === true;
  // MILOOSH CTA CONVERSION OPTIMIZATION MISSION (2026-08-23) — present only
  // for a click on a CTA under active experimentation; the server trusts
  // these as opaque labels only (never used to branch destination logic),
  // same trust posture as ctaLocation.
  const experimentId = typeof body.experimentId === "string" ? body.experimentId : undefined;
  const variant = typeof body.variant === "string" ? body.variant : undefined;
  const experimentFields = experimentId && variant ? { experimentId, variant } : {};

  if (kind === "vendor-link") {
    await trackVendorLinkClick(software, software.website, sourcePage, isTest);

    // Also record into first-party analytics event store
    const { recordFirstPartyEvent } = await import("@/lib/analytics/events");
    await recordFirstPartyEvent({
      type: "outbound_click",
      softwareSlug: software.slug,
      destination: "official",
      url: software.website,
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

    // Also record into first-party analytics event store
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
