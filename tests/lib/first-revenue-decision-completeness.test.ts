import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getSoftware } from "@/data/software";
import { getComparisonsInvolving, getComparisonSlug } from "@/data/comparisons";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";
import { getSoftwareSerpOverride } from "@/data/seo/serp-overrides";
import { SITE_NAME } from "@/lib/site";
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

  it("does not claim a Close cost mechanism the catalog never documents", () => {
    const page = FIRST_REVENUE_PAGES.find((p) => p.slug === "close")!;
    expect(page.notFor).not.toMatch(/usage-based/i);
    const close = getSoftware("close")!;
    // Every clause in notFor must trace to something the catalog actually
    // documents (Close is billed per seat; automated workflows are
    // Growth/Scale-only), not an invented pricing mechanism.
    expect(close.pricing?.entryPaid?.perSeat).toBe(true);
    expect(close.cons?.some((c) => /Growth or Scale/.test(c))).toBe(true);
    expect(page.notFor).toMatch(/per-seat/i);
    expect(page.notFor).toMatch(/Growth\/Scale/i);
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
    // The disclosure must read as its own line at every width, in the same
    // size as the price text beside it -- not a 10px fragment that only
    // gets its own line at sm+ and otherwise reads as a trailing word.
    expect(layout).not.toContain("text-[10px]");
    expect(layout).toMatch(/<span className="block text-xs text-zinc-400">Affiliate link<\/span>/);
  });
});

describe("five money pages: social metadata is not the sitewide fallback", () => {
  it.each(FIRST_REVENUE_PAGES)("$slug's Twitter Card and Open Graph carry the page's own alternatives-led title, not the homepage's", async ({ slug }) => {
    const { generateMetadata } = await import("@/app/software/[slug]/page");
    const meta = await generateMetadata({ params: Promise.resolve({ slug }) });
    const serpOverride = getSoftwareSerpOverride(slug)!;
    expect(meta.twitter?.title).toBe(serpOverride.title);
    expect(meta.twitter?.description).toBe(serpOverride.description);
    expect(meta.openGraph?.title).toBe(serpOverride.title);
    expect(meta.openGraph?.siteName).toBe(SITE_NAME);
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
  it.each([["coda-vs-airtable", "Airtable", "Coda"], ["pipedrive-vs-close", "Close", "Pipedrive"], ["acuity-scheduling-vs-setmore", "Setmore", "Acuity Scheduling"], ["todoist-vs-ticktick", "Todoist", "TickTick"], ["elevenlabs-vs-murf-ai", "ElevenLabs", "Murf AI"]])(
    "%s links %s to #buying-decision with descriptive, per-pair anchor text (not one template repeated verbatim)",
    async (comparison, name, otherName) => {
      const { default: ComparePage } = await import("@/app/compare/[comparison]/page");
      const html = decode(renderToStaticMarkup(await ComparePage({ params: Promise.resolve({ comparison }) })));
      const slug = getSoftware(name.toLowerCase())?.slug ?? "close";
      expect(html).toContain(`href="/software/${slug}#buying-decision"`);
      // The anchor names the actual comparison partner, so the same product's
      // link reads differently across its ~9-17 referring comparison pages
      // instead of one string reused verbatim everywhere.
      expect(html).toContain(`${name} pricing, alternatives and fit — beyond ${otherName}`);
      expect(html).not.toContain(`href="/software/${slug}#alternative-decision-heading"`);
    },
  );
  it("leaves non-cohort comparisons on their existing alternatives guide links", async () => {
    const { default: ComparePage } = await import("@/app/compare/[comparison]/page");
    const html = renderToStaticMarkup(await ComparePage({ params: Promise.resolve({ comparison: "notion-vs-coda" }) }));
    expect(html).not.toContain("#buying-decision");
  });
});
