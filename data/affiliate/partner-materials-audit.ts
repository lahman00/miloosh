export type MonetizationReadiness = "READY NOW" | "APPROVED BUT NEEDS LINK" | "PENDING APPROVAL" | "NEEDS APPLICATION" | "REJECTED" | "NOT ELIGIBLE" | "HOLD / UNCLEAR";
export type NormalizedCommissionType = "recurring_percentage" | "one_time_percentage" | "fixed_cpa" | "qualified_lead" | "revenue_share" | "hybrid" | "unknown";

export type PartnerMaterialAudit = {
  company: string;
  slug: string;
  programNetwork: string;
  currentStatus: string;
  applicationStatus: string;
  approvalStatus: string;
  affiliateUrl: string;
  commission: { type: NormalizedCommissionType; value: string; originalWording: string };
  recurrence: string;
  cookieWindow: string;
  payoutThreshold: string;
  payoutMethod: string;
  qualificationRules: string;
  restrictions: string;
  ppcTrademarkRestrictions: string;
  couponRestrictions: string;
  emailRestrictions: string;
  disclosureRequirements: string;
  geographyRestrictions: string;
  selfReferralRules: string;
  inactivityTerminationRules: string;
  brandAssets: string;
  mediaKit: string;
  brandGuidelines: string;
  promotionalMaterials: string;
  supportContact: string;
  evidence: string[];
  lastVerifiedDate: string;
  readiness: MonetizationReadiness;
  vendorClaims: string[];
  verifiedMarketingFacts: string[];
};

const UNKNOWN = "UNKNOWN";
type AuditSeed = Pick<PartnerMaterialAudit, "company" | "slug" | "evidence" | "lastVerifiedDate" | "readiness"> & Partial<Omit<PartnerMaterialAudit, "company" | "slug" | "evidence" | "lastVerifiedDate" | "readiness">>;

function record(seed: AuditSeed): PartnerMaterialAudit {
  return {
    programNetwork: UNKNOWN, currentStatus: UNKNOWN, applicationStatus: UNKNOWN, approvalStatus: UNKNOWN, affiliateUrl: UNKNOWN,
    commission: { type: "unknown", value: UNKNOWN, originalWording: UNKNOWN }, recurrence: UNKNOWN, cookieWindow: UNKNOWN,
    payoutThreshold: UNKNOWN, payoutMethod: UNKNOWN, qualificationRules: UNKNOWN, restrictions: UNKNOWN,
    ppcTrademarkRestrictions: UNKNOWN, couponRestrictions: UNKNOWN, emailRestrictions: UNKNOWN,
    disclosureRequirements: "Miloosh disclosure and rel=sponsored rules apply whenever an affiliate URL is used.",
    geographyRestrictions: UNKNOWN, selfReferralRules: UNKNOWN, inactivityTerminationRules: UNKNOWN,
    brandAssets: UNKNOWN, mediaKit: UNKNOWN, brandGuidelines: UNKNOWN, promotionalMaterials: UNKNOWN,
    supportContact: UNKNOWN, vendorClaims: [], verifiedMarketingFacts: [],
    ...seed,
  };
}

const HANDOFF = "Codex attachment 383c910a-402e-467b-a3bd-ac398c260ef9 (user-supplied status and personalized URLs, 2026-08-19)";
const STATUS_DRAFT = "docs/affiliate-applications.md working-tree evidence supplied 2026-08-19";
const PROGRAM_RESEARCH = "data/revenue/affiliate-programs.ts official-source research";
const LIVE_VERIFICATION = "Direct PartnerStack dashboard + production affiliate pipeline check, 2026-08-19 (see data/affiliate/AFFILIATE_EVIDENCE_AND_SURFACES_2026-08-19.md live re-verification addendum)";

