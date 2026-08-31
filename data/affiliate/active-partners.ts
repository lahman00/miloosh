export const ACTIVE_PARTNER_SLUGS = [
  "constant-contact", "todoist", "moosend", "volza", "pipedrive",
  "getresponse", "airtable", "monday", "whatconverts", "elevenlabs", "krispcall",
  "setmore", "hubstaff", "close", "shopify", "wix",
  "mailerlite", "omnisend", "wrike", "jotform",
] as const;

export type ActivePartnerSlug = (typeof ACTIVE_PARTNER_SLUGS)[number];

export type ActivePartner = {
  slug: ActivePartnerSlug;
  status: "active";
  affiliateUrl: string | null;
  /**
   * Optional intent-specific tracking asset for pricing-page commercial
   * surfaces (the pricing-section-cta), used instead of the general
   * affiliateUrl above only when a verified, account-specific pricing deep
   * link is on file. Never inferred or constructed -- only ever a real
   * vendor-issued URL, same evidentiary bar as affiliateUrl itself.
   */
  pricingAffiliateUrl?: string;
  blocker: "missing_affiliate_url" | null;
};

/**
 * Canonical registry for verified active partners. Null never means "guess": it keeps the ordinary vendor URL live.
 *
 * Brevo removed 2026-08-19: PartnerStack's top-level partnership badge showed
 * "Active", but the program's own Messages thread (account hello@miloosh.com)
 * contains a first-party Brevo message dated 2026-08-19: "Your application was
 * not approved... has been removed from our onboarding process." No Offer and
 * no referral link were ever attached, consistent with a rejected application.
 * See data/affiliate/partner-materials-audit.ts and
 * data/affiliate/AFFILIATE_EVIDENCE_AND_SURFACES_2026-08-19.md for full evidence.
 *
 * Setmore added 2026-08-20: real first-party approval email (network: Tapfiliate).
 * COMPLIANCE RESTRICTION -- SETMORE: NO PAID MEDIA / PPC / BRAND OR NON-BRAND ADS.
 * The approval email explicitly prohibits Google Ads, PPC, display ads, and paid
 * social advertising for this program; commissions generated through prohibited
 * paid channels will not be approved or paid. Only organic promotion is permitted
 * (blog/content, organic social, newsletters, website referrals). Any future
 * social/affiliate automation touching Setmore must respect this restriction --
 * do not schedule paid promotion or recommend paid channels for this partner.
 *
 * Hubstaff added 2026-08-20: real first-party PartnerStack partnership (account hello@miloosh.com).
 * Verified affiliate URL: https://affiliate.hubstaff.com/ca2oe167vcj1.
 *
 * Close added 2026-08-21: owner supplied a verified referral URL directly
 * (previously PENDING_REVIEW with no link since the 2026-08-18 PartnerStack
 * application). Verified affiliate URL: https://refer.close.com/0alqdg4so8rm.
 * On 2026-08-24 Close also confirmed in a first-party PartnerStack message that
 * content publishers are NOT eligible for the Close Partner Directory. This is
 * a directory-listing restriction only; it does not invalidate the active
 * affiliate/referral relationship. See data/affiliate/current-affiliate-truth.ts
 * for the operational Close relationship and restriction.
 *
 * Shopify reconciled 2026-08-24: first-party Impact email dated 2026-08-15
 * explicitly says "Shopify Affiliate Program: Application Approved" and confirms
 * the Miloosh Impact publisher account. The exact tracking URL already exists in
 * data/software/shopify.json and is copied here as the canonical active URL.
 *
 * Wix reconciled 2026-08-24: first-party Impact welcome plus direct email from
 * Wix Partnerships Manager Romy Ninary supplied four unique tracking URLs. The
 * Classic Website Builder URL below is the canonical general-site CTA; specialized
 * Domain, Headless, and eCommerce links remain available for intent-specific use.
 *
 * MailerLite and Omnisend activated 2026-08-24 from exact owner-supplied referral URLs. Notify Me remains ledger-only until independent editorial content exists.
 *
 * SurveyMonkey removed 2026-08-29 (fail-closed): the 2026-08-24 activation was
 * based on an owner screenshot of a PartnerStack dashboard plus an owner-
 * supplied URL, but the SurveyMonkey affiliate manager has NOT yet confirmed
 * first-party that https://try.partnerstack.com/jx99ylh3mexb is genuinely
 * Miloosh's own asset on the correct PartnerStack account -- a real, live
 * doubt given the separate, confirmed Account #1/#2 PartnerStack confusion
 * elsewhere in this ledger. Presence in THIS array is what makes a CTA
 * resolve to an affiliate link (see lib/affiliate.ts's
 * softwareToAffiliateLink -- it reads .affiliateUrl unconditionally off
 * whatever this array returns, it does not check any status field), so
 * removal is the only way to actually fail the CTA closed to the plain
 * SurveyMonkey URL, not merely a label change. The historical evidence and
 * URL are preserved, not deleted, in data/affiliate/canonical-ledger.ts's
 * surveymonkey entry (status: PROGRAM_NOT_VERIFIED) and in
 * data/affiliate/partner-materials-audit.ts. Do not re-add without explicit
 * first-party vendor confirmation, and do not accept the pending
 * PartnerStack invitation as a substitute for that confirmation.
 *
 * Jotform added 2026-08-29: an earlier attempt to activate this same
 * relationship was declined because the supporting message bundled three
 * git commit SHAs and two PR numbers that did not exist anywhere in this
 * repository's history. This activation rests on a separate, later, direct
 * first-hand account from the owner (not relayed via Codex or any other
 * agent) of personally re-reading the original correspondence in the
 * connected Gmail account: Jotform Affiliate Marketing Specialist Anna
 * Scheucher confirmed approval on 2026-08-19 for account "Eyal_hello"
 * (hello@miloosh.com), and, asked specifically for a link generated for
 * that account (to rule out a demo or mismatched-partner link), supplied
 * both URLs below stating "these are the tracking links associated with
 * your account." Same evidentiary bar as MailerLite/Close/Omnisend. The
 * homepage URL is the canonical CTA below and is used by every commercial
 * surface except the pricing section, which uses the pricing-intent URL
 * (https://www.jotform.com/pricing/?partner=miloosh) via pricingAffiliateUrl
 * -- see data/affiliate/canonical-ledger.ts's jotform entry for the full
 * evidence record.
 */
