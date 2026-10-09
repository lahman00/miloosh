import type { ActivePartnerSlug } from "@/data/affiliate/active-partners";

export type PayoutRailId =
  | "partnerstack-hello"
  | "partnerstack-personal"
  | "impact"
  | "tapfiliate-setmore"
  | "mailerlite-tipalti"
  | "jotform-tremendous"
  | "firstpromoter-fireflies";

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
    id: "firstpromoter-fireflies",
    label: "Fireflies / FirstPromoter",
    accountIdentity: "hello@miloosh.com",
    partnerSlugs: ["fireflies-ai"],
    readiness: "UNVERIFIED",
    ownerActionPackId: "fireflies-firstpromoter-payout",
    methodGuidance: "Fireflies' official affiliate page states payouts are credited via PayPal. Verify the live FirstPromoter payout profile and any required payment details before marking this rail VERIFIED.",
    notes: "Fireflies issued Miloosh an account-specific referral URL in connected Gmail on 2026-09-30. This proves the affiliate relationship and tracking asset, not payout-profile completion.",
  },
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
      "trainual", // First-party PartnerStack welcome + exact referral URL issued to hello@miloosh.com on 2026-09-30.
      "callrail", // PartnerStack approval 2026-10-01 + exact referral URL issued by CallRail Partner Marketing 2026-10-02.
      "activecampaign", // New first-party approval + exact PartnerStack referral URL issued 2026-10-02; supersedes Aug decline.
      "apollo-io", // Apollo welcome + exact PartnerStack referral URL issued 2026-10-01.
    ],
    readiness: "VERIFIED",
    ownerActionPackId: "partnerstack-hello-payout-rail",
    methodGuidance: "Keep the existing PayPal payout provider unless PartnerStack itself reports a problem. PartnerStack Support confirmed PayPal is connected and later confirmed the business account is fully set up with the required tax location.",
    notes: "Payout readiness is first-party verified. PartnerStack Support confirmed on 2026-09-14 that hello@miloosh.com has a connected PayPal account. In ticket 124689 on 2026-10-01, after being asked specifically whether tax/receipt details were complete and the account could withdraw without additional setup, Support replied that everything was set up correctly, the tax location was filled as needed, and the account should be all set. Program-specific eligibility conditions still apply independently.",
  },
  {
    id: "partnerstack-personal",
    label: "PartnerStack — legacy/personal-email account",
    accountIdentity: "lahman00@gmail.com",
    partnerSlugs: ["monday", "whatconverts", "elevenlabs", "wrike"],
    readiness: "UNVERIFIED",
    ownerActionPackId: "partnerstack-personal-payout-rail",
    methodGuidance: "Owner screenshots from 2026-10-09 show the tax-location requirement was cleared and an ILS direct-deposit payout method is connected in the existing legacy PartnerStack account. Do not add a duplicate provider or resubmit personal tax details. Confirm actual withdrawal readiness with the current authenticated PartnerStack dashboard or support before treating this account as VERIFIED. Keep all four issued referral links and the legacy account active.",
    notes: "2026-09-01 Support confirmed the DECLINED network application did not invalidate the four existing partner links. On 2026-09-14 Support reported missing tax location and payout provider. This prior setup blocker was superseded by the owner's 2026-10-09 authenticated screenshots: tax-warning cleared and ILS direct-deposit method connected. The page showed no explicit VERIFIED/APPROVED badge and no received-payout evidence, so current account withdrawal readiness remains UNVERIFIED, not VERIFIED. No bank, tax, account-number, address or identity data is retained here. Zendesk has no verified Miloosh tracking asset."
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
