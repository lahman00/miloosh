import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getRecommendationVendorCtaLabel } from "@/lib/recommend/vendor-cta";

describe("comparison summary trial CTA copy", () => {
  it("reuses the evidence-only trial label helper in the high-intent summary action", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/ComparisonTable.tsx"),
      "utf-8",
    );

    expect(source).toContain("getRecommendationVendorCtaLabel(software)");
    expect(source).toContain('ctaLocation="compare-summary-direct-vendor"');
  });

  it("turns Pipedrive into a 14-day trial action without changing the product evidence", () => {
    const pipedrive = getSoftware("pipedrive");
    expect(pipedrive).toBeDefined();
    expect(getRecommendationVendorCtaLabel(pipedrive!)).toBe("Start 14-day free trial");
  });
});
