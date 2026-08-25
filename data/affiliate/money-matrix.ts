import { getComparisonsInvolving } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getPayoutRailForPartner } from "@/data/affiliate/payout-rails";

export type PartnerMoneyMatrixRow = {
  partner: string;
  slug: string;
  status: "active";
  url: string | null;
  coverage: { softwareRoute: string; comparisonRoutes: number };
  cta: string;
  tracking: boolean;
  disclosure: boolean;
  technicalPathReady: boolean;
  payoutReadiness: "UNVERIFIED" | "OWNER_ACTION_REQUIRED" | "VERIFIED";
  /** End-to-end readiness: technical affiliate path AND payout profile verified. */
  revenueReady: boolean;
  blocker: string | null;
  nextAction: string;
};

export function getPartnerMoneyMatrix(): PartnerMoneyMatrixRow[] {
  return ACTIVE_PARTNERS.map((partner) => {
    const software = getSoftware(partner.slug);
    if (!software) throw new Error(`Active affiliate partner has no software record: ${partner.slug}`);

    const url = partner.affiliateUrl;
    const disclosure = shouldShowAffiliateDisclosure(software);
    const sponsored = getSoftwareCtaRel(software) === "sponsored noopener noreferrer";
    const tracking = true; // Both software and comparison CTAs use TrackedCtaLink.
    const technicalPathReady = Boolean(url && disclosure && sponsored && tracking && getSoftwareCtaUrl(software) === url);
    const payoutRail = getPayoutRailForPartner(partner.slug);
    const payoutReadiness = payoutRail.readiness;
    const revenueReady = technicalPathReady && payoutReadiness === "VERIFIED";

    let blocker: string | null = partner.blocker;
    let nextAction: string;

    if (!url) {
      blocker = blocker ?? "No verified personalized affiliate URL is configured.";
      nextAction = `Obtain and verify a personalized affiliate URL for ${software.name}, then add it to the canonical registry.`;
    } else if (!technicalPathReady) {
      blocker = blocker ?? "Affiliate CTA, disclosure, rel, tracking, or resolved URL failed the technical readiness gate.";
      nextAction = "Repair the technical affiliate path before driving additional commercial traffic.";
    } else if (payoutReadiness !== "VERIFIED") {
      blocker = blocker ?? `Payout profile ${payoutRail.label} is ${payoutReadiness}; end-to-end revenue readiness is not proven.`;
      nextAction = `Verify the account-level payout profile in ${payoutRail.label}; do not treat a working CTA as payout-ready.`;
    } else {
      nextAction = "Technical path and payout profile are verified; monitor qualified outbound clicks, network conversions, commissions, and received payouts.";
    }

    return {
      partner: software.name,
      slug: partner.slug,
      status: partner.status,
      url,
      coverage: {
        softwareRoute: `/software/${partner.slug}`,
        comparisonRoutes: getComparisonsInvolving(partner.slug).length,
      },
      cta: url ? `Visit ${software.name}` : "Visit official site",
      tracking,
      disclosure,
      technicalPathReady,
      payoutReadiness,
      revenueReady,
      blocker,
      nextAction,
    };
  });
}
