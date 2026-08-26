import "../social/_load-env";
import { getAllSoftware } from "@/data/software";
import { getProductProfileFromEvidence } from "@/data/recommend/domain-evidence";

/**
 * Flippa Activation + Recommend Expansion Super-Mission (2026-08-21) —
 * Phase 11: a machine-derived, full (non-truncated) listing of every
 * CATALOG_ONLY product grouped by its real catalog category, as the
 * starting input for the domain-acceptance gate (Phase 12) — this report
 * only groups; it does not recommend which groups become domains.
 *
 * Use merged current domain evidence so later editorially verified
 * additions do not remain falsely listed as CATALOG_ONLY.
 */

function main() {
  const all = getAllSoftware();
  const byCategory: Record<string, string[]> = {};
  for (const s of all) {
    if (!getProductProfileFromEvidence(s.slug)) {
      byCategory[s.category] = byCategory[s.category] ?? [];
      byCategory[s.category].push(s.slug);
    }
  }
  for (const [cat, slugs] of Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${cat} (${slugs.length}): ${slugs.join(", ")}`);
  }
}

main();
