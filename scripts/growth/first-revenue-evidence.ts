import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { FIRST_REVENUE_PAGES, FIRST_REVENUE_GSC_WINDOW, FIRST_REVENUE_CAPTURED_AT } from "@/data/revenue/first-revenue-cohort";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { readOutboundEventsDetailed } from "@/lib/revenue/outbound-read";
import { summarizeFirstRevenuePage } from "@/lib/revenue/first-revenue-funnel";

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN || /SENSITIVE|REDACTED/.test(process.env.BLOB_READ_WRITE_TOKEN)) {
    throw new Error("Authorized production store unavailable; do not substitute local zero counts.");
  }
  const [a,b] = await Promise.allSettled([getAllFirstPartyEvents(),readOutboundEventsDetailed()]);
  const analytics=a.status === "fulfilled" ? a.value : null;
  const outbound=b.status === "fulfilled" ? b.value : null;
  const until=new Date().toISOString();
  const out={capturedAt:until,firstPartyRead:analytics===null?"UNAVAILABLE":"COMPLETE",outboundRead:outbound?.status??"UNAVAILABLE",gscHistoricalWindow:FIRST_REVENUE_GSC_WINDOW,eventWindow:{since:FIRST_REVENUE_CAPTURED_AT,until},rows:FIRST_REVENUE_PAGES.map(p=>({slug:p.slug,...summarizeFirstRevenuePage(p.slug,analytics,outbound,until)})),merchantLoad:"NOT VERIFIED",conversion:"NOT VERIFIED",commission:"NOT VERIFIED"};
  const output=process.argv[2];
  if(output){const dest=path.resolve(output);const privateRoot=path.join(os.homedir(),"MilooshReceipts")+path.sep;if(!dest.startsWith(privateRoot))throw new Error("Output must be a private Miloosh receipt");fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(out,null,2)+"\n");}
  console.log(JSON.stringify(out,null,2));
}
main().catch(()=>{console.error("Evidence read failed; metrics are unavailable, not zero.");process.exitCode=1;});
