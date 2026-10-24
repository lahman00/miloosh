import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSoftware } from "@/data/software";
import { COMPARISON_V2_WAVE } from "@/data/seo/comparison-waves";
import fs from "node:fs";
import path from "node:path";

// The tracked link is a client component; here only the props that decide tracking and attribution matter.
vi.mock("@/components/TrackedCtaLink", () => ({
  TrackedCtaLink: (props: { slug: string; href: string; rel?: string; ctaLocation?: string; children: unknown }) =>
    createElement("a", { "data-slug": props.slug, "data-location": props.ctaLocation, rel: props.rel, href: props.href }, props.children as never),
}));

import { ComparisonChoiceCta } from "@/components/ComparisonChoiceCta";

const render = (slug: string, other: string, ctaLocation?: string) => {
  const software = getSoftware(slug)!;
  return renderToStaticMarkup(createElement(ComparisonChoiceCta, { software, otherSlug: other, ...(ctaLocation ? { ctaLocation } : {}) }));
};

describe("ComparisonChoiceCta", () => {
  it("keeps the existing tracking location by default and uses a separate one when asked", () => {
    expect(render("callrail", "ruler-analytics")).toContain('data-location="compare-page-choose-card"');
    expect(render("callrail", "ruler-analytics", "compare-page-pricing-table")).toContain('data-location="compare-page-pricing-table"');
  });

  it("treats both products identically: a link for each, disclosure only where the link is an affiliate link", () => {
    const affiliate = render("callrail", "ruler-analytics", "compare-page-pricing-table");
    const plain = render("ruler-analytics", "callrail", "compare-page-pricing-table");
    expect(affiliate).toContain("Visit CallRail");
    expect(plain).toContain("Visit Ruler Analytics");
    expect(affiliate).toContain("sponsored");
    expect(affiliate).toContain("This is an affiliate link");
    expect(plain).not.toContain("sponsored");
    expect(plain).not.toContain("This is an affiliate link");
  });
});

describe("v2 comparison page vendor row", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "app/compare/[comparison]/page.tsx"), "utf8");
  it("renders the extra row for both products and only on v2 wave pages", () => {
    const row = page.slice(page.indexOf('aria-label="Visit the vendors"') - 200, page.indexOf('aria-label="Visit the vendors"') + 900);
    expect(row).toContain("comparisonV2 ?");
    expect((row.match(/<ComparisonChoiceCta/g) ?? []).length).toBe(2);
    expect(row).toContain("software={softwareA}");
    expect(row).toContain("software={softwareB}");
    expect(COMPARISON_V2_WAVE.length).toBeGreaterThan(0);
  });
});
