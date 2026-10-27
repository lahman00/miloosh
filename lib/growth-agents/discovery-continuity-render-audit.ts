import { normalizeRenderedHtml } from "./rendered-diff";

/**
 * Fail-closed proof for ONE change: the discovery-continuity repair (the sitemap and the software page's comparison links keep a
 * previously quality-admitted URL when only its valid-date age has gone stale). On the day it ships it must be a no-op for every
 * crawler-visible byte, so this proof is far stricter than the pricing and comparison-template proofs: it allows NO page to change.
 *
 * It passes only when two complete static builds, pinned to the exact 40-character base and head commits of clean checkouts, show that
 *   - both builds hold the same, complete page inventory (at least 1700 pages) and every normalized page is identical,
 *   - every page's head, canonical link, robots meta, JSON-LD blocks and anchor tags are identical (checked separately from the whole page),
 *   - sitemap.xml (every URL and lastmod) and robots.txt are present, non-trivial and identical,
 *   - the changed source files are exactly the reviewed fix files, and the shared CI and package files only gained the reviewed lines.
 * It is not a waiver of any gate or protection and cannot allow a content, price, link or canonical change.
 * Filesystem and Git access stay in the read-only adapter (guardian-sources.ts).
 */

export type DiscoveryContinuityRenderAudit = {
  kind: "DISCOVERY_CONTINUITY_FULL_STATIC_BUILD_AUDIT";
  ok: boolean;
  baseSha: string;
  headSha: string;
  pagesCompared: number;
  /** Pages whose normalized HTML differs. Must be 0 for the proof to pass. */
  changedPages: number;
  sitemapUrls: number;
  sitemapIdentical: boolean;
  robotsIdentical: boolean;
  changedFilesChecked: number;
  errors: string[];
};

export const DISCOVERY_MIN_PAGES = 1700;
// Exact public production sitemap inventory independently captured on 2026-10-27; this proof is scoped to that no-op release.
export const DISCOVERY_EXPECTED_SITEMAP_URLS = 693;
const FULL_SHA = /^[0-9a-f]{40}$/;

/** Exact files of the reviewed fix, shipped as the runtime change. No wildcard and no directory is allowed. */
export const DISCOVERY_RUNTIME_FILES: readonly string[] = [
  "app/sitemap.ts",
  "app/software/[slug]/page.tsx",
  "lib/discovery-continuity.ts",
  "data/seo/discovery-baseline.ts",
  "scripts/maintenance/seo.ts",
];

/** Exact reviewed supporting files of the fix (reports, sentinels, tests) and of this audit's own integration. */
export const DISCOVERY_SUPPORT_FILES: readonly string[] = [
  "data/seo/discovery-intentional-removals.ts",
  "lib/discovery-maintenance.ts",
  "scripts/seo/capture-discovery-baseline.ts",
  "scripts/seo/release-sentinel.ts",
  "scripts/seo/reverification-queue.ts",
  "tests/lib/discovery-continuity.test.ts",
  "tests/lib/sitemap.test.ts",
  "docs/mission/GOOGLE_DISCOVERY_STABILITY_20261027.md",
  "lib/growth-agents/discovery-continuity-render-audit.ts",
  "lib/growth-agents/guardian.ts",
  "lib/growth-agents/guardian-sources.ts",
  "lib/growth-agents/director-cli.ts",
  "scripts/growth/growth-director.ts",
  "tests/growth-agents/discovery-continuity-render-audit.test.ts",
  "tests/growth-agents/guardian.test.ts",
  "tests/growth-agents/director-cli.test.ts",
];

/**
 * Shared files that may change only by ADDING exactly the reviewed lines (a new script entry, a new read-only CI step).
 * Any removed line, or any added line that does not match, fails the proof. Patterns are anchored and exact.
 */
export const DISCOVERY_ADDITIVE_ONLY: Readonly<Record<string, readonly RegExp[]>> = {
  "package.json": [
    /^\s*"prebuild": "npm run seo:release-sentinel",?$/,
    /^\s*"seo:release-sentinel": "tsx scripts\/seo\/release-sentinel\.ts",?$/,
    /^\s*"seo:reverification-queue": "tsx scripts\/seo\/reverification-queue\.ts",?$/,
    /^\s*"seo:capture-discovery-baseline": "tsx scripts\/seo\/capture-discovery-baseline\.ts",?$/,
  ],
  ".github/workflows/ci.yml": [/^\s*$/, /^\s*- name: SEO discovery sentinel$/, /^\s*run: npm run seo:release-sentinel$/],
  ".agents/skills/miloosh-growth-director/references/run-book.md": [/^\| `--discovery-render-(base|candidate) <worktree>` \| .*\|$/],
  ".github/workflows/maintenance.yml": [/^\s*$/, /^\s*- name: Fact re-verification queue \(read-only report\)$/, /^\s*run: npm run seo:reverification-queue$/],
};

