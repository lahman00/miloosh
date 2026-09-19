import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const reads = vi.hoisted(() => ({ firstParty: vi.fn(), revenue: vi.fn(), seo: vi.fn() }));
vi.mock("@/lib/analytics/events", () => ({ getAllFirstPartyEvents: reads.firstParty }));
vi.mock("@/lib/revenue/outbound-read", () => ({ readOutboundEventsDetailed: reads.revenue }));
vi.mock("@/lib/seo-factory/store", () => ({ readLatestSeoFactoryRun: reads.seo }));
import PartnerPerformancePage from "@/app/internal/partner-performance/page";
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
describe("partner reporting requires complete production evidence", () => {
  it("missing credentials render unknown without reading local fallback data", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(renderToStaticMarkup(await PartnerPerformancePage())).toContain("UNKNOWN");
    expect(reads.firstParty).not.toHaveBeenCalled();
  });
  it.each(["PARTIAL", "UNAVAILABLE"])("%s is not a zero-traffic ranking", async status => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "mock-only");
    reads.firstParty.mockResolvedValue([]);
    reads.revenue.mockResolvedValue({ status, events: [] });
    reads.seo.mockResolvedValue(null);
    const html = renderToStaticMarkup(await PartnerPerformancePage());
    expect(html).toContain("UNKNOWN");
    expect(html).not.toContain("<table");
  });
  it("a failed read does not leak an exception or become zero", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "mock-only");
    reads.firstParty.mockRejectedValue(new Error("private backend detail"));
    const html = renderToStaticMarkup(await PartnerPerformancePage());
    expect(html).toContain("UNKNOWN");
    expect(html).not.toContain("private backend detail");
  });
  it("a complete empty production read can legitimately show zero", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "mock-only");
    reads.firstParty.mockResolvedValue([]);
    reads.revenue.mockResolvedValue({ status: "COMPLETE", events: [] });
    reads.seo.mockResolvedValue(null);
    const html = renderToStaticMarkup(await PartnerPerformancePage());
    expect(html).toContain("<table");
    expect(html).not.toContain('role="alert"');
  });
});
