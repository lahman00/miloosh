import fs from "node:fs";
import path from "node:path";
import { getAllSoftware, getSoftware, type Software } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";
import { scoreFactualDepth, type FactualDepthRow } from "@/scripts/growth/factual-depth-audit";
import { readProtectedExperimentSlugs } from "@/scripts/growth/gsc-opportunity-miner";
import { isFrozenSlug, frozenCohortFor } from "@/data/growth/frozen-cohorts";

/**
 * GOOGLE INDEXATION FACTORY, WAVE 2 mission (2026-09-26) — a permanent,
 * reusable readiness check. Originally built as a standalone tool, distinct
 * from the separate `lib/google-war/quality.ts` system on the then-unmerged
 * codex/google-visibility-war-20260926 branch. The Master Google Domination
 * reconciliation (2026-09-26) merged that branch in and unified the two
 * systems' overlapping primitives (see data/growth/frozen-cohorts.ts, now
 * shared with lib/google-war/protection.ts, and countInboundLinks below,
 * which now prefers google-war's real rendered-HTML authority graph over
 * this tool's own cruder static count). This remains the simpler,
 * URL-level companion to growth:google-war's portfolio-level engine, per
 * that mission's own stated ideal model — not a competing source of truth.
 *
 * This measures MILOOSH'S OWN readiness for a page to be worth indexing —
 * it is explicitly NOT a prediction of whether Google will actually index
 * it. Google's own crawl budget, site-wide trust signals, and algorithm
 * are outside anything this repo can measure or control. A page can score
 * PASS here and still sit in Google's "Crawled - currently not indexed"
 * bucket for reasons this tool has no visibility into.
 */

export type ReadinessVerdict = "PASS" | "WARN" | "FAIL" | "PROTECTED";

export interface ReadinessReason {
  code: string;
  detail: string;
}

export interface ReadinessResult {
  slug: string;
  verdict: ReadinessVerdict;
  factualDepth: FactualDepthRow;
  inboundLinks: number;
  reasons: ReadinessReason[];
}

type AuthorityGraphRow = {
  path: string;
  relevantInboundLinks: number;
  orphan: boolean;
};

let authorityGraphCache: Map<string, AuthorityGraphRow> | null | undefined;

/**
 * Master Google Domination reconciliation (2026-09-26) — prefers
 * lib/google-war/graph.ts's real rendered-HTML authority graph
 * (var/growth/google-war/authority-graph.json, produced by
 * `npm run growth:google-war`) when it exists: it counts links actually
 * emitted in the built HTML, weighted by relevance, not just entries in
 * static data files. This is the same "rendered HTML wins over static
 * analysis" lesson the mission's own Part 8 (Pipedrive) and Part 5
 * (9 reversed orphans) findings established. Falls back to the cruder
 * static count (alternatives[]/PUBLISHED_COMPARISONS/guide decisions) when
 * no build has been run yet, so this tool stays usable standalone.
 */
function loadAuthorityGraph(root = process.cwd()): Map<string, AuthorityGraphRow> | null {
  if (authorityGraphCache !== undefined) return authorityGraphCache;
  const file = path.join(root, "var/growth/google-war/authority-graph.json");
  if (!fs.existsSync(file)) {
    authorityGraphCache = null;
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { rows?: AuthorityGraphRow[] };
    const map = new Map<string, AuthorityGraphRow>();
    for (const row of parsed.rows ?? []) map.set(row.path, row);
    authorityGraphCache = map;
    return map;
  } catch {
    authorityGraphCache = null;
    return null;
  }
}

function countInboundLinksStatic(slug: string, all: Software[]): number {
  let count = 0;
  for (const s of all) {
    for (const alt of s.alternatives) {
      if (alt.slug === slug) count++;
    }
  }
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    if (a === slug || b === slug) count++;
  }
  for (const guide of Object.values(ALTERNATIVE_GUIDES)) {
    for (const decision of guide.decisions) {
      if (decision.alternativeSlug === slug) count++;
    }
  }
  return count;
}

function countInboundLinks(slug: string, all: Software[]): number {
  const graph = loadAuthorityGraph();
  const row = graph?.get(`/software/${slug}`);
  if (row) return row.relevantInboundLinks;
  return countInboundLinksStatic(slug, all);
}

const STALE_PRICING_DAYS = 180;

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

