import { ZOHO_ISSUED_ASSETS } from "@/data/affiliate/zoho-issued-assets";
import type { ActivePartnerSlug } from "@/data/affiliate/active-partners";

export type PayoutRailId =
  | "partnerstack-hello"
  | "partnerstack-personal"
  | "impact"
  | "tapfiliate-setmore"
  | "mailerlite-tipalti"
  | "jotform-tremendous"
  | "firstpromoter-fireflies"
  | "zoho-direct";

export type PayoutRail = {
  id: PayoutRailId;
  label: string;
  accountIdentity: string;
  partnerSlugs: readonly ActivePartnerSlug[];
  readiness: "UNVERIFIED" | "OWNER_ACTION_REQUIRED" | "VERIFIED";
  /** Setup observation is independent of verified withdrawal readiness. */
  setupEvidence?: "OWNER_REPORTED_COMPLETE" | "PROVIDER_REVIEW_PENDING" | "PAYPAL_VALIDATION_FAILED" | "METHOD_NOT_SELECTED";
  setupObservedAt?: string;
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
    id: "zoho-direct", label: "Zoho direct affiliate payout", accountIdentity: "hello@miloosh.com",
    partnerSlugs: ZOHO_ISSUED_ASSETS.map(asset => asset.slug), readiness: "UNVERIFIED",
    ownerActionPackId: "zoho-direct-payout",
    methodGuidance: "October 1 Zoho onboarding specifies wire transfer. Inspect existing Payment Method and Billing Details locally; do not overwrite or submit bank or tax information without an explicit owner instruction.",
    notes: "Authenticated portal and Multi DC setup verified 2026-10-01. The six product assets share one Zoho relationship. No bank/tax-profile approval, earned commission or successful withdrawal has been verified.",
  },
  {
    "id": "firstpromoter-fireflies",
    "label": "Fireflies / FirstPromoter",
    "accountIdentity": "hello@miloosh.com",
    "partnerSlugs": [
      "fireflies-ai"
    ],
    "readiness": "OWNER_ACTION_REQUIRED",
    "setupEvidence": "METHOD_NOT_SELECTED",
    "setupObservedAt": "2026-09-30",
    "ownerActionPackId": "fireflies-payout-method",
    "methodGuidance": "Use the existing approved FirstPromoter account. Owner has paused payout configuration until PayPal account clarification; do not connect GefGef or create another account.",
    "notes": "Authenticated Fireflies portal read on 2026-09-30 and owner screenshot: no payout method selected. Affiliate account offer is 10% recurring; this separate payout gate remains incomplete regardless of issued referral URL."
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
      "freshbooks",
      "trainual", // First-party welcome to hello@miloosh.com; payout readiness remains UNVERIFIED.
    ],
    readiness: "UNVERIFIED",
    ownerActionPackId: "partnerstack-hello-payout-rail",
    methodGuidance: "PartnerStack Support confirmed a PayPal account is already connected to hello@miloosh.com. Do not replace a working payout provider merely to optimize rails. Verify the account's tax/receipt profile and withdrawal readiness before marking this rail VERIFIED.",
    notes: "PartnerStack Support confirmed on 2026-09-14 that hello@miloosh.com has a connected PayPal account. Full tax/receipt-profile and withdrawal readiness were not explicitly confirmed, so this rail remains UNVERIFIED rather than being promoted to VERIFIED. First-party partner mail corroborates the relationships assigned here. A read-only confirmation request was sent 2026-09-29; acknowledgment ticket 124689 is not payout verification. Do not duplicate the pending request.",
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
    readiness: "UNVERIFIED",
    ownerActionPackId: "impact-payout-rail",
    methodGuidance: "Owner screenshot shows banking review will occur when the active balance is due for payment. Preserve submitted banking details. Do not reopen old address tickets or change banking data without a current explicit request from Impact.",
    notes: "Superseding owner screenshot 2026-09-30 20.25.04 and subsequent owner statement: Impact is okay; banking details under review when balance is due for payment. Historical city-missing email and closed ticket 880838 are not current proof a field is still missing. Bank approval, autopay configuration and received payment have not been independently verified.",
    setupEvidence: "PROVIDER_REVIEW_PENDING",
    setupObservedAt: "2026-09-30",
  },
  {
    id: "tapfiliate-setmore",
    label: "Setmore / Tapfiliate",
    accountIdentity: "Setmore affiliate account",
    partnerSlugs: ["setmore"],
    readiness: "UNVERIFIED",
    ownerActionPackId: "setmore-payout-method",
    methodGuidance: "Owner reports completing the PayPal step and onboarding. Verify saved payout status read-only; do not restart onboarding, re-request the address, or replace the saved method.",
    notes: "Owner explicitly stated on 2026-09-30 that payout details were already filled. This supersedes the earlier incomplete Step 4 observation, but is not independent vendor confirmation of valid PayPal account ownership or successful withdrawal.",
    setupEvidence: "OWNER_REPORTED_COMPLETE",
    setupObservedAt: "2026-09-30",
  },
  {
    id: "mailerlite-tipalti",
    label: "MailerLite / Tipalti",
    accountIdentity: "MailerLite affiliate account",
    partnerSlugs: ["mailerlite"],
    readiness: "OWNER_ACTION_REQUIRED",
    ownerActionPackId: "mailerlite-tipalti-payout",
    methodGuidance: "Owner has paused this rail pending PayPal account clarification. Resume the existing Tipalti flow only after that checkpoint; do not use the GefGef PayPal account or create a duplicate Tipalti profile.",
    notes: "Owner screenshot 2026-09-30 21.02.17: PayPal could not validate account information. Cause remains UNKNOWN; the error does not prove that a Business account is invalid or that downgrade will fix it. Contact fields were filled, but payout verification did not complete. This is an owner-requested pause, not verified withdrawal readiness.",
    setupEvidence: "PAYPAL_VALIDATION_FAILED",
    setupObservedAt: "2026-09-30",
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
