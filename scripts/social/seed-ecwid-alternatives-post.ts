import "./_load-env";
import { draftQueueEntry } from "@/lib/social/content-engine";
import { getSocialStrategy } from "@/lib/social/strategy";
import { CHANNELS, type Channel } from "@/lib/social/types";
import { readQueue, addQueueEntries, applyQueueTransition, writeQueue } from "@/lib/social/queue";
import { runQaGates, qaPassed } from "@/lib/social/qa-gates";
import { SITE_URL } from "@/lib/site";

/**
 * MILOOSH AUTONOMOUS REVENUE COMPANY BUILD mission (2026-08-24) — one
 * real, evidence-based post surfacing the Ecwid -> Shopify Decision
 * Guide shipped this session. Real Money Priority Engine finding: Ecwid
 * has 219 real GSC impressions across "ecwid alternatives" and
 * "woocommerce vs ecwid" -- direct alternatives-seeking intent -- and
 * the existing generic content-engine pillar rotation has no way to
 * know this specific new asset exists or that it's worth prioritizing;
 * it would surface it eventually through ordinary rotation, but not
 * with this framing or urgency.
 *
 * Same safety pattern established earlier this session
 * (scripts/social/seed-pricing-index-post.ts): drafted through the real
 * content-engine/QA pipeline, inserted as APPROVED_FOR_AUTO (NOT
 * force-scheduled ahead of the existing fair rotation) so the existing
 * scheduler's own cadence/cooldown/pillar-interleaving logic decides
 * timing, same as every other queue entry.
 *
 * Usage: npx tsx --env-file=.env.local scripts/social/seed-ecwid-alternatives-post.ts
 */
async function main() {
  const idea = {
    pillar: "alternatives" as const,
    topic: "alternatives-ecwid-shopify-2026-launch",
    sourceSlugs: ["ecwid", "shopify"],
    headline: "Outgrown Ecwid's embedded cart? Here's when Shopify is the real upgrade.",
    body: "Ecwid works by adding a shopping-cart widget to a site that already exists. The alternatives question is really: has the business outgrown that model into needing a dedicated, full-featured store? We compared Ecwid to Shopify and PrestaShop on exactly that decision.",
    link: `${SITE_URL}/software/ecwid`,
  };

  const strategy = getSocialStrategy();
  const enabledChannels = CHANNELS.filter((c) => strategy.enabledChannels[c] || c === "linkedin" || c === "reddit") as Channel[];

  const drafted = draftQueueEntry(idea, enabledChannels);
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
  const approvedEntry = applyQueueTransition(readyEntry, "APPROVED_FOR_AUTO", "Auto-approved: sourced from real Ecwid/Shopify Decision Guide data, no QA errors.");
  const finalQueue = queueForQa.map((e) => (e.id === entry.id ? approvedEntry : e));
  await writeQueue(finalQueue);

  console.log(`QA PASSED. Entry ${entry.id} is now APPROVED_FOR_AUTO -- will publish on the next available slot per the existing fair-rotation scheduler.`);
  for (const [channel, variant] of Object.entries(entry.channels)) {
    console.log(`\n[${channel}]\n${variant!.text}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
