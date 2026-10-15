import { isNoindex, type PageFacts } from "./page-facts";

/**
 * Rules the built site must satisfy, checked on the HTML Next.js actually
 * prerendered, not on the source that produced it. Each check is pure and
 * returns the evidence it used, so a failure names the pages.
 */

export type CheckStatus = "PASS" | "FAIL" | "INFO";

export type CheckResult = {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  /** How many pages, links or entries the finding covers. */
  count: number;
  /** The first few offending items, for the console. */
  examples: string[];
  /** Every offending item, for a report file. */
  items: string[];
};

export type SiteModel = {
  /** Canonical origin, for example "https://miloosh.com". */
  siteUrl: string;
  /** Every prerendered, publicly routable page keyed by its path ("/", "/software/pipedrive"). */
  pages: ReadonlyMap<string, PageFacts>;
  sitemapPaths: ReadonlySet<string>;
  /** Permanent redirects of the app: source path to destination path. */
  redirects: ReadonlyMap<string, string>;
  /** A page that exists as a route without being prerendered (for example "/recommend"). */
  isStaticRoute(path: string): boolean;
  /** A file served from public/ or a Next.js convention route (icons, feeds, robots). */
  isPublicAsset(path: string): boolean;
  /** Why an indexable page may stay out of the sitemap by deliberate policy, or null when nothing explains it. */
  explainExclusion(path: string): string | null;
  /** Why a page that nothing links to may stay indexable for now (for example, it is under protection until a date), or null. */
  explainDeferral(path: string): string | null;
  /** For a software profile path: whether it may use the v2 profile template. Null when the path is not a profile. */
  isProfileTemplateV2(path: string): boolean | null;
  /** For a comparison path: whether it may use the v2 comparison template. Null when the path is not a comparison. */
  isComparisonTemplateV2(path: string): boolean | null;
};

const MAX_EXAMPLES = 6;
const sample = (items: readonly string[]): string[] => items.slice(0, MAX_EXAMPLES);

/** The path of an internal link, without query, fragment or trailing slash; null when the link leaves the site. */
export function internalPath(href: string, siteUrl: string): string | null {
  let rest = href.trim();
  const origins = [siteUrl, siteUrl.replace("://", "://www.")];
  for (const origin of origins) if (rest === origin || rest.startsWith(`${origin}/`) || rest.startsWith(`${origin}?`) || rest.startsWith(`${origin}#`)) rest = rest.slice(origin.length) || "/";
  if (!rest.startsWith("/") || rest.startsWith("//")) return null;
  const path = rest.split("#")[0]!.split("?")[0]!;
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : "/";
}

const indexable = (page: PageFacts): boolean => !isNoindex(page);

function result(id: string, title: string, failures: readonly string[], passDetail: string, failDetail: string, count = failures.length): CheckResult {
  return failures.length === 0
    ? { id, title, status: "PASS", detail: passDetail, count: 0, examples: [], items: [] }
    : { id, title, status: "FAIL", detail: failDetail, count, examples: sample(failures), items: [...failures] };
}

/** Every page carries the same "N tools across M categories · sources last verified D" line. */
export function checkFooterConsistency(model: SiteModel): CheckResult {
  const lines = new Map<string, string[]>();
  const missing: string[] = [];
  for (const page of model.pages.values()) {
    if (!page.footerLine) missing.push(page.path);
    else lines.set(page.footerLine, [...(lines.get(page.footerLine) ?? []), page.path]);
  }
  const problems: string[] = [];
  if (missing.length > 0) problems.push(`${missing.length} page(s) have no footer line, for example ${sample(missing).join(", ")}`);
  if (lines.size > 1) problems.push(...[...lines].map(([line, paths]) => `${paths.length} page(s) say "${line}", for example ${paths[0]}`));
  return result(
    "footer-consistency",
    "All pages report the same tool count, category count and verification date",
    problems,
    `${model.pages.size} pages share one footer line: ${[...lines.keys()][0] ?? "none"}.`,
    `${lines.size} different footer lines, ${missing.length} pages without one.`,
    lines.size > 1 ? lines.size : missing.length,
  );
}

