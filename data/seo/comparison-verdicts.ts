/**
 * Hand-written decision rule and verdict for each v2 comparison page, written 2026-10-19.
 *
 * Every figure comes from the vendor's own pricing page as read that day (and stored in the two products' pricing records),
 * or from the products' sourced pros and cons. tests/seo/comparison-waves.test.ts requires each number to appear in that
 * data. The rule is at most two sentences; the verdict says what the choice depends on and names no winner.
 */
export type ComparisonVerdict = { rule: string; verdict: string };

export const VERDICTS_WRITTEN_ON = "2026-10-19";

export const COMPARISON_VERDICTS: Readonly<Record<string, ComparisonVerdict>> = {
  "apollo-io-vs-cognism": {
    rule: "Choose Apollo.io if you want published seat prices and a free plan to start with; choose Cognism if phone-verified contact data and compliance screening matter more to you than a public price.",
    verdict: "Apollo.io lists a free plan and paid plans from $49 per seat per month billed annually. Cognism publishes no prices and offers a free data sample rather than a trial; its Standard and Pro plans each include 5 seats.",
  },
  "apollo-io-vs-linkedin-sales-navigator": {
    rule: "Choose Apollo.io if you want prospect data, sequences and a dialer in one platform with a free entry plan; choose LinkedIn Sales Navigator if you want to research and message decision-makers inside LinkedIn.",
    verdict: "Apollo.io lists a free plan and paid plans from $49 per seat per month billed annually, with a credit allowance on every plan. LinkedIn Sales Navigator lists $119.99 per license per month for Core and $159.99 for Advanced, and caps InMail at 50 a month.",
  },
  "apollo-io-vs-outreach": {
    rule: "Choose Apollo.io if you want contact data, sequences and a dialer with seat prices you can see; choose Outreach if you already run sequences and want deal and forecast visibility on a quote-based plan.",
    verdict: "Apollo.io lists a free plan and paid plans from $49 per seat per month billed annually. Outreach publishes no dollar prices: its plans are named by AI-credit allowance, and every call to action is Request pricing.",
  },
  "apollo-io-vs-salesloft": {
    rule: "Choose Apollo.io if you want prospect data with sequences, a dialer and public seat prices; choose Salesloft if you want structured cadences with Clari forecasting in one workspace and are ready for a sales conversation.",
    verdict: "Apollo.io lists a free plan and paid plans from $49 per seat per month billed annually. Salesloft publishes no prices or plan names, and its only call to action is Talk to Sales; its merger with Clari closed on December 3, 2025.",
  },
  "callrail-vs-ruler-analytics": {
    rule: "Choose CallRail if inbound phone leads drive your business and you want call tracking you can try for 14 days; choose Ruler Analytics if you need closed-won revenue attribution across a long B2B sales cycle and have CRM data to connect.",
    verdict: "CallRail's plans run from $50 to $195 a month plus usage and include a 14-day free trial. Ruler Analytics starts at £299 a month for up to 10k monthly visits, rises with traffic, and lists no free trial; its Get Started button leads to a demo booking page.",
  },
  "krispcall-vs-dialpad": {
    rule: "Choose KrispCall if you want a low-priced cloud phone system with global numbers for a small team; choose Dialpad if native AI call transcription and summaries matter to you.",
    verdict: "KrispCall lists plans from $12 per user per month and includes a 14-day money-back guarantee on paid plans. Dialpad's Connect plans list $15 for Standard and $25 for Pro, with a 14-day free trial.",
  },
  "krispcall-vs-nextiva": {
    rule: "Choose KrispCall if a low price and a simple cloud phone for a small team matter most; choose Nextiva if 24/7 live telephone support and a unified phone, video and chat interface matter more.",
    verdict: "KrispCall lists plans from $12 per user per month. Nextiva's small business plans list $15, $25 and $75 per user per month and its contact center plan starts at $75 per agent per month; its pricing page shows two figures for each small business plan without saying which is annual.",
  },
  "whatconverts-vs-callrail": {
    rule: "Choose WhatConverts if you track calls, forms and chats from many ad platforms or run an agency and want a white-label option; choose CallRail if inbound phone leads are the focus.",
    verdict: "WhatConverts' single-account plans run from $30 to $160 a month plus usage, with a $30 usage credit and a 14-day trial. CallRail's plans run from $50 to $195 a month plus usage with a 14-day trial, and its conversation intelligence is on the $150 and $195 plans.",
  },
};

export function getComparisonVerdict(slug: string): ComparisonVerdict | null {
  return COMPARISON_VERDICTS[slug] ?? null;
}
