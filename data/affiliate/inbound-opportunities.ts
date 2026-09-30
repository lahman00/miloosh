export type InboundAffiliateOpportunityStatus =
  | "ACCEPTED_NOT_ACTIVATED"
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
    "id": "cloro-migration-2026-09-27",
    "vendorName": "Cloro",
    "catalogSlug": null,
    "network": "FirstPromoter (replacement; PartnerStack route retired)",
    "status": "TERMS_REVIEW",
    "receivedAt": "2026-09-27",
    "sourceEvidence": [
      "Gmail 1a0e245d336e8be1: vendor migration notice from Ric, read 2026-09-30"
    ],
    "inviteUrl": null,
    "headlineOffer": "Vendor email: 40% of payments for 12 months, not yet accepted account terms",
    "verifiedPublicEconomics": null,
    "publicTermsUrl": null,
    "affiliateUrl": null,
    "acceptedAt": null,
    "ownerAcceptanceRequired": true,
    "nextAction": "Review the exact program/account terms and editorial fit; retrieve an issued asset only after authorized acceptance. Do not auto-apply or promote.",
    "notes": "The vendor explicitly says affiliate.cloro.dev links no longer track. No such link was found in the inspected live affiliate surfaces. Obtain a real replacement asset and account terms before reactivating; preserve the historical signup as a signup, not revenue."
  },
  {
    "id": "catalister-2026-09-29",
    "vendorName": "Catalister",
    "catalogSlug": null,
    "network": "PartnerStack",
    "status": "TERMS_REVIEW",
    "receivedAt": "2026-09-29",
    "sourceEvidence": [
      "Gmail 1a0ed2f2f0d26823: direct invitation addressed to hello@miloosh.com"
    ],
    "inviteUrl": null,
    "headlineOffer": "Invitation headline only: up to USD 17 recurring per membership and up to USD 131 per credit purchase",
    "verifiedPublicEconomics": null,
    "publicTermsUrl": null,
    "affiliateUrl": null,
    "acceptedAt": null,
    "ownerAcceptanceRequired": true,
    "nextAction": "Review the exact program/account terms and editorial fit; retrieve an issued asset only after authorized acceptance. Do not auto-apply or promote.",
    "notes": "Invitation is not acceptance, a verified payable offer, or a reason to add a new catalog product. No invitation accepted during audit."
  },
  {
    "id": "mrpeasy-2026-09-17",
    "vendorName": "MRPeasy",
    "catalogSlug": null,
    "network": "PartnerStack",
    "status": "TERMS_REVIEW",
    "receivedAt": "2026-09-17",
    "sourceEvidence": [
      "Gmail 1a0aff2a7020da1e: invitation from Marko Karner via PartnerStack"
    ],
    "inviteUrl": null,
    "headlineOffer": "Invitation headline only: 20% recurring for up to three years",
    "verifiedPublicEconomics": null,
    "publicTermsUrl": null,
    "affiliateUrl": null,
    "acceptedAt": null,
    "ownerAcceptanceRequired": true,
    "nextAction": "Review the exact program/account terms and editorial fit; retrieve an issued asset only after authorized acceptance. Do not auto-apply or promote.",
    "notes": "The message addresses implementation and referral partners; qualify the editorial publisher route without offering implementation or calls. No new product or application created during audit."
  },

  {
    id: "buddy-punch-2026-08-25",
    vendorName: "Buddy Punch",
    catalogSlug: null,
    network: "PartnerStack",
    status: "ACCEPTED_NOT_ACTIVATED",
    receivedAt: "2026-08-25",
    sourceEvidence: [
      "Vendor welcome Gmail 1a0f2363f6cc8396, 2026-09-30, plus owner confirmation of accepted terms and PartnerStack Links screenshot 2026-09-30 15.18.35 showing the exact default asset.",
      "Direct email to hello@miloosh.com from James Powell, Partnership Manager at Buddy Punch, offering 20% recurring commission and a PartnerStack invitation",
      "Miloosh replied in-thread on 2026-08-25 requesting current publisher eligibility, attribution, recurring-duration, restrictions, payout, and geography details before activation",
      "Current official Buddy Punch partners page independently confirms 20% of every sale for the first 12 months",
    ],
    inviteUrl: "https://dash.partnerstack.com/invite/1e1bb359a25149fdb7890c62bc11f3fb",
    headlineOffer: "20% recurring commission (direct invitation wording)",
    verifiedPublicEconomics: "Buddy Punch's current public partners page states 20% of every sale for the first 12 months",
    publicTermsUrl: "https://buddypunch.com/partners/",
    affiliateUrl: "https://try.buddypunch.com/8nzdz9riy7v0",
    acceptedAt: "2026-09-30",
    ownerAcceptanceRequired: false,
    nextAction: "Already accepted by the owner. Preserve issued asset; do not resubmit or regenerate. Keep commercial activation off until a distinct, evidence-led catalog decision and any required payout verification.",
    notes: "No Buddy Punch software record currently exists in Miloosh. Do not create a catalog product solely to activate an affiliate invitation. Owner supplied and accepted the actual portal terms on 2026-09-30. Historical marketing research is not the assigned private commission contract.",
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
] as const;
