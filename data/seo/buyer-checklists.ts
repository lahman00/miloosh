export type BuyerChecklist = {
  title: string;
  introduction: string;
  checks: Array<{ question: string; answer: string; source: string; sourceLabel: string }>;
  options: Array<{ slug: string; fit: string }>;
  verifiedAt: string;
};
export const BUYER_CHECKLISTS: Record<string, BuyerChecklist> = {
  wrike: {
    title: "Before replacing Wrike, check the billable work",
    introduction: "A lower headline price does not settle the switching decision. Take the same people, permissions, and renewal date into each vendor quote.",
    verifiedAt: "2026-09-10",
    checks: [
      { question: "Which clients and reviewers need paid access?", answer: "Wrike treats external users as paid full users. Contributors are paid limited-access licenses; viewers are free but have narrower permissions. Test the actual review and approval workflow before assuming every client can use a free seat.", source: "https://help.wrike.com/hc/en-us/articles/209603989-Types-of-Licenses-in-Wrike", sourceLabel: "Wrike license types" },
      { question: "Does the quote cover your actual seat count?", answer: "Wrike's pricing FAQ describes seats sold in groups of five up to 30 users, ten from 30 to 100, and 25 above that. Ask for the billable seat quantity and billing period in writing; do not estimate the invoice by multiplying your exact headcount by the headline rate.", source: "https://www.wrike.com/price/", sourceLabel: "Wrike pricing and billing FAQ" },
      { question: "When can a smaller subscription take effect?", answer: "Wrike directs seat reductions to an account or renewals manager. Reductions and downgrades generally take effect at renewal. Confirm the effective date before paying for a replacement, then test an export and rebuild one real workflow before moving the rest.", source: "https://help.wrike.com/hc/en-us/articles/209605689-Purchasing-Upgrading-and-Managing-Subscription", sourceLabel: "Wrike subscription management" },
    ],
    options: [{ slug: "wrike", fit: "Keep Wrike on the shortlist when the required permissions and workflows fit. Use the checklist to validate the subscription before committing." }],
  },
  klaviyo: {
    title: "Choosing a Klaviyo alternative: compare the same audience and sends",
    introduction: "Start with active contacts, monthly email sends, SMS destinations, and the automations you must keep. A free plan is useful only if the whole workload fits.",
    verifiedAt: "2026-09-10",
    checks: [
      { question: "Will the free tier hold your audience?", answer: "Klaviyo's free plan lists up to 250 active profiles and 500 email sends per month. A list of 2,500 active contacts does not fit, even if you send only a few campaigns a year. Compare the paid tier for that audience rather than a vendor's smallest advertised plan.", source: "https://www.klaviyo.com/pricing", sourceLabel: "Klaviyo pricing" },
      { question: "Are email, SMS, and migration priced separately?", answer: "Omnisend Standard lists monthly email sends at 12 times the list size. Pro's unlimited emails have a fair-use limit of 60 times the list. Check SMS credits and destinations separately. For a migration, ask which flows, segments, and templates the vendor will recreate and verify them before switching.", source: "https://www.omnisend.com/pricing/", sourceLabel: "Omnisend plan limits" },
      { question: "Will deleting contacts reduce this month's bill?", answer: "MailerLite counts addresses that were active at any point in the billing cycle, even if deleted later. Its free tier lists 250 subscribers and 2,500 monthly emails. Check both limits and the reset date; lowering a list today may not immediately lower the bill.", source: "https://www.mailerlite.com/pricing", sourceLabel: "MailerLite billing and sending limits" },
    ],
    options: [
      { slug: "omnisend", fit: "Evaluate Omnisend for an ecommerce email and SMS workflow. Test store events, consent records, and the flows that matter to your shop." },
      { slug: "mailerlite", fit: "Evaluate MailerLite when campaigns, signup forms, and a simpler email workflow cover the requirement. Validate required integrations and automation limits first." },
    ],
  },
};
export function getBuyerChecklist(slug: string): BuyerChecklist | undefined { return BUYER_CHECKLISTS[slug]; }
