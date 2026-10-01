import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RelatedDecisionPaths } from "@/components/RelatedDecisionPaths";
import { DECISION_PATHS } from "@/data/seo/decision-paths";
import { getAllRoleGuides } from "@/data/guides/registry";
import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import {
  assertSafeLinkChange,
  loadProtection,
} from "@/lib/google-war/protection";
import { renderedHtml } from "@/lib/seo/rendered-html";

describe("Bounded decision-navigation improvements", () => {
  const inventory = new Set([
    ...getAllSoftware().map((s) => `/software/${s.slug}`),
    ...getAllRoleGuides().map((g) => `/${g.slug}`),
    ...PUBLISHED_COMPARISONS.map(
      ([a, b]) => `/compare/${getComparisonSlug(a, b)}`,
    ),
  ]);
  it("has fourteen unique paths on ten existing pages; all endpoints exist and are unprotected", () => {
    const protections = loadProtection();
    expect(Object.keys(DECISION_PATHS)).toHaveLength(12);
    expect(Object.values(DECISION_PATHS).flat()).toHaveLength(16);
    for (const [source, items] of Object.entries(DECISION_PATHS)) {
      expect(inventory.has(source)).toBe(true);
      expect(new Set(items.map((i) => i.href)).size).toBe(items.length);
      for (const item of items) {
        const target = item.href.split("#")[0];
        expect(inventory.has(target)).toBe(true);
        expect(() =>
          assertSafeLinkChange(source, target, protections),
        ).not.toThrow();
        expect(item.label).not.toMatch(/click here|learn more/i);
      }
    }
  });
  it("emits ordinary server-side crawlable links without affiliate destinations or sponsored flags", () => {
    for (const [source, items] of Object.entries(DECISION_PATHS)) {
      const html = renderToStaticMarkup(
        createElement(RelatedDecisionPaths, { page: source }),
      );
      expect(renderedHtml(html).links.map((a) => a.href)).toEqual(
        items.map((i) => i.href),
      );
      expect(html).toContain('aria-label="Related product decisions"');
      expect(html).not.toMatch(/sponsored|onclick|partner=|affiliate/);
    }
  });
  it("uses native anchors so deep-link hash navigation is not intercepted by the app router", () => {
    const source = readFileSync("components/RelatedDecisionPaths.tsx", "utf8");
    expect(source).not.toContain('from "next/link"');
    expect(source).toContain("<a");
    expect(source).toContain("href={item.href}");
  });
  it("has no effect on unrelated pages", () =>
    expect(
      renderToStaticMarkup(
        createElement(RelatedDecisionPaths, { page: "/software/wrike" }),
      ),
    ).toBe(""));
});
