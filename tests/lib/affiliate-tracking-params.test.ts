import { describe, expect, it } from "vitest";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { withTrackingParams } from "@/lib/affiliate";

describe("affiliate tracking parameter safety", () => {
  it("never overwrites a network-issued ref parameter", () => {
    const url = withTrackingParams("https://www.setmore.com?ref=nge2zwi", { ref: "generic-miloosh-ref" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("ref")).toBe("nge2zwi");
  });

  it("preserves every query key already issued by every active affiliate network", () => {
    for (const partner of ACTIVE_PARTNERS) {
      expect(partner.affiliateUrl, `${partner.slug} must have an active affiliate URL`).toBeTruthy();
      if (!partner.affiliateUrl) continue;
      const original = new URL(partner.affiliateUrl);
      const existingEntries = [...original.searchParams.entries()];
      if (existingEntries.length === 0) continue;

      const attemptedOverwrite = Object.fromEntries(existingEntries.map(([key]) => [key, `MILOOSH_SHOULD_NOT_REPLACE_${key}`]));
      const resolved = new URL(withTrackingParams(partner.affiliateUrl, attemptedOverwrite));

      for (const [key, originalValue] of existingEntries) {
        expect(resolved.searchParams.get(key), `${partner.slug} network-issued query key ${key}`).toBe(originalValue);
      }
    }
  });

  it("adds a configured parameter when the affiliate URL does not already own that key", () => {
    const url = withTrackingParams("https://example.com/affiliate?campaign=abc", { ref: "miloosh" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("campaign")).toBe("abc");
    expect(parsed.searchParams.get("ref")).toBe("miloosh");
  });

  it("preserves an invalid URL rather than mutating or throwing", () => {
    expect(withTrackingParams("not-a-url", { ref: "miloosh" })).toBe("not-a-url");
  });
});
