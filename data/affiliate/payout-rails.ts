import type { ActivePartnerSlug } from "@/data/affiliate/active-partners";

export type PayoutRailId =
  | "partnerstack-hello"
  | "partnerstack-personal"
  | "impact"
  | "tapfiliate-setmore"
  | "mailerlite-tipalti"
  | "jotform-direct";

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
    readiness: "UNVERIFIED",
    ownerActionPackId: "partnerstack-personal-payout-rail",
    methodGuidance: "Verify the payout provider separately in this PartnerStack account. Do not assume the business-account payout configuration carries over. If direct deposit is used, the same Airwallex restrictions apply; Payoneer USD receiving details should not be used as Airwallex bank details.",
    notes: "First-party monday.com application mail, WhatConverts/ElevenLabs affiliate mail, and the 2026-08-25 Wrike PartnerStack welcome/onboarding emails are tied to lahman00@gmail.com. This makes it a separate account-level payout checkpoint from hello@miloosh.com. Wrike payout readiness remains unverified until the live payout profile is checked.",
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
  {
    id: "jotform-direct",
    label: "Jotform Affiliate Program",
    accountIdentity: "Jotform partner account Eyal_hello",
    partnerSlugs: ["jotform"],
    readiness: "UNVERIFIED",
    ownerActionPackId: "jotform-payout-verification",
    methodGuidance: "Use only the payout method actually offered inside the existing Jotform partnership dashboard. Do not infer a method, threshold, tax status, or payout readiness from the tracking-link approval alone.",
    notes: "Jotform is technically active with vendor-issued partner=miloosh links, but payout settings have not been independently verified. Keep revenue readiness separate from link readiness.",
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