/** Every internal link lands on a page, a route, a file or a configured redirect. */
export function checkInternalLinks(model: SiteModel): CheckResult {
  const broken = new Map<string, Set<string>>();
  for (const page of model.pages.values()) {
    for (const anchor of page.anchors) {
      const target = internalPath(anchor.href, model.siteUrl);
      if (target === null) continue;
      if (model.pages.has(target) || model.redirects.has(target) || model.isStaticRoute(target) || model.isPublicAsset(target)) continue;
      if (!broken.has(target)) broken.set(target, new Set());
      broken.get(target)!.add(page.path);
    }
  }
  const failures = [...broken].sort((a, b) => b[1].size - a[1].size).map(([target, from]) => `${target} (linked from ${from.size} page(s), for example ${[...from][0]})`);
  return result("internal-links", "Every internal link resolves", failures, "No internal link points at a missing page.", `${broken.size} internal link target(s) do not resolve.`);
}

/** No page links to a URL that only redirects: the link should name the destination, so users and crawlers skip a hop. */
export function checkLinksThroughRedirects(model: SiteModel): CheckResult {
  const through = new Map<string, Set<string>>();
  for (const page of model.pages.values()) {
    for (const anchor of page.anchors) {
      const target = internalPath(anchor.href, model.siteUrl);
      if (target === null || model.pages.has(target) || !model.redirects.has(target)) continue;
      if (!through.has(target)) through.set(target, new Set());
      through.get(target)!.add(page.path);
    }
  }
  const failures = [...through].sort((a, b) => b[1].size - a[1].size).map(([target, from]) => `${target} -> ${model.redirects.get(target)} (linked from ${from.size} page(s), for example ${[...from][0]})`);
  return result("links-through-redirects", "No internal link goes through a redirect", failures, "Every internal link names its destination.", `${through.size} internal link target(s) only redirect.`);
}

/** Every configured redirect lands on a page in one hop: no chain, no loop, no destination that does not exist. */
export function checkRedirects(model: SiteModel): CheckResult {
  const failures: string[] = [];
  for (const [source, destination] of model.redirects) {
    const target = internalPath(destination, model.siteUrl);
    if (target === null) continue;
    if (model.redirects.has(target)) failures.push(`${source} -> ${destination} -> ${model.redirects.get(target)} (a redirect chain)`);
    else if (!model.pages.has(target) && !model.isStaticRoute(target) && !model.isPublicAsset(target)) failures.push(`${source} -> ${destination} (the destination does not exist)`);
  }
  return result("redirects", "Every redirect reaches a page in one hop", failures.sort(), `${model.redirects.size} redirects, none chained or dead.`, `${failures.length} redirect(s) are chained or lead nowhere.`);
}

/** Every indexable page names itself as its canonical URL: absolute, on the site's origin, without query or trailing slash. */
export function checkCanonicals(model: SiteModel): CheckResult {
  const failures: string[] = [];
  for (const page of model.pages.values()) {
    if (!indexable(page)) continue;
    if (!page.canonical) {
      failures.push(`${page.path}: no canonical link`);
      continue;
    }
    const expected = page.path === "/" ? [model.siteUrl, `${model.siteUrl}/`] : [`${model.siteUrl}${page.path}`];
    if (!expected.includes(page.canonical)) failures.push(`${page.path}: canonical is ${page.canonical}`);
  }
  return result("canonical-self", "Every indexable page is its own canonical URL", failures, "Every indexable page has a self-referencing canonical URL.", `${failures.length} indexable page(s) have a missing or different canonical URL.`);
}

/** Open Graph and Twitter cards say the same thing, and og:url is the page's own canonical URL. */
export function checkSocialMetadata(model: SiteModel): CheckResult {
  const failures: string[] = [];
  for (const page of model.pages.values()) {
    const problems: string[] = [];
    if (page.og["title"] && page.twitter["title"] && page.og["title"] !== page.twitter["title"]) problems.push("twitter:title differs from og:title");
    if (page.og["description"] && page.twitter["description"] && page.og["description"] !== page.twitter["description"]) problems.push("twitter:description differs from og:description");
    if (page.og["url"] && page.canonical && page.og["url"] !== page.canonical) problems.push("og:url differs from the canonical URL");
    if (problems.length > 0) failures.push(`${page.path}: ${problems.join("; ")}`);
  }
  return result("social-metadata", "Open Graph and Twitter cards agree", failures, "Every card pair agrees.", `${failures.length} page(s) have a Twitter card that disagrees with the Open Graph card.`);
}

