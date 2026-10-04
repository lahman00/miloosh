import { afterEach, describe, expect, it, vi } from "vitest";

const { runScheduleCycle } = vi.hoisted(() => ({
  runScheduleCycle: vi.fn(),
}));

vi.mock("@/lib/social/schedule", () => ({ runScheduleCycle }));

import { GET } from "@/app/api/cron/social-schedule/route";

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("social schedule cron authentication", () => {
  it("rejects unauthenticated requests before reading schedule state", async () => {
    process.env.CRON_SECRET = "cron-secret";

    const response = await GET(new Request("https://miloosh.com/api/cron/social-schedule") as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(runScheduleCycle).not.toHaveBeenCalled();
  });

  it("keeps authenticated dry-run verification available", async () => {
    process.env.CRON_SECRET = "cron-secret";
    runScheduleCycle.mockResolvedValue({ dryRun: true, scheduledCount: 0 });

    const response = await GET(new Request("https://miloosh.com/api/cron/social-schedule?dryRun=true", {
      headers: { Authorization: "Bearer cron-secret" },
    }) as never);

    expect(response.status).toBe(200);
    expect(runScheduleCycle).toHaveBeenCalledWith({ dryRun: true });
    expect(await response.json()).toMatchObject({ authenticated: true, dryRun: true, scheduledCount: 0 });
  });
});
