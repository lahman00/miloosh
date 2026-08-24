import type { ActivePartnerSlug } from "@/data/affiliate/active-partners";

export type PayoutRailId = "partnerstack" | "impact" | "tapfiliate-setmore" | "mailerlite-tipalti";

export type PayoutRail = {
  id: PayoutRailId;
  label: string;
  partnerSlugs: readonly ActivePartnerSlug[];
  readiness: "UNVERIFIED" | "OWNER_ACTION_REQUIRED" | "VERIFIED";
  ownerActionPackId: string;
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
    notes: "One network-level payout configuration should service all fourteen active PartnerStack relationships; dashboard readiness is not yet first-party verified.",
  },
  {
    id: "impact",
    label: "Impact.com",
    partnerSlugs: ["shopify", "wix", "omnisend"],
    readiness: "UNVERIFIED",
    ownerActionPackId: "impact-payout-rail",
    notes: "Shopify, Wix, and Omnisend are active on the same Impact publisher rail; finance-profile readiness is not yet first-party verified.",
  },
  {
    id: "tapfiliate-setmore",
    label: "Setmore / Tapfiliate",
    partnerSlugs: ["setmore"],
    readiness: "OWNER_ACTION_REQUIRED",
    ownerActionPackId: "setmore-payout-method",
    notes: "Prior verified Setmore onboarding state was Step 4, payout method. Do not assume Payoneer or another method unless the Setmore portal actually offers it.",
  },
  {
    id: "mailerlite-tipalti",
    label: "MailerLite / Tipalti",
    partnerSlugs: ["mailerlite"],
    readiness: "UNVERIFIED",
    ownerActionPackId: "mailerlite-tipalti-payout",
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
