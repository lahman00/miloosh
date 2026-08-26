import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  insertProvenIntentPriorityEntries,
  runScheduleCycle,
  selectProvenIntentPriorityEntries,
} from "@/lib/social/schedule";
import { readQueue, addQueueEntries } from "@/lib/social/queue";
import type { ChannelVariant, ContentPillar, SocialQueueEntry } from "@/lib/social/types";

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) — this
 * scheduler previously had zero test coverage (matching its "manual-only,
 * never wired to a cron" status). Now that it's a Vercel Cron target
 * (app/api/cron/social-schedule/route.ts), the two properties that
 * matter most for something running unattended in production are proven
 * directly: it never double-schedules the same entry, and it never
 * exceeds the configured conservative pace.
 */
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

const blankVariant: ChannelVariant = { text: "hello", link: "https://miloosh.com/software/notion", imageUrl: null, altText: null, hashtags: [], publishResult: null };

function approvedEntry(id: string, overrides: Partial<SocialQueueEntry> = {}): SocialQueueEntry {
  const now = new Date().toISOString();
  return {
    id,
    pillar: "buyer_education",
    topic: `topic-${id}`,
    sourceSlugs: [`vendor-${id}`],
    campaign: null,
    state: "APPROVED_FOR_AUTO",
    createdAt: now,
    scheduledFor: null,
    channels: { facebook: { ...blankVariant }, linkedin: { ...blankVariant } },
    qaNotes: [],
    history: [{ state: "APPROVED_FOR_AUTO", at: now, note: null }],
    ...overrides,
  };
}

function moneyEntry(
  id: string,
  slug: "krispcall" | "whatconverts",
  pillar: ContentPillar,
  pathname: string,
  topic: string,
): SocialQueueEntry {
  const link = `https://miloosh.com${pathname}`;
  return approvedEntry(id, {
    pillar,
    topic,
    sourceSlugs: pathname.startsWith("/compare/") ? [pathname.replace("/compare/", "")] : [slug],
    channels: {
      facebook: { ...blankVariant, link },
      linkedin: { ...blankVariant, link },
    },
  });
}

describe("proven-intent schedule lane", () => {
  it("selects at most one entry per proven target and prefers the strongest direct buyer path", () => {
    const krispcallComparison = moneyEntry(
      "krispcall-comparison",
      "krispcall",
      "software_decisions",
      "/compare/krispcall-vs-dialpad",
      "decision-krispcall-vs-dialpad",
    );
    const krispcallCommercial = moneyEntry(
      "krispcall-commercial",
      "krispcall",
      "commercial",
      "/software/krispcall",
      "commercial-krispcall",
    );
    const whatPricing = moneyEntry(
      "whatconverts-pricing",
      "whatconverts",
      "pricing_intelligence",
      "/software/whatconverts",
      "pricing-whatconverts",
    );
    const citedButWrongDestination = approvedEntry("wrong-destination", {
      pillar: "alternatives",
      topic: "alternatives-another-product",
      sourceSlugs: ["another-product", "krispcall"],
      channels: {
        facebook: { ...blankVariant, link: "https://miloosh.com/software/another-product" },
        linkedin: { ...blankVariant, link: "https://miloosh.com/software/another-product" },
      },
    });

    const selection = selectProvenIntentPriorityEntries([
      krispcallComparison,
      krispcallCommercial,
      whatPricing,
      citedButWrongDestination,
    ]);

    expect(selection.entries.map((entry) => entry.id)).toEqual([
      "krispcall-commercial",
      "whatconverts-pricing",
    ]);
    expect(selection.targetByEntryId.get("krispcall-commercial")).toBe("krispcall");
    expect(selection.targetByEntryId.get("whatconverts-pricing")).toBe("whatconverts");
    expect(selection.targetByEntryId.has("wrong-destination")).toBe(false);
  });

  it("spreads two priority entries across the 14-day batch rather than placing them back to back", () => {
    const ordinary = Array.from({ length: 20 }, (_, index) => approvedEntry(`ordinary-${index}`));
    const priorities = [
      moneyEntry("krispcall-commercial", "krispcall", "commercial", "/software/krispcall", "commercial-krispcall"),
      moneyEntry("whatconverts-pricing", "whatconverts", "pricing_intelligence", "/software/whatconverts", "pricing-whatconverts"),
    ];

    const ordered = insertProvenIntentPriorityEntries(ordinary, priorities, 14);

    expect(ordered[0]?.id).toBe("krispcall-commercial");
    expect(ordered[7]?.id).toBe("whatconverts-pricing");
    expect(ordered.filter((entry) => priorities.some((priority) => priority.id === entry.id))).toHaveLength(2);
  });

  it("guarantees the two proven-intent pages enter a full 14-day batch without increasing cadence", async () => {
    const ordinary = Array.from({ length: 30 }, (_, index) => approvedEntry(`ordinary-${index}`));
    const lowerKrispCallPath = moneyEntry(
      "krispcall-comparison",
      "krispcall",
      "software_decisions",
      "/compare/krispcall-vs-dialpad",
      "decision-krispcall-vs-dialpad",
    );
    const krispcallCommercial = moneyEntry(
      "krispcall-commercial",
      "krispcall",
      "commercial",
      "/software/krispcall",
      "commercial-krispcall",
    );
    const whatPricing = moneyEntry(
      "whatconverts-pricing",
      "whatconverts",
      "pricing_intelligence",
      "/software/whatconverts",
      "pricing-whatconverts",
    );
    await addQueueEntries([...ordinary, lowerKrispCallPath, krispcallCommercial, whatPricing]);

    const summary = await runScheduleCycle({
      dryRun: true,
      now: new Date("2026-08-26T08:00:00.000Z"),
    });

    expect(summary.perDay).toBe(1);
    expect(summary.scheduledCount).toBe(14);
    expect(summary.priorityTargetSlugs).toEqual(["krispcall", "whatconverts"]);
    expect(summary.priorityScheduledEntryIds).toEqual([
      "krispcall-commercial",
      "whatconverts-pricing",
    ]);
    expect(summary.scheduledEntryIds).toContain("krispcall-commercial");
    expect(summary.scheduledEntryIds).toContain("whatconverts-pricing");
    expect(summary.priorityScheduledEntryIds).not.toContain("krispcall-comparison");
  });
});

describe("runScheduleCycle", () => {
  it("does nothing and reports why when there are no APPROVED_FOR_AUTO entries", async () => {
    const summary = await runScheduleCycle({ dryRun: false });
    expect(summary.scheduledCount).toBe(0);
    expect(summary.priorityScheduledEntryIds).toEqual([]);
    expect(summary.priorityTargetSlugs).toEqual([]);
    expect(summary.reason).toMatch(/no approved_for_auto/i);
  });

  it("promotes APPROVED_FOR_AUTO entries to SCHEDULED with a real scheduledFor timestamp", async () => {
    await addQueueEntries([approvedEntry("a"), approvedEntry("b")]);
    const summary = await runScheduleCycle({ dryRun: false, now: new Date("2026-08-22T12:00:00.000Z") });
    expect(summary.scheduledCount).toBeGreaterThan(0);

    const after = await readQueue();
    const scheduled = after.filter((e) => e.state === "SCHEDULED");
    expect(scheduled.length).toBe(summary.scheduledCount);
    for (const e of scheduled) {
      expect(e.scheduledFor).toBeTruthy();
      expect(new Date(e.scheduledFor!).getTime()).toBeGreaterThan(0);
    }
  });

  it("a dry run never mutates the queue", async () => {
    await addQueueEntries([approvedEntry("a")]);
    await runScheduleCycle({ dryRun: true, now: new Date("2026-08-22T12:00:00.000Z") });
    const after = await readQueue();
    expect(after.find((e) => e.id === "a")?.state).toBe("APPROVED_FOR_AUTO");
  });

  it("IDEMPOTENCY: a second run only ever touches entries still in APPROVED_FOR_AUTO — never re-schedules an already-SCHEDULED entry", async () => {
    await addQueueEntries([approvedEntry("a"), approvedEntry("b"), approvedEntry("c")]);
    const now = new Date("2026-08-22T12:00:00.000Z");

    const first = await runScheduleCycle({ dryRun: false, now });
    const afterFirst = await readQueue();
    const scheduledAfterFirst = afterFirst.filter((e) => e.state === "SCHEDULED").map((e) => e.id).sort();

    const second = await runScheduleCycle({ dryRun: false, now: new Date(now.getTime() + 1000) });
    const afterSecond = await readQueue();
    const scheduledAfterSecond = afterSecond.filter((e) => e.state === "SCHEDULED").map((e) => e.id).sort();

    // The second run must never re-touch (or double-count) an entry the first run already scheduled.
    expect(second.scheduledEntryIds.some((id) => first.scheduledEntryIds.includes(id))).toBe(false);
    expect(scheduledAfterSecond.length).toBe(scheduledAfterFirst.length + second.scheduledCount);
    // No entry's scheduledFor should have changed between the two reads for anything scheduled in run 1.
    for (const id of scheduledAfterFirst) {
      const before = afterFirst.find((e) => e.id === id)!.scheduledFor;
      const laterState = afterSecond.find((e) => e.id === id)!;
      expect(laterState.state).toBe("SCHEDULED");
      expect(laterState.scheduledFor).toBe(before);
    }
  });

  it("respects DAILY pacing — never schedules more than perDay entries onto the same day", async () => {
    const entries = Array.from({ length: 10 }, (_, i) => approvedEntry(`e${i}`));
    await addQueueEntries(entries);
    const summary = await runScheduleCycle({ dryRun: false, now: new Date("2026-08-22T12:00:00.000Z") });

    const after = await readQueue();
    const scheduled = after.filter((e) => e.state === "SCHEDULED");
    const byDay = new Map<string, number>();
    for (const e of scheduled) {
      const day = e.scheduledFor!.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    for (const count of byDay.values()) {
      expect(count).toBeLessThanOrEqual(summary.perDay);
    }
  });

  it("with the real (non-mocked) social strategy, only facebook/linkedin-relevant cadence drives pacing — bluesky/mastodon are disabled and must not inflate perDay", async () => {
    await addQueueEntries([approvedEntry("a")]);
    const summary = await runScheduleCycle({ dryRun: false, now: new Date("2026-08-22T12:00:00.000Z") });
    // facebook=7/wk, linkedin=3/wk enabled; bluesky=4/wk, mastodon=3/wk disabled.
    // minCadence must come only from the enabled set (min(7,3)=3), not be
    // skewed by a disabled channel's number.
    expect(summary.minCadence).toBe(3);
    expect(summary.perDay).toBe(1);
  });
});
