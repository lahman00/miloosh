import { readQueue, writeQueue, applyQueueTransition } from "@/lib/social/queue";
import { getSocialStrategy, getEffectiveCadence } from "@/lib/social/strategy";
import { CHANNELS } from "@/lib/social/types";
import { interleaveByPillarWeight } from "@/lib/social/content-engine";
import { localTimeToUtc } from "@/lib/social/timezone";
import type { ContentPillar, SocialQueueEntry } from "@/lib/social/types";

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
 *
 * PROVEN-INTENT LANE (2026-08-26): KrispCall and WhatConverts are the
 * only active partners for which Miloosh currently has first-party
 * network messages confirming referral-link activity. With thousands of
 * approved posts in the backlog, a purely shuffled 14-day batch can
 * postpone those pages indefinitely. The scheduler therefore reserves at
 * most one slot per proven target, never more than two slots in a batch,
 * and leaves every other slot under the existing weighted editorial mix.
 * This is traffic prioritization, not ranking bias: no product verdict,
 * comparison result, or recommendation score changes here.
 */
const DAYS_AHEAD = 14;
const POST_HOUR_LOCAL = 13; // Facebook's required local-time slot; every enabled channel currently shares one scheduledFor per entry (see KNOWN SIMPLIFICATION in module history).

export const PROVEN_INTENT_TARGET_SLUGS = ["krispcall", "whatconverts"] as const;
export type ProvenIntentTargetSlug = (typeof PROVEN_INTENT_TARGET_SLUGS)[number];

const PROVEN_INTENT_PILLAR_SCORE: Partial<Record<ContentPillar, number>> = {
  commercial: 50,
  pricing_intelligence: 40,
  alternatives: 30,
  software_decisions: 25,
  migration: 15,
  miloosh_research: 10,
};

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

function normalizedLinkPath(link: string | null): string | null {
  if (!link) return null;
  try {
    const pathname = new URL(link).pathname.replace(/\/+$/, "");
    return pathname || "/";
  } catch {
    return null;
  }
}

function entryLinkPaths(entry: SocialQueueEntry): string[] {
  return [...new Set(Object.values(entry.channels).map((variant) => normalizedLinkPath(variant?.link ?? null)).filter((path): path is string => Boolean(path)))];
}

function pathTargetsSlug(pathname: string, slug: ProvenIntentTargetSlug): { matches: boolean; direct: boolean } {
  if (pathname === `/software/${slug}`) return { matches: true, direct: true };
  const comparison = pathname.match(/^\/compare\/([^/]+)$/)?.[1];
  if (!comparison) return { matches: false, direct: false };
  const [left, right, ...rest] = comparison.split("-vs-");
  return { matches: rest.length === 0 && (left === slug || right === slug), direct: false };
}

function provenIntentScore(entry: SocialQueueEntry, slug: ProvenIntentTargetSlug): number | null {
  const matches = entryLinkPaths(entry).map((path) => pathTargetsSlug(path, slug)).filter((match) => match.matches);
  if (matches.length === 0) return null;

  const destinationScore = matches.some((match) => match.direct) ? 100 : 70;
  const pillarScore = PROVEN_INTENT_PILLAR_SCORE[entry.pillar] ?? 0;
  const topicScore = entry.topic === `commercial-${slug}`
    ? 20
    : entry.topic === `pricing-${slug}`
      ? 15
      : entry.topic === `alternatives-${slug}`
        ? 10
        : 0;
  return destinationScore + pillarScore + topicScore;
}

export type ProvenIntentPrioritySelection = {
  entries: SocialQueueEntry[];
  targetByEntryId: ReadonlyMap<string, ProvenIntentTargetSlug>;
};

/**
 * Selects at most one high-intent queue entry for each target. A target
 * must be the actual Miloosh destination (/software/slug or one side of
 * /compare/a-vs-b); appearing only in sourceSlugs is not sufficient,
 * because an alternatives post can cite a product while linking to a
 * different product's page.
 */
export function selectProvenIntentPriorityEntries(entries: SocialQueueEntry[]): ProvenIntentPrioritySelection {
  const selected: SocialQueueEntry[] = [];
  const targetByEntryId = new Map<string, ProvenIntentTargetSlug>();
  const usedEntryIds = new Set<string>();

  for (const target of PROVEN_INTENT_TARGET_SLUGS) {
    const ranked = entries
      .map((entry) => ({ entry, score: provenIntentScore(entry, target) }))
      .filter((row): row is { entry: SocialQueueEntry; score: number } => row.score !== null && !usedEntryIds.has(row.entry.id))
      .sort((a, b) => b.score - a.score || a.entry.createdAt.localeCompare(b.entry.createdAt) || a.entry.id.localeCompare(b.entry.id));
    const best = ranked[0]?.entry;
    if (!best) continue;
    selected.push(best);
    usedEntryIds.add(best.id);
    targetByEntryId.set(best.id, target);
  }

  return { entries: selected, targetByEntryId };
}

