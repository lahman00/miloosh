import fs from "node:fs";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getAllSoftware } from "@/data/software";
import { getComparisonsInvolving } from "@/data/comparisons";
import { classifySessions, countConfirmedOrStrongVisitors } from "@/lib/analytics/human-classification";
import { computeCtaExposure } from "@/scripts/analytics/report";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { SeoFactoryRun } from "@/lib/seo-factory/types";
const audit=JSON.parse(fs.readFileSync("var/work-revenue/audit-20260910.json","utf8"));
const raw=JSON.parse(fs.readFileSync("var/work-revenue/analytics-events-20260910.json","utf8"));
if(!raw.complete) throw new Error("Do not publish an incomplete evidence report");
const events=raw.events as FirstPartyEvent[];
const sessions=classifySessions(events);
const ids=new Set(sessions.filter(s=>["CONFIRMED_CLEAN","STRONG_HUMAN_EVIDENCE"].includes(s.bucket)).map(s=>s.sessionId));
const clean=events.filter(e=>ids.has(e.sessionId));
const outbound=clean.filter(e=>e.type==="outbound_click" && e.destination==="affiliate");
const cta=computeCtaExposure(clean), products=getAllSoftware(), factory=audit.latestFactory as SeoFactoryRun;
const protectedPages=new Set<string>(audit.experiments.filter((e:{decision:string})=>e.decision==="MEASURING").map((e:{page:string})=>e.page));
const selected=new Map<string,typeof factory.opportunities[number] & { targetUrl: string }>();
for(const opportunity of factory.opportunities){if(!opportunity.targetUrl) continue;const prior=selected.get(opportunity.targetUrl);if(!prior||opportunity.opportunityScore>prior.opportunityScore)selected.set(opportunity.targetUrl,{...opportunity,targetUrl:opportunity.targetUrl});}
const activeSlugs=new Set<string>(ACTIVE_PARTNERS.map(p=>p.slug));
const revenuePath=(page:string)=>{
 const product=products.find(p=>page==="/software/"+p.slug);
 return product ? activeSlugs.has(product.slug)||product.alternatives.some(a=>activeSlugs.has(a.slug)) : (selected.get(page)?.relatedSoftware.some(slug=>activeSlugs.has(slug))??false);
};
const priority=(page:string)=>page==="/software/wrike"?0:page==="/software/klaviyo"?1:protectedPages.has(page)?1000:page==="/software/n8n"?2:(selected.get(page)?.gsc.impressions??0)<50?300:revenuePath(page)?10:100;
const queue=[...selected.values()].sort((a,b)=>priority(a.targetUrl)-priority(b.targetUrl)||b.gsc.impressions-a.gsc.impressions||a.gsc.position-b.gsc.position||b.opportunityScore-a.opportunityScore);
const status=(page:string)=>protectedPages.has(page)?"HOLD_MEASUREMENT":page==="/software/n8n"?"DISTRIBUTE_EXISTING":["/software/wrike","/software/klaviyo"].includes(page)?"IMPLEMENTED_VERIFY_RELEASE":"REVIEW_REQUIRED";
const csv=(v:unknown)=>'"'+String(v??"").replaceAll('"','""')+'"';
fs.writeFileSync("docs/work-revenue-queue-2026-09-10.csv",[
 ["priority","query","canonical_page","impressions","clicks","position","gsc_window","status","distribution_gate","measurement"].map(csv).join(","),
 ...queue.map((o,i)=>[i+1,o.query,o.targetUrl,o.gsc.impressions,o.gsc.clicks,o.gsc.position.toFixed(2),factory.window.startDate+" to "+factory.window.endDate,status(o.targetUrl),priority(o.targetUrl)<2?"See distribution packet; live account / partner response required":"Validate specific fit, primary sources and nonduplicate distribution before editing","GSC query cluster; classified first-party visits; CTA exposure and unique affiliate clickers"].map(csv).join(","))
].join("\n")+"\n");
const table=ACTIVE_PARTNERS.map(p=>{
 const itemCta=cta.filter(r=>r.softwareSlug===p.slug);
 const inbound=products.filter(s=>s.alternatives.some(a=>a.slug===p.slug)).length;
 const clicks=outbound.filter(e=>e.type==="outbound_click"&&e.softwareSlug===p.slug);
 return "| "+[p.slug,products.some(s=>s.slug===p.slug)?"yes":"MISSING",p.affiliateUrl?"yes":"MISSING",getComparisonsInvolving(p.slug).length,inbound,itemCta.reduce((s,r)=>s+r.impressions,0),clicks.length,new Set(clicks.map(e=>e.visitorId)).size].join(" | ")+" |";
}).join("\n");
const top=queue.slice(0,10).map((o,i)=>"| "+[i+1,o.query,o.targetUrl,o.gsc.impressions,o.gsc.clicks,o.gsc.position.toFixed(1),status(o.targetUrl)].join(" | ")+" |").join("\n");
const report=`# Miloosh revenue execution — 2026-09-10

## Evidence and limits

- Production source at start: e44741fb8798ead7814e420364c683f67c50adf1; Vercel flowtemplate / miloosh.com was READY, with no runtime errors in the checked 24-hour window.
- Latest available authenticated SEO Factory run: ${factory.generatedAt}, GSC ${factory.window.startDate} through ${factory.window.endDate}. Inventory: 354 software products, 1,348 comparisons, 1,732 analyzed pages. Comparison visibility: 116 pages, 874 impressions, zero clicks, median position 65.
- A direct fresh GSC request was blocked locally by the exported service-account value failing JSON/base64 parsing. This does not prove the deployed GSC integration is broken. No new GSC totals were invented.
- Complete first-party snapshot: ${audit.capturedAt}; ${raw.listed} listed and successfully read objects, zero failed reads, event timestamps ${events.at(-1)?.timestamp} through ${events[0]?.timestamp}.
- ${countConfirmedOrStrongVisitors(sessions)} unique visitors classified as CONFIRMED_CLEAN or STRONG_HUMAN_EVIDENCE, across ${ids.size} sessions. ${outbound.length} affiliate outbound events from ${new Set(outbound.map(e=>e.visitorId)).size} unique visitors. These are observed stored-event classifications, not identity verification, partner conversions or revenue.
- Earlier partial reads returned 888 and 869 events. Their 20-visitor and 2–4-affiliate-event counts are superseded and must not be reused as a complete baseline.
- The complete audit exposed two defects: missing Blob pagination and silently ignored failed object reads. Production reader now paginates, bounds concurrent reads, retries transient object failures, and reports an error when evidence remains incomplete.
- Source attribution is heuristic. No partner-side paid conversion or commission amount was verified in this run. The Cloro signup email is a notification only, not verified revenue or a verified external human.

## Ranked executable work

| Priority | Action | Decision / next gate |
| --- | --- | --- |
| 0 | Correct incomplete analytics retrieval | Implemented; full tests and real-store read proof required before release. |
| 1 | Wrike buyer decision checks | 187 cluster impressions, 0 clicks, position 90.95; exact query had 71 impressions. Add licensing, billable-seat and renewal checks on the existing canonical page. |
| 2 | Klaviyo alternative decision checks | 79 impressions, 0 clicks, position 81.92. Source-backed list/send/SMS/billing checks; legitimate Omnisend and MailerLite CTAs. |
| 3 | Warm partner distribution | Jotform and Close invited support threads handled. MailerLite partner thread is the specific next distribution route for the new checklist. |
| 4 | Owned social distribution | Copy and tagged URLs prepared. LinkedIn and Facebook browser sessions require sign-in. Reconcile existing Wrike scheduled entry and live history before posting. |
| 5 | Impact payment readiness | Owner must verify the missing billing city for account 7623171. No address, banking, tax or financial value changed. |
| 6 | Remaining buyer-intent candidates | Review queue with dated real GSC evidence. Fresh primary-source value and a legitimate distribution route are gates; factory scores are heuristics, not projected revenue. |
| 7 | Proton invitation | Conditional fit for privacy-focused business software; no Proton catalog asset or verified query demand established. Do not accept merely for the incentive. |

## Content and measurement

- New sections: /software/wrike and /software/klaviyo. No competing URL created. Vendor sources and September 10 verification date are visible.
- Commercial links use the canonical affiliate resolver, the existing disclosure, and ctaLocation=buyer-checklist-cta. No affiliate rate, saving, hands-on test result or conversion is fabricated.
- Distribution route and copy: work-distribution-packet-2026-09-10.md. Measure tagged engaged commercial visits, CTA impressions, unique outbound clickers and independently verified partner conversions. A prepared route or sent pitch is not a published post.
- All 19 existing MEASURING software pages retain the existing content treatment. Rendered HTML confirms the new section exists only on the two selected software pages. Existing shared CTA experiment labels and resolver logic were retained.
- Concurrent committed work 1503616 was merged, including two buyer worksheets, pricing-index corrections and the documented SurveyMonkey link reconciliation. This preserves that work; it is not attributed as newly authored here.
- Current code registry contains ${ACTIVE_PARTNERS.length} active partners; the production-at-start registry had 20. SurveyMonkey uses only the newly documented vendor-issued URL. Payout readiness remains unverified.

## High-intent queue

One representative opportunity per canonical URL is retained below and in the CSV. Query-cluster impressions are not market search volume. Distinct or overlapping query rows were not summed. Ranking places the two selected live interventions first, then the recently published n8n asset for distribution, then clusters with at least 50 observed impressions and a structurally relevant active affiliate route, other demand-backed clusters, low-evidence rows, and protected experiments. Within each research band, observed impressions rank before average position. These bands are operating heuristics, not predicted revenue; structural affiliate coverage still requires editorial fit review.

| Rank | Query | Canonical page | Impressions | Clicks | Position | State |
| --- | --- | --- | --- | --- | --- | --- |
${top}

Full queue: work-revenue-queue-2026-09-10.csv (${queue.length} canonical targets). REVIEW_REQUIRED means further evidence/distribution review; it is not authorization for mass publication. Existing recently changed assets should be distributed and measured before another rewrite.

## Active affiliate exposure audit

Counts use the complete retrieved snapshot and only high-confidence human sessions. Zero means no event in that slice; it does not prove there was no real-world exposure. Comparison counts and alternative references are structural inventory, not traffic.

| Product | Catalog page | Issued link | Comparisons | Inbound alternative references | Clean CTA impressions | Affiliate event count | Unique affiliate visitors |
| --- | --- | --- | --- | --- | --- | --- | --- |
${table}

All active products have catalog pages and issued links. Volza has no inbound alternative reference in the catalog; demand and comparison fit need verification before adding a placement. The selected Wrike and Klaviyo work addresses supported buyer intent rather than inserting unrelated CTAs to fill every zero.

## Factual email execution

- Jotform: reply SENT, Gmail 1a08b9c163c2401b, thread 1a085d88de74832c. Asked whether company-page participation qualifies, requested requirements/disclosure/demo access, offered a buyer-focused alternative, and explicitly did not enroll or promise 5,000 views. Handled incoming message archived.
- Close: reply SENT, Gmail 1a08bae1b03d7f5d, thread 1a07c476663c26c2. Accepted the invitation to explain campaign blockers by asking for current calling/SMS/usage-cost guidance and a small outbound-team walkthrough. Acknowledged the August 31 distribution request rather than duplicating it. Handled incoming message archived.
- Smart SME's independent pricing-data coverage and prior thanks were verified in history; no duplicate thanks sent.
- Existing DigiTools, Layer3Labs, Velox, Agenticise, Otimiz, iFeeltech, Soluxe, Cheberko, Lurto, Pipedrive and press sends were treated as prior actions. No duplicate was sent in this work.
- Proton invitation states 25% of first-year customer revenue plus a $1,000 bonus for ten paid conversions. Eligible products, timing and reversal conditions still need review. Invitation not accepted; no bonus or commission earned is asserted.
- Impact: September 9 payment warning specifies a missing billing city. Left unresolved for the owner.

## Community and partner screening

See the distribution packet for verified URLs, the narrow factual community reply draft, and screened partner candidates. Wrike Community prohibits third-party posting, advertising and external-product promotion, and requires an active Wrike account. No promotional reply, fake experience, fake identity, account registration or community post was executed. The live external-communications discussion contains a license ambiguity suitable only for an eligible user's factual clarification.

## Release and follow-up

Release IDs, final production verification, MailerLite send result and new experiment windows are appended after those actions succeed. No pending action in this report is represented as completed.
`;
fs.writeFileSync("docs/work-revenue-execution-2026-09-10.md",report);
console.log(JSON.stringify({targets:queue.length,partners:ACTIVE_PARTNERS.length,visitors:countConfirmedOrStrongVisitors(sessions),affiliateEvents:outbound.length,affiliateVisitors:new Set(outbound.map(e=>e.visitorId)).size,complete:raw.complete}));
