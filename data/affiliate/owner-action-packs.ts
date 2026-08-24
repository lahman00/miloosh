/**
 * OWNER ACTION EXECUTION PACKS
 *
 * Structured instructions for the 5 highest-leverage owner actions.
 * Used to streamline owner execution so Antigravity can immediately activate programs.
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
    id: "impact-publisher-account",
    title: "1. Impact.com Publisher Portal Login & Tax Setup (W-8BEN / W-9)",
    priority: 1,
    loginOrSignupUrl: "https://app.impact.com/",
    productsCovered: [
      "semrush", "lastpass", "woocommerce", "sprout-social", "hootsuite",
      "smartsheet", "mailchimp", "shopify", "bigcommerce", "wix", "squarespace",
      "grammarly", "bitwarden", "ringcentral", "nextiva", "craft", "keeper",
      "keeper-security", "ecwid", "moz"
    ],
    comparisonsAffected: 178,
    commissionEvidence: "Impact.com verified publisher rates ($200 CPA Semrush, 25% LastPass, $100-$150 RingCentral/Nextiva, 20% Ecwid/Craft/Keeper, $25 Moz)",
    preFilledFields: {
      "Company / Site Name": "Miloosh",
      "Website URL": "https://miloosh.com",
      "Contact Email": "hello@miloosh.com",
      "Business Model": "Content / Reviews / Software Research & Comparison",
      "Primary Property": "https://miloosh.com (Software Comparison Platform)"
    },
    ownerRequiredFields: [
      "Account Login / Password for Impact.com",
      "Tax Classification (W-8BEN for non-US / W-9 for US entity)",
      "Bank Account / PayPal payout routing details",
      "Click 'Apply / Join Campaign' for each brand inside Impact marketplace"
    ],
    securityAndComplianceNotes: "Owner only — never share passwords or tax documents with AI agents. Ensure compliance with FTC affiliate disclosure requirements.",
    postCompletionAutomation: "Once campaigns are approved and affiliate URLs generated, paste the URLs into data/affiliate/active-partners.ts to enable automatic tracking and CTA rendering across 178 comparison surfaces."
  },
  {
    id: "partnerstack-marketplace-confirmation",
    title: "2. PartnerStack In-App Category & Audience Profile Confirmation",
    priority: 2,
    loginOrSignupUrl: "https://dash.partnerstack.com/",
    productsCovered: [
      "document360", "mixpanel", "reclaim-ai", "dialpad", "calendly", "motion",
      "guru", "scribe", "nutshell", "keap", "ruler-analytics", "front", "descript",
      "hotjar", "coda", "klaviyo", "gorgias", "quickbooks-online", "miro", "partnerstack"
    ],
    comparisonsAffected: 167,
    commissionEvidence: "PartnerStack standard marketplace offers (15-30% recurring on Document360, Reclaim AI, Guru, Scribe, Nutshell, Keap, Front, Descript, Hotjar)",
    preFilledFields: {
      "Website URL": "https://miloosh.com",
      "Publisher Category": "Software Review & Comparison Platform",
      "Audience Description": "SMB owners, growth operators, freelancers, and software buyers researching B2B SaaS solutions",
      "Primary Traffic Source": "Organic Search (Google / Bing / LLM Search Referrals)"
    },
    ownerRequiredFields: [
      "Sign in to existing PartnerStack Account (hello@miloosh.com)",
      "Select monthly traffic bracket / audience size on vendor-specific in-app forms",
      "Accept updated PartnerStack network referral terms",
      "Confirm agency/reseller checkbox as 'Affiliate / Publisher / Content Creator'"
    ],
    securityAndComplianceNotes: "Do not select 'Reseller / Certified Implementation Agency' unless formal certified deployment proofs are available.",
    postCompletionAutomation: "PartnerStack will approve applications directly into the existing authenticated dashboard. Running `npm run affiliate:status` will pull new active links."
  },
  {
    id: "cj-dual-account-reconciliation",
    title: "3. CJ Dual-Account Reconciliation (do not create a third account)",
    priority: 3,
    loginOrSignupUrl: "https://members.cj.com/",
    productsCovered: [
      "1password", "dashlane", "acuity-scheduling", "google-meet", "google-chat", "evernote"
    ],
    comparisonsAffected: 64,
    commissionEvidence: "Advertiser-specific rates must be verified inside the live CJ account before activation; do not treat historical planning figures as current contract terms.",
    preFilledFields: {
      "Verified CJ Account A": "CID 8043935 — lahman00@gmail.com",
      "Verified CJ Account B": "CID 8048091 — hello@miloosh.com",
      "Promotional Property": "https://miloosh.com",
      "Property Type": "Website / Content / Comparison Engine",
      "Business Name": "Miloosh"
    },
    ownerRequiredFields: [
      "Sign in to both existing CJ publisher accounts; do not create another account",
      "Compare active advertiser relationships, pending/rejected applications, issued tracking links, tax/payment readiness, and any historical clicks/conversions",
      "Choose a canonical account only after that evidence is visible",
      "Do not delete, merge, deactivate, or abandon either CID before the comparison is recorded"
    ],
    securityAndComplianceNotes: "First-party Gmail evidence confirms both CIDs are real: CID 8043935 is tied to lahman00@gmail.com and had payment-information activity on 2026-08-23; CID 8048091 is tied to hello@miloosh.com and was created/configured on 2026-08-19/20. Never share passwords, tax forms, banking details, or one-time verification codes with AI agents.",
    postCompletionAutomation: "After the canonical CID is chosen from live account evidence, record that decision and advertiser relationships in the canonical affiliate ledger; only then generate/activate CJ tracking links with SID tracking."
  },
  {
    id: "zoho-affiliate-ecosystem",
    title: "4. Zoho Affiliate Ecosystem Password Account Creation",
    priority: 4,
    loginOrSignupUrl: "https://www.zoho.com/affiliate.html",
    productsCovered: [
      "zoho-crm", "zoho-books", "zoho-projects", "zoho-desk", "zoho-analytics"
    ],
    comparisonsAffected: 45,
    commissionEvidence: "Zoho 15% recurring on all ecosystem subscriptions for 12 months",
    preFilledFields: {
      "Website": "https://miloosh.com",
      "Company Name": "Miloosh",
      "Promotion Type": "Review & Comparison Platform"
    },
    ownerRequiredFields: [
      "Create Zoho master account and password",
      "Accept Zoho Affiliate Program Agreement",
      "Set up PayPal or direct wire transfer payout details"
    ],
    securityAndComplianceNotes: "Requires owner password creation.",
    postCompletionAutomation: "Provide the Zoho affiliate tracking code (zoho.to/...) to unlock 45 Zoho ecosystem comparison surfaces."
  },
  {
    id: "shareasale-account-creation",
    title: "5. ShareASale Publisher Account Registration",
    priority: 5,
    loginOrSignupUrl: "https://www.shareasale.com/newsignup.cfm",
    productsCovered: [
      "wpengine", "freshbooks", "optinmonster"
    ],
    comparisonsAffected: 22,
    commissionEvidence: "$200 CPA on WP Engine, $5-$10/lead + $55/sale on FreshBooks, 20% on OptinMonster",
    preFilledFields: {
      "Username": "miloosh",
      "Website URL": "https://miloosh.com",
      "Website Description": "Independent B2B software research, alternatives, and comparisons"
    },
    ownerRequiredFields: [
      "Set account password",
      "Confirm verification PIN sent to hello@miloosh.com",
      "Complete W-8BEN/W-9 tax form"
    ],
    securityAndComplianceNotes: "Requires owner email verification code.",
    postCompletionAutomation: "Join WP Engine and OptinMonster merchant programs; insert affiliate links into active registry."
  }
];
