import { describe, expect, it } from "vitest";
import { freshnessExpiry, hostOf, queryNameMatch, sourceTransparency, type QueryRow } from "@/lib/seo/cohort-evidence";
import { getSoftwareIndexingQualityReasons } from "@/lib/indexing-quality";
import { getAllSoftware } from "@/data/software";

describe("freshnessExpiry", () => {
  it("matches the day the real indexing gate starts failing", () => {
    const software = getAllSoftware().find((s) => s.pricing?.lastVerified)!;
    const expiry = freshnessExpiry(software);
    const failsOn = (iso: string) => getSoftwareIndexingQualityReasons(software, new Date(`${iso}T00:00:00.000Z`));
    const dayBefore = (iso: string) => new Date(new Date(`${iso}T00:00:00.000Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
    expect(failsOn(expiry.contentGateFailsOn!)).toContain("content-freshness");
    expect(failsOn(dayBefore(expiry.contentGateFailsOn!))).not.toContain("content-freshness");
    expect(failsOn(expiry.pricingGateFailsOn!)).toContain("pricing-freshness");
    expect(failsOn(dayBefore(expiry.pricingGateFailsOn!))).not.toContain("pricing-freshness");
  });

  it("returns null instead of guessing when dates are missing or unreadable", () => {
    expect(freshnessExpiry({ accessedAt: "not-a-date", pricing: undefined })).toEqual({ contentGateFailsOn: null, pricingGateFailsOn: null });
  });
});

describe("sourceTransparency", () => {
  const base = { website: "https://www.vendor.example", pricing: { officialSource: "https://vendor.example/pricing" } } as never;

  it("accepts the product's own host, subdomains and the pricing source host", () => {
    const result = sourceTransparency({ ...(base as object), sources: ["https://vendor.example", "https://docs.vendor.example/a"] } as never);
    expect(result).toMatchObject({ foreignHosts: [], unreadable: [], hasOfficialPricingSource: true, sourceCount: 3 });
  });

  it("flags a cited host that is not the product's own and unreadable entries, without calling them wrong", () => {
    const result = sourceTransparency({ ...(base as object), sources: ["https://vendor.example", "https://competitor.example/x", "oops"] } as never);
    expect(result.foreignHosts).toEqual(["competitor.example"]);
    expect(result.unreadable).toEqual(["oops"]);
  });

  it("does not treat a look-alike suffix as the same site", () => {
    const result = sourceTransparency({ website: "https://vendor.example", sources: ["https://notvendor.example"] } as never);
    expect(result.foreignHosts).toEqual(["notvendor.example"]);
    expect(result.hasOfficialPricingSource).toBe(false);
  });
});

describe("queryNameMatch", () => {
  const rows: QueryRow[] = [
    { query: "alternative semrush", impressions: 300, clicks: 0, position: 70 },
    { query: "Semrush competitors", impressions: 100, clicks: 1, position: 80 },
    { query: "semrushed", impressions: 50, clicks: 0, position: 10 },
    { query: "clickup alternatives", impressions: 10, clicks: 0, position: 90 },
  ];

  it("matches whole words only and weights position by impressions", () => {
    const match = queryNameMatch(rows, "semrush");
    expect(match).toMatchObject({ queries: 2, impressions: 400, clicks: 1, position: 72.5 });
    expect(match.top.map((r) => r.query)).toEqual(["alternative semrush", "Semrush competitors"]);
  });

  it("requires every word of a multi-word term", () => {
    expect(queryNameMatch(rows, "sprout social").queries).toBe(0);
    expect(queryNameMatch([{ query: "social sprout alternatives", impressions: 83, clicks: 0, position: 84.9 }], "sprout social").queries).toBe(1);
  });

  it("reports no match as null position, not zero", () => {
    expect(queryNameMatch(rows, "unknownproduct")).toMatchObject({ queries: 0, impressions: 0, position: null });
    expect(queryNameMatch(rows, "  ")).toMatchObject({ queries: 0, position: null });
  });
});

describe("hostOf", () => {
  it("strips www and lowercases", () => {
    expect(hostOf("https://WWW.Example.com/a")).toBe("example.com");
    expect(hostOf("nope")).toBeNull();
  });
});
