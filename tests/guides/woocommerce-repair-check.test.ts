import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { WooCommerceRepairCheck } from "@/components/WooCommerceRepairCheck";

const render = (slug = "woocommerce") => renderToStaticMarkup(createElement(WooCommerceRepairCheck, { slug }));

describe("WooCommerce repair-before-migration check", () => {
  it("renders only on the WooCommerce software page", () => {
    expect(render()).toContain('id="woocommerce-repair-check"');
    expect(render("shopify")).toBe("");
    expect(render("wix")).toBe("");
  });

  it("keeps troubleshooting and migration as separate decisions", () => {
    const html = render();
    expect(html).toContain("Repair the store before you replatform");
    expect(html).toContain("Use a current backup and a staging copy");
    expect(html).toContain("Reactivate plugins one at a time");
    expect(html).toContain("Migrate for a structural reason");
    expect(html).toContain("does not estimate a repair or migration price");
  });

  it("links only to official WooCommerce troubleshooting sources plus the internal decision kit", () => {
    const html = render();
    expect(html).toContain('href="https://woocommerce.com/document/how-to-test-for-conflicts/"');
    expect(html).toContain('href="https://woocommerce.com/document/how-to-update-woocommerce/"');
    expect(html).toContain('href="/best-ecommerce-platform-for-small-business#store-decision-kit"');
    expect(html).not.toMatch(/pxf\.io|affiliate|<form|<script|\$\d/);
  });

  it("is integrated before pricing without changing Wix routing code", () => {
    const page = fs.readFileSync("app/software/[slug]/page.tsx", "utf8");
    expect(page.indexOf("<WooCommerceRepairCheck slug={software.slug} />")).toBeGreaterThan(-1);
    expect(page.indexOf("<WooCommerceRepairCheck slug={software.slug} />")).toBeLessThan(page.indexOf("<PricingSection software={software} />"));
    const wix = fs.readFileSync("lib/wix-funnels.ts", "utf8");
    expect(wix).toContain("2097924");
    expect(wix).toContain("3972832");
  });
});
