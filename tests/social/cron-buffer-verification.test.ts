import { afterEach, describe, expect, it, vi } from "vitest";

const { runPublishCycle, verifyBufferLinkedInTarget } = vi.hoisted(() => ({
  runPublishCycle: vi.fn(),
  verifyBufferLinkedInTarget: vi.fn(),
}));

vi.mock("@/lib/social/publish", () => ({ runPublishCycle }));
vi.mock("@/lib/social/channels/linkedin", () => ({
  getLinkedInTransport: () => "buffer",
  verifyBufferLinkedInTarget,
}));

import { GET } from "@/app/api/cron/social-publish/route";

afterEach(() => {
  vi.clearAllMocks();
  for (const key of ["CRON_SECRET", "SOCIAL_BUFFER_VERIFY_ONLY"]) delete process.env[key];
});

describe("social cron Buffer verification-only gate", () => {
  it("returns read-only metadata without entering the publish cycle", async () => {
    Object.assign(process.env, { CRON_SECRET: "cron-secret", SOCIAL_BUFFER_VERIFY_ONLY: "true" });
    verifyBufferLinkedInTarget.mockResolvedValue({
      bufferAuthenticated: true,
      target: "company_page",
      channel: { id: "channel-1", name: "Miloosh", displayName: "Miloosh", descriptor: "LinkedIn Page", service: "linkedin", type: "page", isDisconnected: false, isLocked: false },
    });

    const response = await GET(new Request("https://miloosh.com/api/cron/social-publish", { headers: { Authorization: "Bearer cron-secret" } }) as never);

    expect(response.status).toBe(200);
    expect(verifyBufferLinkedInTarget).toHaveBeenCalledOnce();
    expect(runPublishCycle).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ authenticated: true, mode: "buffer-verification", transport: "buffer", bufferAuthenticated: true, target: "company_page", channel: { id: "channel-1", name: "Miloosh" } });
  });

  it("rejects unauthenticated requests before inspecting the publish queue", async () => {
    Object.assign(process.env, { CRON_SECRET: "cron-secret", SOCIAL_BUFFER_VERIFY_ONLY: "true" });

    const response = await GET(new Request("https://miloosh.com/api/cron/social-publish") as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(verifyBufferLinkedInTarget).not.toHaveBeenCalled();
    expect(runPublishCycle).not.toHaveBeenCalled();
  });
});
