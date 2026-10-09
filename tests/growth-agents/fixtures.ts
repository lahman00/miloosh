import type { Software } from "@/data/software";
import { addDays, measured } from "@/lib/growth-agents/evidence";
import { REQUIRED_GATES, runGuardian, type GateName, type GateResult, type GuardianInputs, type GuardianReport } from "@/lib/growth-agents/guardian";
import { buildIndexationEvidence, type IndexationEvidence } from "@/lib/growth-agents/indexation";
import { runAffiliateRevenueAgent, type AffiliateRevenueReport } from "@/lib/growth-agents/affiliate-revenue-agent";
import { unavailableFunnel } from "@/lib/growth-agents/funnel";
import { buildGscEvidence, type GscEvidence } from "@/lib/growth-agents/gsc-import";
import { buildSiteInventory, type SiteInventory } from "@/lib/growth-agents/inventory";
import { buildProtectionSnapshot, type ProtectionSignal, type ProtectionSnapshot, type ProtectionSourceId } from "@/lib/growth-agents/protection";
import type { PartnerFacts } from "@/lib/growth-agents/partners";
import { runGoogleRecoveryAgent, type GoogleRecoveryInputs, type GoogleRecoveryReport, type PageExtras } from "@/lib/growth-agents/google-recovery-agent";

/** Fixed clock for every test: the report date of the first real run. */
export const NOW = new Date("2026-10-09T00:00:00Z");
export const SHA = "80eb1e57ff73cacf563aafbe21f377f8db7673ed";

export function makeSoftware(slug: string, overrides: Partial<Software> = {}): Software {
  return {
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    slug,
    category: "crm",
    description: `${slug} description`,
    website: `https://${slug}.example`,
    bestFor: `Small teams that need ${slug} for a documented, specific workflow`,
    cons: [`${slug} has a documented limit`],
    features: ["one", "two", "three", "four"],
    alternatives: [],
    sources: [`https://${slug}.example/docs`, `https://${slug}.example/pricing`],
    accessedAt: "2026-10-01",
    pricing: { model: "paid", status: "verified", officialSource: `https://${slug}.example/pricing`, lastVerified: "2026-10-01" },
    ...overrides,
  } as Software;
}

export function csv(header: string, rows: ReadonlyArray<readonly (string | number)[]>): string {
  return `${header}\n${rows.map((r) => r.join(",")).join("\n")}\n`;
}

export type PageRow = readonly [url: string, clicks: number, impressions: number, position: number];

const pct = (clicks: number, impressions: number) => (impressions === 0 ? "0%" : `${Math.round((clicks / impressions) * 1000) / 10}%`);
const pageCsv = (rows: readonly PageRow[]) => csv("Top pages,Clicks,Impressions,CTR,Position", rows.map(([u, c, i, p]) => [u, c, i, pct(c, i), p.toFixed(1)]));

export function dailyCsv(days: ReadonlyArray<readonly [date: string, clicks: number, impressions: number]>): string {
  return csv("Date,Clicks,Impressions,CTR,Position", days.map(([d, c, i]) => [d, c, i, i === 0 ? "" : pct(c, i), i === 0 ? "" : "50.0"]));
}

/** A complete daily series: `total` impressions spread evenly over `days` days, all clicks on the first day. */
export function spread(total: number, clicks: number, start: string, days: number): Array<readonly [string, number, number]> {
  return Array.from({ length: days }, (_, i) => [addDays(start, i), i === 0 ? clicks : 0, Math.floor(total / days) + (i < total % days ? 1 : 0)] as const);
}

export type EvidenceOptions = {
  hist: readonly PageRow[];
  recent: readonly PageRow[];
  /** Historical daily series inside 2026-08-07..2026-08-19; defaults to a flat series that sums to the historical rows' impressions. */
  histDaily?: ReadonlyArray<readonly [string, number, number]>;
  recentDaily?: ReadonlyArray<readonly [string, number, number]>;
  recentComplete?: boolean;
  recentRowsReported?: number;
  zeroJustification?: boolean;
  dataThrough?: string;
};

export type Capture = { manifest: { tables: Array<Record<string, unknown>>; exactPageChecks: unknown[]; [key: string]: unknown }; files: Record<string, string> };