/** No two indexable pages share a title or a meta description. */
export function checkMetadataUniqueness(model: SiteModel): CheckResult {
  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  for (const page of model.pages.values()) {
    if (!indexable(page)) continue;
    if (page.title) titles.set(page.title, [...(titles.get(page.title) ?? []), page.path]);
    if (page.description) descriptions.set(page.description, [...(descriptions.get(page.description) ?? []), page.path]);
  }
  const duplicates = (groups: Map<string, string[]>, label: string) => [...groups].filter(([, paths]) => paths.length > 1).map(([value, paths]) => `${label} "${value.slice(0, 70)}" is shared by ${paths.length} pages: ${paths.slice(0, 3).join(", ")}`);
  const failures = [...duplicates(titles, "title"), ...duplicates(descriptions, "description")];
  return result("metadata-uniqueness", "Indexable pages have unique titles and descriptions", failures, "Titles and descriptions are unique across indexable pages.", `${failures.length} duplicated title or description value(s).`);
}

/**
 * The paths a crawler can discover: the home page and every sitemap URL, then everything they link to, and so on,
 * following redirects. Links on a noindex page do not count, because Google eventually stops following them.
 * With `countNoindexLinks` every link counts: that is the graph as it is before any page is taken out of the index.
 */
export function reachablePaths(model: SiteModel, { countNoindexLinks = false }: { countNoindexLinks?: boolean } = {}): Set<string> {
  const seen = new Set<string>();
  const queue: string[] = [];
  const visit = (path: string) => {
    if (model.pages.has(path) && !seen.has(path)) {
      seen.add(path);
      queue.push(path);
    }
  };
  visit("/");
  for (const path of model.sitemapPaths) visit(path);
  while (queue.length > 0) {
    const page = model.pages.get(queue.pop()!)!;
    if (!countNoindexLinks && !indexable(page)) continue;
    for (const anchor of page.anchors) {
      const target = internalPath(anchor.href, model.siteUrl);
      if (target !== null) visit(model.redirects.get(target) ?? target);
    }
  }
  return seen;
}

/** Comparison pages that no crawler-reachable page links to and the sitemap does not list, counting every link. */
export function unreachableComparisonSlugs(model: SiteModel): string[] {
  const reachable = reachablePaths(model, { countNoindexLinks: true });
  return [...model.pages.keys()]
    .filter((path) => path.startsWith("/compare/") && !reachable.has(path))
    .map((path) => path.slice("/compare/".length))
    .sort();
}

/**
 * The sitemap and the pages agree. Every sitemap URL is a real page and indexable; every indexable page is
 * either in the sitemap or excluded for a reason the policy states; and an indexable page that is outside the
 * sitemap must still be reachable by following internal links, otherwise nothing leads a crawler to it.
 */
export function checkSitemapCoverage(model: SiteModel): CheckResult[] {
  const missing = [...model.sitemapPaths].filter((path) => !model.pages.has(path) && !model.isStaticRoute(path)).sort();
  const noindexed = [...model.sitemapPaths].filter((path) => model.pages.has(path) && !indexable(model.pages.get(path)!)).sort();

  const reachable = reachablePaths(model);
  const unexplained: string[] = [];
  const unreachable: string[] = [];
  const deferred: string[] = [];
  for (const page of model.pages.values()) {
    if (!indexable(page) || model.sitemapPaths.has(page.path)) continue;
    if (!model.explainExclusion(page.path)) unexplained.push(page.path);
    if (reachable.has(page.path)) continue;
    const deferral = model.explainDeferral(page.path);
    if (deferral) deferred.push(`${page.path}: ${deferral}`);
    else unreachable.push(page.path);
  }

  const deferredResult: CheckResult = {
    id: "unreachable-deferred",
    title: "Unreachable indexable pages that are deliberately left alone for now",
    status: deferred.length > 0 ? "INFO" : "PASS",
    detail: deferred.length > 0 ? `${deferred.length} page(s) are outside the sitemap and unlinked but have a recorded deferral.` : "No deferrals are in use.",
    count: deferred.length,
    examples: sample(deferred.sort()),
    items: deferred.sort(),
  };

  return [
    result("sitemap-urls-exist", "Every sitemap URL is a real page", missing, `${model.sitemapPaths.size} sitemap URLs all resolve.`, `${missing.length} sitemap URL(s) match no page.`),
    result("sitemap-excludes-noindex", "No noindex page is in the sitemap", noindexed, "No page that forbids indexing is listed in the sitemap.", `${noindexed.length} noindex page(s) are in the sitemap.`),
    result("sitemap-exclusions-explained", "Every indexable page outside the sitemap has a stated reason", unexplained.sort(), "Each indexable page missing from the sitemap is covered by the quality gate or the discovery policy.", `${unexplained.length} indexable page(s) are outside the sitemap with no stated reason.`),
    result("indexable-pages-reachable", "Every indexable page is in the sitemap or reachable by links from it or the home page", unreachable.sort(), "No indexable page is both unlisted and unreachable.", `${unreachable.length} indexable page(s) are outside the sitemap and no indexable page links to them, directly or through other unlinked pages.`),
    deferredResult,
  ];
}

