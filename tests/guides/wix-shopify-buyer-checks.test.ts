import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { WixShopifyBuyerChecks } from "@/components/WixShopifyBuyerChecks";

// בדיקות תצוגה ומקורות מקומיות בלבד; אין ביקור בקישור שותף או שליחת נתונים.
const render = (comparison = "wix-vs-shopify") => renderToStaticMarkup(createElement(WixShopifyBuyerChecks, { comparison }));
describe("Wix and Shopify scoped buyer checks", () => {
  it("renders only for the intended canonical comparison", () => {
    expect(render()).toContain('id="small-store-buyer-checks"');
    for (const pair of ["shopify-vs-woocommerce", "joomla-vs-wix", "shopify-vs-wix", ""]) expect(render(pair)).toBe("");
  });
  it("keeps the original side-by-side summary before the new buyer panel", () => {
    const page = fs.readFileSync("app/compare/[comparison]/page.tsx", "utf8");
    expect(page.indexOf("<ComparisonTable data={data}")).toBeLessThan(page.indexOf("<WixShopifyBuyerChecks comparison={comparison}"));
    expect(page).toContain('alternates: { canonical: `/compare/${comparison}` }');
    expect(page).toContain('ctaLocation="compare-page-choose-card"');
    expect(page).toContain('id="vendor-choice"');
  });
  it("preserves distinct workflow fit and a stay-or-embed alternative", () => {
    const html = render();
    expect(html).toContain("Start with Wix when the website leads");
    expect(html).toContain("Start with Shopify when commerce leads");
    expect(html).toContain("WooCommerce"); expect(html).toContain("Ecwid");
    expect(html).toContain('/best-ecommerce-platform-for-small-business#store-decision-kit');
    expect(html).toContain('href="#vendor-choice"');
    expect(html).toContain("Jump to the Wix and Shopify choice cards");
    expect(html).toContain("editorial judgments, not hands-on benchmarks");
  });
  it("qualifies vendor claims with nearby official sources", () => {
    const html = render();
    expect(html).toContain("importing orders through its documented Cart2Cart route");
    expect(html).toContain("free installation does not mean free migration");
    expect(html).toContain("target-data cleanup is irreversible");
    expect(html).toContain("Shopify requires a paid plan for payment-gateway testing");
    expect(html).toContain("test mode prevents live customer orders");
    expect(html).toContain('href="https://support.wix.com/en/article/wix-stores-migrating-from-other-ecommerce-platforms-to-wix-stores"');
    expect(html).toContain('href="https://help.shopify.com/en/manual/checkout-settings/test-orders"');
    expect(html).toContain("They do not refresh every fact elsewhere on this page");
  });
  it("adds no tracking links, forms, scripts, ratings or price promises", () => {
    const html = render();
    expect(html).not.toMatch(/pxf\.io|<form|<script|aggregateRating|guaranteed|\$\d/);
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    expect(links).toHaveLength(4);
    expect(links.filter(link => link.startsWith("https://"))).toHaveLength(2);
  });
  it("retains the guide's route-capacity distinction and ungated checklist", () => {
    const source = fs.readFileSync("components/EcommerceDecisionKit.tsx", "utf8");
    expect(source).toContain("not a statement about Wix’s overall catalog capacity");
    expect(source).toContain("to import store orders"); expect(source).toContain("cleanup is irreversible");
    expect(source).toContain("no signup required"); expect(source).toContain("September 17, 2026");
  });
});
