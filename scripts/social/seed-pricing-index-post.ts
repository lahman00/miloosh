import "./_load-env";
import { draftQueueEntry } from "@/lib/social/content-engine";
import { getSocialStrategy } from "@/lib/social/strategy";
import { CHANNELS, type Channel } from "@/lib/social/types";
import { readQueue, addQueueEntries, applyQueueTransition, writeQueue } from "@/lib/social/queue";
import { runQaGates, qaPassed } from "@/lib/social/qa-gates";
import { buildPricingIndex } from "@/lib/pricing-index/build";
import { SITE_URL } from "@/lib/site";

/**
 * MILOOSH OVERNIGHT MONSTER mission (2026-08-24), P15-17 — one real,
 * QA'd queue entry announcing the SaaS Pricing Pressure Index 2026, the
 * flagship asset shipped this session. Not a one-off hand-typed post:
 * built through the exact same draftQueueEntry()/QA pipeline every other
 * entry goes through, using the live-computed headline finding (not a
 * hardcoded number that could drift from the real dataset).
 *
 * Deliberately does NOT force an immediate publish. The production daily
 * cap (hasChannelPublishedToday in lib/social/publish.ts) already showed
 * Facebook published today via the normal automated cron — publishing a
 * second time today would violate that real, deliberate safety rule and
 * the "respect cadence, do not flood" instruction this same mission
 * gives. This entry is inserted as APPROVED_FOR_AUTO (once QA passes) so
 * the existing runScheduleCycle()/runPublishCycle() pipeline picks it up
 * on the next available slot, same as everything else in the queue.
 *
 * Usage: npx tsx --env-file=.env.local scripts/social/seed-pricing-index-post.ts
 */
async function main() {
  const index = buildPricingIndex();
  const top = index.highestModeledCost50Seats;
  if (!top) throw new Error("No modeled 50-seat cost available -- refusing to post a claim the live dataset can't currently support.");

  const freeTierStat = index.stats.find((s) => s.label === "Free tier available")!;

  const idea = {
    pillar: "miloosh_research" as const,
    topic: "research-pricing-pressure-index-2026-launch",
    sourceSlugs: [top.slug],
    headline: `A 50-seat team on ${top.name} can cost $${top.cost50.toLocaleString()}/month.`,
    body: `We checked ${index.sampleSize} SaaS tools with pricing verified directly on the vendor's own site -- not scraped, not estimated -- for the Miloosh SaaS Pricing Pressure Index 2026. ${freeTierStat.numerator}/${freeTierStat.denominator} (${freeTierStat.pct}%) have a free tier. Full dataset and methodology are public.`,
    link: `${SITE_URL}/research/saas-pricing-pressure-index-2026`,
  };

  const strategy = getSocialStrategy();
  const enabledChannels = CHANNELS.filter((c) => strategy.enabledChannels[c] || c === "linkedin" || c === "reddit") as Channel[];

  const drafted = draftQueueEntry(idea, enabledChannels);
  // draftQueueEntry() itself only sets state: "IDEA" (see content-engine.ts) --
  // generateDraftedQueueEntries() separately advances every entry it produces
  // to "DRAFTED" as a real state transition, not just a field assignment.
  // Replicate that here via applyQueueTransition so the entry's history stays
  // consistent with the state machine instead of skipping straight to IDEA.
  const entry = applyQueueTransition(drafted, "DRAFTED", "Channel variants rendered for all enabled channels.");

  const existingQueue = await readQueue();
  const alreadySeeded = existingQueue.find((e) => e.topic === idea.topic && e.state !== "SKIPPED");
  if (alreadySeeded) {
    console.log(`Already seeded (entry ${alreadySeeded.id}, state ${alreadySeeded.state}) -- not creating a duplicate.`);
    return;
  }

  await addQueueEntries([entry]);
  console.log(`Inserted entry ${entry.id} (topic: ${entry.topic}) in state DRAFTED.`);

  const queueForQa = await readQueue();
  const findings = runQaGates(entry, queueForQa);
  const passed = qaPassed(findings);
  const notes = findings.map((f) => `[${f.severity}]${f.channel ? ` (${f.channel})` : ""} ${f.message}`);

  if (!passed) {
    console.log("QA FAILED -- left in DRAFTED for review:");
    for (const note of notes) console.log(`  ${note}`);
    const updated = queueForQa.map((e) => (e.id === entry.id ? { ...e, qaNotes: notes } : e));
    await writeQueue(updated);
    return;
  }

  const readyEntry = applyQueueTransition(entry, "QA_READY", notes.length ? notes.join(" | ") : "All QA gates passed.");
  const approvedEntry = applyQueueTransition(readyEntry, "APPROVED_FOR_AUTO", "Auto-approved: sourced from real, live-computed Pricing Pressure Index data, no QA errors.");
  const finalQueue = queueForQa.map((e) => (e.id === entry.id ? approvedEntry : e));
  await writeQueue(finalQueue);

  console.log(`QA PASSED. Entry ${entry.id} is now APPROVED_FOR_AUTO and will publish on the next available slot per the existing cadence scheduler.`);
  console.log(`Channels drafted: ${Object.keys(entry.channels).join(", ")}`);
  for (const [channel, variant] of Object.entries(entry.channels)) {
    console.log(`\n[${channel}]\n${variant!.text}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
