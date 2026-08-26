import {
  CANONICAL_AFFILIATE_LEDGER as BASE_CANONICAL_AFFILIATE_LEDGER,
  type AffiliateProgramRelationship,
} from "./canonical-ledger-base";

export type { CanonicalLedgerStatus, AffiliateProgramRelationship } from "./canonical-ledger-base";

/**
 * Current canonical relationship added after the original consolidated ledger.
 * Keeping the historical base intact avoids rewriting a large evidence ledger
 * while still making current active-partner invariants exact and testable.
 */
const JOTFORM_AFFILIATE_RELATIONSHIP: AffiliateProgramRelationship = {
  programId: "jotform-affiliate",
  programName: "Jotform Affiliate Program",
  network: "Direct",
  productSlugs: ["jotform"],
  status: "ACTIVE",
  statusUpdatedAt: "2026-08-26",
  applicationSubmittedAt: "2026-08-18",
  decisionAt: "2026-08-19",
  affiliateUrl: "https://www.jotform.com/?partner=miloosh",
  commissionModel: "30% commission on every new paid user for the first 12 months of the referred customer's subscription; commissions have a 60-day qualification period before becoming payable",
  cookieWindow: null,
  evidence: [
    "First-party Jotform application receipt dated 2026-08-18",
    "First-party email from Anna Scheucher, Jotform Affiliate Marketing Specialist, confirming approval on 2026-08-19",
    "First-party email from Anna on 2026-08-26 supplying https://www.jotform.com/?partner=miloosh and https://www.jotform.com/pricing/?partner=miloosh",
    "data/affiliate/active-partners.ts",
  ],
  ownerBlocker: null,
  formBlocker: null,
  eligibility: "Approved Jotform affiliate publisher with account-specific tracking assets supplied directly by Jotform Partnerships",
  applicationUrl: "https://www.jotform.com/partnership/affiliate/application/",
  notes: "Active with vendor-issued partner=miloosh tracking. The known 60-day period is commission qualification, not a verified attribution-cookie window. Affiliate status must not change Jotform editorial ranking.",
};

export const CANONICAL_AFFILIATE_LEDGER: readonly AffiliateProgramRelationship[] = [
  ...BASE_CANONICAL_AFFILIATE_LEDGER,
  JOTFORM_AFFILIATE_RELATIONSHIP,
] as const;
