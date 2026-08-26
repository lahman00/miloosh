import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getRecommendationVendorCtaLabel } from "@/lib/recommend/vendor-cta";

function requireSoftware(slug: string) {
  const software = getSoftware(slug);
  if (!software) throw new Error(`Missing software ${slug}`);
  return software;
}

describe("Recommend vendor CTA copy", () => {
  it("turns Pipedrive's verified 14-day trial into a concrete action", () => {
    const pipedrive = requireSoftware("pipedrive");
    expect(pipedrive.pricing?.freeTrial).toEqual({ available: true, days: 14 });
    expect(getRecommendationVendorCtaLabel(pipedrive)).toBe("Start 14-day free trial");
  });

  it("keeps ordinary Visit copy when no free trial is documented", () => {
    const jotform = requireSoftware("jotform");
    expect(jotform.pricing?.freeTrial).toBeUndefined();
    expect(getRecommendationVendorCtaLabel(jotform)).toBe("Visit Jotform");
  });

  it("uses the helper only for post-ranking CTA copy and keeps affiliate modules out of it", () => {
    const helperSource = fs.readFileSync(
      path.join(process.cwd(), "lib/recommend/vendor-cta.ts"),
      "utf-8",
    );
    const resultsSource = fs.readFileSync(
      path.join(process.cwd(), "app/recommend/results/page.tsx"),
      "utf-8",
    );

    expect(helperSource).not.toContain('from "@/data/affiliate');
    expect(helperSource).not.toContain('from "@/lib/affiliate');
    expect(resultsSource).toContain("getRecommendationVendorCtaLabel(rec.software)");
    expect(resultsSource).toContain('ctaLocation="recommend-results-direct-vendor"');
  });
});
