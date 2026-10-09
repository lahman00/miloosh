/**
 * Typed program restrictions for active affiliate partners.
 *
 * The repository records these terms only as prose (header comments in
 * data/affiliate/active-partners.ts and ledger notes). Prose cannot stop an
 * agent from proposing a forbidden channel, so the terms that ARE recorded are
 * restated here with their source. A partner with no row has "not recorded"
 * restrictions, which is NOT permission: the program terms must be read
 * before any promotional channel is used.
 *
 * tests/growth-agents/partner-restrictions.test.ts re-reads the ledger prose
 * and fails when a restriction keyword appears for a partner that has no row.
 */

export type PromotionChannel =
  | "PAID_SEARCH_OR_PPC"
  | "PAID_SOCIAL_OR_DISPLAY"
  | "BRAND_BIDDING"
  | "UNSOLICITED_MESSAGES"
  | "THIRD_PARTY_SOCIAL_PROMOTION"
  | "COUPON_OR_DEAL_SITES"
  | "PAID_AD_TRAFFIC_TO_LINK"
  | "ALTERED_LINKS_OR_NEW_BRANDED_MATERIALS";

export type RestrictionVerdict = "FORBIDDEN" | "REQUIRES_PRIOR_WRITTEN_APPROVAL";

export type PartnerRestriction = {
  partnerSlug: string;
  channel: PromotionChannel;
  verdict: RestrictionVerdict;
  /** File and phrase that record the term. */
  source: string;
  /** Whether the vendor imposed it or Miloosh chose it. */
  imposedBy: "VENDOR" | "MILOOSH_POLICY";
};

const ACTIVE_PARTNERS_FILE = "data/affiliate/active-partners.ts";
const LEDGER_FILE = "data/affiliate/canonical-ledger.ts";

export const PARTNER_RESTRICTIONS: readonly PartnerRestriction[] = [
  { partnerSlug: "setmore", channel: "PAID_SEARCH_OR_PPC", verdict: "FORBIDDEN", imposedBy: "VENDOR", source: `${ACTIVE_PARTNERS_FILE} header "Setmore added 2026-08-20": approval email prohibits Google Ads and PPC` },
  { partnerSlug: "setmore", channel: "PAID_SOCIAL_OR_DISPLAY", verdict: "FORBIDDEN", imposedBy: "VENDOR", source: `${ACTIVE_PARTNERS_FILE} header "Setmore added 2026-08-20": display ads and paid social prohibited` },
  { partnerSlug: "setmore", channel: "BRAND_BIDDING", verdict: "FORBIDDEN", imposedBy: "VENDOR", source: `${LEDGER_FILE} setmore eligibility: "NO PAID MEDIA / PPC / BRAND ADS"` },
  { partnerSlug: "surveymonkey", channel: "BRAND_BIDDING", verdict: "FORBIDDEN", imposedBy: "VENDOR", source: `${LEDGER_FILE} surveymonkey notes: "no brand bidding"` },
  { partnerSlug: "surveymonkey", channel: "UNSOLICITED_MESSAGES", verdict: "FORBIDDEN", imposedBy: "VENDOR", source: `${LEDGER_FILE} surveymonkey notes: "no unsolicited messages"` },
  { partnerSlug: "surveymonkey", channel: "THIRD_PARTY_SOCIAL_PROMOTION", verdict: "FORBIDDEN", imposedBy: "VENDOR", source: `${LEDGER_FILE} surveymonkey notes: "social promotion only on owned pages"` },
  { partnerSlug: "surveymonkey", channel: "ALTERED_LINKS_OR_NEW_BRANDED_MATERIALS", verdict: "REQUIRES_PRIOR_WRITTEN_APPROVAL", imposedBy: "VENDOR", source: `${LEDGER_FILE} surveymonkey notes: "no altered links or new branded marketing assets without prior written approval"` },
  { partnerSlug: "trainual", channel: "PAID_AD_TRAFFIC_TO_LINK", verdict: "FORBIDDEN", imposedBy: "VENDOR", source: `${LEDGER_FILE} trainual notes: "do not drive paid-ad traffic directly to the affiliate link"` },
  { partnerSlug: "trainual", channel: "COUPON_OR_DEAL_SITES", verdict: "FORBIDDEN", imposedBy: "VENDOR", source: "data/affiliate/partner-materials-audit.ts:87 trainual restrictions: \"No ... coupon/discount sites\"" },
  { partnerSlug: "trainual", channel: "THIRD_PARTY_SOCIAL_PROMOTION", verdict: "FORBIDDEN", imposedBy: "VENDOR", source: "data/affiliate/partner-materials-audit.ts:87 trainual restrictions: link not to be published on properties the affiliate does not own or control; ledger notes keep promotion on Miloosh-owned editorial surfaces" },
  { partnerSlug: "freshbooks", channel: "PAID_SEARCH_OR_PPC", verdict: "FORBIDDEN", imposedBy: "MILOOSH_POLICY", source: `${LEDGER_FILE} freshbooks notes: "No paid campaigns enabled"` },
  { partnerSlug: "freshbooks", channel: "PAID_SOCIAL_OR_DISPLAY", verdict: "FORBIDDEN", imposedBy: "MILOOSH_POLICY", source: `${LEDGER_FILE} freshbooks notes: "No paid campaigns enabled"` },
];

export type ChannelVerdict = RestrictionVerdict | "NOT_RECORDED";

/**
 * What the records say about using `channel` for `partnerSlug`.
 * NOT_RECORDED never means allowed: it means no restriction was written down.
 */
export function channelVerdict(partnerSlug: string, channel: PromotionChannel, table: readonly PartnerRestriction[] = PARTNER_RESTRICTIONS): ChannelVerdict {
  const rows = table.filter((r) => r.partnerSlug === partnerSlug && r.channel === channel);
  if (rows.some((r) => r.verdict === "FORBIDDEN")) return "FORBIDDEN";
  if (rows.some((r) => r.verdict === "REQUIRES_PRIOR_WRITTEN_APPROVAL")) return "REQUIRES_PRIOR_WRITTEN_APPROVAL";
  return "NOT_RECORDED";
}

export function restrictionsFor(partnerSlug: string, table: readonly PartnerRestriction[] = PARTNER_RESTRICTIONS): PartnerRestriction[] {
  return table.filter((r) => r.partnerSlug === partnerSlug);
}

/** Channels the Director may propose for a set of partners: those no record forbids or gates. Paid media is never proposed by default. */
export function organicChannelsAllowed(partnerSlugs: readonly string[], table: readonly PartnerRestriction[] = PARTNER_RESTRICTIONS): { allowed: PromotionChannel[]; blocked: Array<{ channel: PromotionChannel; partnerSlug: string; verdict: ChannelVerdict }> } {
  const organic: PromotionChannel[] = ["THIRD_PARTY_SOCIAL_PROMOTION", "UNSOLICITED_MESSAGES", "COUPON_OR_DEAL_SITES"];
  const blocked: Array<{ channel: PromotionChannel; partnerSlug: string; verdict: ChannelVerdict }> = [];
  const allowed: PromotionChannel[] = [];
  for (const channel of organic) {
    const hits = partnerSlugs
      .map((partnerSlug) => ({ partnerSlug, verdict: channelVerdict(partnerSlug, channel, table) }))
      .filter((hit) => hit.verdict !== "NOT_RECORDED");
    if (hits.length === 0) allowed.push(channel);
    else for (const hit of hits) blocked.push({ channel, partnerSlug: hit.partnerSlug, verdict: hit.verdict });
  }
  return { allowed, blocked };
}
