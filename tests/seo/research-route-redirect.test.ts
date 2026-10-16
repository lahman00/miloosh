import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { REMOVED_COMPARISON_REDIRECTS } from "@/data/redirects";

describe("existing Research footer URL recovery", () => {
  it("redirects the broken /research path to the existing research report without inventing a page", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({
      source: "/research",
      destination: "/research/saas-pricing-pressure-index-2026",
      permanent: true,
    });
    expect(fs.existsSync(path.join(process.cwd(), "app/research/page.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), "app/research/saas-pricing-pressure-index-2026/page.tsx"))).toBe(true);
  });

  it("preserves every pre-existing software comparison redirect exactly", async () => {
    const redirects = await nextConfig.redirects!();
    for (const [comparisonSlug, softwareSlug] of REMOVED_COMPARISON_REDIRECTS) {
      expect(redirects).toContainEqual({
        source: `/compare/${comparisonSlug}`,
        destination: `/software/${softwareSlug}`,
        permanent: true,
      });
    }
    expect(redirects.length).toBe(REMOVED_COMPARISON_REDIRECTS.length + 1);
  });
});
