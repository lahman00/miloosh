import { getSocialStrategy } from "@/lib/social/strategy";
import { readQueue, updateQueueEntry, setQueueState } from "@/lib/social/queue";
import { ADAPTERS } from "@/lib/social/channels/registry";
import type { SocialAdapter } from "@/lib/social/channels/types";
import { publishWithRetry } from "@/lib/social/retry";
import { buildUtmUrl } from "@/lib/social/utm";
import type { Channel, ChannelVariant, ProviderPublishState, PublishResult, SocialQueueEntry } from "@/lib/social/types";
import { reconcileBufferLinkedInPost } from "@/lib/social/channels/linkedin";
import { linkedinPublishIssues, prepareLinkedInVariant } from "@/lib/social/linkedin-readiness";

/**
 * Publish orchestrator — the TypeScript equivalent of Need Go Home's
 * publish_agent.py + scheduler/run_window.py, adapted to this project's
 * serverless/Vercel-Cron execution model instead of a long-lived macOS
 * launchd process:
 *
 *   - KILL SWITCH: social-strategy.json's `paused` flag (same role as
 *     NeeGoHome's PAUSE file) — checked first, before anything else.
 *   - IDEMPOTENCY: only entries in state SCHEDULED with scheduledFor in
 *     the past are picked up; a re-run of the cron job (e.g. a retry)
 *     just finds nothing new to do, since a successful attempt always
 *     transitions the entry out of SCHEDULED.
 *   - FAILURE ISOLATION: every channel's publish() call is awaited
 *     independently and wrapped so one channel's exception can never
 *     stop the loop for the others (Phase 8's explicit requirement).
 *   - No file-lock is needed the way NeeGoHome's process needed
 *     `flock` — Vercel Cron invokes the route serially, and each
 *     invocation is a single short-lived function call, not a
 *     long-running daemon that could overlap itself.
 */

export type PublishRunSummary = {
  ranAt: string;
  dryRun: boolean;
  paused: boolean;
  entriesAttempted: number;
  results: Array<{
    entryId: string;
    channel: Channel;
    status: PublishResult["status"];
    transport?: PublishResult["transport"];
    bufferPostId?: string;
    linkedinPostId?: string;
    error?: string;
  }>;
  staleHandling: {
    graceWindowMs: number;
    maxCatchupPerRun: number;
    maxRequeueAttempts: number;
    /** Overdue entries pushed forward to a fresh slot this run instead of being auto-published as-is. */
    requeued: Array<{ entryId: string; previousScheduledFor: string; newScheduledFor: string; attempt: number }>;
    /** Overdue entries that had already been requeued maxRequeueAttempts times — moved to FAILED for a human to look at, rather than requeued forever. */
    abandoned: Array<{ entryId: string; reason: string }>;
    /** Stale entries that exist but weren't touched this run because maxCatchupPerRun was already spent — still pending, picked up by a future run. */
    staleRemaining: number;
  };
};

const DAILY_ENTRY_CAP = 20; // hard ceiling a scheduler bug can't cross, mirrors NeeGoHome's MAX_PER_DAY concept at the entry level.

export function buyerQuestionFirstIssues(variant: ChannelVariant): string[] {
  const firstLine = variant.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) ?? "";
  if (!firstLine.endsWith("?")) {
    return ["Buyer-question-first policy: the first non-empty line must be a real buyer question ending in '?'."];
  }
  if (/[—–]/.test(variant.text)) {
    return ["Buyer-question-first policy: em/en dash punctuation is not allowed in social copy."];
  }
  return [];
}

/**
 * Overdue-backlog policy (2026-08-17). Without this, any entry with
 * scheduledFor <= now — including one scheduled weeks ago and never run
 * (e.g. after an extended pause) — would publish in full the moment the
 * kill switch is lifted, with content that may reference stale pricing or
 * dates. Instead:
 *   - within GRACE_WINDOW_MS of due: publish normally (today's behavior).
 *   - overdue beyond that: never auto-published as-is. Pushed forward to
 *     a fresh slot (REQUEUE_OFFSET_MS out) so schedule.ts's normal
 *     cadence re-sorts it in, bounded to MAX_CATCHUP_PER_RUN entries per
 *     cron invocation so a large backlog can't be dumped/rescheduled in
 *     one shot.
 *   - an entry requeued MAX_REQUEUE_ATTEMPTS times without ever landing
 *     inside the grace window (i.e. it keeps missing its own rescheduled
 *     slot) stops being auto-requeued and moves to FAILED with a note —
 *     surfaced for manual review instead of looping forever.
 */
