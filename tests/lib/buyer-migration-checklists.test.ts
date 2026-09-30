import React from "react";
import sitemap from "@/app/sitemap";
import { FIRST_REVENUE_CONTENT_UPDATED_AT } from "@/data/revenue/first-revenue-cohort";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { BUYER_MIGRATION_CHECKLISTS } from "@/data/guides/buyer-migration-checklists";
import { BuyerMigrationChecklist } from "@/components/BuyerMigrationChecklist";
import { FirstRevenueSoftwarePanel } from "@/components/FirstRevenueSoftwarePanel";
import { getSoftware } from "@/data/software";
import { isFrozenSlug } from "@/data/growth/frozen-cohorts";
import { readProtectedExperimentSlugs } from "@/scripts/growth/gsc-opportunity-miner";
vi.mock("@/components/TrackedCtaLink", () => ({
  TrackedCtaLink: ({ children, href, rel }: { children: React.ReactNode; href: string; rel: string }) => React.createElement("a", { href, rel }, children),
}));
const render = (slug: string) => renderToStaticMarkup(React.createElement(FirstRevenueSoftwarePanel, { software: getSoftware(slug)! }));
describe("source-linked buyer checks on existing money pages", () => {
  it("updates lastmod only for genuinely changed money pages", () => {
    const dates = new Map(sitemap().map(row => [new URL(row.url).pathname, new Date(row.lastModified ?? 0).toISOString().slice(0, 10)]));
    for (const slug of ["todoist", "close", "setmore"]) expect(dates.get(`/software/${slug}`)).toBe("2026-09-30");
    const airtableDate = [getSoftware("airtable")!.accessedAt, FIRST_REVENUE_CONTENT_UPDATED_AT].sort().at(-1);
    expect(dates.get("/software/airtable")).toBe(airtableDate);
    expect(dates.get("/software/pipedrive")).toBe(getSoftware("pipedrive")!.accessedAt);
    expect(dates.get("/software/wrike")).toBe(getSoftware("wrike")!.accessedAt);
  });
  it("targets exactly three unprotected existing pages", () => {
    expect(Object.keys(BUYER_MIGRATION_CHECKLISTS)).toEqual(["todoist", "close", "setmore"]);
    const protectedSlugs = readProtectedExperimentSlugs();
    for (const slug of Object.keys(BUYER_MIGRATION_CHECKLISTS)) {
      expect(getSoftware(slug)).toBeDefined();
      expect(isFrozenSlug(slug)).toBe(false);
      expect(protectedSlugs.has(slug)).toBe(false);
    }
  });
  it.each(["todoist", "close", "setmore"])("%s renders crawlable facts, sources and a working fragment", slug => {
    const checklist = BUYER_MIGRATION_CHECKLISTS[slug]!;
    const html = render(slug);
    expect(html).toContain('href="#migration-checks"');
    expect(html.match(/id="migration-checks"/g)).toHaveLength(1);
    expect(checklist.checks).toHaveLength(3);
    expect(html).toContain("proposed buyer checks");
    expect(html).toContain("not a claim that Miloosh ran a migration");
    expect(html).toContain("September 30, 2026");
    for (const check of checklist.checks) {
      expect(check.documentedBoundary.length).toBeGreaterThan(40);
      expect(check.buyerAction.length).toBeGreaterThan(40);
      for (const id of check.sourceIds) {
        const source = checklist.sources.find(item => item.id === id)!;
        expect(source).toBeDefined();
        expect(new URL(source.url).protocol).toBe("https:");
        expect(html).toContain(`href="${source.url}" target="_blank" rel="noopener noreferrer"`);
      }
    }
  });
  it.each(["airtable", "elevenlabs", "notion", "fireflies-ai"])("does not add the checklist to %s", slug => {
    expect(renderToStaticMarkup(React.createElement(BuyerMigrationChecklist, {slug}))).toBe("");
    expect(render(slug)).not.toContain('id="migration-checks"');
  });
  it("documents irreversible/import and plan constraints instead of guaranteeing a migration", () => {
    expect(render("todoist")).toContain("no undo action");
    expect(render("todoist")).toContain("completed tasks");
    expect(render("close")).toContain("not automatic migration compatibility");
    expect(render("setmore")).toContain("even without login permission");
  });
});
