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
    "status": "ACCEPTED_NOT_ACTIVATED",
    "receivedAt": "2026-09-17",
    "sourceEvidence": [
      "Gmail 1a0aff2a7020da1e: invitation from Marko Karner via PartnerStack",
      "First-party PartnerStack welcome Gmail 1a0f2363ffd9d6fb dated 2026-09-30: confirms Miloosh joined and supplies exact referral URL https://try.mrpeasy.com/rlmf8edfjcie.",
      "Current first-party MRPeasy program terms reviewed 2026-10-01 expose eligibility, payout-identity, seven-day placement, content-permission and USD 5,000 breach-fine questions; written clarification sent as Gmail 1a0f46ca9713bbb4."
    ],
    "inviteUrl": null,
    "headlineOffer": "Invitation headline: 20% recurring for up to three years; assigned private offer not independently re-read after acceptance",
    "verifiedPublicEconomics": null,
    "publicTermsUrl": "https://www.mrpeasy.com/terms-of-referral-partner-program",
    "affiliateUrl": "https://try.mrpeasy.com/rlmf8edfjcie",
    "acceptedAt": "2026-09-30",
    "ownerAcceptanceRequired": false,
    "nextAction": "Keep public activation off while awaiting the written eligibility, payout-identity, independent-content, seven-day deadline and assigned-commission clarification sent 2026-10-01. Do not create a catalog page solely because the referral relationship exists.",
    "notes": "Approved relationship and exact link are evidenced, but the current terms create material unresolved obligations. Miloosh has no MRPeasy catalog page or comparison route, so the link is not added to ACTIVE_PARTNERS and no ranking, traffic, conversion, commission or payout is claimed. Canonical relationship state is HOLD."
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
    status: "CLOSED",
    receivedAt: "2026-08-24",
    sourceEvidence: [
      "Direct PartnerStack invitation email to hello@miloosh.com from Tom Healy at Trainual.",
      "Official Trainual affiliate page and terms: public 10% recurring baseline, 90-day cookie, activity requirement and PartnerStack payout path.",
      "First-party Trainual welcome Gmail 1a0f2363e2a1521e dated 2026-09-30 issuing https://start.trainual.com/0j9to92n49iy."
    ],
    inviteUrl: "https://dash.partnerstack.com/invite/0a4fcf940e5b4a6a9278f868544f1d7b",
    headlineOffer: "Tiered commissions were described in the invitation; private assigned tier remains unverified",
    verifiedPublicEconomics: "Trainual's public page states a 10% recurring baseline, 90-day cookie and annual referral-activity requirement",
    publicTermsUrl: "https://trainual.com/affiliate",
    affiliateUrl: "https://start.trainual.com/0j9to92n49iy",
    acceptedAt: "2026-09-30",
    ownerAcceptanceRequired: false,
    nextAction: "Resolved into the canonical ACTIVE relationship and exact-link registry. Maintain truthful disclosure and verify payout readiness separately.",
    notes: "Existing Trainual editorial coverage predated affiliate activation. No private tier, conversion, commission or payout is inferred from the welcome email."
  },
] as const;
