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

  it("tracks the checklist and comparison next steps as meaningful internal CTAs", () => {
    const source = fs.readFileSync("components/EcommerceDecisionKit.tsx", "utf8");
    expect(source).toContain('ctaName="store-decision-kit-open-checklist"');
    expect(source).toContain('ctaName="store-decision-kit-download-checklist"');
    expect(source).toContain('ctaName="store-decision-kit-wix-shopify-comparison"');
    expect(source).not.toContain('<a href="/resources/ecommerce-platform-decision-checklist.html"');
    expect(source).not.toContain('<Link href="/compare/wix-vs-shopify"');

    for (const [href, targetPath, ctaName] of [
      ["/resources/ecommerce-platform-decision-checklist.html", "/resources/ecommerce-platform-decision-checklist.html", "store-decision-kit-open-checklist"],
      ["/resources/ecommerce-platform-decision-checklist.html", "/resources/ecommerce-platform-decision-checklist.html", "store-decision-kit-download-checklist"],
      ["/compare/wix-vs-shopify", "/compare/wix-vs-shopify", "store-decision-kit-wix-shopify-comparison"],
    ] as const) {
      const element = TrackedInternalCtaLink({ href, sourcePath: "/best-ecommerce-platform-for-small-business", targetPath, ctaName, children: ctaName });
      (element.props as { onClick: () => void }).onClick();
      expect(trackEvent).toHaveBeenCalledWith({ type: "internal_cta_click", path: "/best-ecommerce-platform-for-small-business", targetPath, ctaName });
    }
  });

  it("keeps Wix ecommerce routing aligned in both guide CTA surfaces", () => {
    const page = fs.readFileSync("app/[guide]/page.tsx", "utf8");
    const routing = 'wixContext={guide.slug === "best-ecommerce-platform-for-small-business" && p.software.slug === "wix" ? "ecommerce" : undefined}';
    expect(page.split(routing)).toHaveLength(4);
    expect(page).toContain('guide.slug === "best-ecommerce-platform-for-small-business" && software.slug === "wix"');
    expect(page).toContain('getWixAffiliateUrl("ecommerce")');
    expect(page.match(/ctaLocation="role-guide-summary-table"/g)).toHaveLength(2);
    expect(page).toContain('ctaLocation="role-guide-card-cta"');
  });

  it("explains the intent-specific Wix product label on comparison choice cards", () => {
    const page = fs.readFileSync("app/compare/[comparison]/page.tsx", "utf8");
    expect(page).toContain('software.slug === "wix" && ctaProductName !== software.name');
    expect(page).toContain('For this comparison, the relevant Wix offering is');
    expect(page).toContain('{ctaProductName}</span>.');
    expect(page).not.toContain('wixContext === "headless" ?');
  });

  it("keeps the vendor action visible in the first table column on mobile", () => {
    const page = fs.readFileSync("app/[guide]/page.tsx", "utf8");
    expect(page).toContain('className="mt-3 sm:hidden"');
    expect(page).toContain('className="hidden py-3.5 px-4 text-right sm:table-cell">Action</th>');
    expect(page).toContain('className="hidden py-4 px-4 text-right sm:table-cell"');
    expect(page).toContain("Vendor links are available beside each tool");
  });
});
