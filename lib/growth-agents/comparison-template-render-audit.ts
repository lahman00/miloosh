import hold from "@/data/seo/price-label-hold.json";
import { COMPARISON_V2_WAVE } from "@/data/seo/comparison-waves";
import { normalizeRenderedHtml } from "./rendered-diff";
import { protectionFor, type ProtectionSnapshot } from "./protection";

/**
 * Fail-closed proof for ONE change: the v2 comparison template (verdict card, pricing table, sourced pros and cons)
 * applied to a fixed wave of editable comparison pages, together with the data corrections that feed them.
 *
 * It is not a general shared-component waiver. It passes only when two complete static builds, pinned to the exact base and
 * head commits of clean checkouts, show that
 *   - every page that is not EDITABLE (protected, observed, in flight, unknown) and every held profile is identical,
 *   - the only pages that changed are the wave pages and pages that render a changed product (plus the pricing index),
 *   - every changed page is EDITABLE and keeps its SEO header,
 *   - no link was removed or altered on any changed page, and a link added to a wave page is never an affiliate link.
 * Filesystem and Git access stay in the read-only adapter (guardian-sources.ts).
 */

export type ComparisonTemplateRenderAudit = {
  kind: "COMPARISON_TEMPLATE_V2_FULL_STATIC_BUILD_AUDIT";
  ok: boolean;
  baseSha: string;
  headSha: string;
  pagesCompared: number;
  nonEditablePagesUnchanged: number;
  heldProfilesUnchanged: number;
  changedPages: number;
  wavePagesChanged: string[];
  derivedPagesChanged: string[];
  errors: string[];
};

/** Pages that aggregate the whole catalog and therefore change when any product record changes. */
export const CATALOG_AGGREGATE_ROUTES: readonly string[] = ["research/saas-pricing-pressure-index-2026.html"];

export function routeToUrl(route: string): string {
  const stem = route.replace(/\.html$/, "");
  return stem === "index" ? "https://miloosh.com/" : `https://miloosh.com/${stem}`;
}

const tags = (html: string, tag: string): string[] => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))].map((m) => m[0].replace(/\s+/g, " "));
const headOf = (html: string): string => normalizeRenderedHtml(/<head\b[^>]*>[\s\S]*?<\/head>/i.exec(html)?.[0] ?? "");

export function auditComparisonTemplateBuilds(input: {
  before: ReadonlyMap<string, string>;
  after: ReadonlyMap<string, string>;
  baseCheckoutSha: string | null;
  candidateCheckoutSha: string | null;
  baseClean: boolean;
  candidateClean: boolean;
  baseSha: string;
  headSha: string;
  protection: ProtectionSnapshot;
  /** Comparison slugs the template change is gated to. */
  waveSlugs: readonly string[];
  /** Routes (e.g. "software/callrail.html") that render a product whose data file changed. */
  derivedRoutes: ReadonlySet<string>;
}): ComparisonTemplateRenderAudit {
  const errors: string[] = [];
  const { before, after } = input;
  const waveRoutes = new Set(input.waveSlugs.map((slug) => `compare/${slug}.html`));
  const allowedDerived = new Set([...input.derivedRoutes, ...CATALOG_AGGREGATE_ROUTES]);
  const heldProfiles = new Set(hold.heldSoftware);

  if (input.baseCheckoutSha !== input.baseSha || input.candidateCheckoutSha !== input.headSha) errors.push("Build checkout SHA does not match Guardian base and HEAD.");
  if (!input.baseClean || !input.candidateClean) errors.push("A build checkout has uncommitted source changes.");
  if (input.protection.checkoutSha !== input.headSha) errors.push("The protection snapshot is not for the current checkout.");
  if (input.waveSlugs.length === 0) errors.push("The wave list is empty.");
  if (before.size < 1700 || after.size !== before.size || [...before.keys()].some((route) => !after.has(route))) errors.push("The full static page inventory differs or is too small.");
  for (const route of waveRoutes) if (!after.has(route)) errors.push(`WAVE_PAGE_NOT_IN_BUILD: ${route}`);
  for (const slug of input.waveSlugs) {
    const verdict = protectionFor(routeToUrl(`compare/${slug}.html`), input.protection).verdict;
    if (verdict !== "EDITABLE") errors.push(`WAVE_PAGE_NOT_EDITABLE: ${slug} (${verdict})`);
  }

  let nonEditableUnchanged = 0;
  let heldProfilesUnchanged = 0;
  let changedPages = 0;
  const waveChanged: string[] = [];
  const derivedChanged: string[] = [];

  for (const [route, old] of before) {
    const next = after.get(route);
    if (next === undefined) continue;
    const same = normalizeRenderedHtml(old) === normalizeRenderedHtml(next);
    const verdict = protectionFor(routeToUrl(route), input.protection).verdict;
    const profile = /^software\/([a-z0-9-]+)\.html$/.exec(route)?.[1];
    const held = verdict !== "EDITABLE" || (profile !== undefined && heldProfiles.has(profile));
    if (held) {
      if (!same) errors.push(`HELD_PAGE_CHANGED: ${route} (${verdict})`);
      else {
        nonEditableUnchanged += 1;
        if (profile !== undefined && heldProfiles.has(profile)) heldProfilesUnchanged += 1;
      }
    }
    if (same) continue;
    changedPages += 1;
    const isWave = waveRoutes.has(route);
    if (isWave) waveChanged.push(route);
    else if (allowedDerived.has(route)) derivedChanged.push(route);
    else errors.push(`UNEXPECTED_RENDERED_CHANGE: ${route}`);

    if (headOf(old) !== headOf(next)) errors.push(`SEO_HEADER_CHANGED: ${route}`);
    const oldLinks = tags(old, "a");
    const newLinks = tags(next, "a");
    const remaining = [...newLinks];
    for (const link of oldLinks) {
      const at = remaining.indexOf(link);
      if (at === -1) errors.push(`LINK_REMOVED_OR_ALTERED: ${route}: ${link.slice(0, 120)}`);
      else remaining.splice(at, 1);
    }
    for (const added of remaining) {
      if (!isWave) errors.push(`LINK_ADDED_OUTSIDE_WAVE: ${route}: ${added.slice(0, 120)}`);
      else if (/sponsored/i.test(added)) errors.push(`AFFILIATE_LINK_ADDED: ${route}: ${added.slice(0, 120)}`);
    }
    if (JSON.stringify(tags(old, "button")) !== JSON.stringify(tags(next, "button"))) errors.push(`BUTTON_ATTRIBUTES_CHANGED: ${route}`);
  }
  for (const route of waveRoutes) if (!waveChanged.includes(route)) errors.push(`WAVE_PAGE_UNCHANGED: ${route}`);
  if (nonEditableUnchanged < 130) errors.push("Too few protected, observed or held pages were directly compared.");
  if (heldProfilesUnchanged < 130) errors.push("Too few held profiles were directly compared.");
  if (changedPages > waveRoutes.size + allowedDerived.size) errors.push("More pages changed than the reviewed scope allows.");

  return {
    kind: "COMPARISON_TEMPLATE_V2_FULL_STATIC_BUILD_AUDIT",
    ok: errors.length === 0,
    baseSha: input.baseSha,
    headSha: input.headSha,
    pagesCompared: before.size,
    nonEditablePagesUnchanged: nonEditableUnchanged,
    heldProfilesUnchanged,
    changedPages,
    wavePagesChanged: waveChanged.sort(),
    derivedPagesChanged: derivedChanged.sort(),
    errors,
  };
}

