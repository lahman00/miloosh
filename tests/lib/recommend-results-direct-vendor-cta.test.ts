import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import {
  getSoftwareCtaRel,
  getSoftwareCtaUrl,
  shouldShowAffiliateDisclosure,
} from "@/lib/affiliate";

function requireSoftware(slug: string) {
  const software = getSoftware(slug);
  if (!software) throw new Error(`Missing software ${slug}`);
  return software;
}

describe("Recommend direct vendor CTA CRO", () => {
  it("uses the canonical affiliate resolver and an explicitly tracked Recommend placement", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/recommend/results/page.tsx"), "utf-8");

    expect(source).toContain("TrackedCtaLink");
    expect(source).toContain("getSoftwareCtaUrl(rec.software)");
    expect(source).toContain("getSoftwareCtaRel(rec.software)");
    expect(source).toContain('ctaLocation="recommend-results-direct-vendor"');
    expect(source).toContain("shouldShowAffiliateDisclosure(rec.software)");
    expect(source).toContain("Affiliate link. Our ranking is independent.");
  });

  it("resolves an active partner to its sponsored tracking URL", () => {
    const software = requireSoftware("wrike");

    expect(getSoftwareCtaUrl(software)).toBe("https://get.wrike.com/wdgn8ok7i5ij");
    expect(getSoftwareCtaRel(software)).toBe("sponsored noopener noreferrer");
    expect(shouldShowAffiliateDisclosure(software)).toBe(true);
  });

  it("keeps a non-partner recommendation on its ordinary vendor URL without sponsored disclosure", () => {
    const software = requireSoftware("asana");

    expect(getSoftwareCtaUrl(software)).toBe(software.website);
    expect(getSoftwareCtaRel(software)).toBe("noopener noreferrer");
    expect(shouldShowAffiliateDisclosure(software)).toBe(false);
  });
});
