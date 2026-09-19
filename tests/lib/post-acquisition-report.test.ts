import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { analyticsLocalPath } from "@/lib/analytics/local-store-path";
import fs from "node:fs";
import path from "node:path";
import { buildPostAcquisitionTable } from "@/scripts/growth/post-acquisition-report";
import { recordFirstPartyEvent, type FirstPartyEvent } from "@/lib/analytics/events";
import { addQueueEntries } from "@/lib/social/queue";
import type { ChannelVariant, SocialQueueEntry } from "@/lib/social/types";

/**
 * Proves post-level attribution joins utm_content to the social queue only
 * after canonical human qualification. A flat non-test hit is not enough.
 */
const ANALYTICS_PATH = analyticsLocalPath("first-party-analytics.json");
const QUEUE_PATH = path.join(process.cwd(), "var", "agents", "social-queue.json");

let analyticsBackup: string | null = null;
let queueBackup: string | null = null;
let realBlobToken: string | undefined;

beforeAll(() => {
  analyticsBackup = fs.existsSync(ANALYTICS_PATH) ? fs.readFileSync(ANALYTICS_PATH, "utf-8") : null;
  queueBackup = fs.existsSync(QUEUE_PATH) ? fs.readFileSync(QUEUE_PATH, "utf-8") : null;
  realBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

beforeEach(() => {
  fs.rmSync(ANALYTICS_PATH, { force: true });
  fs.rmSync(QUEUE_PATH, { force: true });
});

afterAll(() => {
  for (const [p, backup] of [[ANALYTICS_PATH, analyticsBackup], [QUEUE_PATH, queueBackup]] as const) {
    if (backup !== null) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, backup);
    } else {
      fs.rmSync(p, { force: true });
    }
  }
  if (realBlobToken !== undefined) process.env.BLOB_READ_WRITE_TOKEN = realBlobToken;
});

const blankVariant: ChannelVariant = { text: "hello", link: "https://miloosh.com/software/circleci", imageUrl: null, altText: null, hashtags: [], publishResult: null };

function queueEntry(id: string): SocialQueueEntry {
  const now = new Date().toISOString();
  return { id, pillar: "alternatives", topic: "alternatives-circleci", sourceSlugs: ["circleci"], campaign: null, state: "PUBLISHED", createdAt: now, scheduledFor: now, channels: { facebook: { ...blankVariant } }, qaNotes: [], history: [] };
}

describe("buildPostAcquisitionTable", () => {
  it("attributes a human-qualified visitor to the specific post that brought them via utm_content", async () => {
    await addQueueEntries([queueEntry("post-1")]);
    const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
    await recordFirstPartyEvent({ type: "page_view", path: "/software/circleci", utmContent: "post-1", utmSource: "facebook", utmMedium: "social", visitorId: "v_a", sessionId: "s_a", timestamp: t(0) } as FirstPartyEvent);
    await recordFirstPartyEvent({ type: "software_view", path: "/software/circleci", softwareSlug: "circleci", visitorId: "v_a", sessionId: "s_a", timestamp: t(1000) } as FirstPartyEvent);
    await recordFirstPartyEvent({ type: "engaged_view", path: "/software/circleci", durationSeconds: 12, visitorId: "v_a", sessionId: "s_a", timestamp: t(12000) } as FirstPartyEvent);

    const rows = await buildPostAcquisitionTable();
    const row = rows.find((r) => r.queueEntryId === "post-1" && r.channel === "facebook");
    expect(row).toBeTruthy();
    expect(row?.realVisitors).toBe(1);
    expect(row?.engaged).toBe(1);
    expect(row?.commercialActions).toBe(1);
    expect(row?.topic).toBe("alternatives-circleci");
    expect(row?.destination).toBe("https://miloosh.com/software/circleci");
  });

  it("does not call a shallow non-test UTM page hit a real visitor", async () => {
    await addQueueEntries([queueEntry("post-shallow")]);
    await recordFirstPartyEvent({
      type: "page_view",
      path: "/software/circleci",
      utmContent: "post-shallow",
      utmSource: "facebook",
      utmMedium: "social",
      visitorId: "v_shallow",
      sessionId: "s_shallow",
      timestamp: new Date().toISOString(),
    } as FirstPartyEvent);

    const rows = await buildPostAcquisitionTable();
    expect(rows.find((r) => r.queueEntryId === "post-shallow")).toBeUndefined();
  });

  it("never attributes a visitor with no utm_content to any post", async () => {
    const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
    await recordFirstPartyEvent({ type: "page_view", path: "/", visitorId: "v_organic", sessionId: "s_organic", timestamp: t(0) } as FirstPartyEvent);
    const rows = await buildPostAcquisitionTable();
    expect(rows.every((r) => r.queueEntryId !== undefined)).toBe(true);
    expect(rows.some((r) => r.realVisitors > 0 && r.queueEntryId === "")).toBe(false);
  });

  it("counts an affiliate click only on a human-qualified attributed session with pre-click funnel evidence", async () => {
    await addQueueEntries([queueEntry("post-click")]);
    const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
    await recordFirstPartyEvent({ type: "page_view", path: "/software/circleci", utmContent: "post-click", visitorId: "v_click", sessionId: "s_click", timestamp: t(0) } as FirstPartyEvent);
    await recordFirstPartyEvent({ type: "software_view", path: "/software/circleci", softwareSlug: "circleci", visitorId: "v_click", sessionId: "s_click", timestamp: t(1000) } as FirstPartyEvent);
    await recordFirstPartyEvent({ type: "outbound_click", path: "/software/circleci", softwareSlug: "circleci", destination: "affiliate", url: "https://example.test/affiliate", visitorId: "v_click", sessionId: "s_click", timestamp: t(2000) } as FirstPartyEvent);

    const rows = await buildPostAcquisitionTable();
    expect(rows.find((r) => r.queueEntryId === "post-click")?.affiliateClicks).toBe(1);
  });

  it("excludes synthetic QA visitors by default", async () => {
    await addQueueEntries([queueEntry("post-qa")]);
    const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
    await recordFirstPartyEvent({ type: "page_view", path: "/software/circleci", utmContent: "post-qa", visitorId: "v_qa", sessionId: "s_qa", timestamp: t(0), isTest: true } as FirstPartyEvent);
    const rows = await buildPostAcquisitionTable();
    expect(rows.find((r) => r.queueEntryId === "post-qa")).toBeUndefined();
    const withSynthetic = await buildPostAcquisitionTable(true);
    expect(withSynthetic.find((r) => r.queueEntryId === "post-qa")?.realVisitors).toBe(1);
  });
});
