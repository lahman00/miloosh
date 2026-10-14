import { pathToFileURL } from "node:url";
import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { shouldSubmitComparisonToSitemap } from "@/data/seo/gsc-sitemap-comparison-cohort";
import { isComparisonIndexingReady, isSoftwareIndexingReady, getSoftwareIndexingQualityReasons } from "@/lib/indexing-quality";
import cohorts from "@/data/seo/template-cohorts.json";
import snapshot from "@/data/seo/priority-snapshot.json";

/**
 * Read-only early warning for legitimate 90-day evidence expiry.
 *
 * Deliberately does not edit verification dates, sitemap policy or content.
 * The historic GSC snapshot is for ordering a work queue, never for claiming
 * current search traffic or current Google indexing status.
 */
export function indexingFreshnessForecast(asOf: Date, daysAhead = 21) {
  if (Number.isNaN(asOf.getTime())) throw new Error("Invalid asOf date");
  if (!Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 365) throw new Error("daysAhead must be 1 to 365");
  const future = new Date(asOf.getTime() + daysAhead * 86_400_000);
  const products = getAllSoftware();
  const productsBySlug = new Map(products.map((p) => [p.slug, p]));
  const softwareNow = products.filter((p) => isSoftwareIndexingReady(p, asOf));
  const softwareFuture = products.filter((p) => isSoftwareIndexingReady(p, future));
  const comparisonsAt = (date: Date) => PUBLISHED_COMPARISONS.filter(([a, b]) => {
    const first = productsBySlug.get(a);
    const second = productsBySlug.get(b);
    return Boolean(
      first && second &&
      shouldSubmitComparisonToSitemap(getComparisonSlug(a, b)) &&
      isComparisonIndexingReady(first, second, date)
    );
  }).map(([a, b]) => getComparisonSlug(a, b));

  const comparisonNow = comparisonsAt(asOf);
  const comparisonFuture = comparisonsAt(future);
  const futureProductSlugs = new Set(softwareFuture.map((p) => p.slug));
  const historicRows = new Map(snapshot.rows.map((r) => [r.url, r]));

  const atRiskSoftware = softwareNow
    .filter((p) => !futureProductSlugs.has(p.slug))
    .map((p) => {
      const historical = historicRows.get(`/software/${p.slug}`);
      return {
        slug: p.slug,
        protectedUntil: Object.prototype.hasOwnProperty.call(cohorts.software.held, p.slug) ? cohorts.holdUntil : null,
        accessedAt: p.accessedAt,
        pricingVerifiedAt: p.pricing?.lastVerified ?? null,
        reasons: getSoftwareIndexingQualityReasons(p, future),
        historicalGscImpressions: historical?.impressions ?? 0,
        historicalGscClicks: historical?.clicks ?? 0,
      };
    })
    .sort((a, b) =>
      b.historicalGscClicks - a.historicalGscClicks ||
      b.historicalGscImpressions - a.historicalGscImpressions ||
      a.slug.localeCompare(b.slug)
    );

  const atRiskComparisons = comparisonNow.filter((slug) => !comparisonFuture.includes(slug));
  return {
    asOf: asOf.toISOString().slice(0, 10),
    forecastDate: future.toISOString().slice(0, 10),
    horizonDays: daysAhead,
    softwareCurrent: softwareNow.length,
    softwareProjected: softwareFuture.length,
    comparisonCurrent: comparisonNow.length,
    comparisonProjected: comparisonFuture.length,
    totalCandidateEntriesAtRisk: atRiskSoftware.length + atRiskComparisons.length,
    atRiskSoftware,
    atRiskComparisons,
    historicalGscSnapshot: {
      capturedAt: snapshot.sourceRunGeneratedAt,
      windowStart: snapshot.windowStartDate,
      windowEnd: snapshot.windowEndDate,
      notCurrentIndexingEvidence: true,
    },
  };
}

function main(argv: string[]) {
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i < 0 ? undefined : argv[i + 1];
  };
  const start = value("--as-of");
  if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error("--as-of must be YYYY-MM-DD");
  const asOf = start ? new Date(`${start}T12:00:00Z`) : new Date();
  const days = value("--days") ? Number(value("--days")) : 21;
  const report = indexingFreshnessForecast(asOf, days);
  if (argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`Miloosh indexing freshness — ${report.asOf} → ${report.forecastDate}`);
  console.log(`Software eligible for sitemap: ${report.softwareCurrent} → ${report.softwareProjected}`);
  console.log(`Comparisons eligible for sitemap: ${report.comparisonCurrent} → ${report.comparisonProjected}`);
  console.log(`At risk of falling out of sitemap without genuinely reverified evidence: ${report.totalCandidateEntriesAtRisk} URLs`);
  console.log(`  Software: ${report.atRiskSoftware.length} (held: ${report.atRiskSoftware.filter((p) => p.protectedUntil).length})`);
  console.log(`  Comparisons: ${report.atRiskComparisons.length}`);
  console.log(`Historic Search Console snapshot: ${report.historicalGscSnapshot.capturedAt}, NOT current indexing evidence`);
  console.log("Highest-priority source rechecks (historic impressions only):");
  for (const p of report.atRiskSoftware.slice(0, 20)) {
    console.log(`  ${p.slug}: ${p.historicalGscImpressions} historical impressions, ${p.historicalGscClicks} clicks; ${p.reasons.join(", ")}${p.protectedUntil ? `; protected until ${p.protectedUntil}` : ""}`);
  }
  console.log("No freshness or indexing flags were changed. Check official sources and protected-page holds before updating product facts.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
