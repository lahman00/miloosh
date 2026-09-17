import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { ShopifyWooMigrationRecords } from "@/components/ShopifyWooMigrationRecords";

const render = (comparison = "shopify-vs-woocommerce") =>
  renderToStaticMarkup(createElement(ShopifyWooMigrationRecords, { comparison }));

describe("Shopify/WooCommerce migration record gates", () => {
  it("renders only on the intended existing comparison", () => {
    expect(render()).toContain('id="migration-record-gates"');
    for (const slug of ["wix-vs-shopify", "ecwid-vs-shopify", "woocommerce-vs-shopify", ""]) {
      expect(render(slug)).toBe("");
    }
  });

  it("separates products, customers, historical orders and URLs", () => {
    const html = render();
    for (const marker of ["Products", "Customers", "Historical orders", "URLs and domain cutover"]) expect(html).toContain(marker);
    expect(html).toContain("no data-mapping support");
    expect(html).toContain("third-party migration app");
    expect(html).toContain("importing redirects by CSV");
    expect(html).toContain("not a hands-on migration result");
  });
  it("uses only official documentation and internal planning links", () => {
    const html = render();
    expect(html).toContain('href="https://help.shopify.com/en/manual/migrating-to-shopify/migrating-from-woocommerce"');
    expect(html).toContain('href="https://woocommerce.com/document/product-csv-importer-exporter/"');
    expect(html).toContain('href="/best-ecommerce-platform-for-small-business#store-decision-kit"');
    expect(html).not.toMatch(/pxf\.io|<form|<script|aggregateRating|guaranteed|\$\d/);
  });

  it("sits after the comparison table without changing Wix routing code", () => {
    const page = fs.readFileSync("app/compare/[comparison]/page.tsx", "utf8");
    expect(page.indexOf("<ComparisonTable data={data}"))
      .toBeLessThan(page.indexOf("<ShopifyWooMigrationRecords comparison={comparison}"));
    const wixRouting = fs.readFileSync("lib/wix-funnels.ts", "utf8");
    expect(wixRouting).toContain('campaignId: "2097924"');
    expect(wixRouting).toContain('campaignId: "3972832"');
    expect(wixRouting).toContain('joomla: "headless"');
  });
});
