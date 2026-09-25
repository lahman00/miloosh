import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getSoftware } from "@/data/software";
import { getComparisonsInvolving, getComparisonSlug } from "@/data/comparisons";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";
import { getSoftwareSerpOverride } from "@/data/seo/serp-overrides";
import { FirstRevenueSoftwarePanel } from "@/components/FirstRevenueSoftwarePanel";
import { firstRevenueEntryTier } from "@/lib/revenue/first-revenue-price";

vi.mock("@/components/TrackedCtaLink", () => ({
  TrackedCtaLink: ({ children, href, rel }: { children: React.ReactNode; href: string; rel: string }) => React.createElement("a", { href, rel }, children),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("notFound"); },
  usePathname: () => "/compare/test",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const render = (slug: string) => renderToStaticMarkup(React.createElement(FirstRevenueSoftwarePanel, { software: getSoftware(slug)! }));
const decode = (html: string) => html.replaceAll("&#x27;", "'").replaceAll("&amp;", "&");

describe("five money pages: buyer-decision completeness", () => {
  it.each(FIRST_REVENUE_PAGES)("$slug shows billing terms, a switching check and an honest CTA destination", ({ slug, ctaLabel, switchingCheck }) => {
    const software = getSoftware(slug)!;
    const html = decode(render(slug));
    const tier = firstRevenueEntryTier(software);
    expect(tier?.notes).toBeTruthy();
    expect(html).toContain(`${tier!.name} plan terms on record:`);
    expect(html).toContain(tier!.notes!);
    expect(html).toContain('href="#plans"');
    expect(html).toContain("Switching check");
    expect(html).toContain(switchingCheck);
    expect(html).toContain(`Opens ${software.name}'s site in a new tab`);
    // Issued referral assets are general links, not verified pricing deep links.
    expect(ctaLabel).not.toMatch(/pricing/i);
    expect(ctaLabel).toContain(software.name);
    if (/free/i.test(ctaLabel)) expect(software.pricing?.freePlan || software.pricing?.freeTrial?.available).toBe(true);
  });

  it("links measured head-to-heads only through existing published comparisons", () => {
    for (const page of FIRST_REVENUE_PAGES) {
      const published = getComparisonsInvolving(page.slug).map(([a, b]) => getComparisonSlug(a, b));
      for (const slug of page.measuredComparisons ?? []) expect(published).toContain(slug);
    }
    expect(render("airtable")).toContain('href="/compare/coda-vs-airtable"');
    expect(render("airtable")).toContain("Coda vs Airtable");
  });

  it("keeps the full pricing section reachable from the price check", () => {
    const page = fs.readFileSync("app/software/[slug]/page.tsx", "utf8");
    expect(page).toMatch(/<div id="plans" className="scroll-mt-24">\s*<PricingSection software=\{software\} \/>/);
  });

  it("stacks the sticky CTA on narrow phones without dropping billing terms or disclosure", () => {
    const layout = fs.readFileSync("app/software/[slug]/layout.tsx", "utf8");
    expect(layout).toContain("flex-col gap-2 sm:flex-row");
    expect(layout).toContain('className="w-full sm:w-auto sm:shrink-0"');
    expect(layout).toContain("Affiliate link");
    expect(layout).not.toMatch(/truncate[^"]*">\s*\{price/);
  });
});

describe("five money pages: search title alignment", () => {
  it.each(FIRST_REVENUE_PAGES)("$slug leads with the measured alternatives intent and only names compared products", ({ slug }) => {
    const software = getSoftware(slug)!;
    const meta = getSoftwareSerpOverride(slug)!;
    expect(meta.title).toMatch(new RegExp(`^${software.name}( CRM)? Alternatives & Pricing \\(2026\\): `));
    expect(meta.description.length).toBeLessThanOrEqual(155);
    const compared = [
      ...software.alternatives.map((alternative) => alternative.name),
      ...getComparisonsInvolving(slug).flat().map((other) => getSoftware(other)?.name ?? ""),
    ];
    for (const named of meta.title.split(": ")[1].split(", ")) {
      expect(compared.some((name) => name.startsWith(named))).toBe(true);
    }
  });
  it("no longer promises a Todoist vs Microsoft To Do comparison that the site does not have", () => {
    expect(JSON.stringify(getSoftwareSerpOverride("todoist"))).not.toContain("Microsoft To Do");
  });
});

describe("comparison pages route deciders into the money-page buyer panel", () => {
  it.each([["coda-vs-airtable", "Airtable"], ["pipedrive-vs-close", "Close"], ["acuity-scheduling-vs-setmore", "Setmore"], ["todoist-vs-ticktick", "Todoist"], ["elevenlabs-vs-murf-ai", "ElevenLabs"]])(
    "%s links %s to #buying-decision with descriptive text",
    async (comparison, name) => {
      const { default: ComparePage } = await import("@/app/compare/[comparison]/page");
      const html = decode(renderToStaticMarkup(await ComparePage({ params: Promise.resolve({ comparison }) })));
      const slug = getSoftware(name.toLowerCase())?.slug ?? "close";
      expect(html).toContain(`href="/software/${slug}#buying-decision"`);
      expect(html).toContain(`${name} alternatives, pricing and fit`);
      expect(html).not.toContain(`href="/software/${slug}#alternative-decision-heading"`);
    },
  );
  it("leaves non-cohort comparisons on their existing alternatives guide links", async () => {
    const { default: ComparePage } = await import("@/app/compare/[comparison]/page");
    const html = renderToStaticMarkup(await ComparePage({ params: Promise.resolve({ comparison: "notion-vs-coda" }) }));
    expect(html).not.toContain("#buying-decision");
  });
});
