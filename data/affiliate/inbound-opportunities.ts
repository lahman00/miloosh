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
      "Current official Buddy Punch partners page independently confirms 20% of every sale for the first 12 months",
    ],
    inviteUrl: "https://dash.partnerstack.com/invite/1e1bb359a25149fdb7890c62bc11f3fb",
    headlineOffer: "20% recurring commission (direct invitation wording)",
    verifiedPublicEconomics: "Buddy Punch's current public partners page states 20% of every sale for the first 12 months",
    publicTermsUrl: "https://buddypunch.com/partners/",
    affiliateUrl: null,
    acceptedAt: null,
    ownerAcceptanceRequired: true,
    nextAction: "Wait for James Powell to confirm current content/comparison-publisher eligibility and current PartnerStack attribution, restriction, payout, and geography terms. Do not accept the invitation until those terms are reviewed.",
    notes: "No Buddy Punch software record currently exists in Miloosh. Do not create a catalog product solely to activate an affiliate invitation. A legacy official Affiliate Guidelines PDF is publicly accessible but is too old to treat as current policy without vendor confirmation.",
  },
  {
    id: "trainual-2026-08-24",
    vendorName: "Trainual",
    catalogSlug: "trainual",
    network: "PartnerStack",
    status: "TERMS_REVIEW",
    receivedAt: "2026-08-24",
    sourceEvidence: [
      "Direct PartnerStack invitation email to hello@miloosh.com from Tom Healy at Trainual describing tiered commissions and inviting Miloosh to join",
      "Miloosh replied in-thread on 2026-08-25 requesting current content/comparison-publisher eligibility, commission tiers, attribution, payout, restrictions, and geography details before activation",
      "Current official Trainual affiliate page states a public baseline of 10% recurring commission, lifetime while the referred account remains active, subject to the affiliate remaining active each year",
      "Current official Trainual affiliate page states a 90-day cookie and monthly rewards paid the following month through PartnerStack, with PayPal or Stripe and alternatives for non-PayPal regions",
      "Current Trainual Terms prohibit affiliate use of spam and coupon or discounting websites",
    ],
    inviteUrl: "https://dash.partnerstack.com/invite/0a4fcf940e5b4a6a9278f868544f1d7b",
    headlineOffer: "Tiered commissions (direct invitation wording; exact tiers not stated in the email)",
    verifiedPublicEconomics: "Trainual's current public affiliate page states 10% recurring commission for the lifetime of the referred account, provided the affiliate remains active by referring someone new at least once every 12 months; 90-day cookie",
    publicTermsUrl: "https://trainual.com/affiliate",
    affiliateUrl: null,
    acceptedAt: null,
    ownerAcceptanceRequired: true,
    nextAction: "Wait for Tom Healy to reconcile the invitation's tiered-commission wording with the public 10% recurring baseline and confirm current publisher eligibility and promotional restrictions. Do not accept the invitation until those terms are reviewed.",
    notes: "data/software/trainual.json already exists as a real, published Miloosh catalog entry (knowledge-base category) -- this was a stale note from before that page existed, not a current blocker. The official public page explicitly welcomes tech bloggers and other audience publishers, but the direct invitation may contain newer or partner-specific tier economics, so the emailed confirmation remains the controlling unresolved item before activation.",
  },
  {
    id: "flippa-2026-08-21",
    vendorName: "Flippa",
    catalogSlug: null,
    network: "PartnerStack",
    status: "TERMS_REVIEW",
    receivedAt: "2026-08-21",
    sourceEvidence: [
      "Direct PartnerStack invitation email to hello@miloosh.com from Tory Gregory at Flippa offering 20% commission when referrals buy, sell, or list a business",
      "Current official Flippa Affiliate Program Agreement defines affiliate Commission as 15% of Customer Revenue and a 30-day registration attribution window, creating a material conflict with the invitation's 20% wording",
      "Current separate Flippa Referral Program Terms describe 20% incentives for certain acquisition, listing, and sale actions, which may be a different program from the PartnerStack affiliate invitation",
      "Miloosh replied in-thread on 2026-08-26 asking Flippa to identify the controlling program/terms and confirm publisher eligibility, attribution, restrictions, payout, and geography before acceptance",
    ],
    inviteUrl: "https://dash.partnerstack.com/invite/3ea324870264465aaf51c170301cbbef",
    headlineOffer: "20% commission when referrals buy, sell, or list a business (direct invitation wording)",
    verifiedPublicEconomics: "Current official Affiliate Program Agreement says 15% of Customer Revenue, with registration required within 30 days of first click and qualifying transactions within 90 days of registration; separate Referral Program Terms describe 20% incentives, so the controlling economics for this invitation remain unresolved",
    publicTermsUrl: "https://flippa.com/terms-of-service/flippa-affiliate-program-agreement/",
    affiliateUrl: null,
    acceptedAt: null,
    ownerAcceptanceRequired: true,
    nextAction: "Wait for Tory Gregory to reconcile the direct invitation's 20% wording with Flippa's current 15% Affiliate Program Agreement and confirm that independent editorial content publishers with primarily U.S. audience traffic are eligible. Do not accept the invitation until the controlling terms are clear.",
    notes: "No Flippa software record currently exists in Miloosh, and Flippa is an online-business marketplace rather than a conventional software product. Do not manufacture a catalog entry solely to monetize the invitation. Any future placement must be limited to genuinely relevant founder, SaaS acquisition/exit, or digital-business content and remain editorially independent.",
  },
] as const;