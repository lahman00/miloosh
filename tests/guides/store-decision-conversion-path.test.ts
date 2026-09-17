import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));

import { trackEvent } from "@/lib/analytics/track";
import { EcommerceDecisionKit } from "@/components/EcommerceDecisionKit";
import { TrackedInternalCtaLink } from "@/components/TrackedInternalCtaLink";

describe("small-store conversion path", () => {
  it("offers a tracked shortcut to the existing vendor comparison before the worksheet", () => {
    const html = renderToStaticMarkup(createElement(EcommerceDecisionKit));
    const jump = html.indexOf('href="#quick-comparison"');
    const worksheet = html.indexOf('href="/resources/ecommerce-platform-decision-checklist.html"');
    expect(jump).toBeGreaterThanOrEqual(0);
    expect(jump).toBeLessThan(worksheet);
    expect(html).toContain("Ready to compare platforms? Jump to plans, trial status, and vendor links");
  });

  it("records the shortcut as an internal CTA, not an outbound click", () => {
    const element = TrackedInternalCtaLink({ href: "#quick-comparison", sourcePath: "/best-ecommerce-platform-for-small-business", targetPath: "/best-ecommerce-platform-for-small-business#quick-comparison", ctaName: "store-decision-kit-quick-comparison", children: "Compare" });
    (element.props as { onClick: () => void }).onClick();
    expect(trackEvent).toHaveBeenCalledWith({ type: "internal_cta_click", path: "/best-ecommerce-platform-for-small-business", targetPath: "/best-ecommerce-platform-for-small-business#quick-comparison", ctaName: "store-decision-kit-quick-comparison" });
  });

  it("keeps Wix ecommerce routing aligned in both guide CTA surfaces", () => {
    const page = fs.readFileSync("app/[guide]/page.tsx", "utf8");
    const routing = 'wixContext={guide.slug === "best-ecommerce-platform-for-small-business" && p.software.slug === "wix" ? "ecommerce" : undefined}';
    expect(page.split(routing)).toHaveLength(3);
    expect(page).toContain('guide.slug === "best-ecommerce-platform-for-small-business" && software.slug === "wix"');
    expect(page).toContain('getWixAffiliateUrl("ecommerce")');
    expect(page).toContain('ctaLocation="role-guide-summary-table"');
    expect(page).toContain('ctaLocation="role-guide-card-cta"');
  });
});
