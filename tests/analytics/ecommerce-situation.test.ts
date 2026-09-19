import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const sink = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/events", () => ({ recordFirstPartyEvent: sink }));
import { POST } from "@/app/api/analytics/event/route";
import { ECOMMERCE_SITUATIONS } from "@/lib/recommend/types";
import { classifySessions } from "@/lib/analytics/human-classification";
const base = { type: "recommend_ecommerce_situation_selected", situation: "repair", path: "/recommend", visitorId: "v_qa", sessionId: "s_qa" };
function request(extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new NextRequest("https://miloosh.com/api/analytics/event", { method: "POST", body: JSON.stringify({ ...base, ...extra }), headers: { "user-agent": "Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36", ...headers } });
}
beforeEach(() => { sink.mockReset(); sink.mockResolvedValue(true); });
describe("ecommerce situation first-party boundary", () => {
  it.each(ECOMMERCE_SITUATIONS)("stores bounded %s once with QA classification", async situation => {
    const response = await POST(request({ situation, isTest: true, qaRun: "ecommerce-20260919", arbitrary: "do-not-store" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recorded: true, classification: "SYNTHETIC_QA" });
    expect(sink).toHaveBeenCalledTimes(1);
    const event = sink.mock.calls[0][0];
    expect(event).toMatchObject({ ...base, situation, isTest: true, qaRun: "ecommerce-20260919" });
    expect(event).not.toHaveProperty("arbitrary");
    expect(classifySessions([event])[0].bucket).toBe("KNOWN_QA_TEST");
  });
  it.each([undefined, null, "garbage", "", ["repair"], 1])("rejects invalid situation: %j", async situation => {
    expect((await POST(request({ situation }))).status).toBe(400);
    expect(sink).not.toHaveBeenCalled();
  });
  it("keeps missing test marker UNKNOWN, drops untrusted qaRun", async () => {
    const response = await POST(request({ qaRun: "spoof" }));
    expect(await response.json()).toEqual({ recorded: true, classification: "REAL_OR_UNKNOWN_HUMAN" });
    const event = sink.mock.calls[0][0];
    expect(event.isTest).toBeUndefined();
    expect(event.qaRun).toBeUndefined();
    expect(classifySessions([event])[0].bucket).toBe("UNRESOLVED");
  });
  it.each<Record<string, string>>([{ "user-agent": "Googlebot/2.1" }, { "x-vercel-cron": "1" }])("preserves bot/infra gates: %j", async headers => {
    expect((await (await POST(request({}, headers))).json()).recorded).toBe(false);
    expect(sink).not.toHaveBeenCalled();
  });
  it("does not claim success on storage failure", async () => {
    sink.mockResolvedValue(false);
    expect(await (await POST(request())).json()).toEqual({ recorded: false, classification: "FAILED_STORAGE" });
  });
});