export function assessIndexationReadiness(slug: string): ReadinessResult {
  const software = getSoftware(slug);
  if (!software) {
    return {
      slug,
      verdict: "FAIL",
      factualDepth: { slug, name: slug, score: 0, bucket: "D", breakdown: {} as FactualDepthRow["breakdown"], pricingLastVerified: null, accessedAt: "" },
      inboundLinks: 0,
      reasons: [{ code: "NOT_FOUND", detail: `No software entry for slug "${slug}".` }],
    };
  }

  const reasons: ReadinessReason[] = [];
  const protectedExperiments = readProtectedExperimentSlugs();
  const isExperimentProtected = protectedExperiments.has(slug);
  const isFrozen = isFrozenSlug(slug);

  if (isExperimentProtected || isFrozen) {
    if (isExperimentProtected) {
      reasons.push({ code: "ACTIVE_EXPERIMENT", detail: "Slug appears in a work-revenue-experiment-receipt-*.json entry with decision MEASURING, or the legacy protected cohort." });
    }
    if (isFrozen) {
      const cohort = frozenCohortFor(slug);
      reasons.push({ code: "FROZEN_COHORT", detail: `Slug is a measurement asset in data/growth/frozen-cohorts.ts, wave "${cohort?.wave}" — do not edit content or add new inbound links while frozen.` });
    }
    return { slug, verdict: "PROTECTED", factualDepth: scoreFactualDepth(software), inboundLinks: countInboundLinks(slug, getAllSoftware()), reasons };
  }

  const factualDepth = scoreFactualDepth(software);
  const inboundLinks = countInboundLinks(slug, getAllSoftware());

  // Technical indexability: this codebase has no per-page noindex/robots
  // override mechanism today (verified by its absence from data/software/
  // types.ts and app/software/[slug]/page.tsx's generateMetadata), so
  // every software page is technically indexable by default. This check
  // exists for when/if that changes, not because it currently does anything.
  const technicallyIndexable = true;

  if (factualDepth.bucket === "D") {
    reasons.push({ code: "FACTUAL_DEPTH_D", detail: `Factual depth score ${factualDepth.score}/100 (bucket D) — real, sourced facts (pricing, cons, sources) are seriously thin.` });
  }
  if (inboundLinks === 0) {
    reasons.push({ code: "NO_INTERNAL_DISCOVERY", detail: "Zero real inbound links from any alternatives[] mention, published comparison, or decision guide — nothing on the site points here." });
  }
  if (factualDepth.bucket === "D" || inboundLinks === 0) {
    return { slug, verdict: "FAIL", factualDepth, inboundLinks, reasons };
  }

  if (factualDepth.bucket === "C") {
    reasons.push({ code: "FACTUAL_DEPTH_C", detail: `Factual depth score ${factualDepth.score}/100 (bucket C) — has some real facts but real gaps remain.` });
  }
  if (inboundLinks > 0 && inboundLinks < 3) {
    reasons.push({ code: "WEAK_INTERNAL_DISCOVERY", detail: `Only ${inboundLinks} real inbound link(s) — thin discovery signal even though not zero.` });
  }
  const pricingAge = software.pricing?.lastVerified ? daysSince(software.pricing.lastVerified) : null;
  if (pricingAge !== null && pricingAge > STALE_PRICING_DAYS) {
    reasons.push({ code: "STALE_PRICING", detail: `Pricing last verified ${pricingAge} days ago (over the ${STALE_PRICING_DAYS}-day freshness bar).` });
  }
  if (!software.alternatives.length) {
    reasons.push({ code: "NO_ALTERNATIVES", detail: "No alternatives listed — undermines both differentiation and this product's own contribution to other pages' inbound links." });
  }

  if (reasons.length > 0) {
    return { slug, verdict: "WARN", factualDepth, inboundLinks, reasons };
  }

  reasons.push({ code: "READY", detail: `Factual depth ${factualDepth.bucket}, ${inboundLinks} real inbound links, technically indexable.` });
  void technicallyIndexable;
  return { slug, verdict: "PASS", factualDepth, inboundLinks, reasons };
}

export function buildIndexationReadinessReport(): ReadinessResult[] {
  return getAllSoftware()
    .map((s) => assessIndexationReadiness(s.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

async function main() {
  const report = buildIndexationReadinessReport();
  const counts = { PASS: 0, WARN: 0, FAIL: 0, PROTECTED: 0 };
  for (const r of report) counts[r.verdict]++;

  console.log("========================================================================================");
  console.log(` INDEXATION READINESS — ${report.length} software pages (Miloosh's own readiness, not a Google-indexing prediction)`);
  console.log("========================================================================================");
  console.log(`  PASS: ${counts.PASS}   WARN: ${counts.WARN}   FAIL: ${counts.FAIL}   PROTECTED: ${counts.PROTECTED}`);
  console.log("");
  console.log("  FAIL pages (real, fixable gaps):");
  for (const r of report.filter((r) => r.verdict === "FAIL")) {
    console.log(`    ${r.slug.padEnd(28)} ${r.reasons.map((x) => x.code).join(", ")}`);
  }
  console.log("========================================================================================\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
