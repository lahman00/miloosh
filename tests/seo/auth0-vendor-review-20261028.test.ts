import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getSoftwareIndexingQualityReasons } from "@/lib/indexing-quality";

describe("Auth0 October 2026 source-backed quality refresh", () => {
  it("is buyer-ready under the indexing quality gate", () => {
    const auth0 = getSoftware("auth0")!;
    expect(getSoftwareIndexingQualityReasons(auth0, new Date("2026-10-28T12:00:00Z"))).toEqual([]);
    expect(auth0.accessedAt).toBe("2026-10-28");
    expect(auth0.pricing?.lastVerified).toBe("2026-10-28");
  });

  it("records current official pricing evidence without presenting Enterprise as a fixed price", () => {
    const auth0 = getSoftware("auth0")!;
    expect(auth0.pricing?.officialSource).toBe("https://auth0.com/pricing");
    expect(auth0.pricing?.hasFreeTier).toBe(true);
    expect(auth0.pricing?.freeTrial?.days).toBe(22);
    expect(auth0.pricing?.entryPaid?.amount).toBe("35");
    expect(auth0.pricing?.tiers?.some((tier) => tier.name === "Professional" && tier.amount === "240")).toBe(true);
    expect(auth0.pricing?.tiers?.find((tier) => tier.name === "Enterprise")?.amount).toBeUndefined();
  });

  it("documents plan and B2B constraints and uses multiple official sources", () => {
    const auth0 = getSoftware("auth0")!;
    expect(auth0.sources.length).toBeGreaterThanOrEqual(4);
    expect(auth0.sources.every((url) => /auth0\.com/.test(url))).toBe(true);
    const limitations = (auth0.cons ?? []).join(" ");
    expect(limitations).toContain("monthly active users");
    expect(limitations).toContain("Enterprise MFA");
    expect(limitations).toContain("B2B");
    expect(limitations).toContain("5 Organizations");
  });
});
