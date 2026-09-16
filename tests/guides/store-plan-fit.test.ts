import { buildPricingIndex } from "@/lib/pricing-index/build";
import { PricingIndexTable } from "@/components/pricing-index/PricingIndexTable";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { StorePlanFit } from "@/components/StorePlanFit";
import { PricingSection } from "@/components/PricingSection";
import { mapSoftware } from "@/data/software/mapper";
import { softwareRawSchema } from "@/data/software/schema";
import wix from "@/data/software/wix.json";
import shopify from "@/data/software/shopify.json";
vi.mock("next/navigation", () => ({ usePathname: () => "/software/wix" }));
const render = (slug: string) => renderToStaticMarkup(createElement(StorePlanFit, { slug }));

// בדיקות מקור ותצוגה בלבד; אין פתיחת קישור שותפים, הרשמה או בקשת רשת.
describe("small-store plan clarity", () => {
  it("only renders on the two intended product pages", () => {
    expect(render("wix")).toContain("Which Wix plan");
    expect(render("shopify")).toContain("Shopify Basic");
    expect(render("pipedrive")).toBe("");
  });
  it("distinguishes payment-enabled Wix plans and separate business email", () => {
    const html = render("wix");
    expect(html).toContain("Light does not accept payments"); expect(html).toContain("Core or Business");
    expect(html).toContain("separate purchase"); expect(html).toContain("not Wix Studio or Wix Headless pricing");
  });
  it("does not treat additional staff limits as a ban on the owner", () => {
    const html = render("shopify");
    expect(html).toContain("additional Shopify admin staff"); expect(html).toContain("store owner and collaborator");
    expect(html).toContain("POS-only staff follow separate rules");
  });
  it("distinguishes carrier-calculated shipping from all shipping", () => {
    const html = render("shopify");
    expect(html).toContain("third-party carrier-calculated shipping"); expect(html).toContain("does not mean Basic cannot ship");
  });
  it("removes unconfirmed regional Wix amounts without inventing contact-sales pricing", () => {
    const product = mapSoftware(softwareRawSchema.parse(wix));
    expect(product.pricing?.status).toBe("unknown"); expect(product.pricing?.entryPaid).toBeUndefined();
    expect(product.pricing?.tiers?.filter(t => t.name !== "Free").every(t => t.amount === undefined)).toBe(true);
    expect(product.pricing?.startingPrice).toContain("Regional pricing");
  });
  it("preserves Shopify snapshot date but correctly labels monthly equivalents", () => {
    const product = mapSoftware(softwareRawSchema.parse(shopify));
    expect(product.pricing?.lastVerified).toBe("2026-08-17");
    expect(product.pricing?.entryPaid).toMatchObject({ amount: "29", billingPeriod: "monthly", annualBillingRequired: true });
    for (const tier of product.pricing?.tiers?.filter(t => ["Basic", "Grow", "Advanced"].includes(t.name)) ?? []) {
      expect(tier.billingPeriod).toBe("monthly"); expect(tier.notes).toContain("annual billing, not the annual total");
    }
  });
  it("renders Shopify monthly unit and annual requirement together", () => {
    const html = renderToStaticMarkup(createElement(PricingSection, { software: mapSoftware(softwareRawSchema.parse(shopify)) }));
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toMatch(/USD\s+29\s*\/\s*monthly/); expect(text).toContain("Annual billing required at this price.");
  });
  it("keeps new links source-only or internal and no signup gate", () => {
    for (const slug of ["wix", "shopify"]) {
      const html = render(slug);
      expect(html).not.toContain("pxf.io"); expect(html).not.toContain("<form");
      expect(html).toContain('/best-ecommerce-platform-for-small-business#store-decision-kit');
      expect(html).toContain('href="/compare/wix-vs-shopify"');
      expect(html).toContain("not hands-on testing");
    }
  });
  it("inserts the plan explanation before existing pricing without replacing its CTA", () => {
    const text = fs.readFileSync("app/software/[slug]/page.tsx", "utf8");
    expect(text.indexOf('<StorePlanFit slug={software.slug} />')).toBeLessThan(text.indexOf('<PricingSection software={software} />'));
    expect(text).toContain('<PricingSection software={software} />');
  });
  it("shows the unknown price status next to the reviewed date", () => {
    const html = renderToStaticMarkup(createElement(PricingSection, { software: mapSoftware(softwareRawSchema.parse(wix)) }));
    expect(html).toContain("Paid pricing is not verified.");
    expect(html).toContain("Pricing reviewed; paid amount unverified");
    expect(html).not.toContain("17.77"); expect(html).not.toContain("29.77");
  });
  it("excludes unverified Wix prices and preserves Shopify annual conditions in the index", () => {
    const index = buildPricingIndex([mapSoftware(softwareRawSchema.parse(wix)), mapSoftware(softwareRawSchema.parse(shopify))]);
    expect(index.products.map(p => p.slug)).toEqual(["shopify"]);
    expect(index.products[0]).toMatchObject({ startingMonthlyEquivalent: 29, annualBillingRequired: true, lastVerified: "2026-08-17" });
    expect(index.modeledTeamCosts).toEqual([]);
    const html = renderToStaticMarkup(createElement(PricingIndexTable, { products: index.products }));
    expect(html).toContain("Monthly equivalent; annual billing required");
    expect(html).not.toContain("monthly billing recorded");
  });
  it("retains original Shopify tier amounts without claiming a new price check", () => {
    expect(shopify.pricing.tiers.map(t => [t.name,t.amount])).toEqual([["Basic","29"],["Grow","79"],["Advanced","299"],["Plus","2300"]]);
    expect(shopify.pricing.last_verified).toBe("2026-08-17");
  });

});
