import { describe, it, expect } from "vitest";
import { getSoftwareCtaUrl, getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { getSoftware } from "@/data/software";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { WIX_FUNNELS, WIX_COMPARISON_CONTEXT, getWixProductLabelForComparison, resolveComparisonCtaUrl } from "@/lib/wix-funnels";

/**
 * Regression coverage for the real Wix affiliate integration.
 *
 * 2026-08-16: Wix's affiliate manager issued a first real Impact.com
 * tracking link (Headless funnel only), recorded as data/software/
 * wix.json's own `affiliate_url` — real production data, unlike
 * affiliate-activation.test.ts's deliberately fake env-var fixture.
 *
 * 2026-08-17: Wix issued the remaining three funnels (Website Builder,
 * Domain, eCommerce). Per the explicit "if context is unclear, default
 * to Website Builder" rule, wix.json's single `affiliate_url` field —
 * which every page without a known context still falls back to — was
 * updated from the Headless link to the Website Builder link. This test
 * file's default-URL assertion was updated to match; the Headless link
 * is still real and still used, just only where the content is actually
 * about headless architecture (see lib/wix-funnels.ts /
 * WIX_COMPARISON_CONTEXT).
 */

describe("Wix affiliate link — default (no context known)", () => {
  it("the software page CTA resolves to the Website Builder funnel by default", () => {
    const wix = getSoftware("wix")!;
    expect(getSoftwareCtaUrl(wix)).toBe(WIX_FUNNELS["website-builder"].url);
  });

  it("uses rel=sponsored (plus noopener/noreferrer) now that it's a real affiliate link", () => {
    const wix = getSoftware("wix")!;
    const rel = getSoftwareCtaRel(wix);
    expect(rel).toContain("sponsored");
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  it("shows the affiliate disclosure note", () => {
    const wix = getSoftware("wix")!;
    expect(shouldShowAffiliateDisclosure(wix)).toBe(true);
  });

  it("the official website field is untouched — still the plain wix.com URL, not any tracking link", () => {
    const wix = getSoftware("wix")!;
    expect(wix.website).toBe("https://www.wix.com");
  });

  it("source citations are untouched — still official wix.com pages, never an affiliate link", () => {
    const wix = getSoftware("wix")!;
    for (const source of wix.sources) {
      expect(source).not.toContain("wix.pxf.io");
      expect(source).not.toContain("7623171");
    }
  });

  it("Wix's affiliate research record still confirms a real, existing program (not fabricated)", () => {
    const research = AFFILIATE_PROGRAMS.find((p) => p.slug === "wix");
    expect(research?.programExists).toBe("yes");
  });

  it("no duplicate Wix records exist in the research file or the catalog", () => {
    expect(AFFILIATE_PROGRAMS.filter((p) => p.slug === "wix")).toHaveLength(1);
  });

  it("editorial content (bestFor, alternatives) carries no affiliate-derived language — commercial status never rewrites the editorial fields", () => {
    const wix = getSoftware("wix")!;
    expect(wix.bestFor.toLowerCase()).not.toContain("sponsor");
    expect(wix.bestFor.toLowerCase()).not.toContain("affiliate");
    expect(wix.description.toLowerCase()).not.toContain("sponsor");
  });

  it("a product with no affiliate_url set still resolves to its plain official site (no accidental global default)", () => {
    // squarespace lists as a Wix alternative but has no affiliate program of its own recorded here — its own CTA must stay unaffected.
    const squarespace = getSoftware("squarespace")!;
    expect(getSoftwareCtaUrl(squarespace)).toBe(squarespace.website);
    expect(shouldShowAffiliateDisclosure(squarespace)).toBe(false);
  });
});

describe("resolveComparisonCtaUrl — Wix multi-funnel routing", () => {
  it("routes a headless-CMS comparison to the Headless funnel, not the generic default", () => {
    const wix = getSoftware("wix")!;
    expect(resolveComparisonCtaUrl(wix, "contentful")).toBe(WIX_FUNNELS.headless.url);
    expect(resolveComparisonCtaUrl(wix, "sanity")).toBe(WIX_FUNNELS.headless.url);
    expect(resolveComparisonCtaUrl(wix, "storyblok")).toBe(WIX_FUNNELS.headless.url);
    expect(resolveComparisonCtaUrl(wix, "strapi")).toBe(WIX_FUNNELS.headless.url);
    expect(resolveComparisonCtaUrl(wix, "joomla")).toBe(WIX_FUNNELS.headless.url);
    expect(getWixProductLabelForComparison("joomla")).toBe("Wix Headless");
  });

  it("routes a general website-builder comparison to the Website Builder funnel", () => {
    const wix = getSoftware("wix")!;
    expect(resolveComparisonCtaUrl(wix, "squarespace")).toBe(WIX_FUNNELS["website-builder"].url);
    expect(resolveComparisonCtaUrl(wix, "wordpress")).toBe(WIX_FUNNELS["website-builder"].url);
  });

  it("falls back to the Website Builder funnel for a pairing with no explicit classification", () => {
    const wix = getSoftware("wix")!;
    expect(resolveComparisonCtaUrl(wix, "some-future-product-not-yet-classified")).toBe(WIX_FUNNELS["website-builder"].url);
  });

  it("routes the Wix vs Shopify comparison (2026-08-17) to the eCommerce funnel, not the generic default", () => {
    const wix = getSoftware("wix")!;
    expect(resolveComparisonCtaUrl(wix, "shopify")).toBe(WIX_FUNNELS.ecommerce.url);
    expect(getWixProductLabelForComparison("shopify")).toBe("Wix eCommerce");
    expect(getWixProductLabelForComparison("squarespace")).toBe("Wix");
  });

  it("no current Wix comparison is domain-registrar-specific — honest gap, not forced (no domain-registrar product exists in the catalog yet)", () => {
    const domainContexts = Object.values(WIX_COMPARISON_CONTEXT).filter((c) => c === "domain");
    expect(domainContexts).toHaveLength(0);
  });

  it("every product other than Wix still resolves through the plain single-URL path", () => {
    const elevenlabs = getSoftware("elevenlabs")!;
    expect(resolveComparisonCtaUrl(elevenlabs, "anything")).toBe(getSoftwareCtaUrl(elevenlabs));
  });
});
