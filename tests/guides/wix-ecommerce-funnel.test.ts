import { describe, expect, it } from "vitest";
import { getWixAffiliateUrl } from "@/lib/wix-funnels";
import { getRoleGuide } from "@/data/guides/registry";

describe("Wix ecommerce guide funnel", () => {
  it("keeps the dedicated Wix ecommerce tracking asset on file", () => {
    expect(getWixAffiliateUrl("ecommerce")).toBe(
      "https://wix.pxf.io/c/7623171/2097924/25616?trafcat=ecom",
    );
  });

  it("includes Wix in the small-business ecommerce guide", () => {
    const guide = getRoleGuide("best-ecommerce-platform-for-small-business");
    expect(guide).toBeDefined();
    expect(guide?.products.some((product) => product.slug === "wix")).toBe(true);
  });
});
