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
    productsCovered: ["constant-contact", "todoist", "moosend", "volza", "pipedrive", "getresponse", "airtable", "krispcall", "hubstaff", "close", "surveymonkey", "freshbooks", "trainual", "apollo-io"],
    comparisonsAffected: 0,
    commissionEvidence: "PartnerStack Support confirmed hello@miloosh.com is the business account for the assigned relationships and, on 2026-09-14, confirmed a PayPal account is connected. Full tax/receipt-profile and withdrawal readiness were not explicitly confirmed.",
    preFilledFields: { "Account email": "hello@miloosh.com", "Business / Property": "Miloosh", Website: "https://miloosh.com" },
    ownerRequiredFields: [
      "Sign in with the existing email-and-password PartnerStack account; PartnerStack Support explicitly warned not to use Google sign-in for this account",
      "Open Team settings → Commissions / receipt details and verify the tax-registered location and payout-status checks",
      "Confirm the already-connected PayPal provider is verified and withdrawal-ready; do not replace it merely to change rails",
      "Complete any remaining tax/location or provider verification locally only if the dashboard requires it",
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
    commissionEvidence: "The four active relationships are tied to lahman00@gmail.com. PartnerStack Support confirmed on 2026-09-01 that the DECLINED network application does not affect commissions or existing partnerships. On 2026-09-14 Support confirmed this account has no payment provider connected and needs a tax-registered location before it can connect a method or withdraw commissions.",
    preFilledFields: { "Account email": "lahman00@gmail.com", "Business / Property": "Miloosh", Website: "https://miloosh.com" },
    ownerRequiredFields: [
      "Keep the four existing live referral URLs active; PartnerStack confirmed the network decline does not invalidate commissions or existing partnerships",
      "In Team settings → Commissions / receipt details, add the tax-registered location using owner-verified information",
      "Connect an actually offered payout provider locally and complete any required verification",
      "Do not close lahman00@gmail.com until any deliberate migration/re-application to hello@miloosh.com has preserved the four relationships and replacement tracking assets",
    ],
    securityAndComplianceNotes: "Never share account password, bank/tax data, provider credentials, identity documents, or one-time codes. The same Airwallex virtual/foreign-currency bank restriction applies.",
    postCompletionAutomation: "Record this payout rail verified only once the account-level decision is made AND the resulting account's dashboard confirms payout readiness.",
  },
  {
    id: "impact-payout-rail",
    title: "3. Impact bank review (preserve submitted details)",
    priority: 3,
    loginOrSignupUrl: "https://app.impact.com/",
    productsCovered: ["shopify", "wix", "omnisend"],
    comparisonsAffected: 0,
    commissionEvidence: "Three active programs share the Impact rail. Owner screenshot 2026-09-30 supersedes the prior missing-city checkpoint with pending provider bank review; this is not confirmed payout approval.",
    preFilledFields: { "Business / Property": "Miloosh", Website: "https://miloosh.com", "Business Email": "hello@miloosh.com" },
    ownerRequiredFields: [
      "Use the existing Impact publisher account; no new application for Shopify, Wix or Omnisend.",
      "Current screenshot shows banking review pending when a payable balance is due. Check current autopay/status read-only; do not change submitted bank details.",
      "Historical ticket 880838 is closed; do not email the closed no-reply thread. Do not open a new authenticated support request solely from that historical ticket while the provider review is pending.",
      "Escalate once only if the current portal specifically requests corrections or a due payout is blocked."
    ],
    securityAndComplianceNotes: "Do not share Impact password, tax forms, bank data, PayPal credentials, 2FA codes, or identity documents. Avoid changing valid banking details unnecessarily because Impact places a security hold after changes.",
    postCompletionAutomation: "Mark the Impact payout rail verified for all three active programs only after the finance dashboard confirms readiness.",
  },
  {
    id: "setmore-payout-method",
    title: "4. Setmore saved payout verification (owner reports complete)",
    priority: 4,
    loginOrSignupUrl: "https://setmore.tapfiliate.com/",
    productsCovered: ["setmore"],
    comparisonsAffected: 0,
    commissionEvidence: "Setmore remains an approved affiliate; owner reports payout setup completed 2026-09-30. This is not an independent successful-payment verification.",
    preFilledFields: { Affiliate: "Miloosh", Website: "https://miloosh.com", "Payout method expected": "PayPal" },
    ownerRequiredFields: [
      "Owner reported completing onboarding and PayPal on 2026-09-30.",
      "Check the existing saved payout-method status read-only; do not re-request already completed details or restart onboarding.",
      "Only resolve a new explicit validation error if the portal shows one."
    ],
    securityAndComplianceNotes: "Do not store PayPal credentials in chat or the repo. Do not substitute Payoneer merely because Tapfiliate supports it generically unless Setmore itself changes its instructions.",
    postCompletionAutomation: "Record Setmore payout readiness only after the portal shows PayPal payout setup completed.",
  },
  {
    id: "mailerlite-tipalti-payout",
    title: "5. MailerLite / Tipalti provider approval pending",
    priority: 5,
    loginOrSignupUrl: "https://www.mailerlite.com/affiliate",
    productsCovered: ["mailerlite"],
    comparisonsAffected: 0,
    commissionEvidence: "Authenticated Trackdesk/Tipalti on 2026-10-02 shows contact information added and payment method selected; Trackdesk saved the Tipalti rail as Default. Provider account approval remains pending.",
    preFilledFields: { "Affiliate / Property": "Miloosh", Website: "https://miloosh.com", "Business Email": "hello@miloosh.com" },
    ownerRequiredFields: [
      "No owner action while Tipalti Account approved remains pending.",
      "Check the existing profile read-only when reviewing payout readiness; do not create a duplicate Tipalti profile or replace the saved payment method.",
      "Act only if Tipalti or MailerLite presents a new explicit correction request."
    ],
    securityAndComplianceNotes: "Do not create a duplicate Tipalti account. Never send tax IDs, bank details, passwords, identity documents, or verification codes through chat.",
    postCompletionAutomation: "Record MailerLite payout readiness only when the dashboard confirms provider approval and payout readiness.",
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
  {
    id: "jotform-tremendous-payout",
    title: "7. Jotform / Tremendous payout verification",
    priority: 7,
    loginOrSignupUrl: "https://www.jotform.com/partnership/affiliate/",
    productsCovered: ["jotform"],
    comparisonsAffected: 0,
    commissionEvidence: "Jotform Affiliate Marketing confirmed on 2026-09-14 that Miloosh's payout setup has not been completed. The existing partner account and account-specific tracking links remain active.",
    preFilledFields: { "Account": "Eyal_hello", "Business Email": "hello@miloosh.com", Website: "https://miloosh.com" },
    ownerRequiredFields: [
      "Complete the existing Jotform KYC form; do not re-apply for the affiliate program.",
      "Provide the government-issued ID number and front/reverse ID images directly in Jotform's KYC form; these owner-only identity materials must not be stored in chat or source control.",
      "Continue the already-prepared Standard Payout (PayPal only) flow only after KYC can be completed; current intended PayPal email is the owner-verified account used during setup.",
      "Upload the PayPal account-details screenshot requested by Jotform and review all declarations before final KYC submission."
    ],
    securityAndComplianceNotes: "Do not share Jotform or Tremendous passwords, tax IDs, bank details, or verification codes through chat.",
    postCompletionAutomation: "Record Jotform payout readiness only once the dashboard confirms the payout profile is complete.",
  },
  {
    "id": "fireflies-payout-method",
    "title": "8. Fireflies / FirstPromoter payout verification",
    "priority": 8,
    "loginOrSignupUrl": "https://fireflies.firstpromoter.com/login",
    "productsCovered": [
      "fireflies-ai"
    ],
    "comparisonsAffected": 0,
    "commissionEvidence": "Exact account offer: 10% recurring commission. Authenticated FirstPromoter plus owner screenshot on 2026-10-02 confirm PayPal Selected; successful withdrawal remains unverified.",
    "preFilledFields": {
      "Account email": "hello@miloosh.com",
      "Website": "https://miloosh.com"
    },
    "ownerRequiredFields": [
      "No new payout-method selection is required while the existing PayPal method remains Selected.",
      "Check the saved method read-only if a payout becomes due; do not replace it unless FirstPromoter presents a new explicit validation problem.",
      "Treat earned commission and successful withdrawal as separate facts."
    ],
    "securityAndComplianceNotes": "Never store bank, PayPal credentials, tax IDs, identity documents or one-time codes in source control.",
    "postCompletionAutomation": "Mark verified only after the existing vendor portal explicitly confirms the payout configuration; earned and paid commissions remain separate facts."
  },
  {
    "id": "zoho-direct-payout",
    "title": "9. Zoho direct payout verification",
    "priority": 9,
    "loginOrSignupUrl": "https://store.zoho.com/zstore#commissions/updatebankdetails",
    "productsCovered": [
      "zoho-crm",
      "zoho-books",
      "zoho-projects",
      "zoho-desk",
      "zoho-flow",
      "zoho-campaigns"
    ],
    "comparisonsAffected": 0,
    "commissionEvidence": "Zoho October 1 onboarding confirms Standard 15% of actual payment for the first 12 months; qualified referrals only.",
    "preFilledFields": {
      "Account email": "hello@miloosh.com",
      "Website": "https://miloosh.com"
    },
    "ownerRequiredFields": [
      "Inspect existing Payment Method and Billing Details without changing saved values.",
      "Complete any vendor-required bank/tax details locally using verified owner information; no details through chat.",
      "Record payout-profile approval separately from issued links, Multi DC approval and received payments."
    ],
    "securityAndComplianceNotes": "No account merging, no replacement payment method, and no bank, tax, password or verification-code information in source control.",
    "postCompletionAutomation": "Mark VERIFIED only when current first-party evidence confirms all withdrawal setup requirements are complete."
  },
];
