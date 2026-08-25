import {
  CANONICAL_AFFILIATE_LEDGER,
  type AffiliateProgramRelationship,
} from "@/data/affiliate/canonical-ledger";

/**
 * Operational projection over the historical canonical ledger.
 *
 * The raw ledger intentionally retains history, including network assumptions
 * that later became stale. Operational consumers should use this projection so
 * current queues/reports do not resurrect closed or disproven publisher paths.
 */
const replacements: readonly AffiliateProgramRelationship[] = [
  {
    programId: "shift4shop",
    programName: "Shift4Shop Affiliate Program",
    network: "Awin",
    productSlugs: ["shift4shop"],
    status: "OWNER_ACTION_REQUIRED",
    statusUpdatedAt: "2026-08-24",
    applicationSubmittedAt: null,
    decisionAt: null,
    affiliateUrl: null,
    commissionModel: "Current Awin advertiser terms; verify live terms before activation",
    cookieWindow: "120 days",
    evidence: [
      "Current Shift4Shop Awin merchant profile",
      "Awin migration notice confirming ShareASale closed on 2025-10-06",
    ],
    ownerBlocker: "Requires authenticated Awin publisher access if Miloosh chooses to pursue the program.",
    formBlocker: null,
    eligibility: "Current Awin advertiser program exists; Miloosh relationship not yet verified",
    applicationUrl: "https://ui.awin.com/merchant-profile/87645",
    notes: "Do not route the owner to ShareASale.",
  },
  {
    programId: "later",
    programName: "Later Affiliate Program",
    network: "PartnerStack",
    productSlugs: ["later"],
    status: "OWNER_ACTION_REQUIRED",
    statusUpdatedAt: "2026-08-24",
    applicationSubmittedAt: null,
    decisionAt: null,
    affiliateUrl: null,
    commissionModel: "30% or higher commission for every sale per current official Later page",
    cookieWindow: null,
    evidence: ["Current official Later affiliate page routes Apply now to PartnerStack"],
    ownerBlocker: "Defer authenticated application until PartnerStack account consolidation is resolved.",
    formBlocker: null,
    eligibility: "Official program is live; acceptance not guaranteed",
    applicationUrl: "https://later.com/affiliate-program/",
    notes: "Current route is PartnerStack, not ShareASale.",
  },
  {
    programId: "weebly",
    programName: "Weebly Affiliate Program",
    network: "Unverified",
    productSlugs: ["weebly"],
    status: "PROGRAM_NOT_VERIFIED",
    statusUpdatedAt: "2026-08-24",
    applicationSubmittedAt: null,
    decisionAt: null,
    affiliateUrl: null,
    commissionModel: "UNKNOWN",
    cookieWindow: null,
    evidence: ["2026-08-24 current-source sweep found no current official Weebly publisher application"],
    ownerBlocker: null,
    formBlocker: null,
    eligibility: "Current publisher program not verified",
    applicationUrl: null,
    notes: "Do not create an Awin/ShareASale account for Weebly from historical claims.",
  },
  {
    programId: "calendly-affiliate",
    programName: "Calendly Affiliate / Referral Program",
    network: "None currently",
    productSlugs: ["calendly"],
    status: "NO_REAL_PROGRAM_FOUND",
    statusUpdatedAt: "2026-08-24",
    applicationSubmittedAt: null,
    decisionAt: null,
    affiliateUrl: null,
    commissionModel: "N/A",
    cookieWindow: null,
    evidence: ["Calendly currently states it has no affiliate, referral, or reseller partner program"],
    ownerBlocker: null,
    formBlocker: null,
    eligibility: "No current affiliate/referral/reseller program",
    applicationUrl: null,
    notes: "Re-open only if Calendly publishes a new program.",
  },
  {
    programId: "coda-affiliate",
    programName: "Coda Affiliate Program",
    network: "Historical PartnerStack; future Superhuman/Impact direction",
    productSlugs: ["coda"],
    status: "PROGRAM_ENDED",
    statusUpdatedAt: "2026-08-24",
    applicationSubmittedAt: null,
    decisionAt: "2026-04-13",
    affiliateUrl: null,
    commissionModel: "Program ended",
    cookieWindow: null,
    evidence: ["Coda states its affiliate program closed on 2026-04-13"],
    ownerBlocker: null,
    formBlocker: null,
    eligibility: "Program ended",
    applicationUrl: null,
    notes: "Do not send owner to the historical PartnerStack program.",
  },
  {
    programId: "bigcommerce-affiliate",
    programName: "BigCommerce Affiliate Program",
    network: "Historical Impact.com",
    productSlugs: ["bigcommerce"],
    status: "PROGRAM_ENDED",
    statusUpdatedAt: "2026-08-25",
    applicationSubmittedAt: null,
    decisionAt: "2025-05-17",
    affiliateUrl: null,
    commissionModel: "Program ended",
    cookieWindow: null,
    evidence: ["Official BigCommerce Affiliate Program Closure page: program ended 2025-05-17 and tracking links were disabled"],
    ownerBlocker: null,
    formBlocker: null,
    eligibility: "Affiliate program ended; no replacement program announced on the official closure page",
    applicationUrl: null,
    notes: "Do not route Miloosh to the historical Impact affiliate application. Re-open only on new first-party BigCommerce evidence.",
  },
];

export const CURRENT_AFFILIATE_LEDGER: readonly AffiliateProgramRelationship[] = [
  ...CANONICAL_AFFILIATE_LEDGER
    .filter((relationship) => relationship.programId !== "shareasale-portfolio")
    .map((relationship): AffiliateProgramRelationship => {
      if (relationship.programId === "cj-portfolio") {
        return {
          ...relationship,
          programName: "Commission Junction (CJ) Publisher Accounts",
          productSlugs: ["1password", "quickbooks-online"],
          commissionModel: "Advertiser-specific CJ terms; verify live contract terms before activation",
          cookieWindow: null,
          eligibility: "Optional network; no currently active Miloosh affiliate depends on CJ",
          applicationUrl: "https://members.cj.com/",
          notes: "CJ is isolated to current CJ-required publisher targets. Do not treat historical Dashlane/Google/Acuity/Evernote planning claims as current advertiser relationships.",
        };
      }

      if (relationship.programId === "partnerstack-portfolio") {
        return {
          ...relationship,
          productSlugs: relationship.productSlugs.filter(
            (slug) => !["calendly", "coda", "quickbooks-online"].includes(slug)
          ),
          notes: "Current unresolved PartnerStack category programs only. Calendly has no current program, Coda's program ended, and QuickBooks publisher acquisition routes through CJ. Later is tracked separately.",
        };
      }

      if (relationship.programId === "impact-portfolio") {
        return {
          ...relationship,
          productSlugs: relationship.productSlugs.filter((slug) => slug !== "bigcommerce"),
          notes: `${relationship.notes} BigCommerce is excluded from this portfolio because its affiliate program ended on 2025-05-17.`,
        };
      }

      if (relationship.programId === "close") {
        return {
          ...relationship,
          statusUpdatedAt: "2026-08-25",
          evidence: [
            ...relationship.evidence,
            "First-party Close PartnerStack message dated 2026-08-24 confirming content publishers are not eligible for the Close Partner Directory",
          ],
          eligibility: "Approved affiliate/referral partner. Content publishers are not eligible for Close Partner Directory listings.",
          notes: `${relationship.notes} Close confirmed on 2026-08-24 that content publishers are not eligible for its Partner Directory. This directory restriction does not invalidate the active affiliate/referral relationship.`,
        };
      }

      return relationship;
    }),
  ...replacements,
] as const;
