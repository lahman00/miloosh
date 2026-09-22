import type { ActivePartnerSlug } from "@/data/affiliate/active-partners";

export type PayoutRailId =
  | "partnerstack-hello"
  | "partnerstack-personal"
  | "impact"
  | "tapfiliate-setmore"
  | "mailerlite-tipalti"
  | "jotform-tremendous";

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
      "freshbooks", // First-party welcome to hello@miloosh.com; payout readiness remains UNVERIFIED.
    ],
    readiness: "UNVERIFIED",
    ownerActionPackId: "partnerstack-hello-payout-rail",
    methodGuidance: "PartnerStack Support confirmed a PayPal account is already connected to hello@miloosh.com. Do not replace a working payout provider merely to optimize rails. Verify the account's tax/receipt profile and withdrawal readiness before marking this rail VERIFIED.",
    notes: "PartnerStack Support confirmed on 2026-09-14 that hello@miloosh.com has a connected PayPal account. Full tax/receipt-profile and withdrawal readiness were not explicitly confirmed, so this rail remains UNVERIFIED rather than being promoted to VERIFIED. First-party partner mail corroborates the relationships assigned here.",
  },
  {
    id: "partnerstack-personal",
    label: "PartnerStack — legacy/personal-email account",
    accountIdentity: "lahman00@gmail.com",
    partnerSlugs: ["monday", "whatconverts", "elevenlabs", "wrike"],
    readiness: "OWNER_ACTION_REQUIRED",
    ownerActionPackId: "partnerstack-personal-payout-rail",
    methodGuidance: "PartnerStack Support confirmed the declined network application does not affect existing partnerships or commissions. Keep the four live tracking URLs active. The legacy account has no payment provider connected and needs its tax-registered location completed before withdrawals; do not close it until any migration preserves attribution.",
    notes: "PartnerStack Support confirmed on 2026-09-01 that the legacy account's DECLINED network application does not affect commissions or existing partnerships. On 2026-09-14 Support confirmed lahman00@gmail.com has no payment provider connected and must add its tax-registered location before a method can be connected or commissions withdrawn. This rail is OWNER_ACTION_REQUIRED for payout setup, not because the live referral links are invalid. Zendesk still has no verified Miloosh tracking URL and is not included as an active partner."
  },
  {
    id: "impact",
    label: "Impact.com",
    accountIdentity: "Miloosh Impact publisher account",
    partnerSlugs: ["shopify", "wix", "omnisend"],
    readiness: "OWNER_ACTION_REQUIRED",
    ownerActionPackId: "impact-payout-rail",
    methodGuidance: "Prefer bank/EFT when the live account supports the desired currency and fees are acceptable. PayPal is a valid fallback but Impact currently documents a 2% processing fee, capped at the currency-equivalent of USD $20. Do not change working bank details casually because Impact places a security hold after updates.",
    notes: "Shopify, Wix, and Omnisend are active on the same Impact publisher rail; 2026-09-09 Impact notification (Gmail 1a0861d8fa8c9c28) explicitly reports that the billing address is missing the city, preventing payment. Correct the city only from owner-verified billing details; no financial-profile changes were made by this reconciliation.",
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
    readiness: "OWNER_ACTION_REQUIRED",
    ownerActionPackId: "mailerlite-tipalti-payout",
    methodGuidance: "Prefer PayPal when operationally acceptable: MailerLite's current affiliate page says it covers PayPal transaction fees, while Direct Deposit and Wire Transfer fees are borne by the affiliate. Use another method only if the live Tipalti flow or owner preference makes it preferable.",
    notes: "MailerLite Affiliate Operations confirmed on 2026-09-14 that billing details are already added in Trackdesk but no payment method has been selected; embedded Tipalti setup is therefore a confirmed owner action.",
  },
  {
    id: "jotform-tremendous",
    label: "Jotform / Tremendous",
    accountIdentity: "Jotform partner account 'Eyal_hello' (hello@miloosh.com)",
    partnerSlugs: ["jotform"],
    readiness: "OWNER_ACTION_REQUIRED",
    ownerActionPackId: "jotform-tremendous-payout",
    methodGuidance: "Jotform's program page documents payouts via Tremendous; confirm the live payout method/profile directly in the Jotform partner dashboard before assuming any specific method is already configured.",
    notes: "Jotform activated 2026-08-29 with account-specific tracking links. Jotform Affiliate Marketing confirmed on 2026-09-14 that payout setup has not been completed yet, so this rail is a confirmed owner action.",
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