/** Product records the wave's pricing figures come from. A change to any other product record is outside this proof. */
export const COMPARISON_TEMPLATE_REVIEWED_PRODUCTS: readonly string[] = [
  "apollo-io", "callrail", "cognism", "dialpad", "krispcall", "linkedin-sales-navigator",
  "nextiva", "outreach", "ruler-analytics", "salesloft", "whatconverts",
];

const COMPARISON_TEMPLATE_FILES = new Set([
  // The shared template files this proof covers. No other shared input file is on this list.
  "app/compare/[comparison]/page.tsx",
  "components/ComparisonPricingTable.tsx",
  "components/ComparisonVerdictCard.tsx",
  "lib/comparison-v2.ts",
  "data/seo/comparison-waves.ts",
  "data/seo/comparison-verdicts.ts",
  "tests/seo/comparison-waves.test.ts",
  // Read-only tooling shipped in the same PR.
  "lib/growth/funnel-by-landing.ts",
  "scripts/growth/first-party-funnel.ts",
  "scripts/growth/opportunity-matrix.ts",
  "tests/growth/funnel-by-landing.test.ts",
  "package.json",
  ".agents/skills/miloosh-growth-director/references/run-book.md",
  // The Guardian extension itself.
  "lib/growth-agents/comparison-template-render-audit.ts",
  "lib/growth-agents/guardian.ts",
  "lib/growth-agents/guardian-sources.ts",
  "lib/growth-agents/director-cli.ts",
  "scripts/growth/growth-director.ts",
  "tests/growth-agents/comparison-template-render-audit.test.ts",
  "tests/growth-agents/guardian.test.ts",
  "tests/growth-agents/director-cli.test.ts",
]);

export const COMPARISON_TEMPLATE_WAVE_SIZE = COMPARISON_V2_WAVE.length;

/** True for a changed file this proof is allowed to cover. Anything else makes the proof fail. */
export function isComparisonTemplateFile(file: string): boolean {
  if (COMPARISON_TEMPLATE_FILES.has(file)) return true;
  if (file.startsWith("docs/growth/receipts/20261019-first-revenue-engine/")) return true;
  const product = /^data\/software\/([a-z0-9-]+)\.json$/.exec(file)?.[1];
  return product !== undefined && COMPARISON_TEMPLATE_REVIEWED_PRODUCTS.includes(product);
}
