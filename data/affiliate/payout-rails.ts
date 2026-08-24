import type { ActivePartnerSlug } from "@/data/affiliate/active-partners";

export type PayoutRailId = "partnerstack" | "impact" | "tapfiliate-setmore" | "mailerlite-tipalti";

export type PayoutRail = {
  id: PayoutRailId;
  label: string;
  partnerSlugs: readonly ActivePartnerSlug[];
  readiness: "UNVERIFIED" | "OWNER_ACTION_REQUIRED" | "VERIFIED";
  ownerActionPackId: string;
  methodGuidance: string;
  notes: string;
};

/**
 * Canonical payout ownership for every currently active Miloosh affiliate.
 *
 * This is intentionally separate from commission eligibility. A relationship
 * can be active and still have an unverified payout profile. Never store any
 * bank, tax, identity, password, 2FA, or payout-provider secret here.
 */
export const PAYOUT_RAILS: readonly PayoutRail[] = [
  {
    id: "partnerstack",
    label: "PartnerStack",
    partnerSlugs: [
      "constant-contact",
      "todoist",
      "moosend",
      "volza",
      "pipedrive",
      "getresponse",
      "airtable",
      "monday",
      "whatconverts",
      "elevenlabs",
      "krispcall",
      "hubstaff",
      "close",
      "surveymonkey",
    ],
    readiness: "UNVERIFIED",
    ownerActionPackId: "partnerstack-payout-rail",
    methodGuidance: "Prefer a real local Israeli bank through Airwallex if direct deposit is desired and the dashboard accepts it; otherwise use an actually available PayPal/Stripe option. Do not enter the Payoneer USD receiving account as Airwallex direct-deposit banking: PartnerStack says foreign-currency accounts and virtual banks are unsupported for that route.",
    notes: "One network-level payout configuration should service all fourteen active PartnerStack relationships; dashboard readiness is not yet first-party verified.",
  },
  {
    id: "impact",
    label: "Impact.com",
    partnerSlugs: ["shopify", "wix", "omnisend"],
    readiness: "UNVERIFIED",
    ownerActionPackId: "impact-payout-rail",
    methodGuidance: "Prefer bank/EFT when the live account supports the desired currency and fees are acceptable. PayPal is a valid fallback but Impact currently documents a 2% processing fee, capped at the currency-equivalent of USD $20. Do not change working bank details casually because Impact places a security hold after updates.",
    notes: "Shopify, Wix, and Omnisend are active on the same Impact publisher rail; finance-profile readiness is not yet first-party verified.",
  },
  {
    id: "tapfiliate-setmore",
    label: "Setmore / Tapfiliate",
    partnerSlugs: ["setmore"],
    readiness: "OWNER_ACTION_REQUIRED",
    ownerActionPackId: "setmore-payout-method",
    methodGuidance: "Verify or update PayPal. Setmore's first-party welcome email explicitly tells the Miloosh affiliate to keep PayPal details updated in order to cash in. Do not substitute Payoneer merely because Tapfiliate supports it generically unless Setmore itself changes the payout instructions.",
    notes: "Prior verified Setmore onboarding state was Step 4, payout method; first-party Setmore email identifies PayPal as the payout detail that should be kept updated.",
  },
  {
    id: "mailerlite-tipalti",
    label: "MailerLite / Tipalti",
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
