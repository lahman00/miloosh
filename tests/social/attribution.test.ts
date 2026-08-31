import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { recordInboundSocialEvent, getInboundSocialEvents, summarizeInboundByChannel, isValidChannel, isExcludedSocialEvent } from "@/lib/social/attribution";

/**
 * Phase 1E (2026-08-17) — inbound social attribution. Same isolation
 * pattern as tests/lib/click-tracker.test.ts: force the tracking flag on,
 * point at a throwaway local-fallback file, clean up after.
 */

const LOG_FILE = path.join(process.cwd(), "var", "agents", "social-inbound-clicks.json");

let realBackup: string | null = null;
let realFlag: string | undefined;
let realBlobToken: string | undefined;

beforeAll(() => {
  realBackup = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf-8") : null;
  realFlag = process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
  realBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = "true";
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

beforeEach(() => {
  fs.rmSync(LOG_FILE, { force: true });
});

afterAll(() => {
  if (realBackup !== null) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(LOG_FILE, realBackup);
  } else {
    fs.rmSync(LOG_FILE, { force: true });
  }
  if (realFlag !== undefined) process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = realFlag;
  else delete process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
  if (realBlobToken !== undefined) process.env.BLOB_READ_WRITE_TOKEN = realBlobToken;
});

describe("isValidChannel", () => {
  it("accepts a real channel", () => {
    expect(isValidChannel("bluesky")).toBe(true);
  });
  it("rejects an arbitrary string", () => {
    expect(isValidChannel("tiktok")).toBe(false);
    expect(isValidChannel(123)).toBe(false);
    expect(isValidChannel(undefined)).toBe(false);
  });
});

describe("recordInboundSocialEvent — real capture, no personal data", () => {
  it("records channel, campaign, contentId, landingPath, and a server timestamp", async () => {
    await recordInboundSocialEvent({ channel: "bluesky", campaign: "launch-week", contentId: "queue-entry-1", landingPath: "/software/wix" });
    const events = await getInboundSocialEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ channel: "bluesky", campaign: "launch-week", contentId: "queue-entry-1", landingPath: "/software/wix" });
    expect(typeof events[0]!.timestamp).toBe("string");
    expect(Object.keys(events[0]!).sort()).toEqual(["campaign", "channel", "contentId", "landingPath", "timestamp"]); // exact key set — no IP/UA/cookie ever recorded
  });

  it("is a no-op when tracking is disabled", async () => {
    const flag = process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
    delete process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
    await recordInboundSocialEvent({ channel: "mastodon", campaign: null, contentId: null, landingPath: "/software/notion" });
    process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = flag;
    expect(await getInboundSocialEvents()).toHaveLength(0);
  });
});

describe("summarizeInboundByChannel", () => {
  it("groups real landings by channel, busiest first, without inventing zero-rows for unused channels", async () => {
    await recordInboundSocialEvent({ channel: "bluesky", campaign: "a", contentId: "e1", landingPath: "/software/wix" });
    await recordInboundSocialEvent({ channel: "bluesky", campaign: "a", contentId: "e2", landingPath: "/software/notion" });
    await recordInboundSocialEvent({ channel: "mastodon", campaign: "b", contentId: "e3", landingPath: "/software/wix" });

    const events = await getInboundSocialEvents();
    const rows = summarizeInboundByChannel(events);

    expect(rows).toHaveLength(2); // only channels with real data — never a fabricated "x: 0" row
    expect(rows[0]).toEqual({ channel: "bluesky", landings: 2, distinctCampaigns: 1, distinctContent: 2 });
    expect(rows[1]).toEqual({ channel: "mastodon", landings: 1, distinctCampaigns: 1, distinctContent: 1 });
  });
});

/**
 * MILOOSH community attribution readback (2026-08-31): QA/synthetic/
 * operator sessions were previously indistinguishable from real inbound
 * social landings once recorded (no isTest field existed at all on
 * InboundSocialEvent, and components/SocialLandingCapture.tsx never
 * checked the existing ?qa=1 exclusion mechanism before firing).
 */
describe("isTest exclusion (QA/synthetic/operator traffic)", () => {
  it("records isTest:true events in raw storage (immutability — reporting excludes, storage never does)", async () => {
    await recordInboundSocialEvent({ channel: "reddit", campaign: "a", contentId: "e1", landingPath: "/software/wix", isTest: true });
    const events = await getInboundSocialEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.isTest).toBe(true);
    expect(isExcludedSocialEvent(events[0]!)).toBe(true);
  });

  it("an isTest:true event is invisible to summarizeInboundByChannel", async () => {
    await recordInboundSocialEvent({ channel: "reddit", campaign: "a", contentId: "e1", landingPath: "/software/wix", isTest: true });
    await recordInboundSocialEvent({ channel: "reddit", campaign: "a", contentId: "e2", landingPath: "/software/wix", isTest: false });

    const events = await getInboundSocialEvents();
    expect(events).toHaveLength(2); // both stored
    const rows = summarizeInboundByChannel(events);
    expect(rows).toEqual([{ channel: "reddit", landings: 1, distinctCampaigns: 1, distinctContent: 1 }]); // only the real one counted
  });

  it("an event with no isTest field at all (older stored events, or isTest omitted) is treated as real, not excluded", async () => {
    await recordInboundSocialEvent({ channel: "x", campaign: null, contentId: null, landingPath: "/software/wix" });
    const events = await getInboundSocialEvents();
    expect(events[0]!.isTest).toBeUndefined();
    expect(isExcludedSocialEvent(events[0]!)).toBe(false);
    expect(summarizeInboundByChannel(events)).toHaveLength(1);
  });
});
