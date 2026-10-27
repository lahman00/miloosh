/** Read-only: lists admitted products whose recorded facts are overdue or due soon. Writes nothing; always exits 0. */
import { getAllSoftware } from "@/data/software";
import { DISCOVERY_BASELINE } from "@/data/seo/discovery-baseline";
import { buildReverificationQueue } from "@/lib/discovery-maintenance";

const asOf = process.argv.find((arg) => arg.startsWith("--as-of="))?.slice("--as-of=".length);
const now = asOf ? new Date(`${asOf}T00:00:00.000Z`) : new Date();
if (Number.isNaN(now.getTime())) {
  console.error("invalid --as-of date");
  process.exit(2);
}
const queue = buildReverificationQueue(getAllSoftware(), now, DISCOVERY_BASELINE);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ asOf: now.toISOString().slice(0, 10), count: queue.length, queue }, null, 2));
} else {
  const overdue = queue.filter((item) => item.nextDueDate === null);
  console.log(`Re-verification queue as of ${now.toISOString().slice(0, 10)}: ${queue.length} products (${overdue.length} overdue, ${queue.length - overdue.length} due within 14 days)`);
  for (const item of queue) {
    const state = item.nextDueDate === null ? `OVERDUE content ${item.contentDaysOverdue}d / pricing ${item.pricingDaysOverdue}d` : `due ${item.nextDueDate}`;
    console.log(`- ${item.slug} [${item.basis}] ${state} | accessedAt ${item.accessedAt} | pricing ${item.pricingLastVerified} | ${item.officialPricingSource ?? "no official source"}`);
  }
  console.log("Dates are NOT changed by this report. Re-verify against the primary sources, then record the real check date.");
}
