import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runPublishCycle, providerStateFromResult, classifyScheduledEntries } from "@/lib/social/publish";
import { isProviderAuthFailure, markAuthBlocked } from "@/lib/social/auth-failure";
import { readQueue, addQueueEntries } from "@/lib/social/queue";
import type { SocialAdapter } from "@/lib/social/channels/types";
import type { Channel, ChannelVariant, PublishResult, SocialQueueEntry } from "@/lib/social/types";

// A provider rejecting the stored credential (Facebook OAuth code 190,
// Buffer "Access token is not valid") is an owner action, not a property
// of the post. It must not consume the post's three attempts, must not
// move the entry to FAILED, and must stop further calls to that provider
// in the same cycle.

const QUEUE_PATH = path.join(process.cwd(), "var", "agents", "social-queue.json");
let realBackup: string | null = null;
let realBlobToken: string | undefined;

beforeAll(() => {
  realBackup = fs.existsSync(QUEUE_PATH) ? fs.readFileSync(QUEUE_PATH, "utf-8") : null;
  realBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});
beforeEach(() => fs.rmSync(QUEUE_PATH, { force: true }));
afterAll(() => {
  if (realBackup !== null) {
    fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
    fs.writeFileSync(QUEUE_PATH, realBackup);
  } else fs.rmSync(QUEUE_PATH, { force: true });
  if (realBlobToken !== undefined) process.env.BLOB_READ_WRITE_TOKEN = realBlobToken;
});

const FB_190 = "AUTH_TOKEN_ERROR: Error validating access token: Session has expired [subcode 463] (fbtrace_id: abc)";
const BUFFER_INVALID = "Buffer API Access token is not valid";

function result(channel: Channel, status: PublishResult["status"], error: string): PublishResult {
  return { channel, status, text: "t", link: "", postUrl: null, postId: null, verified: false, error, contentHash: "x" };
}

function adapter(channel: Channel, outcome: () => PublishResult, calls: string[]): SocialAdapter {
  return {
    channel, requiredEnv: [], charLimit: 1000, isConfigured: () => true, missingEnv: () => [], format: (t) => t,
    async publish(variant: ChannelVariant, options) {
      calls.push(`${channel}:${options.entryId}`);
      return outcome();
    },
  };
}

const blank: ChannelVariant = { text: "hello", link: null, imageUrl: null, altText: null, hashtags: [], publishResult: null };
function entry(id: string, channels: Partial<Record<Channel, ChannelVariant>>): SocialQueueEntry {
  const at = new Date(Date.now() - 60_000).toISOString();
  return { id, pillar: "buyer_education", topic: id, sourceSlugs: [], campaign: null, state: "SCHEDULED", createdAt: at, scheduledFor: at, channels, qaNotes: [], history: [] };
}

describe("isProviderAuthFailure", () => {
  it.each([
    [FB_190, true],
    [BUFFER_INVALID, true],
    ["Buffer API HTTP 401", true],
    ["Buffer API Unauthorized", true],
    ["PERMISSION_ERROR: (#200) requires pages_manage_posts", false],
    ["RATE_LIMIT: too many calls", false],
    ["INVALID_CONTENT: duplicate status", false],
    ["PAGE_ERROR: Unsupported get request", false],
    ["simulated failure", false],
    ["Buffer API Post text is not valid", false],
  ])("%s -> %s", (error, expected) => {
    expect(isProviderAuthFailure(result("facebook", "FAILED", error))).toBe(expected);
  });

  it("only a FAILED result can be an auth failure", () => {
    expect(isProviderAuthFailure(result("facebook", "PUBLISHED", FB_190))).toBe(false);
  });
});

describe("providerStateFromResult with an auth block", () => {
  it("does not consume an attempt and is not a terminal FAILED", () => {
    const blocked = markAuthBlocked(result("facebook", "FAILED", FB_190));
    const state = providerStateFromResult({ ...providerStateFromResult(undefined, result("facebook", "FAILED", "boom"), "t0"), attempts: 2 }, blocked, "t1");
    expect(state.attempts).toBe(2);
    expect(state.status).toBe("BLOCKED");
    expect(state.error).toContain("owner re-authorization");
  });
});

