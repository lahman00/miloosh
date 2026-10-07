import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import {
  getSoftwareIndexingQualityReasons,
  isComparisonIndexingReady,
  isSoftwareIndexingReady,
} from "@/lib/indexing-quality";

const AUDIT_DATE = new Date("2026-10-07T12:00:00Z");

describe("indexing quality gate", () => {
  it("accepts reviewed buyer-ready software pages", () => {
    expect(isSoftwareIndexingReady(getSoftware("shopify")!, AUDIT_DATE)).toBe(true);
    expect(isSoftwareIndexingReady(getSoftware("wix")!, AUDIT_DATE)).toBe(true);
    expect(isSoftwareIndexingReady(getSoftware("vercel")!, AUDIT_DATE)).toBe(true);
  });

  it("rejects a page that still lacks core buyer evidence", () => {
    const ahrefs = getSoftware("ahrefs")!;
    expect(isSoftwareIndexingReady(ahrefs, AUDIT_DATE)).toBe(false);
    expect(getSoftwareIndexingQualityReasons(ahrefs, AUDIT_DATE)).toContain("pricing-evidence");
    expect(getSoftwareIndexingQualityReasons(ahrefs, AUDIT_DATE)).toContain("documented-constraints");
  });

  it("submits a comparison only when both source pages are ready", () => {
    expect(
      isComparisonIndexingReady(
        getSoftware("wix")!,
        getSoftware("shopify")!,
        AUDIT_DATE
      )
    ).toBe(true);

    expect(
      isComparisonIndexingReady(
        getSoftware("ahrefs")!,
        getSoftware("google-analytics")!,
        AUDIT_DATE
      )
    ).toBe(false);
  });
});
