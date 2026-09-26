import "../social/_load-env";
import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { getAllCategories } from "@/data/categories";
import { getSoftwareByCategory } from "@/lib/related";
import { ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";

/**
 * Growth War Room mission (2026-08-21) — Phase 7. `scripts/report-
 * internal-links.ts` only counts two real link sources (a product's
 * `alternatives` array, and PUBLISHED_COMPARISONS pairings) — it does
 * NOT count the AlternativeDecisionGuide component's real rendered links
 * (each guide entry adds 3 "Explore {product}" + 3 "Open comparison"
 * links) or the category/comparison → /recommend CTA links added in the
 * prior mission. This doesn't replace that report (kept as-is,
 * unchanged, still useful for its own original purpose) — it adds the
 * missing sources rather than guessing at what changed.
 */
function main() {
  const all = getAllSoftware();
  const categories = getAllCategories();

  // Original two sources, reproduced here so the totals are complete.
  const inboundSoftware = new Map<string, number>();
  for (const s of all) inboundSoftware.set(s.slug, 0);
  for (const s of all) {
    for (const alt of s.alternatives) {
      inboundSoftware.set(alt.slug, (inboundSoftware.get(alt.slug) ?? 0) + 1);
    }
  }
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    inboundSoftware.set(a, (inboundSoftware.get(a) ?? 0) + 1);
    inboundSoftware.set(b, (inboundSoftware.get(b) ?? 0) + 1);
  }

  // New source: AlternativeDecisionGuide's real rendered decision links —
  // each entry's 3 decisions each render one /software/{slug} link and
  // one /compare/{slug} link (components/AlternativeDecisionGuide.tsx).
  let guideProductLinks = 0;
  let guideComparisonLinks = 0;
  for (const guide of Object.values(ALTERNATIVE_GUIDES)) {
    for (const decision of guide.decisions) {
      inboundSoftware.set(decision.alternativeSlug, (inboundSoftware.get(decision.alternativeSlug) ?? 0) + 1);
      guideProductLinks++;
      guideComparisonLinks++; // the /compare/{slug} link is a separate inbound edge to a comparison page, not counted in inboundSoftware
    }
  }

  // New source: category page -> /recommend CTA, gated to categories with >3 products (app/category/[slug]/page.tsx).
  const categoriesWithRecommendCta = categories.filter((c) => getSoftwareByCategory(c.slug).length > 3).length;

  // New source: every comparison page -> /recommend CTA (app/compare/[comparison]/page.tsx, unconditional).
  const comparisonPagesWithRecommendCta = PUBLISHED_COMPARISONS.length;

  const totalNewRecommendLinks = categoriesWithRecommendCta + comparisonPagesWithRecommendCta;

  console.log(`Internal link graph v2 — sources report-internal-links.ts misses:\n`);
  console.log(`AlternativeDecisionGuide entries: ${Object.keys(ALTERNATIVE_GUIDES).length}`);
  console.log(`  -> real "Explore {product}" links added:    ${guideProductLinks}`);
  console.log(`  -> real "Open comparison" links added:      ${guideComparisonLinks}`);
  console.log(`\n/recommend discovery links:`);
  console.log(`  Category pages with the CTA (>3 products):  ${categoriesWithRecommendCta} / ${categories.length}`);
  console.log(`  Comparison pages with the CTA (all):        ${comparisonPagesWithRecommendCta} / ${PUBLISHED_COMPARISONS.length}`);
  console.log(`  Total new inbound links to /recommend:      ${totalNewRecommendLinks}`);

  const combined = all
    .map((s) => ({ slug: s.slug, total: inboundSoftware.get(s.slug) ?? 0 }))
    .sort((a, b) => b.total - a.total);
  const orphans = combined.filter((r) => r.total === 0);
  console.log(`\nZero contextual references (alternatives + comparisons + decision guides): ${orphans.length}. NOT true orphans: category/hub HTML is excluded here. Run growth:google-war for the rendered graph.`);
  console.log(`Top 10 most-linked products (combined):`);
  for (const r of combined.slice(0, 10)) console.log(`  ${r.slug}: ${r.total}`);
}

main();
