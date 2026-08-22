import type { Software } from "@/data/software";
import { getAllSoftware, getSoftware } from "@/data/software";
import { getCategoryName } from "@/data/categories";
import { META_DESCRIPTION_MAX_LENGTH, truncateAtWord } from "@/lib/generators";
import { TREATMENT_COHORT } from "@/data/experiments/comparison-quality-cohort";

/**
 * Comparison engine backing /compare/[comparison] (Sprint 7). Built in
 * Sprint 3/4/6 ahead of routing; see docs/comparison-engine.md for the
 * curated-pairs policy (data/comparisons.ts) that decides which pairs
 * actually get a page.
 */

export type ComparisonRow = {
  label: string;
  a: string;
  b: string;
};

export type ComparisonData = {
  softwareA: Software;
  softwareB: Software;
  title: string;
  metaDescription: string;
  intro: string;
  rows: ComparisonRow[];
  keyDifferences: string[];
  whoShouldChooseA: string;
  whoShouldChooseB: string;
};

export function generateComparisonSlug(softwareA: Software, softwareB: Software): string {
  return `${softwareA.slug}-vs-${softwareB.slug}`;
}

/**
 * Splits a "/compare/[pair]" URL segment like "cal-com-vs-calendly" back
 * into two known software slugs. Tries every "-vs-" occurrence rather than
 * just the first, since slugs themselves can contain hyphens
 * (e.g. "microsoft-teams", "cal-com").
 */
export function parseComparisonSlug(pairSlug: string): { slugA: string; slugB: string } | null {
  const knownSlugs = new Set(getAllSoftware().map((software) => software.slug));
  const marker = "-vs-";
  let searchStart = 0;

  while (true) {
    const index = pairSlug.indexOf(marker, searchStart);
    if (index === -1) {
      return null;
    }

    const slugA = pairSlug.slice(0, index);
    const slugB = pairSlug.slice(index + marker.length);

    if (knownSlugs.has(slugA) && knownSlugs.has(slugB)) {
      return { slugA, slugB };
    }

    searchStart = index + 1;
  }
}

export function generateComparisonTitle(softwareA: Software, softwareB: Software): string {
  return `${softwareA.name} vs ${softwareB.name}`;
}

/**
 * Sprint 20 Phase 6 — grounded in each pair's real category data so 1,100+
 * comparison pages don't all share one boilerplate sentence differing only
 * by name (a real duplicate-intent/thin-snippet risk at that volume).
 * Avoids "a/an" agreement entirely by parenthesizing category names rather
 * than splicing them into a sentence.
 */
export function generateComparisonMetaDescription(
  softwareA: Software,
  softwareB: Software
): string {
  const categoryA = getCategoryName(softwareA.category);
  const categoryB = getCategoryName(softwareB.category);

  const full =
    categoryA === categoryB
      ? `${softwareA.name} and ${softwareB.name}, compared: real ${lowercaseForSentence(categoryA)} features and platforms from each vendor's own site.`
      : `${softwareA.name} (${categoryA}) vs ${softwareB.name} (${categoryB}) — real features and platforms, sourced from each vendor's own site.`;

  return truncateAtWord(full, META_DESCRIPTION_MAX_LENGTH);
}

/** Lowercases a category name for mid-sentence use, without mangling acronyms like "CRM". */
function lowercaseForSentence(name: string): string {
  return name === name.toUpperCase() ? name : name.toLowerCase();
}

/**
 * Second sentence is grounded in real per-product numbers (feature count,
 * platform count) rather than the fixed "Here's how they compare on
 * official platforms, features, and positioning" boilerplate that used to
 * be identical across all 1,107 comparison pages regardless of which pair
 * — a content-forensics pass (2026-08-10) found only 12 distinct intro
 * sentence shapes across the whole corpus and >0.5 word-overlap similarity
 * on 82% of comparison pairs sharing a product. Every product already has
 * `features` and `platforms` populated (validate:data enforces non-empty
 * arrays), so this has full coverage with no "Not yet documented" gap.
 */
function generateComparisonFactSentence(softwareA: Software, softwareB: Software): string {
  const platformsA = softwareA.platforms?.length ?? 0;
  const platformsB = softwareB.platforms?.length ?? 0;
  return `${softwareA.name} lists ${softwareA.features.length} features across ${platformsA} platform${platformsA === 1 ? "" : "s"}; ${softwareB.name} lists ${softwareB.features.length} features across ${platformsB} platform${platformsB === 1 ? "" : "s"} — see the full breakdown below, sourced from each vendor's own site rather than ratings or reviews.`;
}

