import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/social/landing/route";
import { getInboundSocialEvents } from "@/lib/social/attribution";

/**
 * MILOOSH community attribution readback (2026-08-31): the route-level
 * wiring for isTest (SocialLandingCapture -> POST body -> stored event) is
 * only exercised end-to-end here — tests/social/attribution.test.ts covers
 * recordInboundSocialEvent/summarizeInboundByChannel directly, bypassing
 * request parsing. Same local-file isolation pattern as those tests.
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

function postLanding(body: Record<string, unknown>) {
  return POST(new NextRequest("https://miloosh.com/api/social/landing", { method: "POST", body: JSON.stringify(body) }));
}

describe("POST /api/social/landing — isTest wiring", () => {
  it("isTest:true in the request body is stored on the event", async () => {
    const res = await postLanding({ utm_source: "reddit", utm_medium: "social", utm_campaign: "c", utm_content: "id1", path: "/software/wix", isTest: true });
    expect(res.status).toBe(200);
    const events = await getInboundSocialEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.isTest).toBe(true);
  });

  it("omitting isTest (a real visitor) never stores isTest:true", async () => {
    const res = await postLanding({ utm_source: "reddit", utm_medium: "social", utm_campaign: "c", utm_content: "id1", path: "/software/wix" });
    expect(res.status).toBe(200);
    const events = await getInboundSocialEvents();
    expect(events[0]!.isTest).not.toBe(true);
  });

  it("a non-boolean isTest value remains unknown, never treated as proven non-test", async () => {
    const res = await postLanding({ utm_source: "reddit", utm_medium: "social", utm_campaign: "c", utm_content: "id1", path: "/software/wix", isTest: "yes" });
    expect(res.status).toBe(200);
    const events = await getInboundSocialEvents();
    expect(events[0]!.isTest).toBeUndefined();
  });
});
