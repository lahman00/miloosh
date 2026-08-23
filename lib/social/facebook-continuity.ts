import { applyQueueTransition, readQueue, writeQueue } from "@/lib/social/queue";
import { hasChannelPublishedToday } from "@/lib/social/publish";
import { getSocialStrategy, getEffectiveCadence } from "@/lib/social/strategy";
import type { ChannelVariant, SocialQueueEntry } from "@/lib/social/types";

function facebookNeedsAttempt(variant: ChannelVariant): boolean {
  if (variant.providerState) {
    return variant.providerState.status === "PENDING" ||
      (variant.providerState.status === "FAILED" && variant.providerState.attempts < 3);
  }
  return variant.publishResult === null ||
    variant.publishResult.status === "FAILED" ||
    variant.publishResult.status === "RATE_LIMITED";
}

function localHour(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

function isFacebookEligible(entry: SocialQueueEntry, now: Date): boolean {
  const variant = entry.channels.facebook;
  if (!variant || !facebookNeedsAttempt(variant)) return false;
  if (variant.scheduledFor && new Date(variant.scheduledFor).getTime() > now.getTime()) return false;
  return true;
}

/**
 * Safety net for the daily Facebook slot.
 *
 * The scheduler historically paced whole queue entries rather than channel
 * obligations. A legacy APPROVED backlog can therefore contain LinkedIn-only
 * entries and consume the shared 13:00 slot while Facebook has nothing due.
 * This guard runs immediately before the publish cycle. At/after 13:00 in the
 * configured business timezone, if Facebook is enabled, has positive cadence,
 * has not already published today, and no Facebook-capable entry is already
 * due, it promotes exactly one APPROVED_FOR_AUTO Facebook-capable entry to
 * SCHEDULED for now. The normal publish orchestrator still owns deduplication,
 * per-day caps, excluded pillars, API calls, persistence, and verification.
 */
export async function ensureFacebookDueForDailyWindow(now = new Date()): Promise<{
  promotedEntryId: string | null;
  reason: string;
}> {
  const strategy = getSocialStrategy();
  if (!strategy.enabledChannels.facebook) return { promotedEntryId: null, reason: "facebook-disabled" };
  if (getEffectiveCadence(strategy, "facebook", now) <= 0) return { promotedEntryId: null, reason: "facebook-cadence-zero" };
  if (localHour(now, strategy.timezone) < 13) return { promotedEntryId: null, reason: "before-facebook-window" };

  const queue = await readQueue();
  if (hasChannelPublishedToday(queue, "facebook", now, strategy.timezone)) {
    return { promotedEntryId: null, reason: "facebook-already-published-today" };
  }

  const alreadyDue = queue.some((entry) => {
    if (!isFacebookEligible(entry, now)) return false;
    if (!entry.scheduledFor || new Date(entry.scheduledFor).getTime() > now.getTime()) return false;
    return entry.state === "SCHEDULED" || entry.state === "PUBLISHED" || entry.state === "READY_FOR_MANUAL" || entry.state === "FAILED";
  });
  if (alreadyDue) return { promotedEntryId: null, reason: "facebook-entry-already-due" };

  const excluded = new Set(strategy.excludedPillarsByChannel.facebook ?? []);
  const candidates = queue.filter((entry) =>
    entry.state === "APPROVED_FOR_AUTO" &&
    !excluded.has(entry.pillar) &&
    isFacebookEligible(entry, now)
  );

  // Prefer a visual post, then oldest approved content for deterministic backlog drainage.
  candidates.sort((a, b) => {
    const aVisual = a.channels.facebook?.imageUrl ? 1 : 0;
    const bVisual = b.channels.facebook?.imageUrl ? 1 : 0;
    if (aVisual !== bVisual) return bVisual - aVisual;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const selected = candidates[0];
  if (!selected) return { promotedEntryId: null, reason: "no-approved-facebook-candidate" };

  const scheduledFor = now.toISOString();
  const updated = queue.map((entry) => {
    if (entry.id !== selected.id) return entry;
    const transitioned = applyQueueTransition(
      entry,
      "SCHEDULED",
      `Facebook continuity safety net: no Facebook-capable entry was due at the daily window; promoted for ${scheduledFor}.`
    );
    return { ...transitioned, scheduledFor };
  });
  await writeQueue(updated);

  return { promotedEntryId: selected.id, reason: "promoted-approved-facebook-candidate" };
}
