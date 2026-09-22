import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { recordInboundSocialEvent } from "@/lib/social/attribution";
import { buildSocialAttributionReport } from "@/scripts/growth/social-attribution-report";

/** Same isolation pattern as tests/social/attribution.test.ts. */
const LOG_FILE = path.join(process.cwd(), "var", "agents", "social-inbound-clicks.json");

let realBackup: string | null = null;
let realFlag: string | undefined;
let realBlobToken: string | undefined;

beforeAll(() => {
  realBackup = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf-8") : null;
  realFlag = process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
  realBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
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

describe("buildSocialAttributionReport", () => {
  it("preserves UNKNOWN when the local ledger cannot be read", async () => {
    process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = "true";
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(LOG_FILE, "{broken");
    expect(await buildSocialAttributionReport()).toMatchObject({
      readStatus: "UNAVAILABLE", totalObservedEvents: "UNKNOWN", byAttributionKey: "UNKNOWN",
    });
  });

  it("separates missing markers from explicit non-test records without asserting humans", async () => {
    process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = "true";
    const event = { channel: "reddit" as const, campaign: "launch", contentId: "post", landingPath: "/recommend" };
    await recordInboundSocialEvent(event);
    await recordInboundSocialEvent({ ...event, isTest: false });
    await recordInboundSocialEvent({ ...event, isTest: true });
    expect(await buildSocialAttributionReport()).toMatchObject({
      readStatus: "COMPLETE", totalObservedEvents: 2, totalExplicitNonTestEvents: 1,
      totalUnknownMarkerEvents: 1, totalExcludedTestEvents: 1, humanAttribution: "UNKNOWN",
      byAttributionKey: [{ count: 2, explicitNonTestCount: 1, unknownMarkerCount: 1 }],
    });
  });

  it("reports NOT_MEASURED, not 0, when tracking is disabled — even with historical events in storage", async () => {
    process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = "true";
    await recordInboundSocialEvent({ channel: "bluesky", campaign: "a", contentId: "e1", landingPath: "/software/wix" });
    delete process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;

    const report = await buildSocialAttributionReport();
    expect(report.trackingEnabled).toBe(false);
    expect(report.totalRealEvents).toBe("NOT_MEASURED");
    expect(report.byAttributionKey).toBe("NOT_MEASURED");
  });

  it("reports real per-attribution_key counts when tracking is enabled, excluding isTest events", async () => {
    process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = "true";
    await recordInboundSocialEvent({ channel: "reddit", campaign: "launch", contentId: "post-1", landingPath: "/software/wix" });
    await recordInboundSocialEvent({ channel: "reddit", campaign: "launch", contentId: "post-1", landingPath: "/software/wix" });
    await recordInboundSocialEvent({ channel: "reddit", campaign: "launch", contentId: "post-2", landingPath: "/software/notion" });
    await recordInboundSocialEvent({ channel: "reddit", campaign: "launch", contentId: "post-1", landingPath: "/software/wix", isTest: true });

    const report = await buildSocialAttributionReport();
    expect(report.trackingEnabled).toBe(true);
    expect(report.totalRealEvents).toBe(3);
    expect(report.totalExcludedTestEvents).toBe(1);
    expect(Array.isArray(report.byAttributionKey)).toBe(true);
    const rows = report.byAttributionKey as Exclude<typeof report.byAttributionKey, "NOT_MEASURED">;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ platform: "reddit", campaign: "launch", contentId: "post-1", landingPath: "/software/wix", count: 2 });
    expect(rows[1]).toMatchObject({ platform: "reddit", campaign: "launch", contentId: "post-2", landingPath: "/software/notion", count: 1 });
  });

  it("reports zero (a real measured zero, not NOT_MEASURED) when tracking is on but nothing has landed yet", async () => {
    process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = "true";
    const report = await buildSocialAttributionReport();
    expect(report.trackingEnabled).toBe(true);
    expect(report.totalRealEvents).toBe(0);
    expect(report.byAttributionKey).toEqual([]);
  });
});