/** Factual, grounded intro — states what's being compared and why, nothing evaluative. */
export function generateComparisonIntro(softwareA: Software, softwareB: Software): string {
  const categoryA = getCategoryName(softwareA.category);
  const categoryB = getCategoryName(softwareB.category);
  const categoryPhrase =
    categoryA === categoryB
      ? lowercaseForSentence(categoryA)
      : `tools people compare when choosing between ${lowercaseForSentence(categoryA)} and ${lowercaseForSentence(categoryB)}`;

  return `${softwareA.name} and ${softwareB.name} are both ${categoryPhrase} options. ${generateComparisonFactSentence(softwareA, softwareB)}`;
}

/**
 * "Pros" reuses each product's own stated features — real, sourced
 * capabilities, not editorial praise. There is no "cons" generator: this
 * dataset deliberately doesn't store unverified weaknesses (see
 * docs/content-engine.md), so instead of inventing them, every comparison
 * page shows an honest disclosure in place of a cons list.
 */
export function generateProsList(software: Software): string[] {
  return software.features;
}

export const CONS_DISCLOSURE =
  "We don't publish a \"cons\" list for either product. No vendor's official site documents its own product's weaknesses, so there's no sourced basis for one — and we'd rather say that plainly than invent one.";

/**
 * Grounded in the vendor's own stated positioning (best_for) — never an
 * independent editorial judgment. Presents best_for verbatim rather than
 * splicing it into a lowercase continuation: some entries' best_for text
 * starts with the product's own name (e.g. "HubSpot positions..."), and a
 * naive first-letter lowercase turns that into a broken word ("hubSpot").
 */
export function generateWhoShouldChoose(software: Software): string {
  return `Choose ${software.name} if this fits: ${software.bestFor}`;
}

/**
 * GOOGLE INDEXATION QUALITY WAR mission (2026-08-22) — real, evidenced gap
 * this closes: generateWhoShouldChoose() above is derived from a single
 * product's own data only, so its output is byte-identical across every
 * comparison page that product appears on, regardless of which competitor
 * it's being weighed against (e.g. "Choose Notion if this fits: ..." reads
 * the same on notion-vs-clickup and notion-vs-coda). That's a real,
 * concrete mechanism behind a prior finding (var/agents/latest-report.json,
 * content-comparison-similarity-analyzer, 2026-08-21): 74.9% of
 * shared-product comparison-page pairs exceed 50% Jaccard word-overlap.
 * That finding explicitly did NOT claim this causes non-indexation — it's
 * being tested as a hypothesis, not asserted as fact (see
 * data/experiments/comparison-quality-cohort.ts).
 *
 * This function makes the "who should choose" text genuinely pair-aware
 * WITHOUT inventing anything: it reuses the exact same real, already-
 * validated feature/platform data generateKeyDifferences() already
 * computes elsewhere on the same page, scoped to what's actually
 * distinctive about THIS side relative to the specific other product.
 * When no real difference exists (equal feature/platform sets — rare),
 * it falls back to the plain sentence rather than fabricate one.
 *
 * Applied ONLY to data/experiments/comparison-quality-cohort.ts's
 * TREATMENT_COHORT (20 pages, hand-selected by real evidence) —
 * generateComparisonData below still calls the plain, unchanged
 * generateWhoShouldChoose for every other comparison, including the
 * CONTROL_COHORT, so this is a true controlled experiment, not a
 * silent behavior change for all 1,212 pages.
 */
const PAIR_AWARE_FEATURE_HIGHLIGHT_CAP = 3;

export function generateWhoShouldChoosePairAware(software: Software, other: Software): string {
  const base = generateWhoShouldChoose(software);

  const uniqueFeatures = software.features.filter((f) => !other.features.includes(f));
  const uniquePlatforms = (software.platforms ?? []).filter((p) => !(other.platforms ?? []).includes(p));

  if (uniqueFeatures.length === 0 && uniquePlatforms.length === 0) return base;

  // Capped, not exhaustive: highlights a few concrete, real differences for
  // decision-making rather than dumping the entire feature-set difference
  // (which, for two products that barely overlap, would just restate one
  // side's whole feature list — not "decision-useful," just longer).
  const highlighted = uniqueFeatures.slice(0, PAIR_AWARE_FEATURE_HIGHLIGHT_CAP);
  const remaining = uniqueFeatures.length - highlighted.length;
  const featureClause = highlighted.length > 0
    ? `${formatList(highlighted)}${remaining > 0 ? `, and ${remaining} more feature${remaining === 1 ? "" : "s"}` : ""} that ${other.name} doesn't list`
    : null;
  const platformClause = uniquePlatforms.length > 0 ? `${formatList(uniquePlatforms)} support that ${other.name} doesn't list` : null;

  const clauses = [featureClause, platformClause].filter((c): c is string => c !== null);
  return `${base} Compared with ${other.name} specifically, ${software.name} also offers ${clauses.join(", plus ")}.`;
}

