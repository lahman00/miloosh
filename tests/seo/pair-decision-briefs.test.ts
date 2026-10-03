import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { PairDecisionBrief } from "@/components/PairDecisionBrief";
import { getComparisonSlug, isPublishedComparison } from "@/data/comparisons";
import {
  getAllPairDecisionBriefs,
  getPairDecisionBrief,
  type BriefFact,
  type PairDecisionBrief as Brief,
} from "@/data/seo/pair-decision-briefs";
import { CONS_DISCLOSURE, getComparisonBySlug } from "@/lib/comparison";
import { decodeHtml, renderedHtml } from "@/lib/seo/rendered-html";
import { SITE_URL } from "@/lib/site";

const BRIEFS = getAllPairDecisionBriefs();
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Every fact that renders as prose or a table cell (row labels are plain headers). */
function facts(brief: Brief): BriefFact[] {
  const out: BriefFact[] = [];
  for (const block of brief.blocks) {
    if (block.kind === "prose") out.push(...block.paragraphs);
    if (block.kind === "definitions") {
      if (block.intro) out.push(block.intro);
      for (const item of block.items) out.push(...item.facts);
    }
    if (block.kind === "table") {
      if (block.intro) out.push(block.intro);
      for (const row of block.rows) out.push(...row.cells);
      if (block.footnote) out.push(block.footnote);
    }
  }
  if (brief.sourcesIntro) out.push(brief.sourcesIntro);
  return out;
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function norm(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

describe("pair decision briefs: registry", () => {
  it("resolves only registered slugs, never prototype keys", () => {
    for (const key of ["constructor", "__proto__", "toString", "hasOwnProperty", "not-a-pair"]) {
      expect(getPairDecisionBrief(key)).toBeUndefined();
    }
  });

  it.each(BRIEFS.map((brief) => [brief.slug, brief] as const))("%s is a published comparison", (slug, brief) => {
    const data = getComparisonBySlug(slug);
    expect(data).toBeTruthy();
    expect(isPublishedComparison(data!.softwareA.slug, data!.softwareB.slug)).toBe(true);
    expect(getComparisonSlug(data!.softwareA.slug, data!.softwareB.slug)).toBe(brief.slug);
    expect(getPairDecisionBrief(slug)).toBe(brief);
  });
});

describe.each(BRIEFS.map((brief) => [brief.slug, brief] as const))("pair decision brief: %s", (slug, brief) => {
  it("cites a source for every fact that carries a figure or a date", () => {
    // The sources intro is the statement about the sources themselves, so it cannot cite them.
    for (const fact of facts(brief).filter((item) => item !== brief.sourcesIntro)) {
      if (/[0-9$]/.test(fact.text)) {
        expect(fact.cite?.length ?? 0, `uncited figure: ${fact.text}`).toBeGreaterThan(0);
      }
    }
  });

  it("has a consistent source list: known ids, every source cited, https URLs, dated reads", () => {
    const ids = brief.sources.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(brief.sources.map((source) => source.url)).size).toBe(brief.sources.length);
    const cited = new Set<string>();
    for (const fact of facts(brief)) for (const id of fact.cite ?? []) cited.add(id);
    for (const id of cited) expect(ids, `unknown source id ${id}`).toContain(id);
    for (const id of ids) expect(cited.has(id), `source never cited: ${id}`).toBe(true);
    expect(brief.updatedAt).toMatch(ISO_DATE);
    for (const source of brief.sources) {
      expect(source.label.trim().length).toBeGreaterThan(5);
      expect(new URL(source.url).protocol).toBe("https:");
      expect(source.checkedOn).toMatch(ISO_DATE);
      expect(source.checkedOn <= brief.updatedAt, `${source.id} read after updatedAt`).toBe(true);
    }
    expect(Math.max(...brief.sources.map((source) => Date.parse(source.checkedOn)))).toBe(Date.parse(brief.updatedAt));
  });

  it("shares no sentence with the generated comparison copy and none of its boilerplate", () => {
    const data = getComparisonBySlug(slug)!;
    const generated = [
      data.intro,
      data.whoShouldChooseA,
      data.whoShouldChooseB,
      CONS_DISCLOSURE,
      data.softwareA.bestFor,
      data.softwareB.bestFor,
      ...data.keyDifferences,
      ...data.softwareA.features,
      ...data.softwareB.features,
    ].flatMap((text) => sentences(text).map(norm));
    const generatedSet = new Set(generated);
    const text = facts(brief).map((fact) => fact.text).join(" ") + " " + brief.disclaimerLead;
    for (const sentence of sentences(text)) {
      if (sentence.split(" ").length >= 6) expect(generatedSet.has(norm(sentence)), `reused: ${sentence}`).toBe(false);
    }
    expect(text).not.toContain("We don't infer weaknesses");
    expect(text).not.toMatch(/\bare both [a-z ]+ options\b/i);
    expect(text).not.toMatch(/\bChoose .+ if this fits\b/);
  });

  it("makes no unsupported claims about testing, ranking or project health", () => {
    const text = facts(brief).map((fact) => fact.text).join(" ");
    expect(text).not.toMatch(/\b(abandoned|dead|unmaintained|deprecated|winner|cheapest|we tested|we ran|hands-on|our testing|guaranteed)\b/i);
  });

  it("states its metadata within search-result limits", () => {
    expect(brief.metadata).toBeDefined();
    expect(brief.metadata!.title.length).toBeGreaterThan(30);
    expect(brief.metadata!.title.length).toBeLessThanOrEqual(70);
    expect(brief.metadata!.description.length).toBeGreaterThan(100);
    expect(brief.metadata!.description.length).toBeLessThanOrEqual(165);
  });

  it("renders native headings, tables and citations with no internal links, scripts or structured data", () => {
    const html = renderToStaticMarkup(React.createElement(PairDecisionBrief, { brief }));
    const page = renderedHtml(html);
    const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((match) => decodeHtml(match[1].replace(/<[^>]*>/g, "")));
    expect(headings).toEqual([...brief.blocks.map((block) => block.heading), brief.sourcesHeading]);
    expect([...html.matchAll(/<table\b/g)].length).toBe(brief.blocks.filter((block) => block.kind === "table").length);
    expect(html).not.toMatch(/<script/i);
    expect(page.schemas).toEqual([]);
    const hrefs = page.links.map((link) => link.href);
    expect(hrefs.filter((href) => href.startsWith("/"))).toEqual([]);
    const external = page.links.filter((link) => link.href.startsWith("https://"));
    expect(external.length).toBe(brief.sources.length);
    for (const link of external) {
      expect(link.rel).toBe("noopener noreferrer");
      expect(link.target).toBe("_blank");
    }
    const inPage = page.links.filter((link) => link.href.startsWith("#"));
    expect(inPage.length + external.length).toBe(page.links.length);
    for (const link of inPage) {
      const match = /^#pair-source-(\d+)$/.exec(link.href);
      expect(match, `unexpected anchor ${link.href}`).not.toBeNull();
      const n = Number(match![1]);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(brief.sources.length);
      expect(page.ids.has(`pair-source-${n}`)).toBe(true);
    }
  });

  it("sets the sitemap lastmod for its URL to the date its sources were re-read", () => {
    const entry = sitemap().find((item) => item.url === `${SITE_URL}/compare/${slug}`);
    expect(entry).toBeDefined();
    expect(new Date(entry!.lastModified as Date).toISOString().slice(0, 10)).toBe(brief.updatedAt);
  });
});

describe("mkdocs-vs-read-the-docs brief: the figures it prints", () => {
  const brief = getPairDecisionBrief("mkdocs-vs-read-the-docs")!;

  it("computes every 12-month total from the monthly list price", () => {
    const block = brief.blocks.find((item) => item.kind === "table" && /plan unlocks/.test(item.heading));
    expect(block && block.kind === "table").toBe(true);
    if (!block || block.kind !== "table") return;
    let checked = 0;
    for (const row of block.rows) {
      const monthly = /^\$([\d,]+) per month$/.exec(row.cells[0].text);
      if (!monthly) continue;
      const total = /^\$([\d,]+) \(12 × \$([\d,]+)\)$/.exec(row.cells[1].text);
      expect(total, row.label).not.toBeNull();
      const price = Number(monthly[1].replace(/,/g, ""));
      expect(Number(total![2].replace(/,/g, ""))).toBe(price);
      expect(Number(total![1].replace(/,/g, ""))).toBe(12 * price);
      checked += 1;
    }
    expect(checked).toBe(3);
  });

  it("keeps the dated facts that define the decision", () => {
    const text = facts(brief).map((fact) => fact.text).join(" ");
    for (const needle of ["1.6.1", "2024-08-30", "2.0.dev6", "2026-09-15", "2025-10-20", "May 5, 2027", "$50", "$150", "$250", "$10,000", "15 minutes"]) {
      expect(text, needle).toContain(needle);
    }
  });
});
