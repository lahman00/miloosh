import { buyerQuestionFirstIssues } from "@/lib/social/publish";
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { publishOneEntry, runPublishCycle, classifyScheduledEntries, hasChannelAttemptedToday, hasChannelPublishedToday, GRACE_WINDOW_MS, MAX_CATCHUP_PER_RUN, MAX_REQUEUE_ATTEMPTS, REQUEUE_OFFSET_MS } from "@/lib/social/publish";
import { readQueue, addQueueEntries } from "@/lib/social/queue";
import { getSocialStrategy } from "@/lib/social/strategy";
import type { SocialAdapter } from "@/lib/social/channels/types";
import type { Channel, ChannelVariant, PublishResult, SocialQueueEntry } from "@/lib/social/types";

// ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) — real
// attribution-gap regression: reconcilePendingBufferPosts (the async
// "was this LinkedIn post actually confirmed by Buffer" check) used to
// re-derive its result using the raw, never-tagged stored draft link
// instead of the UTM-tagged URL actually sent to Buffer during the
// original publish attempt. Mocked here (not network-mocked) so the
// test can inspect exactly which `link` argument reconciliation used,
// without a real Buffer API call.
vi.mock("@/lib/social/channels/linkedin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/social/channels/linkedin")>();
  return { ...actual, reconcileBufferLinkedInPost: vi.fn() };
});

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) — lib/social/
 * publish.ts's skipChannels now genuinely gates on strategy.enabledChannels
 * (previously a channel disabled there could still be attempted at publish
 * time if an entry already carried its variant — a real gap, now fixed).
 * Several tests below use bluesky/reddit purely as an arbitrary SECOND
 * channel to test multi-channel orchestration (failure isolation, per-day
 * caps), not anything bluesky/reddit-specific — both are for-real disabled
 * in the actual strategy config this reads. This helper force-enables
 * exactly the channels a given test cares about, preserving each test's
 * original intent instead of either weakening the new production check or
 * hunting for a channel name that happens to still be enabled.
 */
function strategyWithChannelsEnabled(...channels: Channel[]) {
  const base = getSocialStrategy();
  const enabledChannels = { ...base.enabledChannels };
  for (const c of channels) enabledChannels[c] = true;
  return { ...base, enabledChannels };
}

const QUEUE_PATH = path.join(process.cwd(), "var", "agents", "social-queue.json");

let realBackup: string | null = null;
let realBlobToken: string | undefined;