export const PARTNER_MATERIAL_AUDIT: readonly PartnerMaterialAudit[] = [
  record({ company: "Iconosquare", slug: "iconosquare", readiness: "HOLD / UNCLEAR", evidence: ["No collected file or repository program record located in 2026-08-19 inventory."], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Carepatron", slug: "carepatron", readiness: "HOLD / UNCLEAR", evidence: ["No collected file or repository program record located in 2026-08-19 inventory."], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Ruby", slug: "ruby", readiness: "HOLD / UNCLEAR", evidence: ["No collected file or repository program record located in 2026-08-19 inventory."], lastVerifiedDate: "2026-08-19" }),
  record({ company: "MindStudio", slug: "mindstudio", readiness: "HOLD / UNCLEAR", evidence: ["No collected file or repository program record located in 2026-08-19 inventory."], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Miro", slug: "miro", programNetwork: "PartnerStack (unconfirmed for this account)", currentStatus: "UNKNOWN / NOT_FOUND_IN_CURRENT_ACCOUNT", applicationStatus: "No application evidence found", approvalStatus: "Prior 'approved' pipeline status had no cited source and is corrected", commission: { type: "qualified_lead", value: "$10-$40 by geography (public program page claim, unverified for Miloosh)", originalWording: "$10-$40 per corporate email sign-up to free trial, based on GEO" }, recurrence: "one-time", cookieWindow: "30 days", readiness: "HOLD / UNCLEAR", evidence: [PROGRAM_RESEARCH, LIVE_VERIFICATION, "Zero results in PartnerStack Partnerships and Invitations search, account hello@miloosh.com, 2026-08-19"], lastVerifiedDate: "2026-08-19" }),
  record({ company: "8fig", slug: "8fig", readiness: "HOLD / UNCLEAR", evidence: ["No collected file or repository program record located in 2026-08-19 inventory."], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Pagecloud", slug: "pagecloud", readiness: "HOLD / UNCLEAR", evidence: ["No collected file or repository program record located in 2026-08-19 inventory."], lastVerifiedDate: "2026-08-19" }),
  record({ company: "RocketReach", slug: "rocketreach", readiness: "HOLD / UNCLEAR", evidence: ["No collected file or repository program record located in 2026-08-19 inventory."], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Flatpay", slug: "flatpay", readiness: "HOLD / UNCLEAR", evidence: ["No collected file or repository program record located in 2026-08-19 inventory."], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Closely", slug: "closely", readiness: "HOLD / UNCLEAR", evidence: ["No collected file or repository program record located in 2026-08-19 inventory."], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Pipedrive", slug: "pipedrive", programNetwork: "PartnerStack", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://aff.trypipedrive.com/ajtcgyu06e7i", commission: { type: "revenue_share", value: "20% or 30% for first 12 months; custom Power tier", originalWording: "Rising 20%; Growth 30%; Power custom rate, first 12 months" }, recurrence: "recurring for 12 months", payoutThreshold: "$5", geographyRestrictions: "Some exceptions communicated during approval; countries not named", readiness: "READY NOW", evidence: [HANDOFF, PROGRAM_RESEARCH], lastVerifiedDate: "2026-08-19" }),
  record({ company: "GetResponse", slug: "getresponse", programNetwork: "PartnerStack", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://try.getresponsetoday.com/5op8zmw94gq1", commission: { type: "recurring_percentage", value: "40%/50%/60% for 12 months by tier", originalWording: "Bronze 40%, Silver 50%, Gold 60% for 12 months" }, recurrence: "recurring for 12 months", cookieWindow: "90 days", payoutThreshold: "$50", qualificationRules: "Existing customer not required; application reviewed", readiness: "READY NOW", evidence: [HANDOFF, PROGRAM_RESEARCH], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Volza", slug: "volza", programNetwork: "PartnerStack", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://partner.volza.com/36gtswr72b71", commission: { type: "revenue_share", value: "20%-30%", originalWording: "20-30% revenue share per qualified annual B2B subscription" }, recurrence: "Recorded as one-time in program research", cookieWindow: "90 days", payoutThreshold: "$50", payoutMethod: "PartnerStack: PayPal/direct bank transfer", readiness: "READY NOW", vendorClaims: ["High-ACV global trade/customs intelligence positioning is vendor/program language and not independently verified here."], evidence: [HANDOFF, PROGRAM_RESEARCH], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Todoist", slug: "todoist", programNetwork: "PartnerStack", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://get.todoist.io/dobo71f2y038", commission: { type: "hybrid", value: "Up to 25%", originalWording: "Yearly plans up to 25% one-time; monthly plans up to 25% for up to 12 payments" }, recurrence: "hybrid", cookieWindow: "90 days", payoutThreshold: "$25", restrictions: "Only todoist.com purchases qualify; app-store purchases excluded", brandGuidelines: "No Todoist Brand Guidelines file was located; logo/trademark/screenshot rules remain UNKNOWN.", readiness: "READY NOW", evidence: [HANDOFF, PROGRAM_RESEARCH], lastVerifiedDate: "2026-08-19" }),
  ...[
    ["Constant Contact", "constant-contact", "https://join.constantcontact.com/ezj6pum5ei2l"], ["Moosend", "moosend", "https://trymoo.moosend.com/4jis9o5bx8wx"], ["Airtable", "airtable", "https://airtable.partnerlinks.io/b0dz88v48tek"], ["monday.com", "monday", "https://try.monday.com/1p2fpizulcj7"], ["WhatConverts", "whatconverts", "https://partners.whatconverts.com/bmckzlf0vnl8"], ["ElevenLabs", "elevenlabs", "https://try.elevenlabs.io/gkp73pehjgtl"], ["KrispCall", "krispcall", "https://try.krispcall.com/aikpbrrrl8k9"],
  ].map(([company, slug, affiliateUrl]) => record({ company: company!, slug: slug!, programNetwork: "PartnerStack", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: affiliateUrl!, readiness: "READY NOW", evidence: [HANDOFF, "data/affiliate/active-partners.ts"], lastVerifiedDate: "2026-08-19" })),
  ...[["FreshBooks", "freshbooks"], ["Zendesk", "zendesk"]].map(([company, slug]) => record({ company: company!, slug: slug!, programNetwork: "PartnerStack", currentStatus: "PENDING", applicationStatus: "Under review", approvalStatus: "Not approved", readiness: "PENDING APPROVAL", evidence: [STATUS_DRAFT], lastVerifiedDate: "2026-08-19" })),
  record({ company: "Wrike", slug: "wrike", programNetwork: "PartnerStack", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://get.wrike.com/wdgn8ok7i5ij", commission: { type: "unknown", value: UNKNOWN, originalWording: "Percentage of licenses sold / reward on qualified opportunities; exact rate not disclosed in the available first-party evidence" }, readiness: "READY NOW", evidence: ["First-party PartnerStack email dated 2026-08-25: Welcome to the Wrike Referral Program", "First-party Wrike referral-partner page confirming commissions on referred license sales", "data/affiliate/active-partners.ts", "data/affiliate/canonical-ledger.ts"], lastVerifiedDate: "2026-08-25" }),
  record({ company: "Setmore", slug: "setmore", programNetwork: "Tapfiliate", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://www.setmore.com?ref=nge2zwi", commission: { type: "one_time_percentage", value: "30% of first subscription payment", originalWording: "30% of referred customer's first subscription payment (one-time)" }, recurrence: "one-time", cookieWindow: "90 days", ppcTrademarkRestrictions: "NO PAID MEDIA / PPC / brand or non-brand ads. Approval email explicitly prohibits Google Ads, PPC, display ads, and paid social advertising; commissions generated through prohibited paid channels will not be approved or paid. Only organic promotion (blog/content, organic social, newsletters, website referrals) is permitted.", readiness: "READY NOW", evidence: ["docs/affiliate-applications.md first-party approval email", "Tapfiliate dashboard", "assets.setmore.com official terms PDF", "data/affiliate/canonical-ledger.ts"], lastVerifiedDate: "2026-08-20" }),
  record({ company: "MailerLite", slug: "mailerlite", programNetwork: "MailerLite Partner Portal", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://www.mailerlite.com/?linkId=lp_170762&sourceId=eyal-haimovich&tenantId=mailerlite", commission: { type: "unknown", value: UNKNOWN, originalWording: "Per current MailerLite partner terms; exact current rate retained in the partner portal" }, readiness: "READY NOW", evidence: ["Owner-supplied referral URL generated in the MailerLite affiliate portal, 2026-08-24", "data/software/mailerlite.json", "data/affiliate/active-partners.ts", "data/affiliate/canonical-ledger.ts"], lastVerifiedDate: "2026-08-24" }),
  record({ company: "Omnisend", slug: "omnisend", programNetwork: "Impact", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://your.omnisend.com/PznLej", commission: { type: "unknown", value: UNKNOWN, originalWording: "Per current Impact.com contract; exact current rate not recorded in durable evidence" }, readiness: "READY NOW", evidence: ["First-party Impact approval evidence dated 2026-08-19", "Owner-supplied exact referral URL, 2026-08-24", "data/software/omnisend.json", "data/affiliate/active-partners.ts", "data/affiliate/canonical-ledger.ts"], lastVerifiedDate: "2026-08-24" }),
  record({ company: "SurveyMonkey", slug: "surveymonkey", programNetwork: "PartnerStack", currentStatus: "PROGRAM_NOT_VERIFIED / FAIL-CLOSED", applicationStatus: "Approved (per 2026-08-24 owner-supplied evidence)", approvalStatus: "Asset ownership unconfirmed by vendor as of 2026-08-29", affiliateUrl: UNKNOWN, commission: { type: "unknown", value: UNKNOWN, originalWording: "Per current PartnerStack program terms; exact current rate not recorded in durable evidence" }, readiness: "HOLD / UNCLEAR", evidence: ["Owner screenshot of logged-in SurveyMonkey PartnerStack dashboard, 2026-08-24", "Owner-supplied exact referral URL, 2026-08-24 (historical, preserved in data/affiliate/canonical-ledger.ts, no longer used as the live CTA destination): https://try.partnerstack.com/jx99ylh3mexb", "data/software/surveymonkey.json", "data/affiliate/canonical-ledger.ts", "2026-08-29: SurveyMonkey affiliate manager has not yet confirmed first-party that this asset is genuinely Miloosh's own on the correct PartnerStack account -- removed from data/affiliate/active-partners.ts so the live CTA fails closed to the plain vendor URL"], lastVerifiedDate: "2026-08-29" }),
  record({ company: "ClickUp", slug: "clickup", programNetwork: "PartnerStack", currentStatus: "REJECTED", applicationStatus: "Rejected", approvalStatus: "Rejected", affiliateUrl: UNKNOWN, readiness: "REJECTED", evidence: ["First-party PartnerStack email dated 2026-08-21: After careful consideration, ClickUp has declined your application to join their program.", "data/affiliate/canonical-ledger.ts"], lastVerifiedDate: "2026-08-24" }),
  record({ company: "Close", slug: "close", programNetwork: "PartnerStack", currentStatus: "ACTIVE", applicationStatus: "Application submitted 2026-08-18; owner supplied a working referral link directly on 2026-08-21", approvalStatus: "Approved", affiliateUrl: "https://refer.close.com/0alqdg4so8rm", readiness: "READY NOW", evidence: [STATUS_DRAFT, "data/affiliate/active-partners.ts", "Owner-supplied verified referral URL, 2026-08-21", "Owner-supplied first-party Close one-pager describing Chloe (AI sales teammate), 2026-08-21"], lastVerifiedDate: "2026-08-21" }),
  record({ company: "Kit", slug: "kit", programNetwork: "PartnerStack", currentStatus: "REJECTED", applicationStatus: "Rejected", approvalStatus: "Rejected", readiness: "REJECTED", evidence: [LIVE_VERIFICATION, "CORRECTED TWICE in one day (2026-08-20). First correction (earlier today) wrongly concluded no application existed, based only on the 20-row Partnerships-table sweep, which omits declined applications. The program's own direct page (Application + Messages tabs) shows a real prior application (Business Name: Miloosh, miloosh.com, honest fields throughout) that was declined the same day by Kit's own team: first-party message from Jordan, Senior Affiliate Marketing Manager @ Kit -- 'After reviewing your application, we've decided not to move forward at this time,' citing audience/niche mismatch and insufficient promotional detail. Do not reapply without new evidence."], lastVerifiedDate: "2026-08-20" }),
  record({ company: "Hubstaff", slug: "hubstaff", programNetwork: "PartnerStack", currentStatus: "ACTIVE", applicationStatus: "Approved (pre-existing on the account, not applied to by this agent)", approvalStatus: "Approved", affiliateUrl: "https://affiliate.hubstaff.com/ca2oe167vcj1", commission: { type: "recurring_percentage", value: "30% year 1, or 20% year 1 (two offers shown)", originalWording: "Earn 30% for the customers first year! / Earn 20% in year one" }, readiness: "READY NOW", evidence: [LIVE_VERIFICATION, "Full 20-row PartnerStack partnerships sweep, 2026-08-20: Hubstaff shows Active with a real referral link. Activated on Miloosh with data/software/hubstaff.json built."], lastVerifiedDate: "2026-08-20" }),
  record({ company: "PDWare", slug: "pdware", programNetwork: "PartnerStack", currentStatus: "ACTIVE", applicationStatus: "Approved (pre-existing on the account, not applied to by this agent)", approvalStatus: "Approved", affiliateUrl: "https://try.pdware.com/9l2hndbyhssz", commission: { type: "fixed_cpa", value: "10% per Closed Referral", originalWording: "Earn 10% for each Closed Referrals!" }, readiness: "HOLD / UNCLEAR", evidence: [LIVE_VERIFICATION, "Full 20-row PartnerStack partnerships sweep, 2026-08-20: PDWare shows Active with a real referral link. PDWare has never appeared anywhere in this repo before -- no editorial content exists and it's unclear whether it fits Miloosh's catalog. Not activated."], lastVerifiedDate: "2026-08-20" }),
  ...[["HubSpot", "hubspot"], ["n8n", "n8n"]].map(([company, slug]) => record({ company: company!, slug: slug!, currentStatus: "REJECTED", applicationStatus: "Rejected", approvalStatus: "Rejected", readiness: "REJECTED", evidence: [STATUS_DRAFT], lastVerifiedDate: "2026-08-19" })),
  record({ company: "Brevo", slug: "brevo", programNetwork: "PartnerStack", currentStatus: "REJECTED (PartnerStack top-level partnership badge still shows Active — stale relative to this outcome)", applicationStatus: "Rejected", approvalStatus: "Rejected", affiliateUrl: UNKNOWN, readiness: "REJECTED", evidence: [LIVE_VERIFICATION, "Brevo first-party PartnerStack Messages thread, account hello@miloosh.com, program page BREVO: 'Your application was not approved... has been removed from our onboarding process' (dated Today, 2026-08-19), preceded by an 'under review' message dated Yesterday"], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Help Scout", slug: "help-scout", programNetwork: "PartnerStack", currentStatus: "REJECTED", applicationStatus: "Rejected", approvalStatus: "Rejected", affiliateUrl: UNKNOWN, readiness: "REJECTED", evidence: ["First-party PartnerStack email supplied by the owner on 2026-08-24: 'Help Scout has declined your application to join their program.'"], lastVerifiedDate: "2026-08-24" }),
  record({ company: "Shopify", slug: "shopify", programNetwork: "Impact", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://shopify.pxf.io/L0EG9O", readiness: "READY NOW", evidence: [STATUS_DRAFT, "data/software/shopify.json"], lastVerifiedDate: "2026-08-19" }),
  record({ company: "Wix", slug: "wix", programNetwork: "Impact", currentStatus: "ACTIVE", applicationStatus: "Approved", approvalStatus: "Approved", affiliateUrl: "https://wix.pxf.io/c/7623171/2096727/25616", readiness: "READY NOW", evidence: [STATUS_DRAFT, "data/software/wix.json"], lastVerifiedDate: "2026-08-19" }),
  // Flippa Activation + Recommend Expansion Super-Mission (2026-08-21).
  // Real, owner-supplied referral URL and first-party program terms. No
  // Miloosh catalog page/slug exists -- "flippa" here is an audit-tracking
  // identifier only, not a live page. readiness "HOLD / UNCLEAR" matches
  // the exact precedent set by the PDWare entry above: approved in-network,
  // but withheld because it's unclear/not yet justified whether it fits
  // Miloosh's catalog. See data/affiliate/canonical-ledger.ts's Flippa
  // entry for the full editorial-gate reasoning.
  record({
    company: "Flippa",
    slug: "flippa",
    programNetwork: "PartnerStack (Flippa's own referral program)",
    currentStatus: "APPROVED_NEEDS_EDITORIAL_CONTENT",
    applicationStatus: "Owner already has referral dashboard/resource access",
    approvalStatus: "Approved (referral URL live)",
    affiliateUrl: "https://referral.flippa.com/dhjx92ie474a",
    commission: {
      type: "revenue_share",
      value: "20% of qualifying Flippa fee",
      originalWording: "20% of the success fee paid to Flippa when an eligible referral acquires an online business; 20% of the listing fee when an eligible referral successfully lists a business; 20% of the success fee when an eligible referral successfully sells their listed business.",
    },
    recurrence: "one-time per qualifying transaction (acquisition, listing, or sale)",
    cookieWindow: "12 months (referral action window; last-referrer attribution if multiple referral links were used)",
    payoutThreshold: "$5 USD",
    payoutMethod: "PartnerStack",
    qualificationRules: "Listings below $5,000 do not qualify. Refunded/charged-back transactions before the payable date do not qualify. Referral actions qualify for up to 12 months after referral.",
    restrictions: "No distribution through coupon/discount sites. No PPC bidding on Flippa-related keywords. No self-referrals or group-company abuse. Site must not impersonate Flippa. Flippa logo must not be altered.",
    ppcTrademarkRestrictions: "No PPC bidding on Flippa-related keywords (explicit first-party term).",
    couponRestrictions: "No distribution through coupon/discount sites (explicit first-party term).",
    selfReferralRules: "No self-referrals / group-company abuse (explicit first-party term).",
    geographyRestrictions: "UNVERIFIED. Terms state an eligible-country requirement exists but the supplied evidence does not enumerate which countries qualify. Do not assume Israel (or any other specific country) is eligible or ineligible without direct first-party confirmation.",
    brandGuidelines: "Do not alter the Flippa logo (explicit first-party term). No further brand-asset detail supplied.",
    readiness: "HOLD / UNCLEAR",
    evidence: ["Owner-supplied referral URL (2026-08-21)", "Owner-supplied first-party Flippa Referral Program Terms (2026-08-21)"],
    lastVerifiedDate: "2026-08-21",
  }),
] as const;
