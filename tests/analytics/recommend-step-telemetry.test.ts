import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sink = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics/events")>();
  return { ...actual, recordFirstPartyEvent: sink };
});
import { POST } from "@/app/api/analytics/event/route";

function request(extra: Record<string, unknown> = {}) {
  return new NextRequest("https://miloosh.com/api/analytics/event", {
    method: "POST",
    body: JSON.stringify({
      type: "recommend_step_viewed",
      source: "your_team",
      rank: 2,
      path: "/recommend",
      visitorId: "v_step_test",
      sessionId: "s_step_test",
      ...extra,
    }),
    headers: { "user-agent": "Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36" },
  });
}

beforeEach(() => { sink.mockReset(); sink.mockResolvedValue(true); });

describe("recommend step telemetry boundary", () => {
  it("stores only the bounded step key and 1-based rank", async () => {
    const response = await POST(request({ arbitrary: "drop-me" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recorded: true, classification: "REAL_OR_UNKNOWN_HUMAN" });
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toMatchObject({
      type: "recommend_step_viewed", source: "your_team", rank: 2, path: "/recommend",
    });
    expect(sink.mock.calls[0][0]).not.toHaveProperty("arbitrary");
  });

  it.each([
    { source: "not_a_step", rank: 2 },
    { source: "fine_tune", rank: 0 },
    { source: "fine_tune", rank: 5 },
    { source: "fine_tune", rank: 4.5 },
    { source: "fine_tune", rank: "4" },
  ])("rejects invalid bounded step data: %j", async invalid => {
    const response = await POST(request(invalid));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ recorded: false, classification: "REJECTED_VALIDATION" });
    expect(sink).not.toHaveBeenCalled();
  });
});
