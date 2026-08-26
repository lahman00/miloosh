import "../social/_load-env";
import { getAllSoftware } from "@/data/software";
import { getProductProfileFromEvidence } from "@/data/recommend/domain-evidence";
import { RECOMMEND_DOMAINS } from "@/lib/recommend/domains";

/**
 * Recommend Engine Rebuild (2026-08-21) — Phase 18 of the rebuild brief:
 * a machine-derived coverage report classifying every catalog product.
 * This is a QA/visibility tool, explicitly NOT a mandate to force every
 * product into Recommend — a CATALOG_ONLY classification is a legitimate,
 * honest outcome for a product with no domain evidence (e.g. a CMS or
 * API-infra tool), not a gap demanding action.
 *
 * Runtime eligibility can gain later evidence-backed additions after the
 * original profile authoring pass, so this report reads the merged domain
 * evidence source rather than the historical base profile table alone.
 *
 * Usage: npx tsx --env-file=.env.local scripts/recommend/coverage-report.ts
 */

type Classification = "RECOMMEND_ELIGIBLE" | "CATALOG_ONLY";

function main() {
  const all = getAllSoftware();
  const byCategory: Record<string, number> = {};
  let eligible = 0;
  let catalogOnly = 0;
  const catalogOnlySlugs: string[] = [];

  for (const software of all) {
    const profile = getProductProfileFromEvidence(software.slug);
    const classification: Classification = profile ? "RECOMMEND_ELIGIBLE" : "CATALOG_ONLY";
    if (classification === "RECOMMEND_ELIGIBLE") eligible++;
    else {
      catalogOnly++;
      catalogOnlySlugs.push(software.slug);
    }
    byCategory[software.category] = byCategory[software.category] ?? 0;
  }

  console.log(`Recommend coverage — ${all.length} catalog products total`);
  console.log(`  RECOMMEND_ELIGIBLE: ${eligible}`);
  console.log(`  CATALOG_ONLY (no domain evidence — legitimate, not a gap): ${catalogOnly}`);
  console.log();

  console.log("Products per domain:");
  for (const domain of RECOMMEND_DOMAINS) {
    const count = all.filter((s) => getProductProfileFromEvidence(s.slug)?.domains.includes(domain)).length;
    console.log(`  ${domain}: ${count}`);
  }
  console.log();

  const catalogOnlyByCategory: Record<string, string[]> = {};
  for (const slug of catalogOnlySlugs) {
    const software = all.find((s) => s.slug === slug)!;
    catalogOnlyByCategory[software.category] = catalogOnlyByCategory[software.category] ?? [];
    catalogOnlyByCategory[software.category]!.push(slug);
  }
  console.log("CATALOG_ONLY products by category (candidates for a future domain, not a current defect):");
  for (const [category, slugs] of Object.entries(catalogOnlyByCategory).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${category} (${slugs.length}): ${slugs.slice(0, 8).join(", ")}${slugs.length > 8 ? ", ..." : ""}`);
  }

  // Suspicious dominance check (Phase 19): any product recommended for
  // more than one domain is worth a human glance, even though it isn't
  // automatically wrong (a handful of real products do span domains).
  const multiDomain = all
    .map((s) => ({ slug: s.slug, domains: getProductProfileFromEvidence(s.slug)?.domains ?? [] }))
    .filter((p) => p.domains.length > 1);
  console.log(`\nProducts eligible for more than one domain: ${multiDomain.length}`);
  for (const p of multiDomain) console.log(`  ${p.slug}: ${p.domains.join(", ")}`);
}

main();
