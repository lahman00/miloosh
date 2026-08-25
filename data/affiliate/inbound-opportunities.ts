export type InboundAffiliateOpportunityStatus =
  | "TERMS_REVIEW"
  | "READY_FOR_OWNER_ACCEPTANCE"
  | "DECLINED"
  | "CLOSED";

export type InboundAffiliateOpportunity = {
  id: string;
  vendorName: string;
  catalogSlug: string | null;
  network: string;
  status: InboundAffiliateOpportunityStatus;
  receivedAt: string;
  sourceEvidence: string[];
  inviteUrl: string | null;
  headlineOffer: string;
  verifiedPublicEconomics: string | null;
  publicTermsUrl: string | null;
  affiliateUrl: string | null;
  acceptedAt: string | null;
  ownerAcceptanceRequired: boolean;
  nextAction: string;
  notes: string;
};

/**
 * Direct inbound commercial opportunities that do not yet belong in the
 * canonical product/program ledger. Keeping them here prevents a vendor invite
 * from being lost while also preventing "invited" from being mistaken for
 * "accepted", "active", or a reason to manufacture a catalog product.
 */
export const INBOUND_AFFILIATE_OPPORTUNITIES: readonly InboundAffiliateOpportunity[] = [
  {
    id: "buddy-punch-2026-08-25",
    vendorName: "Buddy Punch",
    catalogSlug: null,
    network: "PartnerStack",
    status: "TERMS_REVIEW",
    receivedAt: "2026-08-25",
    sourceEvidence: [
      "Direct email to hello@miloosh.com from James Powell, Partnership Manager at Buddy Punch, offering 20% recurring commission and a PartnerStack invitation",
      "Miloosh replied in-thread on 2026-08-25 requesting current publisher eligibility, attribution, recurring-duration, restrictions, payout, and geography details before activation",
    ],
    inviteUrl: "https://dash.partnerstack.com/invite/1e1bb359a25149fdb7890c62bc11f3fb",
    headlineOffer: "20% recurring commission (direct invitation wording)",
    verifiedPublicEconomics: "Buddy Punch's current public partnerships page states 20% of every sale for the first 12 months",
    publicTermsUrl: "https://buddypunch.com/partnerships/",
    affiliateUrl: null,
    acceptedAt: null,
    ownerAcceptanceRequired: true,
    nextAction: "Wait for James Powell to confirm current content/comparison-publisher eligibility and current PartnerStack attribution, restriction, payout, and geography terms. Do not accept the invitation until those terms are reviewed.",
    notes: "No Buddy Punch software record currently exists in Miloosh. Do not create a catalog product solely to activate an affiliate invitation.",
  },
] as const;