export const GRACE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_CATCHUP_PER_RUN = 5;
export const MAX_REQUEUE_ATTEMPTS = 3;
export const REQUEUE_OFFSET_MS = 24 * 60 * 60 * 1000;

function countPriorRequeues(entry: SocialQueueEntry): number {
  return entry.history.filter((h) => h.note?.startsWith("stale-requeue:")).length;
}

export function businessDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/**
 * Real, load-bearing safety cap for the Facebook production launch
 * (2026-08-17) — "maximum one automated Facebook publication per day."
 * Deliberately not scheduling-side alone (a scheduling target can drift
 * from reality); this checks the actual recorded PublishResult on every
 * entry, so it holds even if the scheduler over-produces or the cron
 * runs more than once in a day. A channel's own daily count only ever
 * counts a REAL external PUBLISHED status — READY_FOR_MANUAL/FAILED/
 * SETUP_REQUIRED don't count, matching the same real-vs-manual
 * distinction as the PUBLISHED state fix above.
 */
export function hasChannelPublishedToday(queue: SocialQueueEntry[], channel: Channel, now: Date, timeZone = "UTC"): boolean {
  return queue.some((e) => {
    const variant = e.channels[channel];
    const result = variant?.publishResult;
    if (result?.status !== "PUBLISHED") return false;
    const publishedAt = variant?.providerState?.publishedAt ?? e.history.filter((h) => h.state === "PUBLISHED").map((h) => h.at).at(-1);
    if (!publishedAt) return false;
    return businessDayKey(new Date(publishedAt), timeZone) === businessDayKey(now, timeZone);
  });
}

export function hasChannelAttemptedToday(queue: SocialQueueEntry[], channel: Channel, now: Date, timeZone = "UTC"): boolean {
  return queue.some((entry) => {
    const attemptedAt = entry.channels[channel]?.providerState?.lastAttemptAt;
    return Boolean(attemptedAt && businessDayKey(new Date(attemptedAt), timeZone) === businessDayKey(now, timeZone));
  });
}

function channelNeedsAttempt(variant: ChannelVariant): boolean {
  if (variant.providerState) return variant.providerState.status === "PENDING" || (variant.providerState.status === "FAILED" && variant.providerState.attempts < 3);
  return variant.publishResult === null || variant.publishResult.status === "FAILED" || variant.publishResult.status === "RATE_LIMITED";
}

export function providerStateFromResult(previous: ProviderPublishState | undefined, result: PublishResult, attemptedAt: string): ProviderPublishState {
  const unknownOutcome = result.status === "FAILED" && (result.error.includes("NETWORK_ERROR") || result.error.includes("unknown publication outcome"));
  const status: ProviderPublishState["status"] = result.status === "PUBLISHED" ? "PUBLISHED" : result.status === "PENDING_CONFIRMATION" ? "PENDING_CONFIRMATION" : result.status === "MANUAL_ONLY" ? "MANUAL_READY" : result.status === "SETUP_REQUIRED" ? "BLOCKED" : result.status === "DRY_RUN" || result.status === "DUPLICATE_SKIPPED" ? "PENDING" : unknownOutcome ? "UNKNOWN_OUTCOME" : "FAILED";
  return {
    status,
    attempts: (previous?.attempts ?? 0) + (result.status === "DRY_RUN" ? 0 : 1),
    lastAttemptAt: result.status === "DRY_RUN" ? previous?.lastAttemptAt ?? null : attemptedAt,
    publishedAt: result.status === "PUBLISHED" ? attemptedAt : previous?.publishedAt ?? null,
    postId: result.postId,
    postUrl: result.postUrl,
    contentHash: result.contentHash,
    verified: result.verified,
    error: result.error,
    transport: result.transport ?? previous?.transport ?? null,
    executionId: result.executionId ?? previous?.executionId ?? null,
    bufferPostId: result.bufferPostId ?? previous?.bufferPostId ?? null,
    linkedinPostId: result.linkedinPostId ?? previous?.linkedinPostId ?? null,
  };
}

