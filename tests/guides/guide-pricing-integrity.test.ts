import { describe, expect, it } from "vitest";
import { getRoleGuide } from "@/data/guides/registry";

function productText(guideSlug: string, productSlug: string): string {
  const product = getRoleGuide(guideSlug)!.products.find((p) => p.slug === productSlug)!;
  return [product.fitReason, product.limitations, product.pricingNote].filter(Boolean).join(" ");
}

describe("buyer-guide pricing follows the current catalog records", () => {
  it("does not resurrect AppFolio's retired fixed-price claims", () => {
    const text = productText("best-property-management-software", "appfolio");
    expect(text).toMatch(/quote|no public fixed pricing/i);
    expect(text).not.toMatch(/\$280|\$1\.40|\$3\.00|\$5\.00/);
  });

  it("uses current Todoist and Close plan facts", () => {
    expect(productText("best-task-management-for-individuals", "todoist")).toContain("$5/month");
    expect(productText("best-task-management-for-individuals", "todoist")).not.toContain("$4/mo");
    const close = productText("best-crm-for-startups", "close");
    expect(close).toContain("Solo");
    expect(close).toContain("Essentials");
    expect(close).not.toContain("Startup plan");
  });

  it("does not publish the retired Freshdesk ten-agent free-plan offer as current", () => {
    for (const guide of ["best-help-desk-for-ecommerce", "best-customer-service-software-for-startups"]) {
      const text = productText(guide, "freshdesk");
      expect(text).toMatch(/No perpetual free plan|paid per-agent/i);
      expect(text).not.toMatch(/free plan (?:for|up to) 10 agents/i);
    }
  });

  it("keeps Intercom, Front and Buffer notes aligned to the catalog", () => {
    expect(productText("best-customer-service-software-for-startups", "intercom")).toContain("$29/seat/mo");
    expect(productText("best-customer-service-software-for-startups", "front")).toContain("$25/seat/mo");
    const buffer = productText("best-social-media-management-for-agencies", "buffer");
    expect(buffer).toContain("$5/channel/mo");
    expect(buffer).not.toContain("Agency $100");
  });

  it("does not invent fixed Hootsuite pricing when the catalog has none", () => {
    const text = productText("best-social-media-scheduler-for-small-business", "hootsuite");
    expect(text).toMatch(/does not carry|not recorded/i);
    expect(text).not.toMatch(/\$99|\$249/);
  });
});
