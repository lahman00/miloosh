import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getRecommendationVendorCtaLabel } from "@/lib/recommend/vendor-cta";

describe("comparison choice CTA copy", () => {
  it("uses verified trial evidence for Pipedrive", () => {
    const pipedrive = getSoftware("pipedrive");
    expect(pipedrive).toBeDefined();
    expect(getRecommendationVendorCtaLabel(pipedrive!)).toBe("Start 14-day free trial");
  });

  it("uses the evidence-only CTA helper on the lower choose cards without changing the tracked placement", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/compare/[comparison]/page.tsx"),
      "utf-8",
    );

    expect(source).toContain("getRecommendationVendorCtaLabel(software)");
    expect(source).toContain('ctaLocation="compare-page-choose-card"');
  });
});