/**
 * Spreads the bounded priority lane across the batch: first target at the
 * start, second around the midpoint. All non-priority positions retain
 * the existing weighted, vendor-de-collided order.
 */
export function insertProvenIntentPriorityEntries(
  ordinaryOrder: SocialQueueEntry[],
  priorityEntries: SocialQueueEntry[],
  capacity: number,
): SocialQueueEntry[] {
  if (capacity <= 0 || priorityEntries.length === 0) return ordinaryOrder;
  const result = [...ordinaryOrder];
  const bounded = priorityEntries.slice(0, Math.min(capacity, PROVEN_INTENT_TARGET_SLUGS.length));

  bounded.forEach((entry, index) => {
    const desired = index === 0 ? 0 : Math.min(Math.floor(capacity / 2), result.length);
    result.splice(desired, 0, entry);
  });

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
  priorityScheduledEntryIds: string[];
  priorityTargetSlugs: ProvenIntentTargetSlug[];
  reason?: string;
};

export async function runScheduleCycle(options: { dryRun: boolean; now?: Date }): Promise<ScheduleRunSummary> {
  const now = options.now ?? new Date();
  const strategy = getSocialStrategy();
  const enabledCadences = CHANNELS.filter((c) => strategy.enabledChannels[c]).map((c) => getEffectiveCadence(strategy, c, now));
  const minCadence = enabledCadences.length ? Math.min(...enabledCadences.filter((c) => c > 0)) : 0;
  const perDay = Math.max(1, Math.round(minCadence / 7));

  const queue = await readQueue();
  const approved = queue.filter((e) => e.state === "APPROVED_FOR_AUTO");

  if (approved.length === 0) {
    return { ranAt: now.toISOString(), dryRun: options.dryRun, approvedCount: 0, scheduledCount: 0, remainingApprovedCount: 0, perDay, minCadence, scheduledEntryIds: [], priorityScheduledEntryIds: [], priorityTargetSlugs: [], reason: "No APPROVED_FOR_AUTO entries to schedule." };
  }
  if (minCadence === 0) {
    return { ranAt: now.toISOString(), dryRun: options.dryRun, approvedCount: approved.length, scheduledCount: 0, remainingApprovedCount: approved.length, perDay, minCadence, scheduledEntryIds: [], priorityScheduledEntryIds: [], priorityTargetSlugs: [], reason: "No channel has cadence > 0 in social-strategy.json." };
  }

  const capacity = DAYS_AHEAD * perDay;
  const priority = selectProvenIntentPriorityEntries(approved);
  const priorityIds = new Set(priority.entries.map((entry) => entry.id));
  const ordinaryApproved = approved.filter((entry) => !priorityIds.has(entry.id));
  const ordinaryOrder = avoidAdjacentSameVendor(interleaveByPillarWeight(ordinaryApproved, strategy.pillarWeights));
  const ordered = insertProvenIntentPriorityEntries(ordinaryOrder, priority.entries, capacity);
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
      const priorityTarget = priority.targetByEntryId.get(entry.id);
      const priorityNote = priorityTarget ? ` Proven-intent lane: ${priorityTarget}; first-party partner activity exists, but no conversion is claimed.` : "";
      const transitioned = applyQueueTransition(entry, "SCHEDULED", `Scheduled for ${when} by runScheduleCycle (pace: ${perDay}/day, min channel cadence ${minCadence}/week, pillar-interleaved + vendor-adjacency-checked order).${priorityNote}`);
      return { ...transitioned, scheduledFor: when };
    });
    await writeQueue(updated);
  }

  const priorityScheduledEntryIds = priority.entries
    .filter((entry) => scheduledForById.has(entry.id))
    .map((entry) => entry.id);
  const priorityTargetSlugs = priorityScheduledEntryIds
    .map((id) => priority.targetByEntryId.get(id))
    .filter((slug): slug is ProvenIntentTargetSlug => Boolean(slug));

  return {
    ranAt: now.toISOString(),
    dryRun: options.dryRun,
    approvedCount: approved.length,
    scheduledCount: scheduledForById.size,
    remainingApprovedCount: approved.length - scheduledForById.size,
    perDay,
    minCadence,
    scheduledEntryIds: [...scheduledForById.keys()],
    priorityScheduledEntryIds,
    priorityTargetSlugs,
  };
}
