import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { getAllSoftware } from "@/data/software";
import { derivedUrls } from "@/lib/growth-agents/inventory";
import { loadSiteInventory } from "@/lib/growth-agents/inventory-loader";
import { protectionFor } from "@/lib/growth-agents/protection";
import { headSha, loadProtectionSnapshot } from "@/lib/growth-agents/protection-sources";
import { canonicalPageUrl, pathOf } from "@/lib/growth-agents/urls";
import { freshnessExpiry, queryNameMatch, sourceTransparency, type QueryRow } from "@/lib/seo/cohort-evidence";
import type { FocusInboundDetail } from "@/lib/seo/crawl-graph-diagnostic";

/**
 * `tsx scripts/growth/organic-cohort-evidence.ts --paths /software/a,/compare/b-vs-c [--queries-file q.json] [--crawl-file crawl.json] [--today YYYY-MM-DD] [--aggregate-only]`
 *
 * Read-only evidence table for an organic-recovery cohort: protection verdict from the repository's own
 * mechanism (the page AND every page that re-renders from its data), the price-label hold, sitemap membership,
 * the indexing-quality gate, when the 90-day freshness gates will fail, source transparency, and (when given)
 * Search Console query name matches and crawled inbound links. Writes nothing; prints JSON to stdout.
 *
 * --queries-file is the owner-authenticated Search Console query export (private, never committed):
 * { rows: [{ query, clicks, impressions, position }] }. A name match is not a page attribution.
 * --aggregate-only drops the per-query rows from the output so it can be committed.
 */

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function stripTop<T extends { top: unknown }>(match: T): Partial<T> {
  if (!process.argv.includes("--aggregate-only")) return match;
  return Object.fromEntries(Object.entries(match).filter(([key]) => key !== "top")) as Partial<T>;
}

type QueryFile = { rows: Array<{ query: string; clicks: number; impressions: number; position: number }> };

function main() {
  const paths = (arg("paths") ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (paths.length === 0) {
    console.error("usage: organic-cohort-evidence --paths /software/a,/compare/b-vs-c [--queries-file f.json] [--crawl-file f.json] [--today YYYY-MM-DD]");
    process.exit(2);
  }
  const root = process.cwd();
  const today = arg("today") ?? new Date().toISOString().slice(0, 10);
  const now = new Date(`${today}T12:00:00.000Z`);
  const sha = headSha(root);
  const inventory = loadSiteInventory({ checkoutSha: sha, now });
  const { snapshot } = loadProtectionSnapshot({
    repoRoot: root,
    baseSha: sha,
    today,
    ownWorktreePath: root,
    knownComparisonSlugs: new Set(inventory.comparisons.keys()),
    checkoutSha: sha,
    generatedAt: now.toISOString(),
  });
  const held = new Set<string>((JSON.parse(fs.readFileSync("data/seo/price-label-hold.json", "utf8")) as { heldSoftware: string[] }).heldSoftware);
  const bySlug = new Map(getAllSoftware().map((s) => [s.slug, s]));
  const queryFile = arg("queries-file");
  const rows: QueryRow[] = queryFile
    ? (JSON.parse(fs.readFileSync(queryFile, "utf8")) as QueryFile).rows.map((r) => ({ query: r.query, clicks: r.clicks, impressions: r.impressions, position: r.position }))
    : [];
  const crawlFile = arg("crawl-file");
  const focus = crawlFile ? ((JSON.parse(fs.readFileSync(crawlFile, "utf8")) as { focus?: FocusInboundDetail[] }).focus ?? []) : [];

  const result = paths.map((path) => {
    const url = canonicalPageUrl(`https://miloosh.com${path}`) ?? path;
    const entry = inventory.pages.get(url);
    if (!entry) return { path, published: false };
    const protection = [...new Set(derivedUrls(inventory, url))].map((derived) => {
      const verdict = protectionFor(derived, snapshot);
      return { path: pathOf(derived), verdict: verdict.verdict, eligibleAfter: verdict.eligibleAfter, sources: verdict.reasons.map((r) => r.source) };
    });
    const products = entry.softwareSlugs.map((slug) => {
      const software = bySlug.get(slug)!;
      return {
        slug,
        priceLabelHold: held.has(slug),
        ...freshnessExpiry(software),
        sources: sourceTransparency(software),
        queryNameMatch: rows.length ? stripTop(queryNameMatch(rows, software.name)) : null,
      };
    });
    return {
      path,
      published: true,
      kind: entry.identity.kind,
      inSitemap: entry.inSitemap,
      qualityGate: entry.qualityGate,
      pageProtection: protection.find((p) => p.path === path)!.verdict,
      editableToday:
        protection.every((p) => p.verdict === "EDITABLE") && !products.some((p) => p.priceLabelHold),
      blockedBy: protection.filter((p) => p.verdict !== "EDITABLE"),
      products,
      inbound: focus.find((f) => f.path === path) ?? null,
    };
  });
  console.log(JSON.stringify({ checkoutSha: sha, today, queryRows: rows.length, result }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
