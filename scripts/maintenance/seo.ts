import fs from "node:fs";
import path from "node:path";
import { getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { getAllRoleGuides } from "@/data/guides/registry";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { generateTitle, generateMetaDescription } from "@/lib/generators";
import { generateComparisonTitle, generateComparisonMetaDescription } from "@/lib/comparison";
import { LEGAL_PAGES } from "@/lib/legal";
import { SITE_URL } from "@/lib/site";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { runAgent } from "@/lib/maintenance/run-agent";
import { writeReport } from "@/lib/maintenance/report-io";
import type { MaintenanceIssue } from "@/types/maintenance";

/**
 * Sprint 12 Phase 4 — SEO Integrity Agent. Entirely static/read-only:
 * imports the real data layer and the real sitemap.ts/robots.ts modules
 * (rather than re-implementing their logic, which would drift), and
 * greps known page source files for required patterns. Never edits a
 * route, never regenerates metadata — findings only.
 */

function readSourceFile(relativePath: string): string {
  try {
    return fs.readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath), "utf-8");
  } catch {
    return "";
  }
}

function checkDuplicates(entries: Array<{ label: string; value: string }>, kind: string): MaintenanceIssue[] {
  const seen = new Map<string, string[]>();
  for (const { label, value } of entries) {
    const list = seen.get(value) ?? [];
    list.push(label);
    seen.set(value, list);
  }

  const issues: MaintenanceIssue[] = [];
  for (const [value, labels] of seen) {
    if (labels.length > 1) {
      issues.push({
        id: `seo-duplicate-${kind}-${Buffer.from(value).toString("base64").slice(0, 24)}`,
        severity: "warning",
        title: `Duplicate ${kind}`,
        description: `"${value}" is used by more than one page: ${labels.join(", ")}.`,
      });
    }
  }
  return issues;
}

