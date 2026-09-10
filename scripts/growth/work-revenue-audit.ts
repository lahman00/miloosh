import "@/scripts/affiliate/_load-env";
import fs from "node:fs";

async function main() {
 const {GoogleSearchConsoleClient}=await import("@/scripts/agents/seo/lib/google-search-console-client");
 const {readSeoExperiments,readLatestSeoFactoryRun}=await import("@/lib/seo-factory/store");
 const {readCompleteAuditEvents}=await import("./read-complete-audit-events");
 const {classifySessions,summarizeBuckets,countConfirmedOrStrongVisitors}=await import("@/lib/analytics/human-classification");
 const {readQueue}=await import("@/lib/social/queue");
 const {computeAcquisitionSourceBreakdown,computeCtaExposure}=await import("@/scripts/analytics/report");
 const {ACTIVE_PARTNERS}=await import("@/data/affiliate/active-partners");
 const {getAllSoftware}=await import("@/data/software"); const products=getAllSoftware();
 let client; let gscError; try { client=GoogleSearchConsoleClient.fromEnv(); } catch(e) { gscError=e instanceof Error?e.message:String(e); }
 const {head}=await import("@vercel/blob"); await head("seo-factory/experiments.json"); await head("social/queue.json");
 const startDate="2026-08-11",endDate="2026-09-07";
 const [rows,totals,experiments,latest,eventRead,queue]=await Promise.all([client?.queryAllSearchAnalytics({startDate,endDate,dimensions:["query","page"],rowLimit:25000},25000),client?.querySearchAnalytics({startDate,endDate,dimensions:[]}),readSeoExperiments(),readLatestSeoFactoryRun(),readCompleteAuditEvents(),readQueue()]);
 const events=eventRead.events;
 const classified=classifySessions(events),cleanIds=new Set(classified.filter(s=>["CONFIRMED_CLEAN","STRONG_HUMAN_EVIDENCE"].includes(s.bucket)).map(s=>s.sessionId));
 const clean=events.filter(e=>cleanIds.has(e.sessionId));
 const audit={capturedAt:new Date().toISOString(),window:{startDate,endDate},source:"Production Vercel Blob via existing project clients; GSC status explicit",gsc:{totals,rows,error:gscError},experiments,latestFactory:latest,analytics:{storedEventsRead:events.length,first:events.map(e=>e.timestamp).sort()[0],last:events.map(e=>e.timestamp).sort().at(-1),listed:eventRead.listed,failedReads:eventRead.failedPaths.length,complete:eventRead.complete,limitation:"Counts describe retrieved stored events, not all real-world visits. Acquisition source classification is heuristic; clicks are not sales.",buckets:summarizeBuckets(classified),confirmedOrStrongVisitors:countConfirmedOrStrongVisitors(classified),confirmedOrStrongAffiliateEvents:clean.filter(e=>e.type==="outbound_click"&&e.destination==="affiliate").length,confirmedOrStrongNewsletterEvents:clean.filter(e=>e.type==="newsletter_signup").length,sources:computeAcquisitionSourceBreakdown(clean),cta:computeCtaExposure(clean)},activePartners:ACTIVE_PARTNERS.map(p=>({slug:p.slug,hasTrackingLink:Boolean(p.affiliateUrl),hasPricingDeepLink:Boolean(p.pricingAffiliateUrl),catalogPage:products.some(s=>s.slug===p.slug),inboundAlternatives:products.filter(s=>s.alternatives.some(a=>a.slug===p.slug)).map(s=>s.slug),cleanCta:computeCtaExposure(clean).filter(r=>r.softwareSlug===p.slug)})),social:queue};
 fs.mkdirSync("var/work-revenue",{recursive:true});fs.writeFileSync("var/work-revenue/audit-20260910.json",JSON.stringify(audit,null,2));fs.writeFileSync("var/work-revenue/analytics-events-20260910.json",JSON.stringify(eventRead));
 console.log(JSON.stringify({capturedAt:audit.capturedAt,gscWindow:audit.window,gscTotals:totals,queryPageRows:rows?.length,analytics:audit.analytics,activePartners:audit.activePartners,experiments,opportunities:latest?.opportunities?.filter(o=>o.action!=="WAIT").slice(0,15).map(o=>({query:o.query,url:o.targetUrl,gsc:o.gsc,action:o.action})),social:queue.filter(q=>q.createdAt>"2026-09-01"||q.scheduledFor&&q.scheduledFor>"2026-09-09").map(q=>({id:q.id,topic:q.topic,state:q.state,scheduled:q.scheduledFor,channels:q.channels}))},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
