import type { Metadata } from "next";
import { describe, expect, it } from "vitest";
import { generateMetadata as categoryMetadata } from "@/app/category/[slug]/page";
import { generateMetadata as comparisonMetadata } from "@/app/compare/[comparison]/page";
import { generateMetadata as guideMetadata } from "@/app/[guide]/page";
import { metadata as researchMetadata } from "@/app/research/saas-pricing-pressure-index-2026/page";
import { generateMetadata as softwareMetadata } from "@/app/software/[slug]/page";
import { metadata as toolsMetadata } from "@/app/tools/saas-cost-calculator/page";
import { getAllCategories } from "@/data/categories";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getAllRoleGuides } from "@/data/guides/registry";
import { getAllSoftware } from "@/data/software";
import { socialMetadata } from "@/lib/social-metadata";

type OpenGraph = { title?: unknown; description?: unknown; url?: unknown; siteName?: unknown; type?: unknown };
type Twitter = { card?: unknown; title?: unknown; description?: unknown };

/** Everything wrong with one page's social fields, as readable strings. */
function problemsOf(label: string, metadata: Metadata, canonical: string): string[] {
  const og = (metadata.openGraph ?? {}) as OpenGraph;
  const tw = (metadata.twitter ?? {}) as Twitter;
  const problems: string[] = [];
  if (!og.title || !og.description) problems.push(`${label}: Open Graph title or description is missing`);
  if (tw.title !== og.title) problems.push(`${label}: twitter:title "${String(tw.title)}" is not og:title "${String(og.title)}"`);
  if (tw.description !== og.description) problems.push(`${label}: twitter:description differs from og:description`);
  if (tw.card !== "summary_large_image") problems.push(`${label}: twitter:card is ${String(tw.card)}`);
  if (og.siteName !== "Miloosh") problems.push(`${label}: og:site_name is ${String(og.siteName)}`);
  if (typeof og.url !== "string" || !og.url.endsWith(canonical)) problems.push(`${label}: og:url ${String(og.url)} does not match canonical ${canonical}`);
  return problems;
}

describe("socialMetadata", () => {
  it("builds the Open Graph and Twitter fields from one title and one description", () => {
    const result = socialMetadata({ title: "A | B", description: "About A and B.", path: "/compare/a-vs-b" });
    expect(result.openGraph).toMatchObject({ title: "A | B", description: "About A and B.", url: "/compare/a-vs-b", siteName: "Miloosh", locale: "en_US", type: "website" });
    expect(result.twitter).toEqual({ card: "summary_large_image", title: "A | B", description: "About A and B." });
  });

  it("can describe an article", () => {
    expect((socialMetadata({ title: "t", description: "d", path: "/x", type: "article" }).openGraph as OpenGraph).type).toBe("article");
  });
});

describe("every page's Twitter card says what its Open Graph card says", () => {
  it("holds on all software profiles", async () => {
    const problems: string[] = [];
    for (const software of getAllSoftware()) {
      const metadata = await softwareMetadata({ params: Promise.resolve({ slug: software.slug }) });
      problems.push(...problemsOf(`/software/${software.slug}`, metadata, `/software/${software.slug}`));
    }
    expect(problems.slice(0, 5)).toEqual([]);
  });

  it("holds on all published comparisons", async () => {
    const problems: string[] = [];
    for (const [a, b] of PUBLISHED_COMPARISONS) {
      const slug = getComparisonSlug(a, b);
      const metadata = await comparisonMetadata({ params: Promise.resolve({ comparison: slug }) });
      problems.push(...problemsOf(`/compare/${slug}`, metadata, `/compare/${slug}`));
    }
    expect(problems.slice(0, 5)).toEqual([]);
  });

  it("holds on all categories", async () => {
    const problems: string[] = [];
    for (const category of getAllCategories()) {
      const metadata = await categoryMetadata({ params: Promise.resolve({ slug: category.slug }) });
      problems.push(...problemsOf(`/category/${category.slug}`, metadata, `/category/${category.slug}`));
      expect((metadata.openGraph as OpenGraph).title, `${category.slug} must describe its own page`).toBe(category.name);
    }
    expect(problems.slice(0, 5)).toEqual([]);
  });

  it("holds on the research report and the cost calculator", () => {
    expect(problemsOf("research", researchMetadata, "/research/saas-pricing-pressure-index-2026")).toEqual([]);
    expect(problemsOf("calculator", toolsMetadata, "/tools/saas-cost-calculator")).toEqual([]);
  });

  it("holds on the buying guides, which already set both cards", async () => {
    for (const guide of getAllRoleGuides()) {
      const metadata = await guideMetadata({ params: Promise.resolve({ guide: guide.slug }) });
      const og = metadata.openGraph as OpenGraph;
      const tw = metadata.twitter as Twitter;
      expect(tw.title, guide.slug).toBe(og.title);
      expect(tw.description, guide.slug).toBe(og.description);
    }
  });
});
