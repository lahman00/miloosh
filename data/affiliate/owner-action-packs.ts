/**
 * OWNER ACTION EXECUTION PACKS
 *
 * Current owner-only account and payout actions for Miloosh.
 *
 * This file deliberately does not store passwords, tax identifiers, bank
 * details, identity documents, one-time codes, or payout-provider secrets.
 * Non-sensitive execution should be automated elsewhere; these packs describe
 * only the points where the account owner may need to authenticate, choose a
 * payout method, enter sensitive information locally, or approve verification.
 */

export interface OwnerActionPack {
  id: string;
  title: string;
  priority: number;
  loginOrSignupUrl: string;
  productsCovered: string[];
  comparisonsAffected: number;
  commissionEvidence: string;
  preFilledFields: Record<string, string>;
  ownerRequiredFields: string[];
  securityAndComplianceNotes: string;
  postCompletionAutomation: string;
}

export const OWNER_ACTION_PACKS: readonly OwnerActionPack[] = [
  {
    id: "partnerstack-payout-rail",
    title: "1. PartnerStack payout method verification",
    priority: 1,
    loginOrSignupUrl: "https://dash.partnerstack.com/",
    productsCovered: [
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
    comparisonsAffected: 0,
    commissionEvidence: "Fourteen verified active Miloosh relationships share PartnerStack. Payout readiness is a network-level concern, not fourteen separate banking setups.",
    preFilledFields: {
      "Business / Property": "Miloosh",
      "Website": "https://miloosh.com",
      "Business Email": "hello@miloosh.com",
    },
    ownerRequiredFields: [
      "Sign in to the existing PartnerStack account; do not create a duplicate account",
      "Inspect the Payouts/Payments area and verify whether a payout provider is already linked and verified",
      "If incomplete, choose only a payout method actually offered to this account and enter the sensitive details locally",
      "Complete identity or payout-provider verification only if PartnerStack requests it",
    ],
    securityAndComplianceNotes: "Do not put bank details, PayPal/Stripe credentials, identity documents, tax IDs, passwords, or verification codes in chat, source control, logs, or screenshots shared with agents.",
    postCompletionAutomation: "Record the network payout rail as verified once the dashboard itself shows a completed payout method. Do not repeat payout setup program-by-program for PartnerStack relationships.",
  },
  {
    id: "impact-payout-rail",
    title: "2. Impact.com finance profile verification",
    priority: 2,
    loginOrSignupUrl: "https://app.impact.com/",
    productsCovered: ["shopify", "wix", "omnisend"],
    comparisonsAffected: 0,
    commissionEvidence: "Shopify, Wix, and Omnisend are already verified active Miloosh relationships on Impact. They should share one correctly configured Impact finance profile.",
    preFilledFields: {
      "Business / Property": "Miloosh",
      "Website": "https://miloosh.com",
      "Business Email": "hello@miloosh.com",
    },
    ownerRequiredFields: [
      "Sign in to the existing Impact publisher account; do not re-apply to Shopify, Wix, or Omnisend",
      "Inspect Finance/Bank Account/Tax settings and verify whether one payout method is already complete",
      "If incomplete, enter tax/payment information locally and complete any required account verification",
      "Confirm the payout/autopay configuration after the finance profile is accepted",
    ],
    securityAndComplianceNotes: "Do not share Impact password, tax forms, bank account data, PayPal credentials, 2FA codes, or identity documents with agents or store them in the repository.",
    postCompletionAutomation: "Mark the Impact payout rail verified for Shopify, Wix, and Omnisend only after the finance dashboard confirms readiness. No separate finance setup is needed per active Impact program unless Impact explicitly requires it.",
  },
  {
    id: "setmore-payout-method",
    title: "3. Setmore / Tapfiliate payout method",
    priority: 3,
    loginOrSignupUrl: "https://setmore.tapfiliate.com/",
    productsCovered: ["setmore"],
    comparisonsAffected: 0,
    commissionEvidence: "Setmore is a verified active affiliate relationship. Prior first-party verification showed its Tapfiliate onboarding at Step 4, payout method.",
    preFilledFields: {
      "Affiliate": "Miloosh",
      "Website": "https://miloosh.com",
    },
    ownerRequiredFields: [
      "Sign in to the existing Setmore Tapfiliate account",
      "Check whether Step 4 / payout method is still incomplete",
      "If incomplete, choose only a payout method Setmore actually exposes in this account and enter the details locally",
      "Make the selected payout method primary if the portal requires it",
    ],
    securityAndComplianceNotes: "A generic Tapfiliate capability is not proof that Setmore offers that method. Payoneer may be used only if Setmore actually exposes it. Never store payout identifiers in the repo.",
    postCompletionAutomation: "Record Setmore payout readiness only after the affiliate portal shows a completed payout method.",
  },
  {
    id: "mailerlite-tipalti-payout",
    title: "4. MailerLite / Tipalti payout verification",
    priority: 4,
    loginOrSignupUrl: "https://www.mailerlite.com/affiliate",
    productsCovered: ["mailerlite"],
    comparisonsAffected: 0,
    commissionEvidence: "MailerLite is a verified active direct affiliate. Current MailerLite payout documentation routes affiliate payments through its Trackdesk/Tipalti flow rather than a standalone Miloosh Tipalti acquisition task.",
    preFilledFields: {
      "Affiliate / Property": "Miloosh",
      "Website": "https://miloosh.com",
      "Business Email": "hello@miloosh.com",
    },
    ownerRequiredFields: [
      "Sign in to the existing MailerLite affiliate dashboard; do not create another affiliate account",
      "Open payout settings and verify whether the embedded Tipalti payout profile is already complete",
      "If incomplete, select an offered payout method and enter tax/payment details locally",
      "Complete only the identity/tax/payment verification that the embedded payout flow requests",
    ],
    securityAndComplianceNotes: "Do not create a duplicate Tipalti account merely because Tipalti is the payout processor. Never send tax IDs, bank details, passwords, identity documents, or verification codes through chat or commit them.",
    postCompletionAutomation: "Once MailerLite shows a completed payout profile, record MailerLite as payout-ready. Keep payout eligibility/threshold logic separate from account-setup readiness.",
  },
  {
    id: "cj-dual-account-reconciliation",
    title: "5. CJ dual-account payout and advertiser reconciliation (optional rail)",
    priority: 5,
    loginOrSignupUrl: "https://members.cj.com/",
    productsCovered: ["1password", "quickbooks-online"],
    comparisonsAffected: 0,
    commissionEvidence: "CJ is not a core payout rail for the 19 currently active Miloosh partners. Preserve it only for vendors whose current official publisher path genuinely uses CJ, including 1Password and QuickBooks.",
    preFilledFields: {
      "Verified CJ Account A": "CID 8043935 — lahman00@gmail.com",
      "Verified CJ Account B": "CID 8048091 — hello@miloosh.com",
      "Promotional Property": "https://miloosh.com",
      "Property Type": "Website / Content / Comparison Engine",
      "Business Name": "Miloosh",
    },
    ownerRequiredFields: [
      "Sign in to both existing CJ publisher accounts; do not create a third account",
      "Compare active advertiser relationships, pending/rejected applications, issued tracking links, tax/payment readiness, and any historical clicks/conversions",
      "Confirm whether CID 8043935 payment setup is complete; a first-party 2026-08-23 email proves payment-information activity but not full readiness",
      "Choose a canonical CJ account only after the live evidence is recorded; do not delete, merge, or deactivate either CID beforehand",
    ],
    securityAndComplianceNotes: "Never share CJ passwords, tax forms, banking details, Payoneer receiving details, or one-time verification codes with agents. The business-email CID is not automatically canonical merely because it is newer.",
    postCompletionAutomation: "After the canonical CID and payout readiness are proven, record the decision and advertiser relationships. Generate/activate CJ tracking links only for real approved advertisers and preserve SID tracking.",
  },
];
