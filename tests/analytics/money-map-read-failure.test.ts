import { describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/revenue/outbound-read", () => ({ readOutboundEventsDetailed: mock.read }));
import { buildMoneyMap } from "@/lib/revenue/money-map";

describe("legacy opportunity report cannot fabricate complete click evidence", () => {
  it.each(["PARTIAL", "UNAVAILABLE"])("%s data never contributes measured zero or partial totals to ranking", async status => {
    mock.read.mockResolvedValue({ status, events: [{ type: "affiliate_link_click", softwareSlug: "airtable", sourcePage: "/software/airtable", isTest: false }] });
    const report = await buildMoneyMap();
    expect(report.outboundReadStatus).toBe(status);
    expect(report.totalOutboundEventsSitewide).toBeNull();
    expect(report.pages.every(page => page.clicksAvailability === "unavailable")).toBe(true);
    for (const page of report.pages) {
      const clicks = page.scoreComponents.find(component => component.label === "Non-test outbound-log evidence")!;
      expect(clicks.value).toBeNull();
    }
  });
  it("a complete empty listing really is measured zero", async () => {
    mock.read.mockResolvedValue({ status: "COMPLETE", events: [] });
    const report = await buildMoneyMap();
    expect(report.totalOutboundEventsSitewide).toBe(0);
    expect(report.pages.every(page => page.clicksAvailability === "real")).toBe(true);
  });
});