function checkCanonicals(): MaintenanceIssue[] {
  const staticFiles = [
    "app/page.tsx",
    "app/software/[slug]/page.tsx",
    "app/category/[slug]/page.tsx",
    "app/compare/page.tsx",
    "app/compare/[comparison]/page.tsx",
    "app/[guide]/page.tsx",
    "app/recommend/page.tsx",
    "app/about/page.tsx",
    "app/contact/page.tsx",
    ...LEGAL_PAGES.map((page) => `app${page.href}/page.tsx`),
  ];

  const issues: MaintenanceIssue[] = [];
  for (const file of staticFiles) {
    const source = readSourceFile(file);
    if (!source) {
      issues.push({
        id: `seo-canonical-missing-file-${file}`,
        severity: "warning",
        title: `Could not read ${file} to check for a canonical URL`,
        description: "File not found at the expected path — this check may be out of date with the route structure.",
        location: file,
      });
      continue;
    }
    if (!/alternates:\s*\{\s*canonical:/.test(source)) {
      issues.push({
        id: `seo-canonical-missing-${file}`,
        severity: "critical",
        title: `Missing canonical URL`,
        description: `${file} has no \`alternates: { canonical: ... }\` in its metadata export.`,
        location: file,
      });
    }
  }
  return issues;
}

function checkJsonLd(): MaintenanceIssue[] {
  // Route type -> file(s) expected to render <JsonLd — legal pages get theirs
  // from the shared LegalPageLayout, not their own page.tsx.
  const expectations: Array<{ label: string; files: string[] }> = [
    { label: "Home", files: ["app/layout.tsx"] },
    { label: "Software pages", files: ["app/software/[slug]/page.tsx"] },
    { label: "Category pages", files: ["app/category/[slug]/page.tsx"] },
    { label: "Role Guides", files: ["app/[guide]/page.tsx"] },
    { label: "Compare index", files: ["app/compare/page.tsx"] },
    { label: "Comparison pages", files: ["app/compare/[comparison]/page.tsx"] },
    { label: "Legal pages", files: ["components/LegalPageLayout.tsx"] },
  ];

  const issues: MaintenanceIssue[] = [];
  for (const { label, files } of expectations) {
    const hasJsonLd = files.some((file) => /<JsonLd/.test(readSourceFile(file)));
    if (!hasJsonLd) {
      issues.push({
        id: `seo-jsonld-missing-${label}`,
        severity: "warning",
        title: `Missing expected JSON-LD: ${label}`,
        description: `None of [${files.join(", ")}] contain a <JsonLd usage.`,
        location: files[0],
      });
    }
  }
  return issues;
}

function checkOrphanRisk(): MaintenanceIssue[] {
  const issues: MaintenanceIssue[] = [];
  const home = readSourceFile("app/page.tsx");
  const compareIndex = readSourceFile("app/compare/page.tsx");

  const hasDirectSoftwareHub = /\{allSoftware\.map\(/.test(home);
  const hasCategoryHub = /\{allCategories\.map\(/.test(home);
  const categoryPage = readSourceFile("app/category/[slug]/page.tsx");
  const categoryPagesRenderSoftware = /\{software\.map\(/.test(categoryPage);
  const categorySlugs = new Set(getAllCategories().map((category) => category.slug));
  const everySoftwareHasCategoryPath = getAllSoftware().every((software) => categorySlugs.has(software.category));

  // The homepage intentionally uses category hubs plus a curated software grid
  // instead of rendering 350+ software links at once. That is still a complete
  // crawl path when every category is linked from home and every software entry
  // is rendered on its category page. Only fail if neither discovery model is
  // complete.
  if (!hasDirectSoftwareHub && !(hasCategoryHub && categoryPagesRenderSoftware && everySoftwareHasCategoryPath)) {
    issues.push({
      id: "seo-orphan-risk-software",
      severity: "critical",
      title: "Software pages may have lost a complete internal discovery path",
      description: "Neither a direct all-software homepage hub nor a complete homepage → category → software path could be verified from the current source/data.",
      location: "app/page.tsx",
    });
  }
  if (!/\{allCategories\.map\(/.test(home)) {
    issues.push({
      id: "seo-orphan-risk-category",
      severity: "critical",
      title: "Homepage may no longer link every category page",
      description: "app/page.tsx no longer contains the expected `{allCategories.map(` pattern.",
      location: "app/page.tsx",
    });
  }
  if (!/\{comparisons\.map\(/.test(compareIndex)) {
    issues.push({
      id: "seo-orphan-risk-comparison",
      severity: "critical",
      title: "Compare index may no longer link every comparison page",
      description: "app/compare/page.tsx no longer contains the expected `{comparisons.map(` pattern.",
      location: "app/compare/page.tsx",
    });
  }

  const emptyCategories = getAllCategories().filter(
    (category) => !getAllSoftware().some((software) => software.category === category.slug)
  );
  for (const category of emptyCategories) {
    issues.push({
      id: `seo-orphan-empty-category-${category.slug}`,
      severity: "warning",
      title: `Category "${category.name}" has zero software entries`,
      description: "A category page with no software is a real, discoverable dead end.",
      location: `/category/${category.slug}`,
    });
  }

  return issues;
}

function checkBrokenInternalReferences(): MaintenanceIssue[] {
  const issues: MaintenanceIssue[] = [];
  const knownSlugs = new Set(getAllSoftware().map((s) => s.slug));
  const knownCategorySlugs = new Set(getAllCategories().map((c) => c.slug));

  for (const software of getAllSoftware()) {
    for (const alternative of software.alternatives) {
      if (!knownSlugs.has(alternative.slug)) {
        issues.push({
          id: `seo-broken-alternative-${software.slug}-${alternative.slug}`,
          severity: "critical",
          title: `Broken alternative reference`,
          description: `${software.slug}.json lists alternative "${alternative.slug}", which has no matching software file.`,
          location: software.slug,
        });
      }
    }
    if (!knownCategorySlugs.has(software.category)) {
      issues.push({
        id: `seo-broken-category-${software.slug}`,
        severity: "critical",
        title: `Broken category reference`,
        description: `${software.slug}.json has category "${software.category}", which is not a known category.`,
        location: software.slug,
      });
    }
  }

  for (const [slugA, slugB] of PUBLISHED_COMPARISONS) {
    if (!knownSlugs.has(slugA) || !knownSlugs.has(slugB)) {
      issues.push({
        id: `seo-broken-comparison-${slugA}-${slugB}`,
        severity: "critical",
        title: `Broken comparison pair`,
        description: `data/comparisons.ts references "${slugA}" and/or "${slugB}", which don't both exist in data/software.`,
        location: getComparisonSlug(slugA, slugB),
      });
    }
  }

  return issues;
}

function checkDuplicateComparisons(): MaintenanceIssue[] {
  const seen = new Set<string>();
  const issues: MaintenanceIssue[] = [];
  for (const [slugA, slugB] of PUBLISHED_COMPARISONS) {
    const canonicalKey = [slugA, slugB].sort().join("-vs-");
    if (seen.has(canonicalKey)) {
      issues.push({
        id: `seo-duplicate-comparison-${canonicalKey}`,
        severity: "critical",
        title: "Duplicate comparison definition",
        description: `The pair "${slugA}" / "${slugB}" (in either order) is defined more than once in data/comparisons.ts.`,
        location: getComparisonSlug(slugA, slugB),
      });
    }
    seen.add(canonicalKey);
  }
  return issues;
}

async function run() {
  const softwareTitles = getAllSoftware().map((s) => ({ label: `/software/${s.slug}`, value: generateTitle(s) }));
  const categoryTitles = getAllCategories().map((c) => ({ label: `/category/${c.slug}`, value: c.name }));
  const comparisonTitles = PUBLISHED_COMPARISONS.map(([a, b]) => {
    const softwareA = getAllSoftware().find((s) => s.slug === a)!;
    const softwareB = getAllSoftware().find((s) => s.slug === b)!;
    return { label: `/compare/${getComparisonSlug(a, b)}`, value: generateComparisonTitle(softwareA, softwareB) };
  });
  const roleGuideTitles = getAllRoleGuides().map((g) => ({ label: `/${g.slug}`, value: `${g.title} | Miloosh` }));
  const legalTitles = LEGAL_PAGES.map((p) => ({ label: p.href, value: p.name }));
  const staticTitles = [
    { label: "/compare", value: "Compare software" },
    { label: "/recommend", value: "Find your software" },
    { label: "/about", value: "About" },
    { label: "/contact", value: "Contact" },
  ];

  const softwareDescriptions = getAllSoftware().map((s) => ({ label: `/software/${s.slug}`, value: generateMetaDescription(s) }));
  const roleGuideDescriptions = getAllRoleGuides().map((g) => ({ label: `/${g.slug}`, value: g.metaDescription }));
  const comparisonDescriptions = PUBLISHED_COMPARISONS.map(([a, b]) => {
    const softwareA = getAllSoftware().find((s) => s.slug === a)!;
    const softwareB = getAllSoftware().find((s) => s.slug === b)!;
    return { label: `/compare/${getComparisonSlug(a, b)}`, value: generateComparisonMetaDescription(softwareA, softwareB) };
  });

  const titleIssues = checkDuplicates(
    [...softwareTitles, ...categoryTitles, ...comparisonTitles, ...roleGuideTitles, ...legalTitles, ...staticTitles],
    "title"
  );
  const descriptionIssues = checkDuplicates([...softwareDescriptions, ...roleGuideDescriptions, ...comparisonDescriptions], "meta description");
  const canonicalIssues = checkCanonicals();
  const jsonLdIssues = checkJsonLd();
  const orphanIssues = checkOrphanRisk();
  const brokenRefIssues = checkBrokenInternalReferences();
  const duplicateComparisonIssues = checkDuplicateComparisons();

  const sitemapEntries = sitemap();
  const sitemapUrls = new Set(sitemapEntries.map((e) => e.url));
  const sitemapCheckIssues: MaintenanceIssue[] = [];

  const expectedUrls = [
    SITE_URL,
    `${SITE_URL}/about`,
    `${SITE_URL}/contact`,
    `${SITE_URL}/recommend`,
    `${SITE_URL}/compare`,
    ...getAllSoftware().map((s) => `${SITE_URL}/software/${s.slug}`),
    ...getAllCategories().map((c) => `${SITE_URL}/category/${c.slug}`),
    ...getAllRoleGuides().map((g) => `${SITE_URL}/${g.slug}`),
    ...PUBLISHED_COMPARISONS.map(([a, b]) => `${SITE_URL}/compare/${getComparisonSlug(a, b)}`),
    ...LEGAL_PAGES.map((p) => `${SITE_URL}${p.href}`),
  ];
  for (const expected of expectedUrls) {
    if (!sitemapUrls.has(expected)) {
      sitemapCheckIssues.push({
        id: `seo-sitemap-missing-${expected}`,
        severity: "critical",
        title: "Indexable route missing from sitemap",
        description: `${expected} should be in app/sitemap.ts's output but isn't.`,
        location: expected,
      });
    }
  }
  const noindexPatterns = [`${SITE_URL}/recommend/results`, `${SITE_URL}/internal/`];
  for (const url of sitemapUrls) {
    for (const pattern of noindexPatterns) {
      if (url.startsWith(pattern)) {
        sitemapCheckIssues.push({
          id: `seo-sitemap-should-not-include-${url}`,
          severity: "critical",
          title: "Noindex route present in sitemap",
          description: `${url} matches a known noindex pattern (${pattern}) but is listed in app/sitemap.ts.`,
          location: url,
        });
      }
    }
  }

  const robotsResult = robots();
  const rules = Array.isArray(robotsResult.rules) ? robotsResult.rules : [robotsResult.rules];
  const disallowsInternal = rules.some((rule) => {
    const disallow = rule?.disallow;
    const list = Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
    return list.some((entry) => entry.includes("/internal/"));
  });
  const robotsIssues: MaintenanceIssue[] = [];
  if (!disallowsInternal) {
    robotsIssues.push({
      id: "seo-robots-missing-internal-disallow",
      severity: "critical",
      title: "robots.ts does not disallow /internal/",
      description: "app/robots.ts should disallow the /internal/ path prefix so admin dashboards aren't crawled.",
      location: "app/robots.ts",
    });
  }
  if (!robotsResult.sitemap || !String(robotsResult.sitemap).includes("/sitemap.xml")) {
    robotsIssues.push({
      id: "seo-robots-missing-sitemap-link",
      severity: "warning",
      title: "robots.ts does not point to the sitemap",
      description: "app/robots.ts's output should include a sitemap URL.",
      location: "app/robots.ts",
    });
  }

  const issues = [
    ...titleIssues,
    ...descriptionIssues,
    ...canonicalIssues,
    ...jsonLdIssues,
    ...orphanIssues,
    ...brokenRefIssues,
    ...duplicateComparisonIssues,
    ...sitemapCheckIssues,
    ...robotsIssues,
  ];

  return {
    summary: `Checked ${softwareTitles.length + categoryTitles.length + comparisonTitles.length + legalTitles.length + staticTitles.length} page titles, ${softwareDescriptions.length + comparisonDescriptions.length} meta descriptions, ${sitemapEntries.length} sitemap entries, and internal reference integrity. Found ${issues.length} issue(s).`,
    issues,
    data: {
      pagesChecked:
        softwareTitles.length + categoryTitles.length + comparisonTitles.length + legalTitles.length + staticTitles.length,
      sitemapEntryCount: sitemapEntries.length,
      checkedCategories: [
        "duplicate titles",
        "duplicate meta descriptions",
        "missing canonical URLs",
        "missing JSON-LD",
        "orphan-page risk",
        "broken internal references",
        "duplicate comparison definitions",
        "sitemap mismatches",
        "robots inconsistencies",
      ],
    },
  };
}

export async function executeSeoAgent() {
  const report = await runAgent("seo", run, { escalateCriticalToFailure: true });
  writeReport(report);
  return report;
}

async function main() {
  const report = await executeSeoAgent();
  console.log(`[seo] ${report.summary}`);
  console.log(`[seo] run status: ${report.run.status}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