const EXPECTED_STRUCTURED_DATA: Array<{ label: string; matches: (path: string) => boolean; types: readonly string[] }> = [
  { label: "software profile", matches: (path) => path.startsWith("/software/"), types: ["BreadcrumbList", "ItemList", "Organization"] },
  { label: "comparison", matches: (path) => path.startsWith("/compare/") && path !== "/compare", types: ["BreadcrumbList", "ItemList", "Organization"] },
  { label: "category", matches: (path) => path.startsWith("/category/"), types: ["BreadcrumbList", "CollectionPage", "Organization"] },
];

/** Every JSON-LD block parses, and each page type carries the entities it is expected to. */
export function checkStructuredData(model: SiteModel, expectations = EXPECTED_STRUCTURED_DATA): CheckResult {
  const failures: string[] = [];
  for (const page of model.pages.values()) {
    if (page.jsonLd.invalid > 0) failures.push(`${page.path}: ${page.jsonLd.invalid} JSON-LD block(s) are not valid JSON`);
    for (const expectation of expectations) {
      if (!expectation.matches(page.path)) continue;
      const absent = expectation.types.filter((type) => !page.jsonLd.types.includes(type));
      if (absent.length > 0) failures.push(`${page.path}: ${expectation.label} lacks ${absent.join(", ")}`);
    }
  }
  return result("structured-data", "Structured data is valid and complete for each page type", failures, "All JSON-LD parses and each page type has its expected entities.", `${failures.length} structured-data problem(s).`);
}

/** Every sponsored link has an affiliate disclosure next to it. */
export function checkAffiliateDisclosure(model: SiteModel): CheckResult {
  const failures: string[] = [];
  let sponsored = 0;
  for (const page of model.pages.values()) {
    const bare = page.anchors.filter((anchor) => anchor.rel.split(/\s+/).includes("sponsored") && !anchor.disclosureNearby);
    sponsored += page.anchors.filter((anchor) => anchor.rel.split(/\s+/).includes("sponsored")).length;
    if (bare.length > 0) failures.push(`${page.path}: ${bare.length} sponsored link(s) without a nearby disclosure`);
  }
  return result("affiliate-disclosure", "Every sponsored link has a disclosure beside it", failures, `${sponsored} sponsored link(s) all have a disclosure beside them.`, `${failures.length} page(s) have sponsored links without a disclosure beside them.`);
}

const REVIEW_LINE = /Last reviewed [A-Z][a-z]+ \d{1,2}, \d{4} against the vendor's official sources\./;
const GENERIC_PROFILE_ANSWERS = ["Most teams start by exporting their existing", "Integration support varies by tool"];

/**
 * The v2 profile template appears on exactly the profiles the cohort file allows, and on no held profile. A held
 * profile is under a running measurement, so a change to it is a defect even when the change is an improvement.
 */
export function checkProfileTemplateGating(model: SiteModel): CheckResult {
  const failures: string[] = [];
  let v2Pages = 0;
  for (const page of model.pages.values()) {
    const v2 = model.isProfileTemplateV2(page.path);
    if (v2 === null) continue;
    const hasReviewLine = REVIEW_LINE.test(page.text);
    const hasProductEntity = page.jsonLd.topTypes.includes("SoftwareApplication");
    const hasGenericAnswers = GENERIC_PROFILE_ANSWERS.some((needle) => page.text.includes(needle));
    if (v2) {
      v2Pages += 1;
      const missing = [!hasReviewLine && "the review line", !hasProductEntity && "the product entity", hasGenericAnswers && "(it still has the generic FAQ answers)"].filter(Boolean);
      if (missing.length > 0) failures.push(`${page.path}: v2 profile is missing ${missing.join(", ")}`);
    } else if (hasReviewLine || hasProductEntity) {
      failures.push(`${page.path}: held profile shows ${[hasReviewLine && "the review line", hasProductEntity && "the product entity"].filter(Boolean).join(" and ")}`);
    }
  }
  return result("profile-template-gating", "The v2 profile template is on editable profiles only", failures, `${v2Pages} editable profiles use it; no held profile does.`, `${failures.length} profile(s) do not match the cohort file.`);
}

