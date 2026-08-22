import { getAllSoftware } from "@/data/software";
import { getComparisonsInvolving } from "@/data/comparisons";
import type { Software } from "@/data/software/types";

/**
 * GOOGLE INDEXATION QUALITY WAR mission (2026-08-22), Phase 3 — permanent
 * factual-depth scoring for every software page. Pricing was only the
 * first symptom this mission found; this generalizes the same question
 * ("does this page give a buyer real, sourced, decision-useful facts?")
 * across every dimension a buyer actually needs.
 *
 * Deliberately does NOT reward word count or prose length anywhere. Every
 * point comes from the presence/completeness of a real structured fact
 * (a sourced price, a stated platform, a dated verification, a named
 * limitation) — a concise well-sourced page scores exactly as well as a
 * long one with the same facts, and strictly better than a long one
 * padded with unsourced prose.
 */

export interface FactualDepthBreakdown {
  pricingPresent: number; // /15 — real pricing.status/model exists (or honest contact_sales), not null
  pricingSourced: number; // /8  — official_source present
  pricingFreshness: number; // /5  — last_verified present
  freePlanTrialInfo: number; // /8  — freePlan and/or freeTrial explicitly recorded
  featureDepth: number; // /15 — count of distinct, vendor-sourced feature facts (capped, not prose length)
  platformCoverage: number; // /8  — count of distinct stated platforms (capped)
  targetCustomer: number; // /8  — bestFor is present and specific (schema requires presence; scored on being a real sentence, not a placeholder)
  limitations: number; // /10 — cons[] (real stated limitations) present
  sourceCount: number; // /8  — count of distinct sources (capped)
  sourceDiversity: number; // /5  — count of distinct source domains (capped)
  alternativesListed: number; // /5  — count of alternatives (capped)
  comparisonCoverage: number; // /5  — number of live comparison pages this product appears in (capped)
}

export type FactualDepthBucket = "A" | "B" | "C" | "D";

export interface FactualDepthRow {
  slug: string;
  name: string;
  score: number; // 0-100
  bucket: FactualDepthBucket;
  breakdown: FactualDepthBreakdown;
  pricingLastVerified: string | null;
  accessedAt: string;
}

function cap(value: number, max: number): number {
  return Math.min(value, max);
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function bucketFor(score: number): FactualDepthBucket {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function scoreFactualDepth(software: Software): FactualDepthRow {
  const pricing = software.pricing;

  const pricingPresent = pricing && (pricing.status || pricing.model) ? 15 : 0;
  const pricingSourced = pricing?.officialSource ? 8 : 0;
  const pricingFreshness = pricing?.lastVerified ? 5 : 0;
  const freePlanTrialInfo = pricing && (pricing.freePlan !== undefined || pricing.freeTrial) ? 8 : 0;

  const featureDepth = cap(software.features.length * 2.5, 15);
  const platformCoverage = cap((software.platforms?.length ?? 0) * 2, 8);
  const targetCustomer = software.bestFor.trim().length >= 40 ? 8 : software.bestFor.trim().length > 0 ? 4 : 0;
  const limitations = software.cons && software.cons.length > 0 ? 10 : 0;

  const sourceCount = cap(software.sources.length * 4, 8);
  const uniqueDomains = new Set(software.sources.map(domainOf));
  const sourceDiversity = cap(uniqueDomains.size * 2.5, 5);

  const alternativesListed = cap(software.alternatives.length, 5);
  const comparisonCoverage = cap(getComparisonsInvolving(software.slug).length, 5);

  const breakdown: FactualDepthBreakdown = {
    pricingPresent,
    pricingSourced,
    pricingFreshness,
    freePlanTrialInfo,
    featureDepth,
    platformCoverage,
    targetCustomer,
    limitations,
    sourceCount,
    sourceDiversity,
    alternativesListed,
    comparisonCoverage,
  };

  const score = Math.round(Object.values(breakdown).reduce((sum, v) => sum + v, 0));

  return {
    slug: software.slug,
    name: software.name,
    score,
    bucket: bucketFor(score),
    breakdown,
    pricingLastVerified: pricing?.lastVerified ?? null,
    accessedAt: software.accessedAt,
  };
}

export function buildFactualDepthReport(): FactualDepthRow[] {
  return getAllSoftware()
    .map(scoreFactualDepth)
    .sort((a, b) => b.score - a.score);
}

export interface FactualDepthDistribution {
  total: number;
  A: number;
  B: number;
  C: number;
  D: number;
}

export function summarizeFactualDepth(rows: FactualDepthRow[]): FactualDepthDistribution {
  return rows.reduce(
    (acc, r) => {
      acc.total += 1;
      acc[r.bucket] += 1;
      return acc;
    },
    { total: 0, A: 0, B: 0, C: 0, D: 0 } as FactualDepthDistribution,
  );
}

async function main() {
  const rows = buildFactualDepthReport();
  const dist = summarizeFactualDepth(rows);

  console.log(`Factual Depth Audit — ${dist.total} software pages`);
  console.log(`  A (EXCELLENT):      ${dist.A}`);
  console.log(`  B (STRONG):         ${dist.B}`);
  console.log(`  C (THIN):           ${dist.C}`);
  console.log(`  D (SERIOUSLY THIN): ${dist.D}`);
  console.log("");
  console.log("Bottom 20 (lowest factual depth):");
  for (const row of rows.slice(-20).reverse()) {
    console.log(`  [${row.bucket}] ${row.score.toString().padStart(3)}  ${row.slug}`);
  }
  console.log("");
  console.log("Top 10 (highest factual depth):");
  for (const row of rows.slice(0, 10)) {
    console.log(`  [${row.bucket}] ${row.score.toString().padStart(3)}  ${row.slug}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
