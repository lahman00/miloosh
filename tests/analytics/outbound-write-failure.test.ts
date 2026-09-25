import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const sinks = vi.hoisted(() => ({ first: vi.fn(), legacy: vi.fn() }));
vi.mock("@/lib/analytics/events", () => ({ recordFirstPartyEvent: sinks.first }));
vi.mock("@/lib/revenue/click-tracker", () => ({ trackSoftwareCtaClick: sinks.legacy, trackVendorLinkClick: sinks.legacy }));
import { POST } from "@/app/api/outbound-click/route";
const request = () => new NextRequest("https://miloosh.com/api/outbound-click", { method: "POST", headers: { "user-agent": "Mozilla/5.0 Chrome/128 Safari/537.36" }, body: JSON.stringify({ slug: "todoist", kind: "cta", sourcePage: "/software/todoist", eventId: "write-failure-test-1234" }) });
beforeEach(() => { vi.resetAllMocks(); sinks.first.mockResolvedValue(true); sinks.legacy.mockResolvedValue(true); });
describe("independent handoff sinks and truthful receipts", () => {
  it.each(["first", "legacy"] as const)("%s throwing does not suppress the other sink", async failing => {
    sinks[failing].mockRejectedValue(Error("offline"));
    const response = await POST(request());
    expect(response.status).toBe(202);
    const receipt = await response.json();
    expect(sinks.first).toHaveBeenCalledTimes(1); expect(sinks.legacy).toHaveBeenCalledTimes(1);
    expect(receipt.sinks).toEqual(failing === "first" ? { firstParty: "FAILED", legacy: "RECORDED" } : { firstParty: "RECORDED", legacy: "FAILED" });
    expect(receipt.recorded).toBe(failing !== "first");
  });
  it("starts identity-bearing storage before a slow legacy write settles", async () => {
    let finish!: (value: boolean) => void;
    sinks.legacy.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const response = POST(request());
    await vi.waitFor(() => expect(sinks.first).toHaveBeenCalledTimes(1));
    finish(true);
    expect((await (await response).json()).sinks).toEqual({ firstParty: "RECORDED", legacy: "RECORDED" });
  });
  it("distinguishes explicit disablement from two failed writes", async () => {
    sinks.legacy.mockResolvedValue(undefined);
    expect((await (await POST(request())).json()).sinks.legacy).toBe("DISABLED");
    sinks.legacy.mockResolvedValue(false); sinks.first.mockResolvedValue(false);
    expect(await (await POST(request())).json()).toEqual({ ok: true, recorded: false, sinks: { legacy: "FAILED", firstParty: "FAILED" } });
  });
});