/**
 * The v2 comparison template (quick verdict, pricing table) appears on exactly the comparisons in a rollout wave,
 * and the generic cons disclosure is gone from them. Every other comparison must be untouched.
 */
export function checkComparisonTemplateGating(model: SiteModel): CheckResult {
  const failures: string[] = [];
  let v2Pages = 0;
  for (const page of model.pages.values()) {
    const v2 = model.isComparisonTemplateV2(page.path);
    if (v2 === null) continue;
    const hasVerdict = page.text.includes("Quick verdict");
    const hasPricing = page.text.includes("Pricing at a glance");
    const hasDisclosure = page.text.includes("We don't infer weaknesses");
    if (v2) {
      v2Pages += 1;
      const problems = [!hasVerdict && "no quick verdict", !hasPricing && "no pricing table", hasDisclosure && "still shows the generic cons disclosure"].filter(Boolean);
      if (problems.length > 0) failures.push(`${page.path}: ${problems.join(", ")}`);
    } else if (hasVerdict || hasPricing) {
      failures.push(`${page.path}: not in a wave but shows ${[hasVerdict && "the quick verdict", hasPricing && "the pricing table"].filter(Boolean).join(" and ")}`);
    }
  }
  return result("comparison-template-gating", "The v2 comparison template is on wave comparisons only", failures, `${v2Pages} wave comparisons use it; no other comparison does.`, `${failures.length} comparison(s) do not match the wave list.`);
}

/** Every page has exactly one h1. */
export function checkHeadings(model: SiteModel): CheckResult {
  const failures = [...model.pages.values()].filter((page) => page.h1Count !== 1).map((page) => `${page.path}: ${page.h1Count} h1 element(s)`);
  return result("single-h1", "Every page has exactly one h1", failures, "Every page has one h1.", `${failures.length} page(s) do not have exactly one h1.`);
}

export type GenericPattern = { id: string; description: string; scope: (path: string) => boolean; needle: string };

/** Sentences that read the same on many pages. Reported, not failed, until the template that emits them is fixed. */
export const GENERIC_PATTERNS: readonly GenericPattern[] = [
  { id: "faq-migration", description: "Identical migration answer in the profile FAQ", scope: (path) => path.startsWith("/software/"), needle: "Most teams start by exporting their existing" },
  { id: "faq-integrations", description: "Identical integrations answer in the profile FAQ", scope: (path) => path.startsWith("/software/"), needle: "Integration support varies by tool" },
  { id: "cons-disclosure", description: "'We don't infer weaknesses' where a product has no sourced constraint", scope: (path) => path.startsWith("/compare/"), needle: "We don't infer weaknesses" },
  { id: "pricing-undocumented", description: "A comparison row that says 'Not yet documented'", scope: (path) => path.startsWith("/compare/"), needle: "Not yet documented" },
  { id: "limitation-fallback", description: "The generic 'limitation to weigh' fallback", scope: () => true, needle: "Check the required plan, usage limits and workflow fit before choosing" },
];

export function reportGenericText(model: SiteModel, patterns: readonly GenericPattern[] = GENERIC_PATTERNS, maxAllowed: Readonly<Record<string, number>> = {}): CheckResult[] {
  return patterns.map((pattern) => {
    const hits = [...model.pages.values()].filter((page) => pattern.scope(page.path) && page.text.includes(pattern.needle)).map((page) => page.path);
    const limit = maxAllowed[pattern.id];
    const failing = limit !== undefined && hits.length > limit;
    return {
      id: `generic-text:${pattern.id}`,
      title: pattern.description,
      status: failing ? "FAIL" : "INFO",
      detail: `${hits.length} page(s)${limit !== undefined ? `, at most ${limit} allowed` : ""}.`,
      count: hits.length,
      examples: sample(hits),
      items: hits,
    } satisfies CheckResult;
  });
}

export function runAllChecks(model: SiteModel, options: { maxGeneric?: Readonly<Record<string, number>> } = {}): CheckResult[] {
  return [
    checkFooterConsistency(model),
    checkInternalLinks(model),
    checkLinksThroughRedirects(model),
    checkRedirects(model),
    checkCanonicals(model),
    checkSocialMetadata(model),
    checkMetadataUniqueness(model),
    ...checkSitemapCoverage(model),
    checkStructuredData(model),
    checkAffiliateDisclosure(model),
    checkProfileTemplateGating(model),
    checkComparisonTemplateGating(model),
    checkHeadings(model),
    ...reportGenericText(model, GENERIC_PATTERNS, options.maxGeneric),
  ];
}
