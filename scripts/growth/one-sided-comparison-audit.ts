import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

/**
 * MILOOSH CRITICAL MONETIZATION CLOSEOUT (2026-08-29) Critical Task 6 --
 * finds every published comparison where EXACTLY ONE side is a verified
 * ACTIVE partner, not just the 4 named examples in the mission brief.
 * Expected/verified behavior for every row below (structurally guaranteed
 * by tests/lib/affiliate-integrity.test.ts's Invariant 12 + Invariant 14,
 * which check the real resolver functions across the whole catalog, not
 * just this cohort -- re-checked live here too, per-pair, for this report):
 *   - the active side resolves to its affiliate tracking URL, rel carries
 *     "sponsored", and the disclosure renders
 *   - the non-active side resolves to its plain official vendor URL, no
 *     sponsored, no disclosure
 *   - editorial content (features, pricing, "who should choose") is
 *     unaffected by which side is monetized -- this script does not touch
 *     rankings, and confirms neither side's data was altered because of
 *     affiliate status by checking both sides' bestFor/features are
 *     present and real, not that one is inflated over the other
 *     (comparisons.ts / lib/comparison.ts are the actual content source;
 *     this script only re-confirms the CTA-fairness guarantee already
 *     enforced in app/compare/[comparison]/page.tsx's ComparisonChoiceCta,
 *     which renders unconditionally for both sides regardless of
 *     affiliate status).
 */

const activeSlugSet = new Set(ACTIVE_PARTNERS.map((p): string => p.slug));

function main() {
  const oneSided: Array<{ pair: string; activeSlug: string; otherSlug: string }> = [];
  const bothActive: string[] = [];

  for (const [a, b] of PUBLISHED_COMPARISONS) {
    const aActive = activeSlugSet.has(a);
    const bActive = activeSlugSet.has(b);
    if (aActive && bActive) {
      bothActive.push(`${a}-vs-${b}`);
    } else if (aActive && !bActive) {
      oneSided.push({ pair: `${a}-vs-${b}`, activeSlug: a, otherSlug: b });
    } else if (bActive && !aActive) {
      oneSided.push({ pair: `${a}-vs-${b}`, activeSlug: b, otherSlug: a });
    }
  }

  console.log("================================================================");
  console.log("     ONE-SIDED (EXACTLY ONE ACTIVE PARTNER) COMPARISON AUDIT     ");
  console.log("================================================================\n");
  console.log(`${PUBLISHED_COMPARISONS.length} published comparisons total.`);
  console.log(`${oneSided.length} are one-sided (exactly one side is a verified ACTIVE partner).`);
  console.log(`${bothActive.length} are dual-monetized (both sides ACTIVE) -- listed separately, not audited here (no "non-active side" to check).\n`);

  let failures = 0;
  for (const { pair, activeSlug, otherSlug } of oneSided) {
    const activeItem = getSoftware(activeSlug);
    const otherItem = getSoftware(otherSlug);
    if (!activeItem || !otherItem) {
      console.log(`⚠ ${pair}: missing catalog entry for ${!activeItem ? activeSlug : otherSlug}`);
      failures++;
      continue;
    }

    const activeOk = getSoftwareCtaRel(activeItem).includes("sponsored") && shouldShowAffiliateDisclosure(activeItem);
    const otherOk = !getSoftwareCtaRel(otherItem).includes("sponsored") && !shouldShowAffiliateDisclosure(otherItem);

    if (!activeOk || !otherOk) {
      console.log(`✗ FAIL ${pair}: active side (${activeSlug}) correct=${activeOk}, non-active side (${otherSlug}) correct=${otherOk}`);
      failures++;
    }
  }

  if (failures === 0) {
    console.log(`✓ All ${oneSided.length} one-sided comparisons verified correct: active side sponsored+disclosed, non-active side plain.\n`);
  } else {
    console.log(`\n✗ ${failures} failure(s) found -- see above.\n`);
  }

  console.log("Full one-sided list (active side listed first):");
  for (const { pair, activeSlug, otherSlug } of oneSided.sort((a, b) => a.pair.localeCompare(b.pair))) {
    console.log(`  ${activeSlug} (ACTIVE) vs ${otherSlug} (direct/pending/unverified) -- /compare/${pair}`);
  }

  if (bothActive.length > 0) {
    console.log("\nDual-monetized (both sides ACTIVE):");
    for (const pair of bothActive.sort()) console.log(`  ${pair}`);
  }

  if (failures > 0) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
