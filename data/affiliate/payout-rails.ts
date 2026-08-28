import type { ActivePartnerSlug } from "@/data/affiliate/active-partners";

export type PayoutRailId =
  | "partnerstack-hello"
  | "partnerstack-personal"
  | "impact"
  | "tapfiliate-setmore"
  | "mailerlite-tipalti";

export type PayoutRail = {
  id: PayoutRailId;
  label: string;
  accountIdentity: string;
  partnerSlugs: readonly ActivePartnerSlug[];
  readiness: "UNVERIFIED" | "OWNER_ACTION_REQUIRED" | "VERIFIED";
  ownerActionPackId: string;
  methodGuidance: string;
  notes: string;
};

/**
 * Canonical payout ownership for every currently active Miloosh affiliate.
 *
 * Payout ownership is account-specific, not only network-specific. Miloosh has
 * two evidenced PartnerStack account identities, so they are separate payout
 * rails even though both use PartnerStack. Never store any bank, tax, identity,
 * password, 2FA, or payout-provider secret here.
 */
export const PAYOUT_RAILS: readonly PayoutRail[] = [
  {
    id: "partnerstack-hello",
    label: "PartnerStack — Miloosh business account",
    accountIdentity: "hello@miloosh.com",
    partnerSlugs: [
      "constant-contact",
      "todoist",
      "moosend",
      "volza",
      "pipedrive",
      "getresponse",
      "airtable",
      "krispcall",
      "hubstaff",
      "close",
      "surveymonkey",
    ],
    readiness: "UNVERIFIED",
    ownerActionPackId: "partnerstack-hello-payout-rail",
    methodGuidance: "Prefer a real local Israeli bank through Airwallex if direct deposit is desired and the dashboard accepts it; otherwise use an actually available PayPal/Stripe option. Do not enter the Payoneer USD receiving account as Airwallex direct-deposit banking: PartnerStack says foreign-currency accounts and virtual banks are unsupported for that route.",
    notes: "PartnerStack Support explicitly confirmed that hello@miloosh.com is the account containing Airtable/Pipedrive partnerships and activity. First-party partner mail to hello@miloosh.com corroborates the other relationships assigned here. Dashboard payout readiness is not yet verified.",
  },
  {
    id: "partnerstack-personal",
    label: "PartnerStack — legacy/personal-email account",
    accountIdentity: "lahman00@gmail.com",
    partnerSlugs: ["monday", "whatconverts", "elevenlabs", "wrike"],
    readiness: "OWNER_ACTION_REQUIRED",
    ownerActionPackId: "partnerstack-personal-payout-rail",
    methodGuidance: "Do not replace or deactivate any of the four existing live tracking URLs, and do not re-apply to any program from Account #1, until PartnerStack confirms whether Account #2's existing links remain commission-payable despite the account-level decline. Verify the payout provider separately in this PartnerStack account once resolved. If direct deposit is used, the same Airwallex restrictions apply; Payoneer USD receiving details should not be used as Airwallex bank details.",
    notes: "MILOOSH SUPER MISSION (2026-08-27) -- PartnerStack Support (Nina R, ticket #121396, first-party reply 2026-08-26 19:37 EDT) confirmed this account's own network-level application status is DECLINED, even though it individually shows 'Partnered with' monday.com/WhatConverts/ElevenLabs/Wrike/Zendesk. PartnerStack's own recommendation: consolidate onto Account #1 (hello@miloosh.com, network-approved) and re-apply to these four programs from there; closing Account #2 was suggested but NOT executed -- this is an owner decision (risks losing the four existing referral links/tracking history if done before re-establishing them under Account #1). Do not close Account #2 or send any reply to PartnerStack without the owner's explicit direction. This does not change the four partnerships' ACTIVE status in the canonical ledger (their tracking URLs are still real and still resolve correctly on-site) -- it specifically means their PAYOUT path is now confirmed at risk, not merely unverified. UPDATE 2026-08-28: owner has now directly asked PartnerStack (a) whether Account #2's existing links remain commission-payable despite the decline, and (b) whether these programs can be re-applied for from Account #1 while Account #2's links stay active -- no reply yet, so no assumption is made either way. Direct migration/re-approval inquiries were also sent to ElevenLabs, WhatConverts, and monday.com individually. Wrike was not sent a separate inquiry in this update. ZENDESK GAP (found on re-audit): PartnerStack's portal shows Account #2 as 'Partnered with' Zendesk too, but Zendesk has never been added to this partnerSlugs list, has no canonical-ledger.ts entry, and no tracking URL for it has ever been verified or recorded anywhere in this repository -- Miloosh is not currently using any Zendesk affiliate link. Not added here or marked active because no tracking asset has been verified; flagged for the owner to check directly in the Account #2 dashboard. Zendesk is a real, high-relevance product for Miloosh (12 published Zoho Desk comparisons already reference it) if a real link is ever confirmed.",
  },
  {
    id: "impact",
    label: "Impact.com",
    accountIdentity: "Miloosh Impact publisher account",
    partnerSlugs: ["shopify", "wix", "omnisend"],
    readiness: "UNVERIFIED",
    ownerActionPackId: "impact-payout-rail",
    methodGuidance: "Prefer bank/EFT when the live account supports the desired currency and fees are acceptable. PayPal is a valid fallback but Impact currently documents a 2% processing fee, capped at the currency-equivalent of USD $20. Do not change working bank details casually because Impact places a security hold after updates.",
    notes: "Shopify, Wix, and Omnisend are active on the same Impact publisher rail; finance-profile readiness is not yet first-party verified.",
  },
  {
    id: "tapfiliate-setmore",
    label: "Setmore / Tapfiliate",
    accountIdentity: "Setmore affiliate account",
    partnerSlugs: ["setmore"],
    readiness: "OWNER_ACTION_REQUIRED",
    ownerActionPackId: "setmore-payout-method",
    methodGuidance: "Verify or update PayPal. Setmore's first-party welcome email explicitly tells the Miloosh affiliate to keep PayPal details updated in order to cash in. Do not substitute Payoneer merely because Tapfiliate supports it generically unless Setmore itself changes the payout instructions.",
    notes: "Prior verified Setmore onboarding state was Step 4, payout method; first-party Setmore email identifies PayPal as the payout detail that should be kept updated.",
  },
  {
    id: "mailerlite-tipalti",
    label: "MailerLite / Tipalti",
    accountIdentity: "MailerLite affiliate account",
    partnerSlugs: ["mailerlite"],
    readiness: "UNVERIFIED",
    ownerActionPackId: "mailerlite-tipalti-payout",
    methodGuidance: "Prefer PayPal when operationally acceptable: MailerLite's current affiliate page says it covers PayPal transaction fees, while Direct Deposit and Wire Transfer fees are borne by the affiliate. Use another method only if the live Tipalti flow or owner preference makes it preferable.",
    notes: "MailerLite is active; payout-profile completion inside its Trackdesk/Tipalti flow remains unverified.",
  },
] as const;

const PAYOUT_RAIL_BY_PARTNER = new Map<ActivePartnerSlug, PayoutRail>();
for (const rail of PAYOUT_RAILS) {
  for (const slug of rail.partnerSlugs) PAYOUT_RAIL_BY_PARTNER.set(slug, rail);
}

export function getPayoutRailForPartner(slug: ActivePartnerSlug): PayoutRail {
  const rail = PAYOUT_RAIL_BY_PARTNER.get(slug);
  if (!rail) throw new Error(`No payout rail configured for active partner: ${slug}`);
  return rail;
}
