import { describe, expect, it } from "vitest";
import { getRoleGuide } from "@/data/guides/registry";

describe("family password manager guide", () => {
  const guide = getRoleGuide("best-password-manager-for-families");

  it("uses family-specific summary data instead of generic catalog pricing", () => {
    expect(guide).toBeDefined();
    expect(guide?.updatedAt).toBe("2026-09-05");
    expect(guide?.products).toHaveLength(4);
    for (const product of guide?.products ?? []) {
      expect(product.summaryBestFor).toBeTruthy();
      expect(product.summaryPrice).toBeTruthy();
      expect(product.summaryAvailability).toBeTruthy();
      expect(product.strengths?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps verified family-plan facts in the guide", () => {
    const bitwarden = guide?.products.find((p) => p.slug === "bitwarden");
    const dashlane = guide?.products.find((p) => p.slug === "dashlane");
    expect(bitwarden?.summaryPrice).toBe("$3.99/mo (annual)");
    expect(bitwarden?.pricingNote).toContain("$47.88");
    expect(dashlane?.limitations).toContain("plan manager");
    expect(dashlane?.fitReason).toContain("except VPN");
  });
});