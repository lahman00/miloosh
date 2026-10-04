import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const operations = vi.hoisted(() => ({
  schedule: vi.fn(),
  publish: vi.fn(),
  continuity: vi.fn(),
  verifyBuffer: vi.fn(),
  transport: vi.fn(),
}));

vi.mock("@/lib/social/schedule", () => ({ runScheduleCycle: operations.schedule }));
vi.mock("@/lib/social/publish", () => ({ runPublishCycle: operations.publish }));
vi.mock("@/lib/social/facebook-continuity", () => ({ ensureFacebookDueForDailyWindow: operations.continuity }));
vi.mock("@/lib/social/channels/linkedin", () => ({
  verifyBufferLinkedInTarget: operations.verifyBuffer,
  getLinkedInTransport: operations.transport,
}));

import { GET as publish } from "@/app/api/cron/social-publish/route";
import { GET as schedule } from "@/app/api/cron/social-schedule/route";

const TOKEN = "local-test-only-not-a-production-credential";
const AUTH = `Bearer ${TOKEN}`;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-04T17:15:00.000Z")); // 13:15 in New York.
  vi.stubEnv("CRON_SECRET", TOKEN);
  vi.stubEnv("SOCIAL_BUFFER_VERIFY_ONLY", "false");
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  operations.transport.mockReturnValue("buffer");
  operations.schedule.mockImplementation(async ({ dryRun }: { dryRun: boolean }) => ({ dryRun, scheduledCount: 0 }));
  operations.publish.mockImplementation(async ({ dryRun }: { dryRun: boolean }) => ({ dryRun, entriesAttempted: 0, results: [] }));
  operations.continuity.mockResolvedValue({ promotedEntryId: null, reason: "mock-only" });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request(path: string, query = "", headers: Record<string, string> = {}) {
  return new NextRequest(`https://miloosh.com${path}${query}`, { headers });
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("vary")?.toLowerCase().split(/,\s*/)).toContain("authorization");
}

function expectNoOperations() {
  for (const operation of Object.values(operations)) expect(operation).not.toHaveBeenCalled();
}

type RejectedCase = { name: string; secret?: string; headers?: Record<string, string>; query?: string; verifyOnly?: boolean };
const rejected: RejectedCase[] = [
  { name: "missing Authorization header" },
  { name: "wrong bearer", headers: { Authorization: "Bearer wrong-test-token" } },
  { name: "Basic is not cron bearer", headers: { Authorization: "Basic dGVzdDp0ZXN0" } },
  { name: "bare secret is not cron bearer", headers: { Authorization: TOKEN } },
  { name: "undefined secret with literal Bearer undefined", secret: undefined, headers: { Authorization: "Bearer undefined" } },
  { name: "empty configured secret", secret: "", headers: { Authorization: "Bearer " } },
  { name: "query-string secret cannot authenticate", query: `?secret=${TOKEN}` },
  { name: "dryRun=true cannot bypass authentication", query: "?dryRun=true" },
  { name: "dryRun=false cannot bypass authentication", query: "?dryRun=false" },
  { name: "forged cron headers cannot authenticate", headers: { "User-Agent": "vercel-cron/1.0", "x-vercel-cron": "1" } },
  { name: "combined credentials rejected", headers: { Authorization: `${AUTH}, Bearer wrong-test-token` } },
  { name: "verification-only mode still requires auth", verifyOnly: true },
];

for (const route of [
  { name: "publish", path: "/api/cron/social-publish", handler: publish, operation: operations.publish },
  { name: "schedule", path: "/api/cron/social-schedule", handler: schedule, operation: operations.schedule },
]) {
  describe(`social ${route.name} authentication boundary`, () => {
    it.each(rejected)("$name: denies before queue/provider access or logging", async (testCase) => {
      if (Object.hasOwn(testCase, "secret")) vi.stubEnv("CRON_SECRET", testCase.secret);
      if (testCase.verifyOnly) vi.stubEnv("SOCIAL_BUFFER_VERIFY_ONLY", "true");
      const response = await route.handler(request(route.path, testCase.query, testCase.headers));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
      expectNoOperations();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
      expectPrivate(response);
    });

    it("preserves authenticated dry runs without calling live continuity", async () => {
      const response = await route.handler(request(route.path, "?dryRun=true", { Authorization: AUTH }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ authenticated: true, dryRun: true });
      expect(route.operation).toHaveBeenCalledExactlyOnceWith({ dryRun: true });
      expect(operations.continuity).not.toHaveBeenCalled();
      expect(operations.verifyBuffer).not.toHaveBeenCalled();
      expectPrivate(response);
    });

    it("preserves authenticated execution (all queue/provider functions mocked)", async () => {
      const response = await route.handler(request(route.path, "", { Authorization: AUTH }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ authenticated: true, dryRun: false });
      expect(route.operation).toHaveBeenCalledExactlyOnceWith({ dryRun: false });
      expectPrivate(response);
    });
  });
}

describe("publish safeguards remain independent of authentication", () => {
  it.each(["2026-10-04T16:59:59.000Z", "2026-10-04T18:00:00.000Z", "2026-12-04T17:30:00.000Z"])(
    "authenticated request outside the New York window does not read or publish at %s",
    async (time) => {
      vi.setSystemTime(new Date(time));
      const response = await publish(request("/api/cron/social-publish", "", { Authorization: AUTH }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ inPublishWindow: false, entriesAttempted: 0 });
      expectNoOperations();
      expectPrivate(response);
    },
  );

  it("preserves the local winter 13:00 window (mocked execution)", async () => {
    vi.setSystemTime(new Date("2026-12-04T18:15:00.000Z"));
    const response = await publish(request("/api/cron/social-publish", "", { Authorization: AUTH }));
    expect(response.status).toBe(200);
    expect(operations.publish).toHaveBeenCalledExactlyOnceWith({ dryRun: false });
    expect(operations.continuity).toHaveBeenCalledOnce();
    expectPrivate(response);
  });

  it("Buffer verification does not enter publish or continuity (mocked read)", async () => {
    vi.stubEnv("SOCIAL_BUFFER_VERIFY_ONLY", "true");
    operations.verifyBuffer.mockResolvedValue({ bufferAuthenticated: true });
    const response = await publish(request("/api/cron/social-publish", "", { Authorization: AUTH }));
    expect(response.status).toBe(200);
    expect(operations.verifyBuffer).toHaveBeenCalledOnce();
    expect(operations.publish).not.toHaveBeenCalled();
    expect(operations.continuity).not.toHaveBeenCalled();
    expectPrivate(response);
  });

  it("Buffer verification failure remains non-cacheable and never falls through to publication", async () => {
    vi.stubEnv("SOCIAL_BUFFER_VERIFY_ONLY", "true");
    operations.verifyBuffer.mockRejectedValue(new Error("test-only provider failure"));
    const response = await publish(request("/api/cron/social-publish", "", { Authorization: AUTH }));
    expect(response.status).toBe(502);
    expect(operations.publish).not.toHaveBeenCalled();
    expect(operations.continuity).not.toHaveBeenCalled();
    expectPrivate(response);
  });
});
