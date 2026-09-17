import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EcommerceDecisionKit } from "@/components/EcommerceDecisionKit";

describe("user-first merchant decision kit", () => {
  it("puts the existing comparison before the long buyer worksheet", () => {
    const page = fs.readFileSync("app/[guide]/page.tsx", "utf8");
    expect(page.indexOf('id="quick-comparison"')).toBeLessThan(page.indexOf('<BuyerDecisionBrief'));
    expect(page).toContain('guide.slug === "best-ecommerce-platform-for-small-business" ? <EcommerceDecisionKit');
  });
  it("offers an ungated working download and fair stay/repair alternatives", () => {
    const html = renderToStaticMarkup(createElement(EcommerceDecisionKit));
    expect(html).toContain('download=""'); expect(html).toContain('no signup required');
    for (const slug of ["wix", "shopify", "woocommerce", "ecwid"]) expect(html).toContain(`href="#${slug}"`);
    expect(html).toContain("Quote first or checkout first?");
    expect(html).toContain("Treat that as an elimination gate");
    expect(html).toContain("not claims that Wix, Shopify, WooCommerce or Ecwid supports every service, quote or payment-provider combination");
    expect(fs.existsSync('public/resources/ecommerce-platform-decision-checklist.html')).toBe(true);
  });
  it("keeps the worksheet private-by-design, no tracking or forced opt-in", () => {
    const html = fs.readFileSync('public/resources/ecommerce-platform-decision-checklist.html', 'utf8');
    expect(html).toContain('noindex,follow'); expect(html).not.toContain('<script'); expect(html).not.toContain('<form');
    expect(html).not.toMatch(/pxf\.io|affiliate_link_click/); expect(html).toContain('Unknown is not a pass');
    expect(html).toContain('scope="row"'); expect(html).toContain('Shopify test-order documentation');
  });
});
