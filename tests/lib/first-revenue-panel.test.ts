import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getSoftware } from "@/data/software";
import { getComparisonsInvolving, getComparisonSlug } from "@/data/comparisons";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";
import { getSoftwareCtaUrl } from "@/lib/affiliate";
import { FirstRevenueSoftwarePanel } from "@/components/FirstRevenueSoftwarePanel";
import { VendorLinksBlock } from "@/components/VendorLinksBlock";

vi.mock("@/components/TrackedCtaLink", () => ({
  TrackedCtaLink: ({ children, href, rel }: { children: React.ReactNode; href: string; rel: string }) => React.createElement("a", { href, rel }, children),
}));
vi.mock("@/components/TrackedVendorLink", () => ({
  TrackedVendorLink: ({ children, href, rel }: { children: React.ReactNode; href: string; rel: string }) => React.createElement("a", { href, rel }, children),
}));

describe("five money-page decision panels", () => {
  it.each(FIRST_REVENUE_PAGES)("$slug exposes existing alternative fit and published comparison paths without re-ranking", ({ slug }) => {
    const software = getSoftware(slug)!;
    const html = renderToStaticMarkup(React.createElement(FirstRevenueSoftwarePanel, { software }));
    expect(html).toContain('href="#buyer-price-check"');
    expect(html).toContain('id="buyer-price-check"');
    expect(html).toContain('href="#buyer-alternatives"');
    expect(html).toContain('id="buyer-alternatives"');
    expect(html).toContain("Catalog pricing checked");
    expect(html).toContain("sponsored noopener noreferrer");
    expect(html).toContain(getSoftwareCtaUrl(software, "pricing").replaceAll("&", "&amp;"));
    const alternatives = software.alternatives.slice(0, 3);
    let previous = -1;
    for (const alternative of alternatives) {
      const position = html.indexOf(`href="/software/${alternative.slug}"`);
      expect(position).toBeGreaterThan(previous);
      previous = position;
      const pair = getComparisonsInvolving(slug).find(([a, b]) => a === alternative.slug || b === alternative.slug);
      if (pair) expect(html).toContain(`href="/compare/${getComparisonSlug(...pair)}"`);
    }
    // No pseudo comparison routes built from an unregistered pair.
    for (const href of html.matchAll(/href="\/compare\/([^"]+)"/g)) {
      expect(getComparisonsInvolving(slug).map(([a, b]) => getComparisonSlug(a, b))).toContain(href[1]);
    }
  });
  it("does not add the money panel to unrelated products", () => {
    expect(renderToStaticMarkup(React.createElement(FirstRevenueSoftwarePanel, { software: getSoftware("notion")! }))).toBe("");
  });
  it("closes Todoist pricing/trial leaks while retaining a direct documentation source", () => {
    const software = getSoftware("todoist")!;
    const html = renderToStaticMarkup(React.createElement(VendorLinksBlock, { software: { ...software, links: { ...software.links, docs: "https://todoist.com/help" } } }));
    expect(html.match(/sponsored noopener noreferrer/g)).toHaveLength(2);
    expect(html.match(/https:\/\/get.todoist.io\/dobo71f2y038/g)).toHaveLength(2);
    expect(html).not.toContain('href="https://todoist.com/auth/signup"');
    expect(html).not.toContain('href="https://todoist.com/pricing"');
    expect(html).toContain('href="https://todoist.com/help" rel="noopener noreferrer"');
    expect(html).toContain("affiliate referral link");
  });
  it("leaves non-cohort vendor resource links direct", () => {
    const html = renderToStaticMarkup(React.createElement(VendorLinksBlock, { software: getSoftware("pipedrive")! }));
    expect(html).not.toContain("sponsored");
  });
});