async function reconcilePendingBufferPosts(queue: SocialQueueEntry[], now: Date): Promise<void> {
  for (const entry of queue) {
    const variant = entry.channels.linkedin;
    const previous = variant?.providerState;
    if (!variant || previous?.status !== "PENDING_CONFIRMATION" || previous.transport !== "buffer" || !previous.bufferPostId) continue;
    // ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) real
    // attribution-gap finding: variant.link here is the raw stored DRAFT
    // link — UTM tags are deliberately never baked into the stored queue
    // copy (see lib/social/utm.ts's header), only applied at the actual
    // publish call. The original publish attempt correctly sent a
    // UTM-tagged URL to Buffer, but if that attempt came back
    // PENDING_CONFIRMATION rather than immediately "sent", this
    // reconciliation pass used to overwrite the stored publishResult.link
    // with the untagged draft link instead — a real, confirmed
    // production case (2026-08-22, entry 37b40676 published with no
    // utm_* params at all). buildUtmUrl is pure and deterministic, so
    // re-deriving the exact same tagged URL here (rather than re-reading
    // a value that was never persisted) reproduces what was actually
    // sent to Buffer, keeping this reconciled result correctly
    // attributable.
    const taggedLink = variant.link ? buildUtmUrl(variant.link, "linkedin", entry.campaign, entry.id) : "";
    const result = await reconcileBufferLinkedInPost(previous.bufferPostId, variant.text, taggedLink);
    const providerState = providerStateFromResult(previous, result, now.toISOString());
    // Reconciliation is a read, not another publication attempt.
    providerState.attempts = previous.attempts;
    providerState.lastAttemptAt = previous.lastAttemptAt;
    await updateQueueEntry(entry.id, { channels: { ...entry.channels, linkedin: { ...variant, publishResult: result, providerState } } });
    if (result.status === "PUBLISHED" && entry.state === "SCHEDULED") await setQueueState(entry.id, "PUBLISHED", `LinkedIn publication confirmed by Buffer reconciliation (${previous.bufferPostId}).`);
  }
}

/** Pure — no I/O, easy to unit test. Splits due SCHEDULED entries into on-time (publish normally) vs stale (never auto-published as-is). Stale entries are sorted oldest-first so the longest-waiting ones claim the bounded per-run catch-up slots first. */
export function classifyScheduledEntries(queue: SocialQueueEntry[], now: Date): { onTime: SocialQueueEntry[]; stale: SocialQueueEntry[] } {
  const onTime: SocialQueueEntry[] = [];
  const stale: SocialQueueEntry[] = [];
  for (const e of queue) {
    if (!e.scheduledFor) continue;
    const hasPendingProvider = Object.values(e.channels).some((variant) => variant && channelNeedsAttempt(variant));
    // A provider may still be pending after another provider moved the
    // compatibility entry state to PUBLISHED/READY_FOR_MANUAL. Keep that
    // channel eligible on later business days instead of losing it.
    if (e.state !== "SCHEDULED" && e.state !== "PUBLISHED" && e.state !== "READY_FOR_MANUAL" && e.state !== "FAILED") continue;
    if (e.state === "SCHEDULED" && !hasPendingProvider) continue;
    if (e.state !== "SCHEDULED" && !hasPendingProvider) continue;
    const scheduledMs = new Date(e.scheduledFor).getTime();
    if (scheduledMs > now.getTime()) continue; // not due yet
    const hasDueChannelSchedule = Object.values(e.channels).some((variant) =>
      variant && channelNeedsAttempt(variant) && variant.scheduledFor && new Date(variant.scheduledFor).getTime() <= now.getTime()
    );
    // A channel-specific schedule is authoritative for that provider. It
    // must not be discarded merely because the shared entry became stale
    // while this one channel was deliberately waiting for its own window.
    if (hasDueChannelSchedule) {
      onTime.push(e);
      continue;
    }
    if (e.state !== "SCHEDULED") {
      onTime.push(e);
      continue;
    }
    const overdueMs = now.getTime() - scheduledMs;
    if (overdueMs <= GRACE_WINDOW_MS) onTime.push(e);
    else stale.push(e);
  }
  stale.sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime());
  return { onTime, stale };
}