/** The raw manifest and table files of a small valid capture. Error-path tests edit these before building evidence. */
export function makeCapture(options: EvidenceOptions): Capture {
  const histTotal = options.hist.reduce((s, r) => s + r[2], 0);
  const histClicks = options.hist.reduce((s, r) => s + r[1], 0);
  const histDaily = options.histDaily ?? spread(histTotal, histClicks, "2026-08-07", 13);
  const recentTotal = options.recent.reduce((s, r) => s + r[2], 0);
  const recentClicks = options.recent.reduce((s, r) => s + r[1], 0);
  const recentDaily = options.recentDaily ?? spread(recentTotal, recentClicks, "2026-09-08", 28);
  const justification = options.zeroJustification === false ? undefined : "Table read in full, no filters; a missing page had no impressions.";
  const manifest = {
    schemaVersion: 1,
    captureId: "fixture",
    property: "sc-domain:miloosh.com",
    searchType: "web",
    filters: {},
    timezone: "America/Los_Angeles",
    capturedAt: "2026-10-08T22:25:00Z",
    capturedVia: "ui-table-capture",
    dataThrough: options.dataThrough ?? "2026-10-05",
    dataThroughRule: "fixture rule",
    tables: [
      { id: "pages-historical", role: "historical", kind: "pages", file: "ph.csv", window: { start: "2026-07-23", end: "2026-08-19" }, firstDataDate: "2026-08-07", rowsReported: options.hist.length, complete: true, ...(justification ? { zeroIfAbsentJustification: justification } : {}), propertyTotals: { clicks: options.hist.reduce((s, r) => s + r[1], 0), impressions: histTotal } },
      { id: "pages-recent", role: "recent", kind: "pages", file: "pr.csv", window: { start: "2026-09-08", end: "2026-10-05" }, rowsReported: options.recentRowsReported ?? options.recent.length, complete: options.recentComplete ?? true, ...(justification && (options.recentComplete ?? true) ? { zeroIfAbsentJustification: justification } : {}) },
      { id: "dates-historical", role: "context", kind: "dates", file: "dh.csv", window: { start: "2026-07-23", end: "2026-09-07" }, firstDataDate: "2026-08-07", rowsReported: histDaily.length, complete: true },
      { id: "dates-recent", role: "recent", kind: "dates", file: "dr.csv", window: { start: "2026-09-08", end: "2026-10-05" }, rowsReported: recentDaily.length, complete: true },
    ],
    exactPageChecks: [],
    notes: [],
  };
  return { manifest, files: { "ph.csv": pageCsv(options.hist), "pr.csv": pageCsv(options.recent), "dh.csv": dailyCsv(histDaily), "dr.csv": dailyCsv(recentDaily) } };
}

/** Adds a queries table filtered to one page (a path such as "/software/alpha") to a raw capture. */
export function addPageQueryTable(
  capture: Capture,
  spec: { path: string; rows: ReadonlyArray<readonly [query: string, impressions: number]>; declaredImpressions?: number | null; role?: "historical" | "recent"; mode?: "contains" | "equals" },
): string {
  const role = spec.role ?? "historical";
  const id = `queries-page${spec.path.replace(/[^a-z0-9]+/gi, "-")}`;
  const file = `${id}.csv`;
  const declared = spec.declaredImpressions === undefined ? spec.rows.reduce((sum, r) => sum + r[1], 0) : spec.declaredImpressions;
  capture.manifest.tables.push({
    id,
    role,
    kind: "queries",
    file,
    window: role === "historical" ? { start: "2026-07-23", end: "2026-08-19" } : { start: "2026-09-08", end: "2026-10-05" },
    ...(role === "historical" ? { firstDataDate: "2026-08-07" } : {}),
    rowsReported: spec.rows.length,
    complete: true,
    ...(declared === null ? {} : { propertyTotals: { clicks: 0, impressions: declared } }),
    visibility: "committed",
    pageFilter: { mode: spec.mode ?? "contains", value: spec.path },
  });
  capture.files[file] = csv("Top queries,Clicks,Impressions,CTR,Position", spec.rows.map(([query, impressions]) => [`"${query.replace(/"/g, '""')}"`, 0, impressions, "0%", "80.0"]));
  return id;
}

export function makeEvidence(options: EvidenceOptions): GscEvidence {
  const capture = makeCapture(options);
  return buildGscEvidence(capture.manifest, capture.files);
}

