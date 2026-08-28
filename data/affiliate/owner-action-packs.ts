// Current owner-only payout/account checkpoints for Miloosh.
// Never store passwords, bank/tax/identity data, payout-provider secrets, or 2FA here.

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
    id: "partnerstack-hello-payout-rail",
    title: "1. PartnerStack payout verification — hello@miloosh.com",
    priority: 1,
    loginOrSignupUrl: "https://dash.partnerstack.com/",
    productsCovered: ["constant-contact", "todoist", "moosend", "volza", "pipedrive", "getresponse", "airtable", "krispcall", "hubstaff", "close", "surveymonkey"],
    comparisonsAffected: 0,
    commissionEvidence: "PartnerStack Support confirmed hello@miloosh.com is the account containing Airtable/Pipedrive partnerships and activity; first-party partner mail corroborates the other relationships assigned to this account.",
    preFilledFields: { "Account email": "hello@miloosh.com", "Business / Property": "Miloosh", Website: "https://miloosh.com" },
    ownerRequiredFields: [
      "Sign in with the existing email-and-password PartnerStack account; PartnerStack Support explicitly warned not to use Google sign-in for this account",
      "Open Payouts/Payments and verify whether a payout provider is already linked and verified",
      "If incomplete, choose an actually offered payout provider and enter sensitive details locally",
      "Complete identity/provider verification only if PartnerStack requests it",
    ],
    securityAndComplianceNotes: "Do not put bank details, PayPal/Stripe credentials, identity documents, tax IDs, passwords, or verification codes in chat or source control. PartnerStack Airwallex direct deposit does not support virtual banks or foreign-currency accounts.",
    postCompletionAutomation: "Record this PartnerStack account payout rail as verified only after the dashboard confirms it.",
  },
  {
    id: "partnerstack-personal-payout-rail",
    title: "2. PartnerStack account decision required — lahman00@gmail.com (network application DECLINED)",
    priority: 2,
    loginOrSignupUrl: "https://dash.partnerstack.com/",
    productsCovered: ["monday", "whatconverts", "elevenlabs", "wrike"],
    comparisonsAffected: 0,
    commissionEvidence: "First-party monday.com application mail, WhatConverts/ElevenLabs affiliate mail, and the 2026-08-25 Wrike PartnerStack welcome/onboarding emails are tied to lahman00@gmail.com. PartnerStack Support (Nina R, ticket #121396, 2026-08-26) confirmed this account's network application status is DECLINED and recommended re-applying to these four programs from the approved hello@miloosh.com account instead. UPDATE 2026-08-28: owner has now directly asked PartnerStack whether Account #2's existing links remain commission-payable and whether these programs can be re-applied for from Account #1 while Account #2's links stay active; separately sent direct migration/re-approval inquiries to ElevenLabs, WhatConverts, and monday.com. No replies yet on any of these as of this update.",
    preFilledFields: { "Account email": "lahman00@gmail.com", "Business / Property": "Miloosh", Website: "https://miloosh.com" },
    ownerRequiredFields: [
      "Awaiting PartnerStack's reply on whether account #2's existing links remain commission-payable and whether these programs can be re-applied for from account #1 without losing account #2's tracking -- already asked 2026-08-28, do not act until it answers",
      "Awaiting ElevenLabs/WhatConverts/monday.com's individual replies to the direct migration/re-approval inquiries sent 2026-08-28",
      "Do not close lahman00@gmail.com and do not replace or deactivate any of its four existing live tracking URLs until the above replies are in -- doing so first risks losing the existing referral links/tracking history",
      "A Gmail-drafted 'please close the account' reply exists in ticket #121396's thread but was never sent -- it should not be sent without confirming the re-application path first",
      "Once a path is chosen, verify a payout provider is linked and complete in whichever account ends up holding these four partnerships",
    ],
    securityAndComplianceNotes: "Never share account password, bank/tax data, provider credentials, identity documents, or one-time codes. The same Airwallex virtual/foreign-currency bank restriction applies.",
    postCompletionAutomation: "Record this payout rail verified only once the account-level decision is made AND the resulting account's dashboard confirms payout readiness.",
  },
  {
    id: "impact-payout-rail",
    title: "3. Impact.com finance profile verification",
    priority: 3,
    loginOrSignupUrl: "https://app.impact.com/",
    productsCovered: ["shopify", "wix", "omnisend"],
    comparisonsAffected: 0,
    commissionEvidence: "Shopify, Wix, and Omnisend are verified active Miloosh Impact relationships and should share one Impact finance profile.",
    preFilledFields: { "Business / Property": "Miloosh", Website: "https://miloosh.com", "Business Email": "hello@miloosh.com" },
    ownerRequiredFields: [
      "Sign in to the existing Impact publisher account; do not re-apply to Shopify, Wix, or Omnisend",
      "Inspect Finance/Bank Account/Tax settings and verify whether one payout method is already complete",
      "If incomplete, enter tax/payment information locally and complete required verification",
      "Confirm payout/autopay configuration after the finance profile is accepted",
    ],
    securityAndComplianceNotes: "Do not share Impact password, tax forms, bank data, PayPal credentials, 2FA codes, or identity documents. Avoid changing valid banking details unnecessarily because Impact places a security hold after changes.",
    postCompletionAutomation: "Mark the Impact payout rail verified for all three active programs only after the finance dashboard confirms readiness.",
  },
  {
    id: "setmore-payout-method",
    title: "4. Setmore / Tapfiliate PayPal verification",
    priority: 4,
    loginOrSignupUrl: "https://setmore.tapfiliate.com/",
    productsCovered: ["setmore"],
    comparisonsAffected: 0,
    commissionEvidence: "Setmore's first-party welcome email explicitly instructs the affiliate to keep PayPal details updated to cash in; prior verification showed onboarding at Step 4, payout method.",
    preFilledFields: { Affiliate: "Miloosh", Website: "https://miloosh.com", "Payout method expected": "PayPal" },
    ownerRequiredFields: [
      "Sign in to the existing Setmore Tapfiliate account",
      "Check whether Step 4 / payout method is still incomplete",
      "Verify or update the PayPal payout details requested by Setmore locally",
      "Make PayPal primary if required",
    ],
    securityAndComplianceNotes: "Do not store PayPal credentials in chat or the repo. Do not substitute Payoneer merely because Tapfiliate supports it generically unless Setmore itself changes its instructions.",
    postCompletionAutomation: "Record Setmore payout readiness only after the portal shows PayPal payout setup completed.",
  },
  {
    id: "mailerlite-tipalti-payout",
    title: "5. MailerLite / Tipalti payout verification",
    priority: 5,
    loginOrSignupUrl: "https://www.mailerlite.com/affiliate",
    productsCovered: ["mailerlite"],
    comparisonsAffected: 0,
    commissionEvidence: "MailerLite is active and its current official payout flow uses embedded Trackdesk/Tipalti; no separate Tipalti acquisition task is needed.",
    preFilledFields: { "Affiliate / Property": "Miloosh", Website: "https://miloosh.com", "Business Email": "hello@miloosh.com" },
    ownerRequiredFields: [
      "Sign in to the existing MailerLite affiliate dashboard; do not create another account",
      "Open Billing/payout settings and verify whether the embedded Tipalti payout profile is complete",
      "If incomplete, select an offered payout method and enter tax/payment details locally",
      "Complete only verification requested by the embedded payout flow",
    ],
    securityAndComplianceNotes: "Do not create a duplicate Tipalti account. Never send tax IDs, bank details, passwords, identity documents, or verification codes through chat.",
    postCompletionAutomation: "Record MailerLite payout readiness only when the dashboard confirms the payout profile is complete.",
  },
  {
    id: "cj-dual-account-reconciliation",
    title: "6. CJ dual-account payout and advertiser reconciliation (optional rail)",
    priority: 6,
    loginOrSignupUrl: "https://members.cj.com/",
    productsCovered: ["1password", "quickbooks-online"],
    comparisonsAffected: 0,
    commissionEvidence: "CJ is optional for Miloosh's current active-partner payout system and retained only for current official CJ publisher paths such as 1Password and QuickBooks. CJ officially supports Payoneer payouts.",
    preFilledFields: {
      "Verified CJ Account A": "CID 8043935 — lahman00@gmail.com",
      "Verified CJ Account B": "CID 8048091 — hello@miloosh.com",
      "Promotional Property": "https://miloosh.com",
      "Business Name": "Miloosh",
    },
    ownerRequiredFields: [
      "Sign in to both existing CJ publisher accounts; do not create a third account",
      "Compare advertiser relationships, issued links, tax/payment readiness, and historical performance",
      "Confirm whether CID 8043935 payment setup is complete; the Aug 23 email proves payment-information activity only",
      "Check whether the already-ready Payoneer account is actually linked in CJ; do not infer linkage from timing alone",
      "Choose a canonical CJ account only after live evidence is recorded; do not delete/merge/deactivate either CID beforehand",
    ],
    securityAndComplianceNotes: "Never share CJ passwords, tax forms, banking/Payoneer details, or one-time codes. The business-email CID is not automatically canonical merely because it is newer.",
    postCompletionAutomation: "After canonical CID and payout readiness are proven, record the decision and activate only real approved CJ advertisers with SID tracking.",
  },
];
