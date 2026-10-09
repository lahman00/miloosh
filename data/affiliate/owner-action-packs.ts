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
    title: "PartnerStack payout verified — hello@miloosh.com",
    priority: 99,
    loginOrSignupUrl: "https://dash.partnerstack.com/",
    productsCovered: ["constant-contact", "todoist", "moosend", "volza", "pipedrive", "getresponse", "airtable", "krispcall", "hubstaff", "close", "surveymonkey", "freshbooks", "trainual", "callrail", "activecampaign", "apollo-io"],
    comparisonsAffected: 0,
    commissionEvidence: "PartnerStack Support confirmed PayPal connected on 2026-09-14. In ticket 124689 on 2026-10-01, Support answered Miloosh's explicit read-only payout-readiness question by confirming everything was set up correctly and the required tax location was filled; the account should be all set.",
    preFilledFields: { "Account email": "hello@miloosh.com", "Business / Property": "Miloosh", Website: "https://miloosh.com" },
    ownerRequiredFields: [],
    securityAndComplianceNotes: "No payout action is currently required. Do not expose or change bank, PayPal, tax, identity, password, or verification details unless PartnerStack itself reports a new account-specific requirement.",
    postCompletionAutomation: "Keep this rail VERIFIED unless new first-party PartnerStack evidence reports a payout or compliance problem. Program-specific commission conditions remain separate.",
  },
  {
    id: "partnerstack-personal-payout-rail",
    title: "2. Confirm withdrawal readiness on the already-connected legacy PartnerStack payout account",
    priority: 2,
    loginOrSignupUrl: "https://dash.partnerstack.com/",
    productsCovered: ["monday", "whatconverts", "elevenlabs", "wrike"],
    comparisonsAffected: 0,
    commissionEvidence: "Four active relationships remain tied to the legacy account. PartnerStack Support confirmed 2026-09-01 that its network decline does not invalidate existing partnerships. Support documented incomplete tax location and missing payout method on 2026-09-14. Owner screenshots 2026-10-09 now show the tax warning cleared and an ILS direct-deposit method connected. There is no separate VERIFIED status, withdrawal confirmation, conversion or received commission on record.",
    preFilledFields: { "Account email": "lahman00@gmail.com", "Business / Property": "Miloosh", Website: "https://miloosh.com" },
    ownerRequiredFields: [
      "Keep the four existing live referral URLs active; PartnerStack confirmed the network decline does not invalidate commissions or existing partnerships",
      "Do not reconnect or replace the existing payout provider: on 2026-10-09 the tax-location warning was gone and a direct-deposit method was connected",
      "Confirm the current payout provider is verified/withdrawal-ready through the authenticated account or a first-party PartnerStack support reply; if no confirmation is displayed, retain UNVERIFIED until the first valid withdrawal is demonstrably possible",
      "Do not close lahman00@gmail.com until any deliberate migration/re-application to hello@miloosh.com has preserved the four relationships and replacement tracking assets",
    ],
    securityAndComplianceNotes: "Never share an account password, bank/tax details, bank name or account digits, identity documents, provider credentials, or one-time codes. A connected ILS method does not establish verified eligibility, fees beyond the displayed account terms, or a successful withdrawal. Do not change financial settings without a first-party requirement.",
    postCompletionAutomation: "Keep the status UNVERIFIED after method connection; mark VERIFIED only after actual first-party confirmation of withdrawal readiness. Do not invent payout or commission evidence.",
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
      "Use the existing support flow to request Billing Address and Corporate Address corrections with the owner-verified full address",
      "Provide supporting proof only inside the same authorized Impact ticket if requested; do not create duplicate tickets",
      "After the address correction is accepted, confirm the payment-blocker banner is gone and payout/autopay status is ready",
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
    commissionEvidence: "MailerLite Affiliate Operations confirmed on 2026-09-14 that billing details are already present in Trackdesk but no payment method has been selected; the embedded Tipalti setup therefore remains incomplete.",
    preFilledFields: { "Affiliate / Property": "Miloosh", Website: "https://miloosh.com", "Business Email": "hello@miloosh.com" },
    ownerRequiredFields: [
      "Sign in to the existing MailerLite affiliate dashboard; do not create another account",
      "Open the existing Trackdesk payout settings and launch the embedded Tipalti setup",
      "Select an offered payment method and enter required tax/payment details locally",
      "Complete the flow until all three Tipalti setup checks are shown as complete",
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
      "Sign in to the existing Jotform partner dashboard; do not re-apply",
      "Open Payment History in the existing Jotform Partnerships dashboard",
      "Click Set Payout Email and complete the payout setup offered by Jotform/Tremendous locally",
    ],
    securityAndComplianceNotes: "Do not share Jotform or Tremendous passwords, tax IDs, bank details, or verification codes through chat.",
    postCompletionAutomation: "Record Jotform payout readiness only once the dashboard confirms the payout profile is complete.",
  },
  {
    id: "fireflies-firstpromoter-payout",
    title: "8. Fireflies / FirstPromoter payout verification",
    priority: 8,
    loginOrSignupUrl: "https://fireflies.firstpromoter.com/login",
    productsCovered: ["fireflies-ai"],
    comparisonsAffected: 0,
    commissionEvidence: "Fireflies issued Miloosh a unique referral URL on 2026-09-30. The official Fireflies affiliate page states up to 30% recurring commissions for 12 months, a 90-day purchase window, and PayPal payouts.",
    preFilledFields: { "Account email": "hello@miloosh.com", "Business / Property": "Miloosh", Website: "https://miloosh.com" },
    ownerRequiredFields: [
      "Sign in to the existing Fireflies / FirstPromoter affiliate account; do not create a duplicate account",
      "Open payout/payment settings and confirm the PayPal payout profile is configured and eligible to receive payments",
      "Confirm any required payout threshold/profile checks shown by the live dashboard before treating commissions as withdrawable",
    ],
    securityAndComplianceNotes: "Do not share PayPal credentials, tax information, passwords, identity documents, or verification codes through chat or source control.",
    postCompletionAutomation: "Mark the Fireflies payout rail VERIFIED only after the live FirstPromoter dashboard confirms payout readiness.",
  },
];