/** `otherCtas` maps a software page to the other products its decision guide and buyer checklist show a call to action for. */
export function makeInventory(options: { software?: Software[]; comparisons?: Array<[string, string]>; sitemapPaths?: string[]; otherCtas?: Record<string, string[]> } = {}): SiteInventory {
  const software = options.software ?? [makeSoftware("alpha"), makeSoftware("beta"), makeSoftware("gamma"), makeSoftware("delta")];
  const comparisons = options.comparisons ?? [["alpha", "beta"], ["beta", "gamma"]];
  return buildSiteInventory({
    checkoutSha: SHA,
    now: NOW,
    software,
    comparisons,
    comparisonSlug: (a, b) => `${a}-vs-${b}`,
    categories: [{ slug: "crm" }],
    guideSlugs: [],
    legalPaths: ["/privacy"],
    sitemapPaths: options.sitemapPaths ?? ["/", ...software.map((s) => `/software/${s.slug}`), ...comparisons.map(([a, b]) => `/compare/${a}-vs-${b}`)],
    otherCtaSlugsOf: (slug) => options.otherCtas?.[slug] ?? [],
  });
}

const ALL_SOURCES: ProtectionSourceId[] = ["legacy-cohort", "measuring-receipts", "first-revenue-cohort", "comparison-quality-cohort", "decision-money-pages", "release-observation", "in-flight-work"];

export function makeProtection(signals: ProtectionSignal[] = [], unread: ProtectionSourceId[] = []): ProtectionSnapshot {
  return buildProtectionSnapshot({
    checkoutSha: SHA,
    generatedAt: NOW.toISOString(),
    sources: ALL_SOURCES.map((id) => ({ id, ok: !unread.includes(id), count: 0, locator: id })),
    signals,
  });
}

export const U = (path: string) => `https://miloosh.com${path}`;

export function signal(partial: Partial<ProtectionSignal> & { urls: string[] }): ProtectionSignal {
  return { source: "legacy-cohort", kind: "PROTECTED", detail: "fixture", evidence: "fixture", ...partial };
}

export function partnerFacts(slug: string, overrides: Partial<PartnerFacts> = {}): PartnerFacts {
  return {
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    registryActive: true,
    issuedLinkPresent: true,
    trackingLocked: false,
    ledgerAgrees: true,
    ledgerStatus: "ACTIVE",
    approvalEvidenceItems: 2,
    network: "PartnerStack",
    payout: { railId: "rail-ok", railLabel: "Verified rail", readiness: "VERIFIED", ownerActionPackId: "pack-ok" },
    technicalPathReady: true,
    disclosureShown: true,
    revenueReady: true,
    networkSignals: [],
    softwarePageUrl: U(`/software/${slug}`),
    comparisonPageUrls: [],
    ...overrides,
  };
}

export type World = {
  gsc: GscEvidence;
  inventory: SiteInventory;
  protection: ProtectionSnapshot;
  google: GoogleRecoveryReport;
  affiliate: AffiliateRevenueReport;
};

/** A small, fully specified world: alpha has a verified partner, beta has none, gamma has a blocked payout rail. */
export function makeWorld(overrides: { hist?: PageRow[]; recent?: PageRow[]; signals?: ProtectionSignal[]; partners?: PartnerFacts[]; inventory?: SiteInventory; google?: Partial<GoogleRecoveryInputs> } = {}): World {
  const hist: PageRow[] = overrides.hist ?? [
    [U("/software/alpha"), 0, 240, 70],
    [U("/software/beta"), 0, 300, 75],
    [U("/software/gamma"), 0, 80, 60],
    [U("/compare/alpha-vs-beta"), 0, 40, 12],
    [U("/compare/beta-vs-gamma"), 0, 30, 30],
    [U("/software/delta"), 0, 6, 8],
    [U("/"), 1, 20, 5],
  ];
  const recent: PageRow[] = overrides.recent ?? [[U("/"), 0, 4, 5]];
  const gsc = makeEvidence({ hist, recent });
  const inventory = overrides.inventory ?? makeInventory();
  const protection = makeProtection(overrides.signals ?? []);
  const partners =
    overrides.partners ??
    [
      partnerFacts("alpha", { comparisonPageUrls: [U("/compare/alpha-vs-beta")] }),
      partnerFacts("gamma", {
        payout: { railId: "rail-blocked", railLabel: "Blocked rail", readiness: "OWNER_ACTION_REQUIRED", ownerActionPackId: "pack-blocked" },
        revenueReady: false,
        comparisonPageUrls: [U("/compare/beta-vs-gamma")],
      }),
    ];
  const google = runGoogleRecoveryAgent({
    now: NOW,
    gsc,
    protection,
    inventory,
    indexation: null,
    monetization: (url) => {
      const entry = inventory.pages.get(url);
      const active = new Set(partners.map((p) => p.slug));
      const hits = [...(entry?.softwareSlugs ?? []), ...(entry?.otherCtaSlugs ?? [])].filter((s) => active.has(s));
      return hits.length > 0 ? { verified: true, detail: `active: ${hits.join(",")}` } : { verified: false, detail: "no active partner" };
    },
    ...overrides.google,
  });
  const affiliate = runAffiliateRevenueAgent({ now: NOW, partners, gsc, inventory, protection, funnel: unavailableFunnel("fixture") });
  return { gsc, inventory, protection, google, affiliate };
}

