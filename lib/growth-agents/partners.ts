import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { getPartnerMoneyMatrix } from "@/data/affiliate/money-matrix";
import { NETWORK_PERFORMANCE_SIGNALS } from "@/data/affiliate/network-performance-signals";
import { getPayoutRailForPartner } from "@/data/affiliate/payout-rails";
import { getComparisonSlug, getComparisonsInvolving } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { comparisonUrl, softwareUrl } from "./urls";

/**
 * Read-only view of the repository's affiliate registries, reduced to the
 * facts the Affiliate Revenue Agent reasons about.
 *
 * Deliberately NOT carried: affiliate URLs, referral ids and any account
 * identifier. The agent needs to know a link is issued, locked or missing,
 * never what it is, and its reports are committed to a public repository.
 */

export type PartnerFacts = {
  slug: string;
  name: string;
  /** Row exists in the canonical active registry. */
  registryActive: boolean;
  /** The registry holds an issued, non-null link for this partner. */
  issuedLinkPresent: boolean;
  /** Program terms forbid appending Miloosh tracking parameters to the issued link. */
  trackingLocked: boolean;
  /** The current ledger holds exactly one ACTIVE relationship for this product with the same link as the registry. */
  ledgerAgrees: boolean;
  ledgerStatus: string | null;
  approvalEvidenceItems: number;
  network: string | null;
  payout: { railId: string; railLabel: string; readiness: "VERIFIED" | "UNVERIFIED" | "OWNER_ACTION_REQUIRED"; ownerActionPackId: string };
  /** Link, disclosure, sponsored rel and tracked CTA all resolve (the repository's own matrix). */
  technicalPathReady: boolean;
  disclosureShown: boolean;
  /** Technical path AND payout profile verified. Says nothing about conversions or commissions. */
  revenueReady: boolean;
  /** Hand-entered vendor or network observations. They prove neither conversions nor revenue. */
  networkSignals: Array<{ observedAt: string; signal: string; clickFloor: number | null }>;
  softwarePageUrl: string;
  comparisonPageUrls: string[];
};

export function loadPartnerFacts(): PartnerFacts[] {
  const matrix = new Map(getPartnerMoneyMatrix().map((row) => [row.slug, row]));
  return ACTIVE_PARTNERS.map((partner) => {
    const software = getSoftware(partner.slug);
    const relationships = CURRENT_AFFILIATE_LEDGER.filter((r) => r.productSlugs.includes(partner.slug) && r.status === "ACTIVE");
    const relationship = relationships.length === 1 ? relationships[0]! : null;
    const rail = getPayoutRailForPartner(partner.slug);
    const row = matrix.get(partner.slug);
    return {
      slug: partner.slug,
      name: software?.name ?? partner.slug,
      registryActive: partner.status === "active",
      issuedLinkPresent: Boolean(partner.affiliateUrl),
      trackingLocked: partner.allowAdditionalTrackingParams === false,
      ledgerAgrees: Boolean(relationship && relationship.affiliateUrl && relationship.affiliateUrl === partner.affiliateUrl),
      ledgerStatus: relationship?.status ?? null,
      approvalEvidenceItems: relationship?.evidence.length ?? 0,
      network: relationship?.network ?? null,
      payout: { railId: rail.id, railLabel: rail.label, readiness: rail.readiness, ownerActionPackId: rail.ownerActionPackId },
      technicalPathReady: row?.technicalPathReady ?? false,
      disclosureShown: row?.disclosure ?? false,
      revenueReady: row?.revenueReady ?? false,
      networkSignals: NETWORK_PERFORMANCE_SIGNALS.filter((s) => s.partnerSlug === partner.slug).map((s) => ({ observedAt: s.observedAt, signal: s.signal, clickFloor: s.clickFloor })),
      softwarePageUrl: softwareUrl(partner.slug),
      comparisonPageUrls: getComparisonsInvolving(partner.slug).map(([a, b]) => comparisonUrl(getComparisonSlug(a, b))).sort(),
    };
  });
}
