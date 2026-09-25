import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RoleGuidePage from "@/app/[guide]/page";
import { getSoftware } from "@/data/software";
import { shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { getRoleGuide } from "@/data/guides/registry";

const GUIDE = "best-crm-for-startups";

describe("role guide card CTAs carry an adjacent affiliate disclosure", () => {
  it("renders one card-level disclosure per affiliate product and none for non-affiliate products", async () => {
    const guide = getRoleGuide(GUIDE)!;
    const affiliateCount = guide.products.filter((item) => {
      const software = getSoftware(item.slug);
      return software && shouldShowAffiliateDisclosure(software);
    }).length;
    expect(affiliateCount).toBeGreaterThan(0);
    expect(affiliateCount).toBeLessThan(guide.products.length);

    const html = renderToStaticMarkup(await RoleGuidePage({ params: Promise.resolve({ guide: GUIDE }) }));
    expect(html.match(/This is an affiliate link\. See our/g) ?? []).toHaveLength(affiliateCount);
  });
});
