import { getAllSoftware, type Software } from "@/data/software";
import { getAllCategories, type Category } from "@/data/categories";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import type { CategoryMoneyMapRow } from "./types";
import { HEURISTIC_TRAFFIC_SIGNAL } from "./comparison-graph";
import { computeMonetizationGaps } from "./monetization-gaps";

/**
 * Static category opportunity map. The `impressions` field on each row is
 * HEURISTIC_TRAFFIC_SIGNAL, a hand-curated relative-priority number -- NOT
 * an authenticated Search Console measurement (see
 * lib/growth-audit/comparison-graph.ts for what it actually is and where
 * real GSC data lives instead). Clicks and positions are UNKNOWN unless
 * explicitly supplied by the caller -- never fabricated. Affiliate status
 * is derived through computeMonetizationGaps(), which in turn uses current
 * affiliate relationship truth rather than hard-coded queues.
 */
export function computeCategoryMoneyMap(
  categories: Category[] = getAllCategories(),
  software: Software[] = getAllSoftware(),
  pendingSlugs?: Set<string>,
  heuristicSignalBySlug: Record<string, number> = HEURISTIC_TRAFFIC_SIGNAL,
  gscClicks: Record<string, number> = {},
  gscPositions: Record<string, number> = {}
): CategoryMoneyMapRow[] {
  const gapRows = computeMonetizationGaps(software, pendingSlugs, undefined, undefined, heuristicSignalBySlug);
  const statusBySlug = new Map(gapRows.map((row) => [row.slug, row.statusGroup]));

  return categories.map((category) => {
    const products = software.filter((softwareEntry) => softwareEntry.category === category.slug);
    const productSlugs = new Set(products.map((softwareEntry) => softwareEntry.slug));
    const intraCategoryComparisons = PUBLISHED_COMPARISONS.filter(([a, b]) => productSlugs.has(a) && productSlugs.has(b)).length;
    const maxPossibleComparisons = (products.length * (products.length - 1)) / 2;
    const density = maxPossibleComparisons > 0 ? (intraCategoryComparisons / maxPossibleComparisons) * 100 : 0;

    let totalImpressions = 0;
    let totalClicks = 0;
    let weightedPositionSum = 0;
    let positionedImpressions = 0;

    for (const product of products) {
      const impressions = heuristicSignalBySlug[product.slug] ?? 0;
      const clicks = gscClicks[product.slug] ?? 0;
      const position = gscPositions[product.slug] ?? null;

      totalImpressions += impressions;
      totalClicks += clicks;
      if (position !== null && impressions > 0) {
        weightedPositionSum += position * impressions;
        positionedImpressions += impressions;
      }
    }

    const avgPosition = positionedImpressions > 0 ? weightedPositionSum / positionedImpressions : null;
    const ctrPct = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    const activeProducts = products.filter((product) => statusBySlug.get(product.slug) === "A");
    const pendingProducts = products.filter((product) => statusBySlug.get(product.slug) === "B");
    const viableProducts = products.filter((product) => statusBySlug.get(product.slug) === "C");

    const affiliateCoveragePct = products.length > 0 ? (activeProducts.length / products.length) * 100 : 0;

    let activeImpressions = 0;
    let activeClicks = 0;
    for (const activeProduct of activeProducts) {
      activeImpressions += heuristicSignalBySlug[activeProduct.slug] ?? 0;
      activeClicks += gscClicks[activeProduct.slug] ?? 0;
    }

    const currentValueScore = Math.min(100, Math.round(
      (activeProducts.length * 15) +
      (activeClicks * 25) +
      Math.min(30, Math.log10(activeImpressions + 1) * 12) +
      (affiliateCoveragePct * 0.3)
    ));

    const highIntentCategories = ["crm", "customer-support", "marketing", "ecommerce", "accounting", "field-service-management", "security"];
    const categoryWeight = highIntentCategories.includes(category.slug) ? 1.2 : 1.0;
    const unmonetizedImpressions = Math.max(0, totalImpressions - activeImpressions);
    const untappedValueScore = Math.min(100, Math.round(
      (
        Math.min(45, Math.log10(unmonetizedImpressions + 1) * 13) +
        pendingProducts.length * 10 +
        viableProducts.length * 4 +
        products.length * 1.5
      ) * categoryWeight
    ));

    return {
      slug: category.slug,
      name: category.name,
      productCount: products.length,
      comparisonCount: intraCategoryComparisons,
      comparisonDensityPct: Math.round(density * 10) / 10,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctrPct: Math.round(ctrPct * 100) / 100,
      avgPosition: avgPosition !== null ? Math.round(avgPosition * 10) / 10 : null,
      activeAffiliatesCount: activeProducts.length,
      pendingAffiliatesCount: pendingProducts.length,
      viableAffiliatesCount: viableProducts.length,
      affiliateCoveragePct: Math.round(affiliateCoveragePct * 10) / 10,
      currentValueScore,
      untappedValueScore,
    };
  }).sort((a, b) => b.untappedValueScore - a.untappedValueScore || b.impressions - a.impressions);
}
