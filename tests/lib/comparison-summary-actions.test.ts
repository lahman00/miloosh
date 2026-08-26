import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { resolveComparisonCtaUrl } from "@/lib/wix-funnels";

function requireSoftware(slug: string) {
  const software = getSoftware(slug);
  if (!software) throw new Error(`Missing software ${slug}`);
  return software;
}

describe("comparison summary vendor actions", () => {
  it("renders equal tracked actions for both sides directly under the summary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/ComparisonTable.tsx"),
      "utf-8",
    );

    expect(source).toContain('ctaLocation="compare-summary-direct-vendor"');
    expect(source).toContain("software={data.softwareA}");
    expect(source).toContain("software={data.softwareB}");
  });

  it("monetizes ElevenLabs while leaving Murf AI on its official destination", () => {
    const elevenlabs = requireSoftware("elevenlabs");
    const murf = requireSoftware("murf-ai");

    expect(resolveComparisonCtaUrl(elevenlabs, murf.slug)).toBe(
      "https://try.elevenlabs.io/gkp73pehjgtl",
    );
    expect(getSoftwareCtaRel(elevenlabs)).toBe("sponsored noopener noreferrer");
    expect(shouldShowAffiliateDisclosure(elevenlabs)).toBe(true);

    expect(resolveComparisonCtaUrl(murf, elevenlabs.slug)).toBe(murf.website);
    expect(getSoftwareCtaRel(murf)).toBe("noopener noreferrer");
    expect(shouldShowAffiliateDisclosure(murf)).toBe(false);
  });
});