describe("runPublishCycle during a provider credential outage", () => {
  it("leaves every entry SCHEDULED, makes one provider call, and consumes no attempts", async () => {
    await addQueueEntries([entry("a", { facebook: blank }), entry("b", { facebook: blank }), entry("c", { facebook: blank })]);
    const calls: string[] = [];
    const adapters = { facebook: adapter("facebook", () => result("facebook", "FAILED", FB_190), calls) } as Record<Channel, SocialAdapter>;

    await runPublishCycle({ dryRun: false, now: new Date(), adapters });

    expect(calls).toHaveLength(1);
    const after = await readQueue();
    for (const e of after) {
      expect(e.state).toBe("SCHEDULED");
      expect((e.channels.facebook?.providerState?.attempts ?? 0)).toBe(0);
    }
    const tried = after.find((e) => e.channels.facebook?.publishResult)!;
    expect(tried.channels.facebook?.publishResult?.error).toContain("owner re-authorization");
  });

  it("publishes the same entry on a later cycle once the credential works again", async () => {
    await addQueueEntries([entry("a", { facebook: blank })]);
    const calls: string[] = [];
    let healthy = false;
    const adapters = { facebook: adapter("facebook", () => (healthy ? result("facebook", "PUBLISHED", "") : result("facebook", "FAILED", FB_190)), calls) } as Record<Channel, SocialAdapter>;

    await runPublishCycle({ dryRun: false, now: new Date(), adapters });
    expect((await readQueue())[0]!.state).toBe("SCHEDULED");
    healthy = true;
    await runPublishCycle({ dryRun: false, now: new Date(), adapters });
    const final = (await readQueue())[0]!;
    expect(final.channels.facebook?.publishResult?.status).toBe("PUBLISHED");
    expect(final.state).toBe("PUBLISHED");
  });

  it("an auth block on one channel does not stop another channel from publishing the entry", async () => {
    await addQueueEntries([entry("a", { facebook: blank, bluesky: blank })]);
    const calls: string[] = [];
    const adapters = {
      facebook: adapter("facebook", () => result("facebook", "FAILED", FB_190), calls),
      bluesky: adapter("bluesky", () => result("bluesky", "PUBLISHED", ""), calls),
    } as Record<Channel, SocialAdapter>;
    const { getSocialStrategy } = await import("@/lib/social/strategy");
    const base = getSocialStrategy();
    await runPublishCycle({ dryRun: false, now: new Date(), adapters, strategy: { ...base, enabledChannels: { ...base.enabledChannels, bluesky: true } } });
    const e = (await readQueue())[0]!;
    expect(e.channels.bluesky?.publishResult?.status).toBe("PUBLISHED");
    expect(e.state).toBe("PUBLISHED");
  });

  it("a non-auth failure still behaves exactly as before: FAILED, attempt counted", async () => {
    await addQueueEntries([entry("a", { facebook: blank })]);
    const calls: string[] = [];
    const adapters = { facebook: adapter("facebook", () => result("facebook", "FAILED", "PAGE_ERROR: bad page"), calls) } as Record<Channel, SocialAdapter>;
    await runPublishCycle({ dryRun: false, now: new Date(), adapters });
    const e = (await readQueue())[0]!;
    expect(e.state).toBe("FAILED");
    expect(e.channels.facebook?.providerState?.attempts).toBe(1);
  });
});

describe("classifyScheduledEntries", () => {
  it("keeps an auth-blocked channel eligible for the next attempt", () => {
    const blocked = markAuthBlocked(result("facebook", "FAILED", FB_190));
    const variant: ChannelVariant = { ...blank, publishResult: blocked, providerState: providerStateFromResult(undefined, blocked, "t") };
    const { onTime } = classifyScheduledEntries([entry("a", { facebook: variant })], new Date());
    expect(onTime).toHaveLength(1);
  });
});
