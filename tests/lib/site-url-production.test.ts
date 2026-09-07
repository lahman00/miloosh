import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/site";
import { getSoftware } from "@/data/software";

describe("production URL safety", () => {
  it("never falls back to localhost for a production build", () => {
    expect(resolveSiteUrl(undefined, "production")).toBe("https://miloosh.com");
    expect(resolveSiteUrl("", "production")).toBe("https://miloosh.com");
    expect(resolveSiteUrl("[SENSITIVE]", "production")).toBe("https://miloosh.com");
    expect(resolveSiteUrl("https://example.com", "production")).toBe("https://miloosh.com");
  });

  it("keeps localhost as the development fallback", () => {
    expect(resolveSiteUrl(undefined, "development")).toBe("http://localhost:3000");
  });

  it("accepts the canonical Miloosh production URL and strips a trailing slash", () => {
    expect(resolveSiteUrl("https://miloosh.com/", "production")).toBe("https://miloosh.com");
  });

  it("pins Adobe Analytics to the current live Adobe pricing route", () => {
    const adobe = getSoftware("adobe-analytics")!;
    expect(adobe.pricing?.officialSource).toBe("https://business.adobe.com/products/adobe-analytics/pricing.html");
    expect(adobe.sources).toContain("https://business.adobe.com/products/adobe-analytics/pricing.html");
  });
});
