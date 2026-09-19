import type { Software } from "@/data/software";
import { shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { recordOutboundEvent, type OutboundEvent } from "@/lib/revenue/events";
import { WIX_FUNNELS } from "@/lib/wix-funnels";

/**
 * Sprint 8 Phase 4 (architecture) / Sprint 9 Task 6 (wired in) — Click
 * Tracker. The capture layer that turns "a user clicked this software's
 * CTA" into an OutboundEvent, sitting on top of lib/affiliate.ts (which
 * already knows — including any Sprint 9 activation — whether a given
 * software resolves to an official or affiliate URL) and
 * lib/revenue/events.ts (which decides whether anything actually gets
 * recorded, and where). Called from app/api/outbound-click/route.ts,
 * which itself is only reachable via components/TrackedCtaLink.tsx.
 */

/**
 * 2026-08-17 — resolves the structured affiliate dimensions (network,
 * program, funnel, campaign) from the FINAL resolved URL rather than
 * trusting anything the client sent — the same "recompute server-side"
 * discipline the rest of this module already follows. Currently only
 * Wix has more than one funnel; this is intentionally a small, direct
 * lookup rather than a generic multi-vendor registry, since no other
 * program needs it yet (see lib/wix-funnels.ts's own header for why that
 * restraint is deliberate, not an oversight).
 */
function resolveAffiliateDimensions(slug: string, url: string): Pick<OutboundEvent, "affiliateProgram" | "affiliateFunnel" | "campaignId" | "network"> {
  if (slug === "wix") {
    const funnel = Object.values(WIX_FUNNELS).find((f) => f.url === url);
    if (funnel) {
      return { affiliateProgram: "wix", affiliateFunnel: funnel.context, campaignId: funnel.campaignId, network: "impact" };
    }
  }
  return {};
}

export async function trackSoftwareCtaClick(software: Software, resolvedUrl: string, sourcePage: string, ctaLocation?: string, isTest?: boolean): Promise<void> {
  const isAffiliate = shouldShowAffiliateDisclosure(software);

  const event: OutboundEvent = {
    type: isAffiliate ? "affiliate_link_click" : "official_site_click",
    softwareSlug: software.slug,
    destination: isAffiliate ? "affiliate" : "official",
    url: resolvedUrl,
    ctaLocation,
    isTest,
    ...(isAffiliate ? resolveAffiliateDimensions(software.slug, resolvedUrl) : {}),
  };

  await recordOutboundEvent(event, sourcePage);
}

export async function trackVendorLinkClick(software: Software, url: string, sourcePage: string, ctaLocation?: string, isTest?: boolean): Promise<void> {
  await recordOutboundEvent(
    {
      type: "vendor_link_click",
      softwareSlug: software.slug,
      destination: "official",
      url,
      ctaLocation,
      isTest,
    },
    sourcePage
  );
}