export const ACTIVE_PARTNERS: readonly ActivePartner[] = [
  { slug: "constant-contact", status: "active", affiliateUrl: "https://join.constantcontact.com/ezj6pum5ei2l", blocker: null },
  { slug: "todoist", status: "active", affiliateUrl: "https://get.todoist.io/dobo71f2y038", blocker: null },
  { slug: "moosend", status: "active", affiliateUrl: "https://trymoo.moosend.com/4jis9o5bx8wx", blocker: null },
  { slug: "volza", status: "active", affiliateUrl: "https://partner.volza.com/36gtswr72b71", blocker: null },
  { slug: "pipedrive", status: "active", affiliateUrl: "https://aff.trypipedrive.com/ajtcgyu06e7i", blocker: null },
  { slug: "getresponse", status: "active", affiliateUrl: "https://try.getresponsetoday.com/5op8zmw94gq1", blocker: null },
  { slug: "airtable", status: "active", affiliateUrl: "https://airtable.partnerlinks.io/b0dz88v48tek", blocker: null },
  { slug: "monday", status: "active", affiliateUrl: "https://try.monday.com/1p2fpizulcj7", blocker: null },
  { slug: "whatconverts", status: "active", affiliateUrl: "https://partners.whatconverts.com/bmckzlf0vnl8", blocker: null },
  { slug: "elevenlabs", status: "active", affiliateUrl: "https://try.elevenlabs.io/gkp73pehjgtl", blocker: null },
  { slug: "krispcall", status: "active", affiliateUrl: "https://try.krispcall.com/aikpbrrrl8k9", blocker: null },
  { slug: "setmore", status: "active", affiliateUrl: "https://www.setmore.com?ref=nge2zwi", blocker: null },
  { slug: "hubstaff", status: "active", affiliateUrl: "https://affiliate.hubstaff.com/ca2oe167vcj1", blocker: null },
  { slug: "close", status: "active", affiliateUrl: "https://refer.close.com/0alqdg4so8rm", blocker: null },
  { slug: "shopify", status: "active", affiliateUrl: "https://shopify.pxf.io/L0EG9O", blocker: null },
  { slug: "wix", status: "active", affiliateUrl: "https://wix.pxf.io/c/7623171/2096727/25616?trafcat=wsb", blocker: null },
  { slug: "mailerlite", status: "active", affiliateUrl: "https://www.mailerlite.com/?linkId=lp_170762&sourceId=eyal-haimovich&tenantId=mailerlite", blocker: null },
  { slug: "omnisend", status: "active", affiliateUrl: "https://your.omnisend.com/PznLej", blocker: null },
  { slug: "wrike", status: "active", affiliateUrl: "https://get.wrike.com/wdgn8ok7i5ij", blocker: null },
  { slug: "jotform", status: "active", affiliateUrl: "https://www.jotform.com/?partner=miloosh", pricingAffiliateUrl: "https://www.jotform.com/pricing/?partner=miloosh", blocker: null },
] as const;

const ACTIVE_PARTNERS_BY_SLUG = new Map(ACTIVE_PARTNERS.map((partner) => [partner.slug, partner]));

export function getActivePartner(slug: string): ActivePartner | undefined {
  return ACTIVE_PARTNERS_BY_SLUG.get(slug as ActivePartnerSlug);
}