beforeAll(() => {
  realBackup = fs.existsSync(QUEUE_PATH) ? fs.readFileSync(QUEUE_PATH, "utf-8") : null;
  realBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

beforeEach(() => {
  fs.rmSync(QUEUE_PATH, { force: true });
});

afterAll(() => {
  if (realBackup !== null) {
    fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
    fs.writeFileSync(QUEUE_PATH, realBackup);
  } else {
    fs.rmSync(QUEUE_PATH, { force: true });
  }
  if (realBlobToken !== undefined) process.env.BLOB_READ_WRITE_TOKEN = realBlobToken;
});

function fakeAdapter(channel: Channel, behavior: "publish" | "throw" | "fail" | "manual"): SocialAdapter {
  return {
    channel,
    requiredEnv: [],
    charLimit: 1000,
    isConfigured: () => true,
    missingEnv: () => [],
    format: (t) => t,
    async publish(variant: ChannelVariant): Promise<PublishResult> {
      if (behavior === "throw") throw new Error(`${channel} adapter exploded`);
      if (behavior === "fail") return { channel, status: "FAILED", text: variant.text, link: variant.link ?? "", postUrl: null, postId: null, verified: false, error: "simulated failure", contentHash: "x" };
      if (behavior === "manual") return { channel, status: "MANUAL_ONLY", text: variant.text, link: variant.link ?? "", postUrl: null, postId: null, verified: false, error: "", contentHash: "x" };
      return { channel, status: "PUBLISHED", text: variant.text, link: variant.link ?? "", postUrl: "https://example.com/post/1", postId: "1", verified: true, error: "", contentHash: "x" };
    },
  };
}

/** Adapter that never actually publishes (SETUP_REQUIRED, like Facebook with no credentials) — used to reproduce the real observed cron behavior in the MANUAL_ONLY-bookkeeping tests below. */
function setupRequiredAdapter(channel: Channel): SocialAdapter {
  return {
    channel,
    requiredEnv: ["SOME_ENV"],
    charLimit: 1000,
    isConfigured: () => false,
    missingEnv: () => ["SOME_ENV"],
    format: (t) => t,
    async publish(variant: ChannelVariant): Promise<PublishResult> {
      return { channel, status: "SETUP_REQUIRED", text: variant.text, link: variant.link ?? "", postUrl: null, postId: null, verified: false, error: "missing env", contentHash: "x" };
    },
  };
}

/** Captures exactly what variant each adapter actually received — used to prove UTM tagging happens before the adapter is called. */
function capturingAdapter(channel: Channel, received: ChannelVariant[]): SocialAdapter {
  return {
    channel,
    requiredEnv: [],
    charLimit: 1000,
    isConfigured: () => true,
    missingEnv: () => [],
    format: (t) => t,
    async publish(variant: ChannelVariant): Promise<PublishResult> {
      received.push(variant);
      return { channel, status: "DRY_RUN", text: variant.text, link: variant.link ?? "", postUrl: null, postId: null, verified: false, error: "", contentHash: "x" };
    },
  };
}

function fixtureEntry(channels: Partial<Record<Channel, ChannelVariant>>): SocialQueueEntry {
  const now = new Date().toISOString();
  return {
    id: "pub-1",
    pillar: "buyer_education",
    topic: "t",
    sourceSlugs: [],
    campaign: null,
    state: "SCHEDULED",
    createdAt: now,
    scheduledFor: now,
    channels,
    qaNotes: [],
    history: [],
  };
}

const blankVariant: ChannelVariant = { text: "hello", link: null, imageUrl: null, altText: null, hashtags: [], publishResult: null };

describe("publishOneEntry — failure isolation", () => {
  it("a channel adapter throwing does not stop the other channels from being attempted", async () => {
    const entry = fixtureEntry({ facebook: blankVariant, bluesky: blankVariant, mastodon: blankVariant });
    const adapters = {
      facebook: fakeAdapter("facebook", "throw"),
      bluesky: fakeAdapter("bluesky", "publish"),
      mastodon: fakeAdapter("mastodon", "fail"),
    } as Record<Channel, SocialAdapter>;

    const attempts = await publishOneEntry(entry, false, adapters);
    expect(attempts).toHaveLength(3);

    const byChannel = Object.fromEntries(attempts.map((a) => [a.channel, a.result.status]));
    expect(byChannel.facebook).toBe("FAILED"); // caught, not propagated
    expect(byChannel.bluesky).toBe("PUBLISHED"); // unaffected by facebook's exception
    expect(byChannel.mastodon).toBe("FAILED");
  });

  it("a throwing adapter's caught error is recorded in the result, not swallowed silently", async () => {
    const entry = fixtureEntry({ facebook: blankVariant });
    const adapters = { facebook: fakeAdapter("facebook", "throw") } as Record<Channel, SocialAdapter>;
    const attempts = await publishOneEntry(entry, false, adapters);
    expect(attempts[0]!.result.error).toContain("facebook adapter exploded");
  });
});

describe("runPublishCycle — dry-run safety", () => {
  it("a dry run never mutates queue state, even when every channel would succeed", async () => {
    await addQueueEntries([fixtureEntry({ bluesky: blankVariant })]);
    await runPublishCycle({ dryRun: true, now: new Date() });
    const after = await readQueue();
    expect(after[0]!.state).toBe("SCHEDULED"); // unchanged — a dry run is a preview only
  });

  it("respects the paused kill switch and attempts nothing", async () => {
    await addQueueEntries([fixtureEntry({ bluesky: blankVariant })]);
    const pausedStrategy = { ...getSocialStrategy(), paused: true };
    const summary = await runPublishCycle({ dryRun: true, now: new Date(), strategy: pausedStrategy });
    expect(summary.paused).toBe(true);
    expect(summary.entriesAttempted).toBe(0);
  });

  it("only picks up entries whose scheduledFor is in the past, not future-scheduled ones", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await addQueueEntries([{ ...fixtureEntry({ bluesky: blankVariant }), scheduledFor: future }]);
    const summary = await runPublishCycle({ dryRun: true, now: new Date() });
    expect(summary.entriesAttempted).toBe(0);
  });
});

/**
 * 2026-08-17 — overdue-backlog safety net. Before this, any SCHEDULED
 * entry with scheduledFor <= now would publish in full the moment the
 * kill switch is lifted, however overdue — a paused period (or a
 * forgotten schedule) would dump the entire stale backlog in one run.
 * See lib/social/publish.ts's header comment for the full policy.
 */
describe("classifyScheduledEntries — grace window", () => {
  const now = new Date("2026-08-17T12:00:00.000Z");

  it("an entry due within the grace window is on-time, not stale", () => {
    const scheduledFor = new Date(now.getTime() - GRACE_WINDOW_MS + 1000).toISOString();
    const { onTime, stale } = classifyScheduledEntries([{ ...fixtureEntry({ bluesky: blankVariant }), scheduledFor }], now);
    expect(onTime).toHaveLength(1);
    expect(stale).toHaveLength(0);
  });

  it("an entry overdue beyond the grace window is stale, not on-time", () => {
    const scheduledFor = new Date(now.getTime() - GRACE_WINDOW_MS - 1000).toISOString();
    const { onTime, stale } = classifyScheduledEntries([{ ...fixtureEntry({ bluesky: blankVariant }), scheduledFor }], now);
    expect(onTime).toHaveLength(0);
    expect(stale).toHaveLength(1);
  });

  it("a future-scheduled entry is neither on-time nor stale", () => {
    const scheduledFor = new Date(now.getTime() + 60_000).toISOString();
    const { onTime, stale } = classifyScheduledEntries([{ ...fixtureEntry({ bluesky: blankVariant }), scheduledFor }], now);
    expect(onTime).toHaveLength(0);
    expect(stale).toHaveLength(0);
  });

  it("stale entries are sorted oldest-first, so the longest-waiting ones claim catch-up slots first", () => {
    const older = { ...fixtureEntry({ bluesky: blankVariant }), id: "older", scheduledFor: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() };
    const newer = { ...fixtureEntry({ bluesky: blankVariant }), id: "newer", scheduledFor: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() };
    const { stale } = classifyScheduledEntries([newer, older], now);
    expect(stale.map((e) => e.id)).toEqual(["older", "newer"]);
  });
});

describe("runPublishCycle — overdue backlog is never dumped", () => {
  it("does not auto-publish a stale entry as-is — it gets requeued to a fresh slot instead", async () => {
    const staleFor = new Date(Date.now() - GRACE_WINDOW_MS - 60_000).toISOString();
    await addQueueEntries([{ ...fixtureEntry({ bluesky: blankVariant }), scheduledFor: staleFor }]);

    const summary = await runPublishCycle({ dryRun: false, now: new Date() });

    expect(summary.entriesAttempted).toBe(0); // never went through the normal publish path
    expect(summary.results).toHaveLength(0);
    expect(summary.staleHandling.requeued).toHaveLength(1);

    const after = await readQueue();
    expect(after[0]!.state).toBe("SCHEDULED"); // still scheduled, not published or failed
    expect(new Date(after[0]!.scheduledFor!).getTime()).toBeGreaterThan(Date.now()); // pushed into the future
  });

  it("a very old backlog is bounded to MAX_CATCHUP_PER_RUN entries per run — the rest waits for a future run", async () => {
    const now = new Date();
    const staleEntries = Array.from({ length: MAX_CATCHUP_PER_RUN + 3 }, (_, i) => ({
      ...fixtureEntry({ bluesky: blankVariant }),
      id: `stale-${i}`,
      scheduledFor: new Date(now.getTime() - GRACE_WINDOW_MS - (i + 1) * 60_000).toISOString(),
    }));
    await addQueueEntries(staleEntries);

    const summary = await runPublishCycle({ dryRun: false, now });

    expect(summary.staleHandling.requeued.length).toBe(MAX_CATCHUP_PER_RUN);
    expect(summary.staleHandling.staleRemaining).toBe(3);
  });

  it("an entry requeued MAX_REQUEUE_ATTEMPTS times stops being auto-requeued and moves to FAILED for manual review", async () => {
    const now = new Date();
    const history = Array.from({ length: MAX_REQUEUE_ATTEMPTS }, (_, i) => ({ state: "SCHEDULED" as const, at: now.toISOString(), note: `stale-requeue: attempt ${i + 1}` }));
    await addQueueEntries([{ ...fixtureEntry({ bluesky: blankVariant }), scheduledFor: new Date(now.getTime() - GRACE_WINDOW_MS - 60_000).toISOString(), history }]);

    const summary = await runPublishCycle({ dryRun: false, now });

    expect(summary.staleHandling.requeued).toHaveLength(0);
    expect(summary.staleHandling.abandoned).toHaveLength(1);
    const after = await readQueue();
    expect(after[0]!.state).toBe("FAILED"); // surfaced for a human, not silently republished forever
  });

  it("a dry run previews stale handling without mutating the queue", async () => {
    const staleFor = new Date(Date.now() - GRACE_WINDOW_MS - 60_000).toISOString();
    await addQueueEntries([{ ...fixtureEntry({ bluesky: blankVariant }), scheduledFor: staleFor }]);

    const summary = await runPublishCycle({ dryRun: true, now: new Date() });
    expect(summary.staleHandling.requeued).toHaveLength(1); // reported in the preview

    const after = await readQueue();
    expect(after[0]!.scheduledFor).toBe(staleFor); // but nothing was actually persisted
    expect(after[0]!.state).toBe("SCHEDULED");
  });

  it("the requeued slot is REQUEUE_OFFSET_MS in the future, not an arbitrary date", async () => {
    const now = new Date();
    const staleFor = new Date(now.getTime() - GRACE_WINDOW_MS - 60_000).toISOString();
    await addQueueEntries([{ ...fixtureEntry({ bluesky: blankVariant }), scheduledFor: staleFor }]);

    const summary = await runPublishCycle({ dryRun: false, now });
    const newScheduledFor = new Date(summary.staleHandling.requeued[0]!.newScheduledFor).getTime();
    expect(newScheduledFor).toBe(now.getTime() + REQUEUE_OFFSET_MS);
  });
});

/**
 * 2026-08-17 pre-production Facebook hardening — UTM tagging is now wired
 * into publishOneEntry(), the one real choke point every channel's
 * publish() call goes through. Proven here by capturing the exact variant
 * each fake adapter receives, rather than trusting buildUtmUrl()'s own
 * (already-covered) unit tests — this is the integration proof that it's
 * actually called, which is what was missing before this fix (the
 * function existed with zero call sites).
 */
describe("publishOneEntry — UTM tagging is wired into the real publish path", () => {
  it("the adapter receives a UTM-tagged link, not the raw stored link", async () => {
    const received: ChannelVariant[] = [];
    const entry = { ...fixtureEntry({ facebook: { ...blankVariant, link: "https://miloosh.com/software/contentful" } }), id: "utm-entry-1", campaign: "spring-launch" };
    const adapters = { facebook: capturingAdapter("facebook", received) } as Record<Channel, SocialAdapter>;

    await publishOneEntry(entry, true, adapters);

    expect(received).toHaveLength(1);
    const url = new URL(received[0]!.link!);
    expect(url.origin + url.pathname).toBe("https://miloosh.com/software/contentful");
    expect(url.searchParams.get("utm_source")).toBe("facebook");
    expect(url.searchParams.get("utm_medium")).toBe("social");
    expect(url.searchParams.get("utm_campaign")).toBe("spring-launch");
    expect(url.searchParams.get("utm_content")).toBe("utm-entry-1"); // stable identifier — the queue entry's own id
  });

  it("defaults utm_campaign to organic when the entry has no campaign set", async () => {
    const received: ChannelVariant[] = [];
    const entry = { ...fixtureEntry({ facebook: { ...blankVariant, link: "https://miloosh.com/software/notion" } }), campaign: null };
    await publishOneEntry(entry, true, { facebook: capturingAdapter("facebook", received) } as Record<Channel, SocialAdapter>);
    expect(new URL(received[0]!.link!).searchParams.get("utm_campaign")).toBe("organic");
  });

  it("a variant with no link is passed through unchanged — no crash, no fabricated link", async () => {
    const received: ChannelVariant[] = [];
    const entry = fixtureEntry({ facebook: { ...blankVariant, link: null } });
    await publishOneEntry(entry, true, { facebook: capturingAdapter("facebook", received) } as Record<Channel, SocialAdapter>);
    expect(received[0]!.link).toBeNull();
  });

  it("the stored queue entry's link is never mutated — tagging happens only at publish time, on a copy", async () => {
    const entry = fixtureEntry({ facebook: { ...blankVariant, link: "https://miloosh.com/software/contentful" } });
    const originalLink = entry.channels.facebook!.link;
    await publishOneEntry(entry, true, { facebook: capturingAdapter("facebook", []) } as Record<Channel, SocialAdapter>);
    expect(entry.channels.facebook!.link).toBe(originalLink); // unchanged — the tagged copy never writes back
  });

  it("this is exactly what a real dry-run against a real entry would show — proof, not assertion, of the Contentful case", async () => {
    const received: ChannelVariant[] = [];
    const entry = { ...fixtureEntry({ facebook: { ...blankVariant, text: "2 alternatives to Contentful...", link: "https://miloosh.com/software/contentful" } }), id: "contentful-entry" };
    await publishOneEntry(entry, true, { facebook: capturingAdapter("facebook", received) } as Record<Channel, SocialAdapter>);
    expect(received[0]!.link).toBe("https://miloosh.com/software/contentful?utm_source=facebook&utm_medium=social&utm_campaign=organic&utm_content=contentful-entry");
  });
});

/**
 * 2026-08-17 pre-production Facebook hardening — reproduces the exact
 * real production-cron behavior discovered before the first live
 * Facebook post: an entry with Facebook SETUP_REQUIRED (no credentials
 * yet) but LinkedIn/Reddit MANUAL_ONLY (content drafted, no API call at
 * all) was landing in PUBLISHED — falsely implying something had gone
 * live externally when nothing had. PUBLISHED must now mean a real
 * external success on at least one channel.
 */
describe("runPublishCycle — MANUAL_ONLY must never masquerade as PUBLISHED", () => {
  it("reproduces the exact observed cron case: facebook SETUP_REQUIRED + linkedin/reddit MANUAL_ONLY -> READY_FOR_MANUAL, not PUBLISHED", async () => {
    await addQueueEntries([fixtureEntry({ linkedin: blankVariant, facebook: blankVariant, reddit: blankVariant })]);
    const adapters = {
      linkedin: fakeAdapter("linkedin", "manual"),
      facebook: setupRequiredAdapter("facebook"),
      reddit: fakeAdapter("reddit", "manual"),
    } as Record<Channel, SocialAdapter>;

    await runPublishCycle({ dryRun: false, now: new Date(), adapters, strategy: strategyWithChannelsEnabled("reddit") });
    const after = await readQueue();

    expect(after[0]!.state).toBe("READY_FOR_MANUAL"); // this used to be the exact bug: it would land in PUBLISHED here
  });

  it("with real adapters (all NEEDS_OWNER_AUTH in a test environment with no channel credentials), the same entry does NOT become PUBLISHED", async () => {
    await addQueueEntries([fixtureEntry({ linkedin: blankVariant, facebook: blankVariant, reddit: blankVariant })]);
    await runPublishCycle({ dryRun: false, now: new Date() }); // real ADAPTERS registry, default
    const after = await readQueue();
    expect(after[0]!.state).not.toBe("PUBLISHED");
  });

  it("an entry with at least one real external success is PUBLISHED even if other channels are manual-only", async () => {
    await addQueueEntries([fixtureEntry({ bluesky: blankVariant, linkedin: blankVariant })]);
    const adapters = { bluesky: fakeAdapter("bluesky", "publish"), linkedin: fakeAdapter("linkedin", "manual") } as Record<Channel, SocialAdapter>;
    const queue = await readQueue();
    const attempts = await publishOneEntry(queue[0]!, false, adapters);
    const realPublish = attempts.some((a) => a.result.status === "PUBLISHED");
    expect(realPublish).toBe(true);
  });

  it("an entry where every channel fails outright (no manual-only, no success) has neither realPublish nor manualReady true", async () => {
    await addQueueEntries([fixtureEntry({ facebook: blankVariant })]);
    const adapters = { facebook: fakeAdapter("facebook", "fail") } as Record<Channel, SocialAdapter>;
    const queue = await readQueue();
    const attempts = await publishOneEntry(queue[0]!, false, adapters);
    const realPublish = attempts.some((a) => a.result.status === "PUBLISHED");
    const manualReady = attempts.some((a) => a.result.status === "MANUAL_ONLY");
    expect(realPublish).toBe(false);
    expect(manualReady).toBe(false);
  });
});

/**
 * 2026-08-17 Facebook production launch — the real, load-bearing safety
 * cap: "maximum one automated Facebook publication per day." Checks the
 * actual recorded PublishResult + history timestamp, not a scheduling
 * target, so it holds even if the scheduler over-produces.
 */
describe("hasChannelPublishedToday", () => {
  const today = new Date("2026-08-17T20:00:00.000Z");

  function publishedEntry(channel: Channel, publishedAt: string): SocialQueueEntry {
    return {
      ...fixtureEntry({ [channel]: { ...blankVariant, publishResult: { channel, status: "PUBLISHED", text: "x", link: "", postUrl: null, postId: "1", verified: true, error: "", contentHash: "x" } } }),
      state: "PUBLISHED",
      history: [{ state: "PUBLISHED", at: publishedAt, note: null }],
    };
  }

  it("true when the channel has a real PUBLISHED result recorded earlier today", () => {
    const queue = [publishedEntry("facebook", "2026-08-17T09:00:00.000Z")];
    expect(hasChannelPublishedToday(queue, "facebook", today)).toBe(true);
  });

  it("false when the channel's PUBLISHED result was on a different UTC day", () => {
    const queue = [publishedEntry("facebook", "2026-08-16T09:00:00.000Z")];
    expect(hasChannelPublishedToday(queue, "facebook", today)).toBe(false);
  });

  it("uses the configured business timezone across a UTC midnight", () => {
    const queue = [publishedEntry("facebook", "2026-08-18T03:30:00.000Z")]; // Aug 17, 23:30 New York
    expect(hasChannelPublishedToday(queue, "facebook", new Date("2026-08-18T04:30:00.000Z"), "America/New_York")).toBe(false);
  });

  it("false when no entry has a PUBLISHED result for that channel at all", () => {
    const queue = [fixtureEntry({ facebook: blankVariant })];
    expect(hasChannelPublishedToday(queue, "facebook", today)).toBe(false);
  });

  it("a different channel's PUBLISHED result today does not count for facebook", () => {
    const queue = [publishedEntry("bluesky", "2026-08-17T09:00:00.000Z")];
    expect(hasChannelPublishedToday(queue, "facebook", today)).toBe(false);
  });

  it("MANUAL_ONLY does not count as PUBLISHED for cap purposes", () => {
    const entry = {
      ...fixtureEntry({ linkedin: { ...blankVariant, publishResult: { channel: "linkedin", status: "MANUAL_ONLY", text: "x", link: "", postUrl: null, postId: null, verified: false, error: "", contentHash: "x" } } }),
      state: "READY_FOR_MANUAL" as const,
      history: [{ state: "READY_FOR_MANUAL" as const, at: "2026-08-17T09:00:00.000Z", note: null }],
    };
    expect(hasChannelPublishedToday([entry], "linkedin", today)).toBe(false);
  });
});

describe("runPublishCycle — Facebook per-day cap enforcement", () => {
  it("a second entry due the same day does not attempt Facebook again once it already published today", async () => {
    const alreadyPublishedToday: SocialQueueEntry = {
      ...fixtureEntry({ facebook: { ...blankVariant, publishResult: { channel: "facebook", status: "PUBLISHED", text: "x", link: "", postUrl: null, postId: "1", verified: true, error: "", contentHash: "x" } } }),
      id: "already-published",
      state: "PUBLISHED",
      history: [{ state: "PUBLISHED", at: new Date().toISOString(), note: null }],
    };
    const secondCandidate: SocialQueueEntry = { ...fixtureEntry({ facebook: blankVariant, bluesky: blankVariant }), id: "second-candidate" };
    await addQueueEntries([alreadyPublishedToday, secondCandidate]);

    const adapters = { facebook: fakeAdapter("facebook", "publish"), bluesky: fakeAdapter("bluesky", "publish") } as Record<Channel, SocialAdapter>;
    await runPublishCycle({ dryRun: false, now: new Date(), adapters, strategy: strategyWithChannelsEnabled("bluesky") });

    const after = await readQueue();
    const second = after.find((e) => e.id === "second-candidate")!;
    expect(second.channels.facebook?.publishResult).toBeNull(); // never attempted — the cap withheld it
    expect(second.channels.bluesky?.publishResult?.status).toBe("PUBLISHED"); // other channels still proceed normally
    expect(second.state).toBe("PUBLISHED"); // bluesky's real success still resolves the entry
  });

  it("an entry whose ONLY channel is Facebook, already capped, is left untouched (still SCHEDULED) rather than marked FAILED", async () => {
    const alreadyPublishedToday: SocialQueueEntry = {
      ...fixtureEntry({ facebook: { ...blankVariant, publishResult: { channel: "facebook", status: "PUBLISHED", text: "x", link: "", postUrl: null, postId: "1", verified: true, error: "", contentHash: "x" } } }),
      id: "already-published",
      state: "PUBLISHED",
      history: [{ state: "PUBLISHED", at: new Date().toISOString(), note: null }],
    };
    const facebookOnly: SocialQueueEntry = { ...fixtureEntry({ facebook: blankVariant }), id: "facebook-only" };
    await addQueueEntries([alreadyPublishedToday, facebookOnly]);

    const adapters = { facebook: fakeAdapter("facebook", "publish") } as Record<Channel, SocialAdapter>;
    await runPublishCycle({ dryRun: false, now: new Date(), adapters });

    const after = await readQueue();
    const entry = after.find((e) => e.id === "facebook-only")!;
    expect(entry.state).toBe("SCHEDULED"); // NOT FAILED — nothing was actually attempted, so nothing should be recorded as a failure
    expect(entry.channels.facebook?.publishResult).toBeNull();
  });

  it("without a prior publish today, Facebook proceeds normally", async () => {
    await addQueueEntries([fixtureEntry({ facebook: blankVariant })]);
    const adapters = { facebook: fakeAdapter("facebook", "publish") } as Record<Channel, SocialAdapter>;
    await runPublishCycle({ dryRun: false, now: new Date(), adapters });
    const after = await readQueue();
    expect(after[0]!.channels.facebook?.publishResult?.status).toBe("PUBLISHED");
  });

  it("retains Facebook as pending when Bluesky succeeds, then publishes Facebook on the next business day", async () => {
    const now = new Date("2026-08-19T17:00:00.000Z");
    const alreadyPublishedToday: SocialQueueEntry = {
      ...fixtureEntry({ facebook: { ...blankVariant, publishResult: { channel: "facebook", status: "PUBLISHED", text: "x", link: "", postUrl: null, postId: "existing", verified: true, error: "", contentHash: "x" } } }),
      id: "already-published",
      state: "PUBLISHED",
      scheduledFor: "2026-08-19T16:00:00.000Z",
      history: [{ state: "PUBLISHED", at: now.toISOString(), note: null }],
    };
    const candidate = { ...fixtureEntry({ facebook: { ...blankVariant }, bluesky: { ...blankVariant } }), id: "provider-independent", scheduledFor: "2026-08-19T16:30:00.000Z" };
    await addQueueEntries([alreadyPublishedToday, candidate]);
    const adapters = { facebook: fakeAdapter("facebook", "publish"), bluesky: fakeAdapter("bluesky", "publish") } as Record<Channel, SocialAdapter>;
    const strategy = strategyWithChannelsEnabled("bluesky");

    await runPublishCycle({ dryRun: false, now, adapters, strategy });
    let updated = (await readQueue()).find((entry) => entry.id === candidate.id)!;
    expect(updated.state).toBe("PUBLISHED");
    expect(updated.channels.facebook?.providerState).toBeUndefined();
    expect(updated.channels.bluesky?.providerState?.status).toBe("PUBLISHED");

    await runPublishCycle({ dryRun: false, now: new Date("2026-08-20T17:00:00.000Z"), adapters, strategy });
    updated = (await readQueue()).find((entry) => entry.id === candidate.id)!;
    expect(updated.channels.facebook?.providerState?.status).toBe("PUBLISHED");
    expect(updated.channels.bluesky?.providerState?.attempts).toBe(1);
  });
});

describe("runPublishCycle — pillar exclusion per channel", () => {
  it("an excluded pillar's entry never attempts the excluded channel, even though it's fully configured", async () => {
    const commercialEntry: SocialQueueEntry = { ...fixtureEntry({ facebook: blankVariant }), pillar: "commercial" };
    await addQueueEntries([commercialEntry]);
    const strategy = { ...getSocialStrategy(), excludedPillarsByChannel: { facebook: ["commercial" as const] } };
    const adapters = { facebook: fakeAdapter("facebook", "publish") } as Record<Channel, SocialAdapter>;

    await runPublishCycle({ dryRun: false, now: new Date(), strategy, adapters });

    const after = await readQueue();
    expect(after[0]!.channels.facebook?.publishResult).toBeNull(); // never attempted
    expect(after[0]!.state).toBe("SCHEDULED"); // untouched, not FAILED
  });

  it("a non-excluded pillar on the same channel still publishes normally", async () => {
    const alternativesEntry: SocialQueueEntry = { ...fixtureEntry({ facebook: blankVariant }), pillar: "alternatives" };
    await addQueueEntries([alternativesEntry]);
    const strategy = { ...getSocialStrategy(), excludedPillarsByChannel: { facebook: ["commercial" as const] } };
    const adapters = { facebook: fakeAdapter("facebook", "publish") } as Record<Channel, SocialAdapter>;

    await runPublishCycle({ dryRun: false, now: new Date(), strategy, adapters });

    const after = await readQueue();
    expect(after[0]!.channels.facebook?.publishResult?.status).toBe("PUBLISHED");
  });
});

describe("runPublishCycle — LinkedIn-only daily continuity", () => {
  const safeLinkedIn = { ...blankVariant, text: "A durable software decision starts with the workflow constraint your team cannot compromise on, not a generic feature-count ranking." };

  it("selects one approved LinkedIn candidate at 17:00 UTC without calling Facebook", async () => {
    const approved = { ...fixtureEntry({ linkedin: safeLinkedIn, facebook: blankVariant }), id: "approved-linkedin", state: "APPROVED_FOR_AUTO" as const, scheduledFor: null };
    await addQueueEntries([approved]);
    const linkedin = fakeAdapter("linkedin", "publish");
    const facebook = fakeAdapter("facebook", "publish");

    const summary = await runPublishCycle({ dryRun: false, now: new Date("2026-08-31T17:00:00.000Z"), adapters: { linkedin, facebook } as Record<Channel, SocialAdapter> });
    const updated = (await readQueue())[0]!;

    expect(summary.results).toEqual([{ entryId: "approved-linkedin", channel: "linkedin", status: "PUBLISHED" }]);
    expect(updated.channels.linkedin?.providerState?.status).toBe("PUBLISHED");
    expect(updated.channels.facebook?.publishResult).toBeNull();
    expect(updated.state).toBe("APPROVED_FOR_AUTO");
  });

  it("does not select another LinkedIn candidate after any real attempt on the same business day", async () => {
    const attempted = { ...fixtureEntry({ linkedin: { ...safeLinkedIn, providerState: { status: "FAILED" as const, attempts: 1, lastAttemptAt: "2026-08-31T17:00:00.000Z", publishedAt: null, postId: null, postUrl: null, contentHash: "x", verified: false, error: "definite failure", transport: "buffer" as const } } }), id: "attempted", state: "FAILED" as const };
    const approved = { ...fixtureEntry({ linkedin: safeLinkedIn }), id: "next-approved", state: "APPROVED_FOR_AUTO" as const, scheduledFor: null };
    await addQueueEntries([attempted, approved]);

    expect(hasChannelAttemptedToday(await readQueue(), "linkedin", new Date("2026-08-31T18:00:00.000Z"), "America/New_York")).toBe(true);
    const summary = await runPublishCycle({ dryRun: false, now: new Date("2026-08-31T17:30:00.000Z"), adapters: { linkedin: fakeAdapter("linkedin", "publish") } as Record<Channel, SocialAdapter> });
    expect(summary.results).toHaveLength(0);
  });

  it("never catches LinkedIn up at the later 18:00 UTC cron while leaving Facebook eligible", async () => {
    const entry = { ...fixtureEntry({ linkedin: safeLinkedIn, facebook: blankVariant }), id: "missed-linkedin-window", scheduledFor: "2026-08-20T17:00:00.000Z" };
    await addQueueEntries([entry]);

    const summary = await runPublishCycle({ dryRun: false, now: new Date("2026-08-20T18:00:00.000Z"), adapters: { linkedin: fakeAdapter("linkedin", "publish"), facebook: fakeAdapter("facebook", "publish") } as Record<Channel, SocialAdapter> });

    expect(summary.results).toEqual([{ entryId: entry.id, channel: "facebook", status: "PUBLISHED" }]);
    const updated = (await readQueue())[0]!;
    expect(updated.channels.linkedin?.providerState).toBeUndefined();
    expect(updated.channels.facebook?.providerState?.status).toBe("PUBLISHED");
  });

  it("honors a channel-specific LinkedIn time without delaying or duplicating other channels", async () => {
    const entry = {
      ...fixtureEntry({ linkedin: { ...safeLinkedIn, scheduledFor: "2026-08-21T17:00:00.000Z" } }),
      id: "channel-specific-linkedin-time",
      scheduledFor: "2026-08-20T17:00:00.000Z",
    };
    await addQueueEntries([entry]);
    const adapters = { linkedin: fakeAdapter("linkedin", "publish") } as Record<Channel, SocialAdapter>;

    const first = await runPublishCycle({ dryRun: false, now: new Date("2026-08-20T17:00:00.000Z"), adapters });
    expect(first.results).toEqual([]);

    const second = await runPublishCycle({ dryRun: false, now: new Date("2026-08-21T17:00:05.000Z"), adapters });
    expect(second.results).toEqual([{ entryId: entry.id, channel: "linkedin", status: "PUBLISHED" }]);
    const updated = (await readQueue())[0]!;
    expect(updated.id).toBe(entry.id);
    expect(updated.channels.linkedin?.providerState?.attempts).toBe(1);
  });
});

describe("reconcilePendingBufferPosts (via runPublishCycle) — attribution integrity", () => {
  it("REGRESSION: reconciling a PENDING_CONFIRMATION LinkedIn post re-derives the UTM-tagged link, not the raw untagged draft link", async () => {
    const { reconcileBufferLinkedInPost } = await import("@/lib/social/channels/linkedin");
    const { buildUtmUrl } = await import("@/lib/social/utm");
    // Mirrors the real function's contract: whatever `link` it's called
    // with is what ends up on the returned PublishResult (see
    // buildPublishResult / resultFromBufferPost in the real module).
    vi.mocked(reconcileBufferLinkedInPost).mockImplementation(async (_bufferPostId, text = "", link = "") => ({
      channel: "linkedin", status: "PUBLISHED", text, link,
      postUrl: "https://www.linkedin.com/feed/update/urn:li:share:1", postId: "1", verified: true, error: "", contentHash: "x", transport: "buffer", bufferPostId: "buf-1",
    }));

    const draftLink = "https://miloosh.com/software/close";
    const entry: SocialQueueEntry = {
      ...fixtureEntry({
        linkedin: {
          text: "x", link: draftLink, imageUrl: null, altText: null, hashtags: [],
          publishResult: { channel: "linkedin", status: "PENDING_CONFIRMATION", text: "x", link: draftLink, postUrl: null, postId: null, verified: false, error: "", contentHash: "x" },
          providerState: { status: "PENDING_CONFIRMATION", attempts: 1, lastAttemptAt: "2026-08-22T07:06:00.000Z", publishedAt: null, postId: null, postUrl: null, contentHash: "x", verified: false, error: "", transport: "buffer", bufferPostId: "buf-1" },
        },
      }),
      campaign: "launch-week",
      state: "SCHEDULED",
    };
    await addQueueEntries([entry]);

    await runPublishCycle({ dryRun: false, now: new Date("2026-08-22T09:00:00.000Z"), adapters: {} as Record<Channel, SocialAdapter> });

    const [, , calledLink] = vi.mocked(reconcileBufferLinkedInPost).mock.calls[0]!;
    const expectedTaggedLink = buildUtmUrl(draftLink, "linkedin", "launch-week", entry.id);
    expect(calledLink).toBe(expectedTaggedLink);
    expect(calledLink).toContain("utm_source=linkedin");

    const updated = (await readQueue()).find((e) => e.id === entry.id)!;
    expect(updated.channels.linkedin?.publishResult?.link).toBe(expectedTaggedLink);
  });
});


describe("buyer-question-first publish gate", () => {
  it("accepts a real buyer question and rejects announcement-style first lines", () => {
    const base = { link: null, imageUrl: null, altText: null, hashtags: [], publishResult: null };
    expect(buyerQuestionFirstIssues({ ...base, text: "What should you use instead of HubSpot?\n\nCompare fit before features." })).toEqual([]);
    expect(buyerQuestionFirstIssues({ ...base, text: "10 CRM tools compared.\n\nHere is the list." })[0]).toContain("first non-empty line");
  });

  it("rejects AI-style em/en dash punctuation even when the first line is a question", () => {
    const base = { link: null, imageUrl: null, altText: null, hashtags: [], publishResult: null };
    expect(buyerQuestionFirstIssues({ ...base, text: "Is HubSpot worth it?\n\nIt depends — especially on team size." })[0]).toContain("dash punctuation");
  });
});