export const PROV = { source: "test", locator: "fixture", capturedAt: "2026-10-08T00:00:00Z" };

/** Every per-page fact the Google Recovery gates need beyond the performance tables, all confirmed. */
export function fullExtras(url: string): PageExtras {
  return {
    live: measured({ status: 200, canonical: url, robotsMeta: null, xRobotsTag: null, indexable: true }, PROV),
    intent: measured({ queries: [{ query: "alpha vs beta", impressions: 12 }], commercial: true }, PROV),
    contentGapConfirmedAgainstVendor: true,
  };
}

/** Indexation evidence holding an indexed-version URL inspection for each URL (no sitemap or coverage report). */
export function makeIndexation(urls: string[], options: { lastCrawl?: string | null; coverageState?: string } = {}): IndexationEvidence {
  const sidecar = {
    schemaVersion: 1,
    kind: "url-inspections",
    property: "sc-domain:miloosh.com",
    capturedAt: "2026-10-08T22:00:00Z",
    source: "fixture",
    indexedVersionOnly: true,
    inspections: urls.map((url) => ({
      url,
      inspectedAt: "2026-10-08T22:00:00Z",
      coverageState: options.coverageState ?? "Crawled - currently not indexed",
      lastCrawl: options.lastCrawl === undefined ? "2026-08-30T10:00:00Z" : options.lastCrawl,
      crawlAllowed: true,
      indexingAllowed: true,
      pageFetch: "Successful",
      userCanonical: url,
      googleCanonical: url,
    })),
    notes: [],
  };
  return buildIndexationEvidence((file) => (file === "url-inspections.json" ? sidecar : null), "fixture");
}

export function gateResult(gate: GateName, status: GateResult["status"] = "PASS", failureIds: string[] = []): GateResult {
  return {
    gate,
    command: `fixture ${gate}`,
    status,
    exitCode: status === "NOT_RUN" ? null : status === "PASS" ? 0 : 1,
    summary: status === "PASS" ? "ok" : status === "FAIL" ? "failed" : "not run",
    failureIds,
    ranAt: status === "NOT_RUN" ? null : NOW.toISOString(),
  };
}

export function guardianInputs(overrides: Partial<GuardianInputs> = {}): GuardianInputs {
  return {
    now: NOW,
    git: { branch: "claude/test", headSha: SHA, baseSha: SHA, dirtyPaths: [], changedFiles: [], commitsAheadOfBase: 0, pushedToRemote: null },
    worktrees: [],
    gates: REQUIRED_GATES.map((gate) => gateResult(gate)),
    baseline: null,
    protection: { affectedUrls: [], affectedNonEditable: [], sharedTemplateChanged: false },
    production: null,
    renderedDiff: null,
    ...overrides,
  };
}

/** A Guardian report with every gate green and nothing dirty (RELEASE_ALLOWED), or with the given failing gates. */
export function makeGuardian(failing: GateName[] = []): GuardianReport {
  return runGuardian(guardianInputs({ gates: REQUIRED_GATES.map((gate) => gateResult(gate, failing.includes(gate) ? "FAIL" : "PASS", failing.includes(gate) ? [`${gate}-failure`] : [])) }));
}
