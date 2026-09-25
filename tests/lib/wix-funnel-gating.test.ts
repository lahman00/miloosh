import { describe, expect, it, vi } from "vitest";
import { getSoftware } from "@/data/software";
import { WIX_CONTEXTS, getWixAffiliateUrl, resolveComparisonCtaUrl } from "@/lib/wix-funnels";

// Simulate Wix losing its verified affiliate relationship.
vi.mock("@/lib/affiliate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/affiliate")>()),
  shouldShowAffiliateDisclosure: () => false,
}));

describe("Wix funnel approval gating", () => {
  it("falls back to the official site for every funnel when Wix is not an active disclosed partner", () => {
    const wix = getSoftware("wix")!;
    for (const context of WIX_CONTEXTS) {
      expect(getWixAffiliateUrl(context), context).toBe(wix.website);
    }
    expect(getWixAffiliateUrl()).toBe(wix.website);
    expect(resolveComparisonCtaUrl(wix, "contentful")).toBe(wix.website);
    expect(resolveComparisonCtaUrl(wix, "shopify")).toBe(wix.website);
  });
});