const EXACT_FILES = new Set<string>([...DISCOVERY_RUNTIME_FILES, ...DISCOVERY_SUPPORT_FILES, ...Object.keys(DISCOVERY_ADDITIVE_ONLY)]);

/** True only for a file this proof is allowed to cover. Exact string match: nothing is allowed by prefix or pattern. */
export function isDiscoveryContinuityFile(file: string): boolean {
  return EXACT_FILES.has(file);
}

/** Added (`+`) and removed (`-`) body lines of a unified diff, without the file headers. */
export function diffLines(diff: string): { added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added.push(line.slice(1));
    else if (line.startsWith("-")) removed.push(line.slice(1));
  }
  return { added, removed };
}

const tagsOf = (html: string, tag: string): string[] => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))].map((m) => m[0].replace(/\s+/g, " "));
const headOf = (html: string): string => normalizeRenderedHtml(/<head\b[^>]*>[\s\S]*?<\/head>/i.exec(html)?.[0] ?? "");
const jsonLdOf = (html: string): string[] =>
  [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)].map((m) => m[0].replace(/\s+/g, " "));
const canonicalsOf = (html: string): string[] => tagsOf(html, "link").filter((t) => /rel\s*=\s*["']canonical["']/i.test(t));
const robotsMetaOf = (html: string): string[] => tagsOf(html, "meta").filter((t) => /name\s*=\s*["']robots["']/i.test(t));

/** `<loc>` and `<lastmod>` pairs of a sitemap body, in file order. A url without lastmod keeps an empty lastmod. */
export function parseSitemapEntries(body: string): Array<{ loc: string; lastmod: string }> {
  return [...body.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)].map((m) => ({
    loc: /<loc>\s*([^<]*?)\s*<\/loc>/i.exec(m[1]!)?.[1] ?? "",
    lastmod: /<lastmod>\s*([^<]*?)\s*<\/lastmod>/i.exec(m[1]!)?.[1] ?? "",
  }));
}

const looksComplete = (html: string): boolean => /<html\b/i.test(html) && /<\/html>\s*$/i.test(html.trim()) && /<head\b/i.test(html) && /<body\b/i.test(html);

export function auditDiscoveryContinuityBuilds(input: {
  before: ReadonlyMap<string, string>;
  after: ReadonlyMap<string, string>;
  /** Raw route-handler outputs (.next/server/app/sitemap.xml.body and robots.txt.body); null when the file is missing. */
  beforeSitemap: string | null;
  afterSitemap: string | null;
  beforeRobots: string | null;
  afterRobots: string | null;
  baseCheckoutSha: string | null;
  candidateCheckoutSha: string | null;
  baseClean: boolean;
  candidateClean: boolean;
  baseSha: string;
  headSha: string;
  /** Files changed between base and head (committed). */
  changedFiles: readonly string[];
  /** Unified diffs of the additive-only shared files, keyed by path. */
  sharedFileDiffs: Readonly<Record<string, string>>;
}): DiscoveryContinuityRenderAudit {
  const errors: string[] = [];
  const { before, after } = input;

  if (!FULL_SHA.test(input.baseSha) || !FULL_SHA.test(input.headSha)) errors.push("Base and head must be full 40-character commit ids.");
  else if (input.baseSha === input.headSha) errors.push("Base and head are the same commit; there is no change to prove.");
  if (input.baseCheckoutSha !== input.baseSha) errors.push("The base build checkout is not at the exact base commit.");
  if (input.candidateCheckoutSha !== input.headSha) errors.push("The candidate build checkout is not at the exact head commit.");
  if (!input.baseClean || !input.candidateClean) errors.push("A build checkout has uncommitted source changes.");

  // Source scope: exact whitelist, shared files additive-only.
  if (input.changedFiles.length === 0) errors.push("No changed files were reported between base and head.");
  for (const file of input.changedFiles) {
    if (!isDiscoveryContinuityFile(file)) errors.push(`FILE_OUT_OF_SCOPE: ${file}`);
  }
  for (const [file, patterns] of Object.entries(DISCOVERY_ADDITIVE_ONLY)) {
    if (!input.changedFiles.includes(file)) continue;
    const diff = input.sharedFileDiffs[file];
    if (diff === undefined) {
      errors.push(`SHARED_FILE_DIFF_MISSING: ${file}`);
      continue;
    }
    const { added, removed } = diffLines(diff);
    if (added.length === 0 && removed.length === 0) errors.push(`SHARED_FILE_DIFF_EMPTY: ${file}`);
    for (const line of removed) errors.push(`SHARED_FILE_LINE_REMOVED: ${file}: ${line.trim().slice(0, 100)}`);
    for (const line of added) if (!patterns.some((p) => p.test(line))) errors.push(`SHARED_FILE_LINE_NOT_REVIEWED: ${file}: ${line.trim().slice(0, 100)}`);
  }

  // Inventory: complete, equal, and each page a whole document (an empty or truncated build must not look identical).
  if (before.size < DISCOVERY_MIN_PAGES) errors.push(`The base build has only ${before.size} pages; at least ${DISCOVERY_MIN_PAGES} are required.`);
  if (after.size < DISCOVERY_MIN_PAGES) errors.push(`The candidate build has only ${after.size} pages; at least ${DISCOVERY_MIN_PAGES} are required.`);
  for (const route of before.keys()) if (!after.has(route)) errors.push(`PAGE_DROPPED: ${route}`);
  for (const route of after.keys()) if (!before.has(route)) errors.push(`PAGE_ADDED: ${route}`);

  let changedPages = 0;
  for (const [route, old] of before) {
    const next = after.get(route);
    if (next === undefined) continue;
    if (!looksComplete(old) || !looksComplete(next)) {
      errors.push(`PAGE_INCOMPLETE: ${route}`);
      continue;
    }
    if (normalizeRenderedHtml(old) !== normalizeRenderedHtml(next)) {
      changedPages += 1;
      errors.push(`PAGE_CHANGED: ${route}`);
    }
    if (headOf(old) !== headOf(next)) errors.push(`HEAD_CHANGED: ${route}`);
    if (JSON.stringify(canonicalsOf(old)) !== JSON.stringify(canonicalsOf(next))) errors.push(`CANONICAL_CHANGED: ${route}`);
    if (JSON.stringify(robotsMetaOf(old)) !== JSON.stringify(robotsMetaOf(next))) errors.push(`ROBOTS_META_CHANGED: ${route}`);
    if (JSON.stringify(jsonLdOf(old)) !== JSON.stringify(jsonLdOf(next))) errors.push(`JSON_LD_CHANGED: ${route}`);
    if (JSON.stringify(tagsOf(old, "a")) !== JSON.stringify(tagsOf(next, "a"))) errors.push(`LINKS_CHANGED: ${route}`);
  }

  // Sitemap and robots: present, real, and byte-identical in content.
  let sitemapUrls = 0;
  let sitemapIdentical = false;
  if (input.beforeSitemap === null || input.afterSitemap === null) {
    errors.push("SITEMAP_MISSING: sitemap.xml.body is absent from a build.");
  } else {
    const a = parseSitemapEntries(input.beforeSitemap);
    const b = parseSitemapEntries(input.afterSitemap);
    sitemapUrls = Math.min(a.length, b.length);
    if (a.length !== DISCOVERY_EXPECTED_SITEMAP_URLS || b.length !== DISCOVERY_EXPECTED_SITEMAP_URLS) errors.push(`SITEMAP_COUNT_MISMATCH: ${a.length} before, ${b.length} after (exactly ${DISCOVERY_EXPECTED_SITEMAP_URLS} required for this release).`);
    if (a.some((e) => !e.loc) || b.some((e) => !e.loc)) errors.push("SITEMAP_UNREADABLE: an entry has no <loc>.");
    sitemapIdentical = input.beforeSitemap.trim() === input.afterSitemap.trim() && a.length === b.length && JSON.stringify(a) === JSON.stringify(b);
    if (!sitemapIdentical) {
      const bSet = new Set(b.map((e) => `${e.loc} ${e.lastmod}`));
      const aSet = new Set(a.map((e) => `${e.loc} ${e.lastmod}`));
      const dropped = a.filter((e) => !bSet.has(`${e.loc} ${e.lastmod}`));
      const added = b.filter((e) => !aSet.has(`${e.loc} ${e.lastmod}`));
      errors.push(`SITEMAP_CHANGED: ${dropped.length} entries dropped or re-dated, ${added.length} added or re-dated${dropped[0] ? `, e.g. ${dropped[0].loc}` : ""}.`);
    }
  }
  let robotsIdentical = false;
  if (input.beforeRobots === null || input.afterRobots === null) {
    errors.push("ROBOTS_MISSING: robots.txt.body is absent from a build.");
  } else if (!/user-agent/i.test(input.beforeRobots) || !/user-agent/i.test(input.afterRobots)) {
    errors.push("ROBOTS_UNREADABLE: robots.txt has no User-agent line.");
  } else {
    robotsIdentical = input.beforeRobots.trim() === input.afterRobots.trim();
    if (!robotsIdentical) errors.push("ROBOTS_CHANGED: robots.txt differs between the builds.");
  }

  return {
    kind: "DISCOVERY_CONTINUITY_FULL_STATIC_BUILD_AUDIT",
    ok: errors.length === 0,
    baseSha: input.baseSha,
    headSha: input.headSha,
    pagesCompared: [...before.keys()].filter((route) => after.has(route)).length,
    changedPages,
    sitemapUrls,
    sitemapIdentical,
    robotsIdentical,
    changedFilesChecked: input.changedFiles.length,
    errors,
  };
}