/**
 * Adapters are injectable (default: the real registry) so tests can
 * exercise failure isolation with a fake adapter that throws, without
 * needing real channel credentials or network access. `skipChannels`
 * (2026-08-17) lets the caller withhold specific channels for THIS call
 * without touching the entry's stored channels — used for the Facebook
 * per-day cap and pillar exclusion below. A skipped channel is simply
 * never attempted this cycle (not a FAILED result) — it's reconsidered
 * next time this entry is processed.
 */
export async function publishOneEntry(
  entry: SocialQueueEntry,
  dryRun: boolean,
  adapters: Record<Channel, SocialAdapter> = ADAPTERS,
  skipChannels: Channel[] = []
): Promise<{ channel: Channel; result: PublishResult }[]> {
  const attempts: { channel: Channel; result: PublishResult }[] = [];
  const channelKeys = (Object.keys(entry.channels) as Channel[]).filter((channel) => channelNeedsAttempt(entry.channels[channel]!));

  for (const channel of channelKeys) {
    if (skipChannels.includes(channel)) continue;
    const variant = channel === "linkedin" ? prepareLinkedInVariant(entry) : entry.channels[channel];
    if (!variant) continue;
    const adapter = adapters[channel];
    // Enforce the buyer-question-first cutover on REAL live publication.
    // Fake adapters are used by orchestration unit tests, and dry-runs must
    // remain able to exercise transport/UTM behavior without mutating state.
    if (!dryRun && adapter === ADAPTERS[channel]) {
      const buyerQuestionIssues = buyerQuestionFirstIssues(variant);
      if (buyerQuestionIssues.length) {
        attempts.push({ channel, result: buildBlockedPublishResult(channel, variant, buyerQuestionIssues) });
        continue;
      }
    }
    if (channel === "linkedin" && adapter === ADAPTERS.linkedin) {
      const issues = linkedinPublishIssues(entry, variant);
      if (issues.length) {
        attempts.push({ channel, result: buildBlockedPublishResult(channel, variant, issues) });
        continue;
      }
    }
    // UTM tagging happens here, at publish time, never baked into the
    // stored draft — this is the one choke point every channel's real
    // publish() call goes through (dry-run included, so a dry-run proves
    // the tagged URL that would actually be sent). Reuses buildUtmUrl()
    // as-is: it already preserves any existing query params and
    // overwrites (never duplicates) the four utm_* keys via
    // URLSearchParams.set(). utm_content is the queue entry's own id —
    // stable, and already the resolved Miloosh destination (never the
    // raw affiliate URL — content-engine.ts resolves commercial-pillar
    // links to the Miloosh page, not the vendor, before this ever runs).
    const taggedVariant: ChannelVariant = variant.link ? { ...variant, link: buildUtmUrl(variant.link, channel, entry.campaign, entry.id) } : variant;
    let result: PublishResult;
    try {
      result = await publishWithRetry(() => adapter.publish(taggedVariant, { dryRun, entryId: entry.id, scheduledAt: variant.scheduledFor ?? entry.scheduledFor }));
    } catch (err) {
      // Failure-safe fallback in case an adapter implementation itself
      // throws instead of catching its own error (contract violation,
      // but the orchestrator must never let it propagate regardless).
      result = {
        channel,
        status: "FAILED",
        text: taggedVariant.text,
        link: taggedVariant.link ?? "",
        postUrl: null,
        postId: null,
        verified: false,
        error: `orchestrator caught unhandled adapter error: ${err instanceof Error ? err.message : String(err)}`,
        contentHash: "",
      };
    }
    attempts.push({ channel, result });
  }

  return attempts;
}