function formatList(values: string[] | undefined): string {
  return values && values.length > 0 ? values.join(", ") : "Not yet documented";
}

export function generateComparisonRows(softwareA: Software, softwareB: Software): ComparisonRow[] {
  const rows: ComparisonRow[] = [
    {
      label: "Category",
      a: getCategoryName(softwareA.category),
      b: getCategoryName(softwareB.category),
    },
    {
      label: "Alternatives tracked",
      a: String(softwareA.alternatives.length),
      b: String(softwareB.alternatives.length),
    },
    {
      label: "Platforms",
      a: formatList(softwareA.platforms),
      b: formatList(softwareB.platforms),
    },
  ];

  if (softwareA.pricing?.model || softwareB.pricing?.model) {
    rows.push({
      label: "Pricing model",
      a: softwareA.pricing?.model ?? "Not yet documented",
      b: softwareB.pricing?.model ?? "Not yet documented",
    });
  }

  return rows;
}

/**
 * Plain-language differences grounded only in fields both entries actually
 * have — a set difference on stated features/platforms, not an editorial
 * judgment about which product is "better."
 */
export function generateKeyDifferences(softwareA: Software, softwareB: Software): string[] {
  const differences: string[] = [];

  if (softwareA.category !== softwareB.category) {
    differences.push(
      `${softwareA.name} is categorized under ${getCategoryName(softwareA.category)}, while ${softwareB.name} is categorized under ${getCategoryName(softwareB.category)}.`
    );
  }

  const featuresOnlyInA = softwareA.features.filter((f) => !softwareB.features.includes(f));
  const featuresOnlyInB = softwareB.features.filter((f) => !softwareA.features.includes(f));

  if (featuresOnlyInA.length > 0) {
    differences.push(`${softwareA.name} lists ${formatList(featuresOnlyInA)} that ${softwareB.name} doesn't list.`);
  }
  if (featuresOnlyInB.length > 0) {
    differences.push(`${softwareB.name} lists ${formatList(featuresOnlyInB)} that ${softwareA.name} doesn't list.`);
  }

  const platformsA = new Set(softwareA.platforms ?? []);
  const platformsB = new Set(softwareB.platforms ?? []);
  const platformsOnlyInA = [...platformsA].filter((p) => !platformsB.has(p));
  const platformsOnlyInB = [...platformsB].filter((p) => !platformsA.has(p));

  if (platformsOnlyInA.length > 0) {
    differences.push(`${softwareA.name} supports ${formatList(platformsOnlyInA)}, which ${softwareB.name} doesn't list.`);
  }
  if (platformsOnlyInB.length > 0) {
    differences.push(`${softwareB.name} supports ${formatList(platformsOnlyInB)}, which ${softwareA.name} doesn't list.`);
  }

  return differences;
}

export function generateComparisonData(softwareA: Software, softwareB: Software): ComparisonData {
  // GOOGLE INDEXATION QUALITY WAR mission (2026-08-22) — the controlled
  // experiment gate. Only the 20 hand-selected TREATMENT_COHORT slugs get
  // the pair-aware whoShouldChoose text; every other comparison (including
  // the 20-page CONTROL_COHORT) keeps calling the exact same, unchanged
  // generateWhoShouldChoose it always has. See
  // data/experiments/comparison-quality-cohort.ts for the selection
  // methodology and hypothesis.
  const isTreatment = TREATMENT_COHORT.includes(generateComparisonSlug(softwareA, softwareB));

  return {
    softwareA,
    softwareB,
    title: generateComparisonTitle(softwareA, softwareB),
    metaDescription: generateComparisonMetaDescription(softwareA, softwareB),
    intro: generateComparisonIntro(softwareA, softwareB),
    rows: generateComparisonRows(softwareA, softwareB),
    keyDifferences: generateKeyDifferences(softwareA, softwareB),
    whoShouldChooseA: isTreatment ? generateWhoShouldChoosePairAware(softwareA, softwareB) : generateWhoShouldChoose(softwareA),
    whoShouldChooseB: isTreatment ? generateWhoShouldChoosePairAware(softwareB, softwareA) : generateWhoShouldChoose(softwareB),
  };
}

/** Full engine entry point: resolves a "/compare/[pair]" URL segment straight to ComparisonData, or null if either side is unknown. */
export function getComparisonBySlug(pairSlug: string): ComparisonData | null {
  const parsed = parseComparisonSlug(pairSlug);
  if (!parsed) {
    return null;
  }

  const softwareA = getSoftware(parsed.slugA);
  const softwareB = getSoftware(parsed.slugB);

  if (!softwareA || !softwareB) {
    return null;
  }

  return generateComparisonData(softwareA, softwareB);
}
