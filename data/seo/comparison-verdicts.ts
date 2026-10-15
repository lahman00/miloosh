/**
 * Hand-written decision rule and verdict for each v2 comparison page.
 *
 * Every figure and claim must come from the two products' stored data (pricing, sourced pros and cons, best-for):
 * tests/seo/comparison-waves.test.ts requires each number in the text to appear in that data. The rule is at most
 * two sentences; the verdict says what the choice depends on, and names no winner the data cannot support.
 * Written 2026-10-12 from the data as checked on the dates each product page shows.
 */
export type ComparisonVerdict = { rule: string; verdict: string };

export const COMPARISON_VERDICTS: Readonly<Record<string, ComparisonVerdict>> = {
  "apollo-io-vs-linkedin-sales-navigator": {
    rule: "Choose Apollo.io if you want prospect data, outreach sequences and a dialer in one platform with a free plan; choose LinkedIn Sales Navigator if you want to research and message decision-makers directly on LinkedIn.",
    verdict: "Apollo.io has a free plan and paid plans from $49 per seat a month billed annually, with a credit system on top of the seat price. LinkedIn Sales Navigator has no free plan and starts at $119.99 per month per license, with InMail capped at 50 a month.",
  },
  "bamboohr-vs-gusto": {
    rule: "Choose BambooHR if you want an HR system of record with hiring, onboarding and performance tools; choose Gusto if payroll and benefits for a US small business are the main job.",
    verdict: "BambooHR starts at $10 per employee a month with a 7-day trial, or a flat rate from $250 a month for 25 or fewer employees. Gusto starts at a $49 monthly base fee plus $6 per person, billed month to month, and its Simple plan excludes most HR tools; BambooHR sells payroll as an add-on.",
  },
  "bill-vs-ramp": {
    rule: "Choose BILL if you want a free corporate card plus optional per-user accounts payable and receivable automation; choose Ramp if you want a free card bundled with AI-driven expense management and zero-fee domestic AP payments.",
    verdict: "Both have free plans. BILL's AP & AR automation is a separate subscription from $49 per user a month, while Ramp's paid Plus plan is $15 per user a month plus a team-size-based platform fee.",
  },
  "bill-vs-tipalti": {
    rule: "Choose BILL if you are a small or midsize business or accounting firm that wants a free card and optional per-user AP and AR automation; choose Tipalti if you are a mid-market or enterprise finance team paying many suppliers or partners across countries.",
    verdict: "BILL's Spend & Expense product is free and its AP & AR automation starts at $49 per user a month. Tipalti starts at $99 a month for Accounts Payable and $249 a month for Mass Payments, with unlimited users on entry plans, and its final price depends on transaction volume.",
  },
  "brevo-vs-getresponse": {
    rule: "Choose Brevo if you want to pay by email volume and add WhatsApp and SMS next to email; choose GetResponse if you want one suite with webinars, landing pages and conversion funnels.",
    verdict: "Both have a free plan: Brevo allows 300 emails a day, GetResponse allows up to 500 contacts. Paid plans start at $9 a month for Brevo and $15.58 a month billed annually for GetResponse, so the choice is mainly volume-based pricing versus a broader marketing suite.",
  },
  "brex-vs-expensify": {
    rule: "Choose Brex if you want a free corporate card with accounting integrations and travel booking; choose Expensify if receipt-scanning expense reports are the main job and you want a flat per-member price.",
    verdict: "Brex's Essentials plan is free and Premium is $12 per user a month. Expensify's Submit workspace is free for individuals, Collect is a flat $5 per member a month, and Control costs $18 per member a month annually without the Expensify Card.",
  },
  "brex-vs-navan": {
    rule: "Choose Brex if you want a free corporate card with accounting integrations for a growing company; choose Navan if travel booking and expense management in one platform matter and you have up to 300 employees.",
    verdict: "Navan's travel booking is free for companies up to 300 employees and its expense management is free for the first 5 users, then $15 per user a month. Brex's Essentials plan is free and its Premium plan is $12 per user a month.",
  },
  "brex-vs-ramp": {
    rule: "Choose Brex if you are a startup or scaling company that wants a free card with room to add paid expense policies; choose Ramp if you want AI-driven expense management and zero-fee domestic ACH, check and card AP payments.",
    verdict: "Both have free plans. Brex Premium is $12 per user a month; Ramp Plus is $15 per user a month plus a team-size-based platform fee.",
  },
  "callrail-vs-ruler-analytics": {
    rule: "Choose CallRail if inbound phone leads drive your business and you want call transcripts and a Google Ads sync; choose Ruler Analytics if you need multi-touch, closed-won revenue attribution across a long B2B sales cycle.",
    verdict: "CallRail starts at $45 a month with a 14-day trial. Ruler Analytics starts at £199 a month, has no self-serve trial, and needs an active CRM pipeline integration to unlock full attribution.",
  },
  "constant-contact-vs-brevo": {
    rule: "Choose Constant Contact if live phone and chat support on every plan and built-in event tools matter most; choose Brevo if you send to a large list and want to pay by email volume, with a permanent free plan.",
    verdict: "Constant Contact has no free plan (14-day trial, from $12 a month for up to 500 contacts), while Brevo has a free plan with 300 emails a day and paid plans from $9 a month. The choice comes down to support and ease of use versus volume-based pricing.",
  },
  "constant-contact-vs-moosend": {
    rule: "Choose Constant Contact if you want live phone and chat support on every plan and event tools; choose Moosend if you want unlimited email sends and the lower entry price.",
    verdict: "Neither has a permanent free plan: Moosend offers a 30-day trial and Constant Contact a 14-day trial. Moosend starts at $9 a month for up to 500 active subscribers and Constant Contact at $12 a month for up to 500 contacts.",
  },
  "constant-contact-vs-zoho-campaigns": {
    rule: "Choose Constant Contact if live phone and chat support and event tools matter most; choose Zoho Campaigns if you want a free plan, a lower entry price and Zoho integration.",
    verdict: "Constant Contact has no permanent free plan (14-day trial, from $12 a month for up to 500 contacts). Zoho Campaigns has a free plan and paid plans from $3 a month for 500 contacts billed annually.",
  },
  "deel-vs-gusto": {
    rule: "Choose Deel if you hire or pay contractors and employees in other countries; choose Gusto if you run payroll, benefits and core HR for a US business.",
    verdict: "Deel's contractor management starts at $49 per contractor a month and its employer of record service at $599 per employee a month. Gusto starts at a $49 monthly base fee plus $6 per person.",
  },
  "deel-vs-papaya-global": {
    rule: "Choose Deel if you want published per-worker prices and month-to-month billing; choose Papaya Global if you are an enterprise that wants the vendor to assume compliance and misclassification liability.",
    verdict: "Deel's contractor management starts at $49 per contractor a month and its employer of record service at $599 per employee a month, with no trial. Papaya Global lists contractor payments from $5 and employer of record from $499 as 'starting from' prices, and a real quote requires contacting sales.",
  },
  "deel-vs-remote": {
    rule: "Choose Deel if you want one vendor for employer of record, contractors, global payroll, HR and IT devices; choose Remote if you want exact employer-of-record pricing and its own local entities in each country.",
    verdict: "Deel's employer of record service costs $599 per employee a month and Remote's costs $699; contractor management starts at $49 per contractor a month at Deel and $29 at Remote. Neither offers a self-serve free trial.",
  },
  "expensify-vs-navan": {
    rule: "Choose Expensify if receipt-scanning expense reports are the core need and you want a flat $5 per member a month; choose Navan if you also want travel booking, which is free for companies up to 300 employees.",
    verdict: "Expensify's Collect plan is $5 per member a month with no annual commitment, and Control costs $18 per member a month annually without the Expensify Card. Navan's expense management is free for the first 5 users, then $15 per user a month.",
  },
  "expensify-vs-ramp": {
    rule: "Choose Expensify if you want receipt-scanning expense reports at a flat per-member price; choose Ramp if you want a free corporate card with AI-driven expense management and accounts payable automation.",
    verdict: "Expensify's Collect plan is $5 per member a month and its Submit workspace is free for individuals. Ramp has a free plan with unlimited cards, and its Plus plan is $15 per user a month plus a team-size-based platform fee.",
  },
  "fathom-vs-fireflies-ai": {
    rule: "Choose Fathom if you want free, unlimited recording and transcription for an individual or customer-facing team; choose Fireflies.ai if you want broad video and dialer coverage and conversation-intelligence analytics.",
    verdict: "Both have free plans. Fathom Premium is $16 per user a month billed annually and Fireflies.ai Pro is $10 per seat a month billed annually. Fireflies.ai's free plan is capped by a shared 400-minute storage limit and 20 AI credits a month.",
  },
  "freshbooks-vs-wave": {
    rule: "Choose FreshBooks if you want invoicing, time tracking, estimates and a client portal in one paid workflow; choose Wave if you want free invoicing and basic double-entry bookkeeping.",
    verdict: "Wave's Starter plan is free and Pro costs $16 a month; FreshBooks lists $23 a month before promotions and offers a 30-day trial. Wave has no built-in project tracking.",
  },
  "freshbooks-vs-zoho-books": {
    rule: "Choose FreshBooks if you are a freelancer or service business that lives in invoicing and time tracking; choose Zoho Books if you need multiple users, inventory tracking and workflow automation.",
    verdict: "FreshBooks lists $23 a month before promotions and caps billable clients at 5 on Lite. Zoho Books has a free plan for revenue under $50k a year and paid plans from $12.50 with annual billing.",
  },
  "getresponse-vs-zoho-campaigns": {
    rule: "Choose GetResponse if you want webinars, funnels and AI tools in one suite; choose Zoho Campaigns if you already use Zoho products and want SMS and WhatsApp next to email.",
    verdict: "Zoho Campaigns has a free plan for up to 2,000 contacts and paid plans from $3 a month for 500 contacts billed annually. GetResponse's free plan covers up to 500 contacts, and its paid plans start at $15.58 a month billed annually.",
  },
  "mailerlite-vs-brevo": {
    rule: "Choose MailerLite if you want email, websites, landing pages and booking tools in one platform; choose Brevo if you send to a large list and want to pay by email volume.",
    verdict: "Both have permanent free plans: MailerLite for up to 250 subscribers, Brevo for 300 emails a day. Paid plans start at $12 a month for MailerLite and $9 a month for Brevo.",
  },
  "mailerlite-vs-getresponse": {
    rule: "Choose MailerLite if you want a permanent free plan and lightweight website and landing-page tools; choose GetResponse if you want webinars, funnels and AI-assisted email in one suite.",
    verdict: "MailerLite's free plan covers up to 250 subscribers and 2,500 monthly emails, with paid plans from $12 a month. GetResponse's free plan covers up to 500 contacts, with paid plans from $15.58 a month billed annually, and its advanced automation and webinars need the Marketing Automation tier.",
  },
  "mailerlite-vs-zoho-campaigns": {
    rule: "Choose MailerLite if you want websites and landing pages alongside email; choose Zoho Campaigns if you use the wider Zoho suite or want the lowest contact-tier price.",
    verdict: "Both have permanent free plans: MailerLite for up to 250 subscribers, Zoho Campaigns for up to 2,000 contacts. Paid plans start at $12 a month for MailerLite and $3 a month for 500 contacts billed annually for Zoho Campaigns, whose value is greatest for teams inside the wider Zoho ecosystem.",
  },
  "moosend-vs-brevo": {
    rule: "Choose Moosend if you want unlimited email sends on every paid plan; choose Brevo if you want a permanent free plan or to pay by email volume with WhatsApp and SMS available.",
    verdict: "Both paid plans start at $9 a month. Moosend has no permanent free tier after its 30-day trial, while Brevo's free plan allows 300 emails a day; Brevo bills SMS and WhatsApp message credits separately.",
  },
  "moosend-vs-getresponse": {
    rule: "Choose Moosend if you want unlimited sends at a low entry price; choose GetResponse if you want an all-in-one suite with webinars, landing pages and ecommerce integrations.",
    verdict: "Moosend starts at $9 a month with a 30-day trial and no permanent free tier. GetResponse has a free plan for up to 500 contacts and paid plans from $15.58 a month billed annually; its advanced automation and webinar hosting need the Marketing Automation tier.",
  },
  "moosend-vs-zoho-campaigns": {
    rule: "Choose Moosend if you want unlimited sends and automation workflows from the first paid plan; choose Zoho Campaigns if you want a free plan or already use Zoho.",
    verdict: "Moosend has no permanent free tier after its 30-day trial and starts at $9 a month for up to 500 active subscribers. Zoho Campaigns has a free plan and paid plans from $3 a month for 500 contacts billed annually.",
  },
  "omnisend-vs-brevo": {
    rule: "Choose Omnisend if you run an online store and want ecommerce automations such as abandoned cart and win-back journeys; choose Brevo if you want volume-based pricing and a built-in CRM with WhatsApp and SMS.",
    verdict: "Both have free plans: Omnisend for up to 250 unique contacts and 500 emails a month, Brevo for 300 emails a day. Paid plans start at $16 a month for Omnisend and $9 a month for Brevo.",
  },
  "omnisend-vs-zoho-campaigns": {
    rule: "Choose Omnisend if you run an online store and want ecommerce automations built in; choose Zoho Campaigns if you want contact-tier pricing and tight Zoho CRM and Zoho Books integration.",
    verdict: "Omnisend's free plan covers up to 250 unique contacts and 500 emails a month, with paid plans from $16 a month. Zoho Campaigns' free plan covers up to 2,000 contacts, with paid plans from $3 a month billed annually, and its abandoned-cart workflows need the Professional plan.",
  },
  "papaya-global-vs-remote": {
    rule: "Choose Papaya Global if you are an enterprise that wants one platform for many countries with the vendor assuming compliance liability; choose Remote if you want exact self-serve monthly prices and its own local entities.",
    verdict: "Papaya Global's prices are 'starting from' floors (contractor payments from $5 a month, employer of record from $499 per employee a month) and a real quote needs sales. Remote publishes employer of record at $699 per employee a month and Global Payroll at $29, but excludes a separate payroll delivery fee.",
  },
  "quickbooks-online-vs-freshbooks": {
    rule: "Choose QuickBooks Online if you want broad accountant familiarity and a deep feature set that reaches inventory tracking on higher tiers; choose FreshBooks if you are a freelancer or service business focused on invoicing, time tracking and a client portal.",
    verdict: "QuickBooks Online starts at $38 a month and FreshBooks at a $23 a month list price before promotions. FreshBooks caps billable clients at 5 on Lite and 50 on Plus, and charges $11 a month for each additional team member.",
  },
  "quickbooks-online-vs-wave": {
    rule: "Choose QuickBooks Online if you need a mature feature set, many integrations and accountant familiarity; choose Wave if you are a solopreneur or micro-business that wants free invoicing and basic bookkeeping.",
    verdict: "Wave's Starter plan is free with unlimited invoices and its Pro plan costs $16 a month; QuickBooks Online starts at $38 a month. Wave has no built-in inventory or project tracking and a smaller integration ecosystem.",
  },
  "quickbooks-online-vs-xero": {
    rule: "Choose QuickBooks Online if your bookkeeper or accountant already works in it and you want payroll and invoicing in one product family; choose Xero if you want a lower list price with unlimited users on every plan.",
    verdict: "QuickBooks Online starts at $38 a month for one user. Xero starts at $25 a month, but its Early plan caps you at 20 invoices and 5 bills a month. Both offer a free trial.",
  },
  "quickbooks-online-vs-zoho-books": {
    rule: "Choose QuickBooks Online if US accountant familiarity and payroll in the same product family matter most; choose Zoho Books if you want more user seats per dollar, workflow automation and Zoho integration.",
    verdict: "Zoho Books has a free plan for businesses with revenue under $50k a year and paid plans from $12.50 with annual billing; QuickBooks Online starts at $38 a month. Zoho Books' interface can feel complex because of its feature depth.",
  },
  "wave-vs-zoho-books": {
    rule: "Choose Wave if you are a solopreneur who wants free invoicing and simple bookkeeping; choose Zoho Books if you need more users, workflow automation and inventory tracking.",
    verdict: "Both have free plans: Wave's Starter has unlimited invoices, while Zoho Books' free plan is limited to businesses with revenue under $50k a year and up to 1,000 invoices a year. Paid plans start at $16 a month for Wave and $12.50 with annual billing for Zoho Books.",
  },
  "whatconverts-vs-callrail": {
    rule: "Choose WhatConverts if you need to trace calls, forms and chats from many ad platforms and CRMs, or run an agency and want a white-label option; choose CallRail if inbound phone leads are the focus and you want AI call transcripts and a Google Ads sync.",
    verdict: "WhatConverts starts at $30 a month and CallRail at $45 a month, each with a 14-day trial. CallRail's conversation intelligence raises the monthly cost, and WhatConverts limits individual-business plans to a single account.",
  },
  "whatconverts-vs-ruler-analytics": {
    rule: "Choose WhatConverts if you want to trace calls, forms and chats to their marketing source at a lower starting price; choose Ruler Analytics if your B2B sales cycles are long and you need closed-won revenue attributed back to marketing.",
    verdict: "WhatConverts starts at $30 a month with a 14-day trial. Ruler Analytics starts at £199 a month, has no self-serve trial, and needs an active CRM pipeline integration to unlock full closed-loop attribution.",
  },
  "xero-vs-freshbooks": {
    rule: "Choose Xero if you want unlimited users and real-time bank reconciliation; choose FreshBooks if client invoicing, time tracking and a client portal are the core of your work.",
    verdict: "Xero starts at $25 a month with unlimited users on every plan. FreshBooks lists $23 a month before promotions, charges $11 a month for each additional team member, and caps billable clients at 5 on Lite.",
  },
  "xero-vs-wave": {
    rule: "Choose Xero if you need unlimited users, multi-currency at higher tiers and accountant familiarity; choose Wave if you want a free plan with unlimited invoicing for a very small business.",
    verdict: "Wave's Starter plan is free and its Pro plan is $16 a month; Xero starts at $25 a month and its Early plan caps you at 20 invoices and 5 bills a month. Wave's automatic bank feeds and receipt scanning need the paid Pro plan.",
  },
  "xero-vs-zoho-books": {
    rule: "Choose Xero if you work with an accountant who uses it and want real-time bank reconciliation; choose Zoho Books if you want a free plan, inventory tracking and Zoho CRM integration.",
    verdict: "Zoho Books is free for businesses with revenue under $50k a year, with paid plans from $12.50 with annual billing; Xero starts at $25 a month. Both are less familiar to US bookkeepers than QuickBooks Online.",
  },
};

export function getComparisonVerdict(slug: string): ComparisonVerdict | null {
  return COMPARISON_VERDICTS[slug] ?? null;
}