function buildBlockedPublishResult(channel: Channel, variant: ChannelVariant, issues: string[]): PublishResult {
  return {
    channel,
    status: "FAILED",
    text: variant.text,
    link: variant.link ?? "",
    postUrl: null,
    postId: null,
    verified: false,
    error: `Deterministic pre-publish quality gate blocked this post: ${issues.join(" ")}`,
    contentHash: "",
    transport: channel === "linkedin" ? "buffer" : null,
    targetId: channel === "linkedin" ? process.env.SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID ?? null : null,
  };
}

export async function runPublishCycle(options: { dryRun: boolean; now?: Date; strategy?: ReturnType<typeof getSocialStrategy>; adapters?: Record<Channel, SocialAdapter> }): Promise<PublishRunSummary> {
  const now = options.now ?? new Date();
  const strategy = options.strategy ?? getSocialStrategy();
  const adapters = options.adapters ?? ADAPTERS;

  const emptyStaleHandling = { graceWindowMs: GRACE_WINDOW_MS, maxCatchupPerRun: MAX_CATCHUP_PER_RUN, maxRequeueAttempts: MAX_REQUEUE_ATTEMPTS, requeued: [], abandoned: [], staleRemaining: 0 };

  if (strategy.paused) {
    return { ranAt: now.toISOString(), dryRun: options.dryRun, paused: true, entriesAttempted: 0, results: [], staleHandling: emptyStaleHandling };
  }

  const queue = await readQueue();
  // A dry run must not contact Buffer or mutate provider state. Live cron
  // invocations reconcile prior Buffer acceptance before considering new
  // due work, so Buffer remains transport rather than a second scheduler.
  if (!options.dryRun) await reconcilePendingBufferPosts(queue, now);
  const { onTime, stale } = classifyScheduledEntries(queue, now);
  const due = onTime.slice(0, DAILY_ENTRY_CAP);
  const linkedinOnlyEntryIds = new Set<string>();
  // LinkedIn-only continuity once the pre-scheduled runway is exhausted.
  // The selected APPROVED entry is explicitly marked LinkedIn-only for
  // this invocation; no other adapter is eligible and the shared entry's
  // schedule/state is not changed. 17:00 UTC matches the existing slots.
  const hasDueLinkedIn = due.some((entry) => entry.channels.linkedin && channelNeedsAttempt(entry.channels.linkedin));
  if (now.getUTCHours() === 17 && !hasDueLinkedIn && !hasChannelAttemptedToday(queue, "linkedin", now, strategy.timezone)) {
    const approvedLinkedIn = queue.find((entry) => {
      const variant = prepareLinkedInVariant(entry);
      return entry.state === "APPROVED_FOR_AUTO" && variant && channelNeedsAttempt(variant) && linkedinPublishIssues(entry, variant).length === 0;
    });
    if (approvedLinkedIn) {
      due.push(approvedLinkedIn);
      linkedinOnlyEntryIds.add(approvedLinkedIn.id);
    }
  }
  const staleToHandle = stale.slice(0, MAX_CATCHUP_PER_RUN);

  const requeued: PublishRunSummary["staleHandling"]["requeued"] = [];
  const abandoned: PublishRunSummary["staleHandling"]["abandoned"] = [];

  for (const entry of staleToHandle) {
    const priorAttempts = countPriorRequeues(entry);
    if (priorAttempts >= MAX_REQUEUE_ATTEMPTS) {
      const reason = `exceeded max requeue attempts (${MAX_REQUEUE_ATTEMPTS}) — needs manual review`;
      abandoned.push({ entryId: entry.id, reason });
      if (!options.dryRun) {
        await setQueueState(entry.id, "FAILED", `Stale backlog: overdue and requeued ${priorAttempts} times without becoming current. Needs manual review/reschedule, not auto-published. ${reason}`);
      }
      continue;
    }
    const newScheduledFor = new Date(now.getTime() + REQUEUE_OFFSET_MS).toISOString();
    requeued.push({ entryId: entry.id, previousScheduledFor: entry.scheduledFor!, newScheduledFor, attempt: priorAttempts + 1 });
    if (!options.dryRun) {
      await updateQueueEntry(entry.id, {
        scheduledFor: newScheduledFor,
        history: [
          ...entry.history,
          { state: "SCHEDULED", at: now.toISOString(), note: `stale-requeue: was overdue (originally ${entry.scheduledFor}), rescheduled to ${newScheduledFor} (attempt ${priorAttempts + 1}/${MAX_REQUEUE_ATTEMPTS})` },
        ],
      });
    }
  }

  const staleHandling: PublishRunSummary["staleHandling"] = {
    graceWindowMs: GRACE_WINDOW_MS,
    maxCatchupPerRun: MAX_CATCHUP_PER_RUN,
    maxRequeueAttempts: MAX_REQUEUE_ATTEMPTS,
    requeued,
    abandoned,
    staleRemaining: stale.length - staleToHandle.length,
  };

  const results: PublishRunSummary["results"] = [];
  // Tracked across this whole run (not just the initial queue snapshot) —
  // if an earlier entry in this same cycle achieves a real Facebook
  // PUBLISHED, every later entry in the same run must also see the cap
  // as reached, not just entries processed by a future invocation.
  const publishedTodayByChannel = new Map<Channel, boolean>();
  const attemptedTodayByChannel = new Map<Channel, boolean>();
  const channelHasPublishedToday = (channel: Channel) => publishedTodayByChannel.get(channel) ?? hasChannelPublishedToday(queue, channel, now, strategy.timezone);
  const channelHasAttemptedToday = (channel: Channel) => attemptedTodayByChannel.get(channel) ?? hasChannelAttemptedToday(queue, channel, now, strategy.timezone);

  for (const entry of due) {
    // Two independent, permanent-until-config-changes reasons a channel
    // gets withheld for this entry: (1) that channel already published
    // for real today (the launch-period safety cap), or (2) this
    // entry's pillar is excluded for that channel (e.g. "commercial"
    // posts blocked from Facebook pending a content-quality fix).
    // KNOWN GAP (2026-08-17, same family as schedule.ts's documented
    // per-channel-cadence simplification): if an entry has multiple
    // channels and ONLY Facebook gets skipped here while another channel
    // still succeeds, the entry still leaves SCHEDULED — so Facebook
    // permanently misses that entry's content rather than being retried
    // later. Only reachable if more than one entry is due in the same
    // cycle (rare at a ~1/day pace); not fixed here, since a real fix
    // needs per-channel state, not per-entry — flagged, not silently
    // accepted.
    const skipChannels = (Object.keys(entry.channels) as Channel[]).filter((channel) => {
      // ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) — a real
      // gap this closes: disabling a channel in enabledChannels (e.g.
      // bluesky/mastodon, which have never had real production
      // credentials) previously only affected future content generation
      // and schedule.ts's cadence math, never the publish attempt itself.
      // An entry generated before the channel was disabled still carries
      // that channel's variant with publishResult: null, which
      // channelNeedsAttempt() reads as "needs attempt" regardless of the
      // current strategy config — so every not-yet-tried entry in the
      // backlog would still burn one real attempt against a channel
      // that's known to have no credentials. Checked first, before any
      // per-entry logic, since a disabled channel is a blanket fact, not
      // conditional on this entry.
      if (!strategy.enabledChannels[channel]) return true;
      if (linkedinOnlyEntryIds.has(entry.id) && channel !== "linkedin") return true;
      const channelScheduledFor = entry.channels[channel]?.scheduledFor;
      if (channelScheduledFor && new Date(channelScheduledFor).getTime() > now.getTime()) return true;
      // LinkedIn has one deliberate professional publication window. A
      // missed invocation waits for the next day's window instead of
      // becoming a late-night catch-up; other channels remain unaffected.
      if (channel === "linkedin" && now.getUTCHours() !== 17) return true;
      if (channel === "linkedin" && channelHasAttemptedToday(channel)) return true;
      if (channelHasPublishedToday(channel)) return true;
      const excludedPillars = strategy.excludedPillarsByChannel[channel];
      return Boolean(excludedPillars?.includes(entry.pillar));
    });

    const attempts = await publishOneEntry(entry, options.dryRun, adapters, skipChannels);
    for (const { channel, result } of attempts) {
      results.push({
        entryId: entry.id,
        channel,
        status: result.status,
        ...(result.transport ? { transport: result.transport } : {}),
        ...(result.bufferPostId ? { bufferPostId: result.bufferPostId } : {}),
        ...(result.linkedinPostId ? { linkedinPostId: result.linkedinPostId } : {}),
        ...(result.error ? { error: result.error } : {}),
      });
      if (result.status === "PUBLISHED") publishedTodayByChannel.set(channel, true);
      if (channel === "linkedin" && !options.dryRun && result.status !== "DUPLICATE_SKIPPED") attemptedTodayByChannel.set(channel, true);
    }

    // Every channel was withheld (daily cap already hit, or every
    // present channel is pillar-excluded) — nothing was actually
    // attempted, so this entry must NOT be touched at all: no FAILED, no
    // publishResult write, no state change. It stays SCHEDULED and is
    // reconsidered on a future cycle (the cap resets the next calendar
    // day). Skipping this here is what prevents "Facebook already
    // published today" from wrongly failing the entry outright.
    if (attempts.length === 0) continue;

    // A dry run is a preview: it must never mutate the queue, or running
    // one (e.g. to sanity-check what's about to fire) would permanently
    // dead-end a SCHEDULED entry into PUBLISHED with no real post having
    // happened anywhere — the queue's PUBLISHED state has no outgoing
    // transition, so this would be irreversible. Only a real (--live /
    // authenticated cron) run is allowed to persist anything.
    if (options.dryRun) continue;

    // A concurrent/retried invocation that lost the durable LinkedIn
    // provider claim made no external request and must not overwrite the
    // winner's state or mark the shared queue entry failed.
    if (attempts.every((attempt) => attempt.result.status === "DUPLICATE_SKIPPED")) continue;

    const updatedChannels = { ...entry.channels };
    for (const { channel, result } of attempts) {
      const current = updatedChannels[channel]!;
      updatedChannels[channel] = { ...current, publishResult: result, providerState: providerStateFromResult(current.providerState, result, now.toISOString()) };
    }
    await updateQueueEntry(entry.id, { channels: updatedChannels });

    // PUBLISHED must mean something was actually, externally published —
    // MANUAL_ONLY (LinkedIn, Reddit: content drafted for a human to paste,
    // no API call made at all) is not that, and must never be counted as
    // if it were. A real bug, found before the first live Facebook post:
    // an entry whose only "successful" channels were MANUAL_ONLY was
    // landing in PUBLISHED, which falsely implied something had gone
    // live. Three real outcomes now: a genuine external success anywhere
    // -> PUBLISHED; no external success but at least one channel has
    // manual content ready -> READY_FOR_MANUAL; neither -> FAILED.
    const realPublish = attempts.some((a) => a.result.status === "PUBLISHED");
    const manualReady = attempts.some((a) => a.result.status === "MANUAL_ONLY");
    const pendingConfirmation = attempts.some((a) => a.result.status === "PENDING_CONFIRMATION");
    const nextState = realPublish ? "PUBLISHED" : manualReady ? "READY_FOR_MANUAL" : pendingConfirmation ? "SCHEDULED" : "FAILED";
    const note = nextState === "FAILED" ? "All channel attempts failed — see per-channel publishResult for detail." : nextState === "READY_FOR_MANUAL" ? "No channel published automatically — manual-only content is drafted and ready for a human to post (see per-channel publishResult)." : undefined;
    if (entry.state === "SCHEDULED" && nextState !== "SCHEDULED") await setQueueState(entry.id, nextState, note);
  }

  return { ranAt: now.toISOString(), dryRun: options.dryRun, paused: false, entriesAttempted: due.length, results, staleHandling };
}
