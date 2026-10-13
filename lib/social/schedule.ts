import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import { readQueue, writeQueue, applyQueueTransition } from "@/lib/social/queue";
import { getSocialStrategy, getEffectiveCadence } from "@/lib/social/strategy";
import { CHANNELS } from "@/lib/social/types";
import { interleaveByPillarWeight } from "@/lib/social/content-engine";
import { localTimeToUtc } from "@/lib/social/timezone";
import type { SocialQueueEntry } from "@/lib/social/types";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) — extracted
 * from scripts/social/schedule.ts (previously a manual-only CLI script,
 * never wired to any cron) so app/api/cron/social-schedule/route.ts and
 * the CLI can share one implementation, the same relationship
 * runPublishCycle already has with app/api/cron/social-publish/route.ts
 * and scripts/social/publish.ts. This was found to be the single biggest
 * acquisition-pipeline gap: the publish cron ran reliably 4x/day but
 * could only ever consume SCHEDULED entries, and nothing but a human
 * remembering to run this script promoted APPROVED_FOR_AUTO -> SCHEDULED
 * — 2,436 fully-QA'd, ready-to-publish posts sat completely unscheduled.
 *
 * IDEMPOTENCY: identical to runPublishCycle's — this only ever reads
 * entries currently in APPROVED_FOR_AUTO and immediately transitions any
 * it touches to SCHEDULED in the same write, so a second invocation
 * (e.g. two cron ticks close together) finds a strictly smaller
 * candidate pool each time and can never double-schedule the same entry.
 * No entry can be scheduled twice, and nothing here ever publishes —
 * that stays runPublishCycle's job, gated by its own separate CRON_SECRET
 * check and per-channel-per-day caps. No distributed lock is needed for
 * the same reason runPublishCycle doesn't need one: Vercel Cron invokes
 * a route serially, not as a long-lived overlapping process.
 *
 * CADENCE: paces entries at the minimum cadence among ENABLED channels
 * only (bluesky/mastodon are disabled — see data/social/social-strategy.json
 * — so as of this mission that's effectively facebook(7/wk) and
 * linkedin(3/wk), giving a conservative 1/day pace) — never dumps the
 * backlog, matches the "start conservative to avoid spam signals"
 * principle already documented in social-strategy.json.
 */
const DAYS_AHEAD = 14;
const POST_HOUR_LOCAL = 13; // Facebook's required local-time slot; every enabled channel currently shares one scheduledFor per entry (see KNOWN SIMPLIFICATION in module history).

function sharesVendor(a: SocialQueueEntry, b: SocialQueueEntry): boolean {
  return a.sourceSlugs.some((slug) => b.sourceSlugs.includes(slug));
}

/** Best-effort local de-collision: for each position, if it shares a vendor with the previous pick, swap in the nearest later candidate that doesn't. */
function avoidAdjacentSameVendor(ordered: SocialQueueEntry[]): SocialQueueEntry[] {
  const result = [...ordered];
  for (let i = 1; i < result.length; i++) {
    if (!sharesVendor(result[i]!, result[i - 1]!)) continue;
    const swapIndex = result.findIndex((e, j) => j > i && !sharesVendor(e, result[i - 1]!) && !sharesVendor(e, result[i + 1] ?? e));
    if (swapIndex !== -1) {
      [result[i], result[swapIndex]] = [result[swapIndex]!, result[i]!];
    }
  }
  return result;
}

export type ScheduleRunSummary = {
  ranAt: string;
  dryRun: boolean;
  approvedCount: number;
  scheduledCount: number;
  remainingApprovedCount: number;
  perDay: number;
  minCadence: number;
  scheduledEntryIds: string[];
  reason?: string;
};

export async function runScheduleCycle(options: { dryRun: boolean; now?: Date }): Promise<ScheduleRunSummary> {
  if (!options.dryRun) await assertMutationAllowed();
  const now = options.now ?? new Date();
  const strategy = getSocialStrategy();
  const enabledCadences = CHANNELS.filter((c) => strategy.enabledChannels[c]).map((c) => getEffectiveCadence(strategy, c, now));
  const minCadence = enabledCadences.length ? Math.min(...enabledCadences.filter((c) => c > 0)) : 0;
  const perDay = Math.max(1, Math.round(minCadence / 7));

  const queue = await readQueue();
  const approved = queue.filter((e) => e.state === "APPROVED_FOR_AUTO");

  if (approved.length === 0) {
    return { ranAt: now.toISOString(), dryRun: options.dryRun, approvedCount: 0, scheduledCount: 0, remainingApprovedCount: 0, perDay, minCadence, scheduledEntryIds: [], reason: "No APPROVED_FOR_AUTO entries to schedule." };
  }
  if (minCadence === 0) {
    return { ranAt: now.toISOString(), dryRun: options.dryRun, approvedCount: approved.length, scheduledCount: 0, remainingApprovedCount: approved.length, perDay, minCadence, scheduledEntryIds: [], reason: "No channel has cadence > 0 in social-strategy.json." };
  }

  const ordered = avoidAdjacentSameVendor(interleaveByPillarWeight(approved, strategy.pillarWeights));
  const approvedIds = ordered.map((e) => e.id);

  const scheduledForById = new Map<string, string>();
  let cursor = 0;
  for (let day = 0; day < DAYS_AHEAD && cursor < approvedIds.length; day++) {
    const dayAnchor = new Date(now);
    dayAnchor.setUTCDate(dayAnchor.getUTCDate() + day);
    for (let slot = 0; slot < perDay && cursor < approvedIds.length; slot++) {
      const when = localTimeToUtc(dayAnchor, POST_HOUR_LOCAL, 0, strategy.timezone);
      when.setTime(when.getTime() + slot * 60 * 60 * 1000);
      scheduledForById.set(approvedIds[cursor]!, when.toISOString());
      cursor += 1;
    }
  }

  if (!options.dryRun) {
    const updated = queue.map((entry) => {
      const when = scheduledForById.get(entry.id);
      if (!when) return entry;
      const transitioned = applyQueueTransition(entry, "SCHEDULED", `Scheduled for ${when} by runScheduleCycle (pace: ${perDay}/day, min channel cadence ${minCadence}/week, pillar-interleaved + vendor-adjacency-checked order).`);
      return { ...transitioned, scheduledFor: when };
    });
    await writeQueue(updated);
  }

  return {
    ranAt: now.toISOString(),
    dryRun: options.dryRun,
    approvedCount: approved.length,
    scheduledCount: scheduledForById.size,
    remainingApprovedCount: approved.length - scheduledForById.size,
    perDay,
    minCadence,
    scheduledEntryIds: [...scheduledForById.keys()],
  };
}
