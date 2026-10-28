import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getSoftwareIndexingQualityReasons } from "@/lib/indexing-quality";

const reviewDate = new Date("2026-11-01T12:00:00.000Z");

describe("Salesforce October 2026 vendor-evidence refresh", () => {
  it("links the official buyer decision and migration sources", () => {
    const salesforce = getSoftware("salesforce");
    expect(salesforce).toBeDefined();
    const sources = salesforce!.sources;
    expect(sources).toContain("https://www.salesforce.com/crm/pricing/");
    expect(sources).toContain("https://www.salesforce.com/crm/free-crm/");
    expect(sources).toContain("https://help.salesforce.com/s/articleView?id=000383962&language=en_US&type=1");
    expect(sources).toContain("https://help.salesforce.com/s/articleView?id=000383363&language=en_US&type=1");
  });

  it("documents concrete export and mobile constraints without a universal claim about all editions", () => {
    const salesforce = getSoftware("salesforce")!;
    const limitations = (salesforce.cons ?? []).join(" ");
    expect(limitations).toContain("Data Export");
    expect(limitations).toContain("weekly or monthly");
    expect(limitations).toContain("48-hour");
    expect(limitations).toContain("mobile app");
    expect(limitations).toContain("Check the objects");
  });

  it("does not bump the shared accessedAt field as part of this scoped editorial release", () => {
    const salesforce = getSoftware("salesforce")!;
    expect(salesforce.accessedAt).toBe("2026-07-31");
    expect(getSoftwareIndexingQualityReasons(salesforce, reviewDate)).toContain("content-freshness");
  });
});
