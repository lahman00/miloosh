import type { Blocker, DemandClass, MeasuredWindowView } from "./contracts";
import { addDays, compareDates, inclusiveDays, round, valueOf, type DateWindow, type Measured } from "./evidence";
import {
  findPagesTable,
  lookupPage,
  pageQueryEvidence,
  type GscDatesTable,
  type GscEvidence,
  type PagePerformance,
} from "./gsc-import";
import { postReleaseCrawlObserved, type IndexationEvidence, type UrlInspection } from "./indexation";
import { derivedUrls, type PageInventoryEntry, type SiteInventory } from "./inventory";
import { summarizeIntent } from "./intent";
import { isChangeSafe, protectionFor, summarizeVerdicts, type ProtectionResult, type ProtectionSnapshot, type ProtectionVerdict } from "./protection";
import { classifyPage, pathOf, type PageKind } from "./urls";

/**
 * Google Recovery Agent: a pure function from captured evidence to a diagnosis
 * of where organic visibility was lost, what blocks acting on each page, and
 * the single next step.
 *
 * It never edits anything, never calls the network and never turns a missing
 * measurement into a number. Thresholds below are operating choices of this
 * project, labelled as such in the report; none is a statement about how
 * Google ranks pages.
 */

export type RecoveryConfig = {
  /** A page needs at least this many impressions in the historical window to be a recovery candidate. Matches the repo's HIGH_IMPRESSION floor of 20. */
  minHistoricalImpressions: number;
  /** Impressions in the finalised recent window at or above which demand counts as currently verified. Matches the repo evidence floor of 10. */
  currentDemandFloor: number;
  /** A page that ranked (average position 20 or better) also qualifies with this many impressions, because it proved Google could place it. */
  minImpressionsForRankedPage: number;
  /** Candidates returned in the shortlist. */
  shortlistSize: number;
  /** Review window after a change, in days (14/28-day contract; 28 is the full window). */
  observationDays: number;
};

export const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  minHistoricalImpressions: 20,
  currentDemandFloor: 10,
  minImpressionsForRankedPage: 5,
  shortlistSize: 5,
  observationDays: 28,
};

/** Evidence about one page that is gathered outside the performance tables. Every field is optional: absent means not checked. */
export type PageExtras = {
  live?: Measured<{ status: number; canonical: string | null; robotsMeta: string | null; xRobotsTag: string | null; indexable: boolean }>;
  intent?: Measured<{ queries: Array<{ query: string; impressions: number }>; commercial: boolean }>;
  /** The sponsored links the rendered page actually carries, mapped to active partners by the product named in the link text. */
  rendered?: Measured<{ sponsoredLinkCount: number; partnerSlugs: string[]; unmatchedAnchorTexts: string[] }>;
  /** True only when the gap was confirmed against current official vendor documentation. */
  contentGapConfirmedAgainstVendor?: boolean;
};

/** Whether a call to action on the page leads to a verified partner. `extras` carries what was observed on the rendered page, when it was read. */
export type MonetizationLookup = (url: string, extras?: PageExtras) => { verified: boolean | null; detail: string; /** Partners whose call to action the registry says the page shows. */ expectedPartnerSlugs?: string[] };

export type GoogleRecoveryInputs = {
  now: Date;
  gsc: GscEvidence | null;
  protection: ProtectionSnapshot | null;
  inventory: SiteInventory | null;
  indexation: IndexationEvidence | null;
  extras?: ReadonlyMap<string, PageExtras>;
  monetization?: MonetizationLookup;
  /** Production release date (YYYY-MM-DD) used to test whether Google crawled anything since. */
  releaseDate?: string;
  config?: Partial<RecoveryConfig>;
};

export type GateId =
  | "PROTECTION_CLEAR"
  | "DERIVED_PAGES_CLEAR"
  | "PUBLISHED"
  | "DEMAND_MEASURED"
  | "POSITIVE_LOSS"
  | "LIVE_TECHNICAL"
  | "GOOGLE_COVERAGE"
  | "BUYER_INTENT"
  | "CONTENT_GAP"
  | "MONETIZATION_PATH";

export type Gate = { id: GateId; status: "PASS" | "FAIL" | "UNKNOWN"; detail: string };

export type PageEvaluation = {
  url: string;
  kind: PageKind;
  slug: string | null;
  /** Product slugs whose records feed the page: [slug] for software, [a, b] for a comparison. */
  softwareSlugs: string[];
  /** Other products a software page shows a call to action for (decision-guide alternatives, buyer-checklist options). Empty for other page types. */
  otherCtaSlugs: string[];
  title: string | null;
  historical: MeasuredWindowView;
  recent: MeasuredWindowView;
  dailyImpressionLoss: number | null;
  declinePercent: number | null;
  /** Daily loss using the skill calculator's convention: whole-window days as the denominator. */
  dailyImpressionLossWindowBasis: number | null;
  demandClass: DemandClass;
  rankingBand: "PAGE_ONE" | "STRIKING_DISTANCE" | "DEEP" | "UNKNOWN";
  protection: ProtectionResult;
  derived: { total: number; blocking: Array<{ url: string; verdict: string }> };
  inventory: { published: boolean; inSitemapPerCode: boolean | null; qualityGateReady: boolean | null; qualityGateReasons: string[] };
  coverage: { state: string; lastCrawl: string | null; evidence: string } | null;
  /** What the searches that reached this page say about buyer intent, from a captured queries table or from explicit per-page evidence; null when neither exists. */
  intent: { source: "EXPLICIT" | "GSC_QUERY_TABLE"; commercial: boolean | null; listedQueries: number; listedImpressions: number; decisionQueries: number | null; decisionShare: number | null } | null;
  /** Sponsored links read from the rendered page, when the page was read; null otherwise. */
  renderedCtas: { sponsoredLinkCount: number; partnerSlugs: string[] } | null;
  gates: Gate[];
  /** Every gate passed, including a verified monetization path. */
  eligible: boolean;
  /** Every gate except the monetization path passed: a visibility-only recovery with no partner involved. */
  eligibleEditorial: boolean;
  blockers: Blocker[];
};

export type FamilyRow = {
  family: PageKind;
  historicalPagesListed: number;
  historicalImpressions: number;
  recentPagesListed: number;
  recentImpressions: number;
};

export type DailyObservation = {
  peak: { date: string; impressions: number } | null;
  largestDrop: { from: string; to: string; fromImpressions: number; toImpressions: number; dropPercent: number } | null;
  /** Same-window context only. Timing is an observation; the report never names a cause. */
  note: string;
};

export type PropertyWindowSummary = {
  window: DateWindow;
  windowDays: number;
  observedDays: number;
  finalized: boolean;
  clicks: number | null;
  impressions: number | null;
  impressionsBasis: "DAILY_SERIES_SUM" | "PAGE_ROW_SUM" | "NOT_MEASURED";
  pageRowImpressions: number | null;
  pageRowsListed: number | null;
  impressionsPerObservedDay: number | null;
};

export type Barrier = {
  id: string;
  kind: "TECHNICAL" | "INDEXATION" | "DEMAND" | "SITE_HYPOTHESIS" | "CONTENT_HYPOTHESIS";
  label: "OBSERVED" | "SUPPORTED_HYPOTHESIS" | "NOT_VERIFIED";
  statement: string;
  evidence: string[];
};

export type RecoveryNextAction = {
  kind: "HANDOFF_TO_PAGE_UPGRADER" | "COLLECT_EVIDENCE" | "WAIT_FOR_OBSERVATION" | "OWNER_DECISION" | "NEEDS_DATA";
  summary: string;
  /** Page the action concerns, when there is one. */
  url: string | null;
  /** For waiting actions: the first date the situation can change. */
  eligibleAfter: string | null;
  steps: string[];
};

export type GoogleRecoveryReport = {
  status: "OK" | "NEEDS_DATA";
  generatedAt: string;
  checkoutSha: string | null;
  config: RecoveryConfig;
  missingInputs: Array<{ input: string; howToProvide: string }>;
  windows: { historical: PropertyWindowSummary | null; recent: PropertyWindowSummary | null; dataThrough: string | null; capturedAt: string | null; capturedVia: "ui-table-capture" | "ui-export-csv" | "api" | null };
  daily: DailyObservation | null;
  families: FamilyRow[];
  /** Protection verdict of every page the historical Pages table lists (home, legal and other pages included), so the owner sees how much of what Google showed is locked. */
  protectionSummary: { pagesChecked: number; verdicts: Record<ProtectionVerdict, number> } | null;
  indexation: {
    sitemap: IndexationEvidence["sitemap"] | null;
    coverage: IndexationEvidence["coverage"] | null;
    crawlStats: IndexationEvidence["crawlStats"] | null;
    postReleaseCrawl: { sampled: number; crawledAfterRelease: number; newestCrawl: string | null; releaseDate: string } | null;
    coverageReportOlderThanRelease: boolean | null;
  };
  barriers: Barrier[];
  candidates: PageEvaluation[];
  shortlist: PageEvaluation[];
  technicalTriage: Array<{ url: string; historicalImpressions: number; reason: string }>;
  cannibalization: { status: "NOT_MEASURED"; reason: string; howToMeasure: string };
  keywordDifficulty: { status: "NOT_VERIFIED"; reason: string };
  nextAction: RecoveryNextAction;
  warnings: string[];
};

export const GSC_IMPORT_HOW_TO =
  "Capture the Search Console Performance > Pages table for a finalised historical window and a finalised recent window (same property, Web, no filters), plus the daily Dates table, into a capture directory with a manifest.json (see docs/growth/receipts/20261009-growth-agent-system/evidence/gsc-ui-capture-20261009 for a worked example), then run the director with --gsc-dir <directory>.";

function toWindowView(perf: PagePerformance, role: "historical" | "recent"): MeasuredWindowView {
  if (perf.state === "UNAVAILABLE") {
    return { state: "UNAVAILABLE", impressions: null, clicks: null, position: null, window: null, impressionsPerDay: null, note: perf.reason };
  }
  const table = perf.table;
  const days = role === "historical" ? table.observedDays : table.windowDays;
  if (perf.state === "MEASURED") {
    return {
      state: "MEASURED",
      impressions: perf.metrics.impressions,
      clicks: perf.metrics.clicks,
      position: perf.metrics.position,
      window: table.window,
      impressionsPerDay: days > 0 ? round(perf.metrics.impressions / days, 3) : null,
    };
  }
  if (perf.state === "EXACT_EMPTY") {
    return { state: "ZERO_BY_EXACT_PAGE_CHECK", impressions: 0, clicks: 0, position: null, window: table.window, impressionsPerDay: 0, note: `exact-page check ${perf.check.checkedAt}` };
  }
  if (perf.state === "ABSENT_FROM_COMPLETE_TABLE") {
    return { state: "ZERO_BY_COMPLETE_TABLE", impressions: 0, clicks: 0, position: null, window: table.window, impressionsPerDay: 0, note: perf.justification };
  }
  return { state: "NOT_OBSERVED", impressions: null, clicks: null, position: null, window: table.window, impressionsPerDay: null, note: perf.reason };
}

function demandClassOf(historical: MeasuredWindowView, recent: MeasuredWindowView, config: RecoveryConfig): DemandClass {
  if (recent.impressions === null || historical.impressions === null) return "UNKNOWN";
  if (recent.impressions >= config.currentDemandFloor) return "CURRENT_VERIFIED";
  if (recent.impressions > 0) return "CURRENT_TRACE";
  return historical.impressions > 0 ? "HISTORICAL_ONLY" : "NO_MEASURED_DEMAND";
}

function rankingBandOf(position: number | null): PageEvaluation["rankingBand"] {
  if (position === null) return "UNKNOWN";
  if (position <= 10) return "PAGE_ONE";
  if (position <= 30) return "STRIKING_DISTANCE";
  return "DEEP";
}

function sumDays(table: GscDatesTable, startDay: string, endDay: string): { impressions: number; clicks: number; complete: boolean; days: number } {
  const required = inclusiveDays(startDay, endDay);
  let impressions = 0;
  let clicks = 0;
  let days = 0;
  for (const day of table.days) {
    if (compareDates(day.date, startDay) < 0 || compareDates(day.date, endDay) > 0) continue;
    if (!day.final) continue;
    impressions += day.impressions;
    clicks += day.clicks;
    days += 1;
  }
  return { impressions, clicks, complete: days === required, days };
}

function summarizeProperty(evidence: GscEvidence, role: "historical" | "recent"): PropertyWindowSummary | null {
  const pages = findPagesTable(evidence, role);
  if (!pages) return null;
  const dateTables = evidence.tables.filter((t): t is GscDatesTable => t.kind === "dates");
  let fromDaily: { impressions: number; clicks: number } | null = null;
  for (const table of dateTables) {
    const startDay = addDays(pages.window.end, -(pages.observedDays - 1));
    const sum = sumDays(table, startDay, pages.window.end);
    if (sum.complete && sum.days > 0) {
      fromDaily = { impressions: sum.impressions, clicks: sum.clicks };
      break;
    }
  }
  const impressions = fromDaily?.impressions ?? null;
  return {
    window: pages.window,
    windowDays: pages.windowDays,
    observedDays: pages.observedDays,
    finalized: pages.finalized,
    clicks: fromDaily?.clicks ?? pages.propertyTotals?.clicks ?? null,
    impressions,
    impressionsBasis: impressions !== null ? "DAILY_SERIES_SUM" : "NOT_MEASURED",
    pageRowImpressions: pages.rowSum.impressions,
    pageRowsListed: pages.rowsCaptured,
    impressionsPerObservedDay: impressions !== null && pages.observedDays > 0 ? round(impressions / pages.observedDays, 2) : null,
  };
}

function observeDaily(evidence: GscEvidence): DailyObservation | null {
  const days = evidence.tables
    .filter((t): t is GscDatesTable => t.kind === "dates")
    .flatMap((t) => t.days)
    .filter((d) => d.final)
    .sort((a, b) => a.date.localeCompare(b.date));
  const unique = new Map(days.map((d) => [d.date, d]));
  const series = [...unique.values()];
  if (series.length < 2) return null;
  const peak = series.reduce((best, d) => (d.impressions > best.impressions ? d : best), series[0]!);
  let largestDrop: DailyObservation["largestDrop"] = null;
  for (let i = 1; i < series.length; i += 1) {
    const before = series[i - 1]!;
    const after = series[i]!;
    if (before.impressions < 100 || compareDates(after.date, addDays(before.date, 1)) !== 0) continue;
    const drop = ((before.impressions - after.impressions) / before.impressions) * 100;
    if (!largestDrop || drop > largestDrop.dropPercent) {
      largestDrop = { from: before.date, to: after.date, fromImpressions: before.impressions, toImpressions: after.impressions, dropPercent: round(drop, 1) };
    }
  }
  return {
    peak: { date: peak.date, impressions: peak.impressions },
    largestDrop,
    note: "Observed in the property's finalised daily series. Timing is reported; no cause is asserted.",
  };
}

function familyTable(evidence: GscEvidence, inventory: SiteInventory | null): FamilyRow[] {
  const rows = new Map<PageKind, FamilyRow>();
  const ensure = (family: PageKind): FamilyRow => {
    const existing = rows.get(family);
    if (existing) return existing;
    const created: FamilyRow = { family, historicalPagesListed: 0, historicalImpressions: 0, recentPagesListed: 0, recentImpressions: 0 };
    rows.set(family, created);
    return created;
  };
  for (const role of ["historical", "recent"] as const) {
    const table = findPagesTable(evidence, role);
    if (!table) continue;
    for (const record of table.pages.values()) {
      const family = classifyPage(record.canonicalUrl, inventory?.routes ?? {}).kind;
      const row = ensure(family);
      if (role === "historical") {
        row.historicalPagesListed += 1;
        row.historicalImpressions += record.metrics.impressions;
      } else {
        row.recentPagesListed += 1;
        row.recentImpressions += record.metrics.impressions;
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.historicalImpressions - a.historicalImpressions || a.family.localeCompare(b.family));
}

function blocker(partial: Blocker): Blocker {
  return partial;
}

function inspectionFor(indexation: IndexationEvidence | null, url: string): UrlInspection | null {
  const m = indexation?.inspections.get(url);
  return m ? valueOf(m) : null;
}

export type EvaluationInputs = {
  gsc: GscEvidence;
  protection: ProtectionSnapshot;
  inventory: SiteInventory;
  indexation: IndexationEvidence | null;
  extras?: ReadonlyMap<string, PageExtras>;
  monetization?: MonetizationLookup;
  now: Date;
};

export function evaluatePage(url: string, inputs: EvaluationInputs, config: RecoveryConfig): PageEvaluation {
  const { gsc, protection, inventory, indexation } = inputs;
  const identity = classifyPage(url, inventory.routes);
  const entry: PageInventoryEntry | undefined = inventory.pages.get(url);
  const historical = toWindowView(lookupPage(gsc, "historical", url), "historical");
  const recent = toWindowView(lookupPage(gsc, "recent", url), "recent");

  const histRate = historical.impressionsPerDay;
  const recentRate = recent.impressionsPerDay;
  const dailyLoss = histRate !== null && recentRate !== null ? round(histRate - recentRate, 3) : null;
  const histWindowDays = historical.window ? inclusiveDays(historical.window.start, historical.window.end) : null;
  const dailyLossWindowBasis =
    historical.impressions !== null && recent.impressions !== null && histWindowDays && recent.window
      ? round(historical.impressions / histWindowDays - recent.impressions / inclusiveDays(recent.window.start, recent.window.end), 3)
      : null;
  const declinePercent = dailyLoss !== null && histRate !== null && histRate > 0 ? round((dailyLoss / histRate) * 100, 1) : null;

  const demandClass = demandClassOf(historical, recent, config);
  const protectionResult = protectionFor(url, protection);
  const derivedList = derivedUrls(inventory, url).filter((u) => u !== url);
  const derivedResults = derivedList.map((u) => protectionFor(u, protection));
  const blockingDerived = derivedResults.filter((r) => r.verdict !== "EDITABLE").map((r) => ({ url: r.url, verdict: r.verdict }));

  const published = entry !== undefined || inventory.sitemapPaths.has(pathOf(url));
  const inspection = inspectionFor(indexation, url);
  const lastSample = indexation?.lastCrawlSamples.get(url) ?? null;
  const extras = inputs.extras?.get(url);
  const monetization = inputs.monetization?.(url, extras) ?? { verified: null, detail: "no monetization lookup was provided" };

  const blockers: Blocker[] = [];
  const gates: Gate[] = [];
  const addGate = (id: GateId, status: Gate["status"], detail: string) => gates.push({ id, status, detail });

  // 1. Protection of the page itself.
  if (protectionResult.verdict === "EDITABLE") addGate("PROTECTION_CLEAR", "PASS", "No protection source claims the page and every source was read.");
  else if (protectionResult.verdict === "UNKNOWN") {
    addGate("PROTECTION_CLEAR", "UNKNOWN", `Protection sources not read: ${protectionResult.unreadSources.join(", ")}.`);
    blockers.push(blocker({ code: "PROTECTION_UNKNOWN", detail: `Unread protection sources: ${protectionResult.unreadSources.join(", ")}.`, resolvableBy: "AGENT_EVIDENCE", nextInput: "Re-run protection discovery with the registries and git readable." }));
  } else if (protectionResult.verdict === "OBSERVATION_WINDOW") {
    addGate("PROTECTION_CLEAR", "FAIL", `In an observation window until ${protectionResult.eligibleAfter ?? "an unknown date"}.`);
    blockers.push(blocker({ code: "OBSERVATION_WINDOW_ACTIVE", detail: protectionResult.reasons.map((r) => r.detail).join(" "), resolvableBy: "WAIT_UNTIL", ...(protectionResult.eligibleAfter ? { eligibleAfter: protectionResult.eligibleAfter } : {}) }));
  } else if (protectionResult.verdict === "IN_FLIGHT") {
    addGate("PROTECTION_CLEAR", "FAIL", "Another worktree holds unfinished work on this page.");
    blockers.push(blocker({ code: "IN_FLIGHT_WORK", detail: protectionResult.reasons.map((r) => `${r.detail} (${r.evidence})`).join(" "), resolvableBy: "OWNER_DECISION" }));
  } else {
    addGate("PROTECTION_CLEAR", "FAIL", "Member of a protected experiment or cohort.");
    blockers.push(blocker({ code: "PROTECTED_EXPERIMENT", detail: protectionResult.reasons.map((r) => `${r.detail} (${r.evidence})`).join(" "), resolvableBy: "OWNER_DECISION" }));
  }

  // 2. Pages that re-render when this page's data changes.
  if (blockingDerived.length === 0) addGate("DERIVED_PAGES_CLEAR", "PASS", `${derivedList.length} derived page(s), none protected, observed or in flight.`);
  else {
    addGate("DERIVED_PAGES_CLEAR", "FAIL", `${blockingDerived.length} of ${derivedList.length} derived page(s) are not editable.`);
    blockers.push(blocker({
      code: "DERIVED_PAGE_BLOCKED",
      detail: `Editing this page's shared data would also change ${blockingDerived.length} page(s) that are protected, observed or in flight, for example ${blockingDerived.slice(0, 3).map((b) => `${pathOf(b.url)} (${b.verdict})`).join(", ")}. A page-owned override avoids shared data.`,
      resolvableBy: "OWNER_DECISION",
    }));
  }

  // 3. The code publishes the URL.
  if (published) addGate("PUBLISHED", "PASS", entry ? "The checked-out code publishes the page." : "A static route listed by the sitemap builder.");
  else {
    addGate("PUBLISHED", "FAIL", "The checked-out code does not publish this URL.");
    blockers.push(blocker({ code: "NOT_PUBLISHED_BY_CODE", detail: "The URL has historical impressions but no route in the checked-out code; it may 404 or redirect today.", resolvableBy: "AGENT_EVIDENCE", nextInput: "Fetch the live URL and record its status and redirect target." }));
  }

  // 4. Demand is measured on both sides.
  if (historical.impressions === null || recent.impressions === null) {
    addGate("DEMAND_MEASURED", "UNKNOWN", `Historical: ${historical.state}; recent: ${recent.state}.`);
    blockers.push(blocker({ code: "RECENT_DEMAND_NOT_VERIFIED", detail: `Recent impressions are ${recent.state} for this page.`, resolvableBy: "AGENT_EVIDENCE", nextInput: "Run an exact-page, no-extra-dimension Search Console check for the recent window." }));
  } else if (historical.impressions < config.minHistoricalImpressions && !(historical.position !== null && historical.position <= 20 && historical.impressions >= config.minImpressionsForRankedPage)) {
    addGate("DEMAND_MEASURED", "FAIL", `Only ${historical.impressions} historical impressions; the floor is ${config.minHistoricalImpressions} (or ${config.minImpressionsForRankedPage} at an average position of 20 or better).`);
    blockers.push(blocker({ code: "NO_MEASURED_HISTORICAL_DEMAND", detail: `${historical.impressions} historical impressions is below the ${config.minHistoricalImpressions}-impression operating floor.`, resolvableBy: "NOT_RESOLVABLE" }));
  } else addGate("DEMAND_MEASURED", "PASS", `${historical.impressions} historical and ${recent.impressions} recent impressions, both measured.`);

  // 5. Demand was actually lost.
  if (dailyLoss === null) addGate("POSITIVE_LOSS", "UNKNOWN", "A daily loss needs both windows measured.");
  else if (dailyLoss > 0) addGate("POSITIVE_LOSS", "PASS", `Impressions per day fell by ${dailyLoss}.`);
  else {
    addGate("POSITIVE_LOSS", "FAIL", "Impressions per day did not fall.");
    blockers.push(blocker({ code: "NO_POSITIVE_DEMAND_LOSS", detail: "The page did not lose impressions per day between the windows.", resolvableBy: "NOT_RESOLVABLE" }));
  }

  // 6. Live technical state.
  const live = extras?.live ? valueOf(extras.live) : null;
  if (!live) {
    addGate("LIVE_TECHNICAL", "UNKNOWN", "No live response check is on record.");
    blockers.push(blocker({ code: "LIVE_TECHNICAL_NOT_CHECKED", detail: "The current public response, canonical and robots directives were not checked.", resolvableBy: "AGENT_EVIDENCE", nextInput: "Fetch the live URL: status, canonical, robots meta and X-Robots-Tag." }));
  } else if (live.indexable) addGate("LIVE_TECHNICAL", "PASS", `HTTP ${live.status}, self-consistent canonical, no noindex.`);
  else {
    addGate("LIVE_TECHNICAL", "FAIL", `HTTP ${live.status}; canonical ${live.canonical ?? "none"}; robots ${live.robotsMeta ?? live.xRobotsTag ?? "none"}.`);
    blockers.push(blocker({ code: "LIVE_TECHNICAL_DEFECT", detail: "The live page has a status, canonical or robots defect; repair that before any content work.", resolvableBy: "CODE_CHANGE" }));
  }

  // 7. Google's own coverage view of this URL.
  if (inspection) addGate("GOOGLE_COVERAGE", "PASS", `${inspection.coverageState}; last crawl ${inspection.lastCrawl ?? "not available"}; read ${inspection.inspectedAt.slice(0, 10)}.`);
  else if (lastSample) addGate("GOOGLE_COVERAGE", "UNKNOWN", `Only a sampled last-crawl date (${lastSample.date}) exists; the coverage wording was not read.`);
  else {
    addGate("GOOGLE_COVERAGE", "UNKNOWN", "No URL Inspection reading is on record.");
  }
  if (!inspection) {
    blockers.push(blocker({ code: "GOOGLE_COVERAGE_NOT_CHECKED", detail: "Google's indexed-version coverage and last crawl for this URL were not read.", resolvableBy: "AGENT_EVIDENCE", nextInput: "URL Inspection indexed-version lookup (not a live test, not an indexing request)." }));
  }

  // 8. Commercial buyer intent: explicit per-page evidence wins; otherwise the page's own captured queries table.
  const explicitIntent = extras?.intent ? valueOf(extras.intent) : null;
  const queryEvidence = explicitIntent ? null : pageQueryEvidence(gsc, "historical", url);
  const derivedIntent = queryEvidence && queryEvidence.state === "MEASURED" ? summarizeIntent(queryEvidence.table.queries.map((q) => ({ query: q.query, impressions: q.metrics.impressions }))) : null;
  let intentView: PageEvaluation["intent"] = null;
  if (explicitIntent) {
    intentView = { source: "EXPLICIT", commercial: explicitIntent.commercial, listedQueries: explicitIntent.queries.length, listedImpressions: explicitIntent.queries.reduce((sum, q) => sum + q.impressions, 0), decisionQueries: null, decisionShare: null };
    if (explicitIntent.commercial) addGate("BUYER_INTENT", "PASS", `${explicitIntent.queries.length} query row(s) show commercial intent.`);
    else {
      addGate("BUYER_INTENT", "FAIL", "Observed queries are not commercial decisions.");
      blockers.push(blocker({ code: "BUYER_INTENT_NOT_CONFIRMED", detail: "The observed queries do not describe a purchase decision.", resolvableBy: "NOT_RESOLVABLE" }));
    }
  } else if (derivedIntent && queryEvidence?.state === "MEASURED") {
    intentView = { source: "GSC_QUERY_TABLE", commercial: derivedIntent.commercial, listedQueries: derivedIntent.listedQueries, listedImpressions: derivedIntent.listedImpressions, decisionQueries: derivedIntent.decisionQueries, decisionShare: derivedIntent.decisionShare };
    const percent = derivedIntent.decisionShare === null ? "n/a" : `${Math.round(derivedIntent.decisionShare * 100)}%`;
    const facts = `${derivedIntent.decisionQueries} of ${derivedIntent.listedQueries} listed queries (${derivedIntent.decisionImpressions} of ${derivedIntent.listedImpressions} listed impressions, ${percent}) ask to compare, replace or price a product. ${queryEvidence.note}.`;
    if (derivedIntent.commercial === true) addGate("BUYER_INTENT", "PASS", facts);
    else if (derivedIntent.commercial === false) {
      addGate("BUYER_INTENT", "FAIL", `Most listed searches are not purchase decisions: ${facts}`);
      blockers.push(blocker({ code: "BUYER_INTENT_NOT_CONFIRMED", detail: "The searches that reached this page do not mostly describe a purchase decision.", resolvableBy: "NOT_RESOLVABLE" }));
    } else {
      addGate("BUYER_INTENT", "UNKNOWN", `Too few impressions are listed to classify intent: ${facts}`);
      blockers.push(blocker({ code: "BUYER_INTENT_NOT_CONFIRMED", detail: "The page's query table lists too few impressions to say what searchers wanted.", resolvableBy: "AGENT_EVIDENCE", nextInput: "A larger window or a complete query table for this exact page." }));
    }
  } else {
    addGate("BUYER_INTENT", "UNKNOWN", `No page-level query evidence is on record; intent rests on the page type only${queryEvidence && queryEvidence.state === "NOT_OBSERVED" ? ` (${queryEvidence.reason})` : ""}.`);
    blockers.push(blocker({ code: "BUYER_INTENT_NOT_CONFIRMED", detail: "Query-level evidence tying this page to a commercial decision was not captured.", resolvableBy: "AGENT_EVIDENCE", nextInput: "Search Console query table filtered to this exact page, historical window." }));
  }

  // 9. Content gap, confirmed against the vendor.
  if (extras?.contentGapConfirmedAgainstVendor === true) addGate("CONTENT_GAP", "PASS", "A buyer-information gap was confirmed against current official vendor documentation.");
  else {
    const reasons = entry?.qualityGate && !entry.qualityGate.ready ? ` Repository quality gate reasons: ${entry.qualityGate.reasons.join(", ")}.` : "";
    addGate("CONTENT_GAP", "UNKNOWN", `No gap has been confirmed against current official vendor sources.${reasons}`);
    blockers.push(blocker({ code: "CONTENT_GAP_NOT_CONFIRMED", detail: `A content gap is a hypothesis until it is checked against the vendor's current documentation.${reasons}`, resolvableBy: "AGENT_EVIDENCE", nextInput: "Hand the page to miloosh-money-page-upgrader for vendor-source verification." }));
  }

  // 10. Monetization path. The registry says which partner calls to action the page should carry; the rendered page, when read, is the ground truth.
  const rendered = extras?.rendered ? valueOf(extras.rendered) : null;
  const expectedPartners = monetization.expectedPartnerSlugs ?? [];
  if (monetization.verified === true) {
    if (rendered && expectedPartners.length > 0 && expectedPartners.every((slug) => !rendered.partnerSlugs.includes(slug))) {
      addGate("MONETIZATION_PATH", "UNKNOWN", `${monetization.detail} But the rendered page shows no sponsored link for ${expectedPartners.join(", ")} (it shows ${rendered.partnerSlugs.length > 0 ? rendered.partnerSlugs.join(", ") : "none"}).`);
      blockers.push(blocker({ code: "MONETIZATION_NOT_VERIFIED", detail: "The registry expects a partner call to action that the rendered page does not show.", resolvableBy: "CODE_CHANGE" }));
    } else {
      addGate("MONETIZATION_PATH", "PASS", rendered ? `${monetization.detail} The rendered page shows sponsored links for: ${rendered.partnerSlugs.join(", ") || "none"}.` : monetization.detail);
    }
  } else if (monetization.verified === false) {
    addGate("MONETIZATION_PATH", "FAIL", monetization.detail);
    blockers.push(blocker({ code: "NO_ACTIVE_PARTNER", detail: monetization.detail, resolvableBy: "OWNER_DECISION" }));
  } else {
    addGate("MONETIZATION_PATH", "UNKNOWN", monetization.detail);
    blockers.push(blocker({ code: "MONETIZATION_NOT_VERIFIED", detail: monetization.detail, resolvableBy: "AGENT_EVIDENCE", nextInput: "Registry, issued-link and payout-rail evidence for the partner(s)." }));
  }

  const safe = isChangeSafe([protectionResult, ...derivedResults]);
  const eligible = gates.every((g) => g.status === "PASS") && safe;
  const eligibleEditorial = gates.filter((g) => g.id !== "MONETIZATION_PATH").every((g) => g.status === "PASS") && safe;

  return {
    url,
    kind: identity.kind,
    slug: identity.slug,
    softwareSlugs: entry?.softwareSlugs ?? [],
    otherCtaSlugs: entry?.otherCtaSlugs ?? [],
    title: entry?.title ?? null,
    historical,
    recent,
    dailyImpressionLoss: dailyLoss,
    declinePercent,
    dailyImpressionLossWindowBasis: dailyLossWindowBasis,
    demandClass,
    rankingBand: rankingBandOf(historical.position),
    protection: protectionResult,
    derived: { total: derivedList.length, blocking: blockingDerived },
    inventory: {
      published,
      inSitemapPerCode: entry ? entry.inSitemap : published ? true : null,
      qualityGateReady: entry?.qualityGate ? entry.qualityGate.ready : null,
      qualityGateReasons: entry?.qualityGate?.reasons ?? [],
    },
    coverage: inspection
      ? { state: inspection.coverageState, lastCrawl: inspection.lastCrawl, evidence: "URL inspection (indexed version)" }
      : lastSample
        ? { state: "NOT_VERIFIED", lastCrawl: lastSample.date, evidence: lastSample.evidence }
        : null,
    intent: intentView,
    renderedCtas: rendered ? { sponsoredLinkCount: rendered.sponsoredLinkCount, partnerSlugs: rendered.partnerSlugs } : null,
    gates,
    eligible,
    eligibleEditorial,
    blockers,
  };
}

/** Deterministic order: eligible first, then current demand before historical-only, larger daily loss first, URL as the final tie-break. */
export function compareEvaluations(a: PageEvaluation, b: PageEvaluation): number {
  if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
  if (a.eligibleEditorial !== b.eligibleEditorial) return a.eligibleEditorial ? -1 : 1;
  const rank = (e: PageEvaluation) => (e.demandClass === "CURRENT_VERIFIED" ? 0 : e.demandClass === "CURRENT_TRACE" ? 1 : e.demandClass === "HISTORICAL_ONLY" ? 2 : 3);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  const lossA = a.dailyImpressionLoss ?? Number.NEGATIVE_INFINITY;
  const lossB = b.dailyImpressionLoss ?? Number.NEGATIVE_INFINITY;
  if (lossA !== lossB) return lossB - lossA;
  return a.url.localeCompare(b.url);
}

function indexationFacts(inputs: GoogleRecoveryInputs, releaseDate: string | undefined, shortlistUrls: readonly string[]): GoogleRecoveryReport["indexation"] {
  const indexation = inputs.indexation;
  if (!indexation) {
    return { sitemap: null, coverage: null, crawlStats: null, postReleaseCrawl: null, coverageReportOlderThanRelease: null };
  }
  let post: GoogleRecoveryReport["indexation"]["postReleaseCrawl"] = null;
  if (releaseDate) {
    const all = [...indexation.lastCrawlSamples.keys()];
    const urls = all.length > 0 ? all : shortlistUrls;
    post = { ...postReleaseCrawlObserved(indexation, urls, releaseDate), releaseDate };
  }
  const coverage = valueOf(indexation.coverage);
  return {
    sitemap: indexation.sitemap,
    coverage: indexation.coverage,
    crawlStats: indexation.crawlStats,
    postReleaseCrawl: post,
    coverageReportOlderThanRelease: coverage && releaseDate ? compareDates(coverage.reportLastUpdated, releaseDate) < 0 : null,
  };
}

/** Pages the snapshot holds inside a recent-change observation window (release-observation signals). */
function observationWindowPages(protection: ProtectionSnapshot): number {
  let count = 0;
  for (const reasons of protection.byUrl.values()) if (reasons.some((r) => r.kind === "OBSERVATION_WINDOW")) count += 1;
  return count;
}

function buildBarriers(windows: GoogleRecoveryReport["windows"], daily: DailyObservation | null, indexation: GoogleRecoveryReport["indexation"], observationWindowPages: number): Barrier[] {
  const barriers: Barrier[] = [];
  const recent = windows.recent;
  const historical = windows.historical;
  if (recent && recent.impressions !== null) {
    const against =
      historical && historical.impressions !== null
        ? `, against ${historical.impressions} impression(s) over ${historical.observedDays} observed day(s) of the historical window (${historical.window.start} to ${historical.window.end})`
        : "";
    const rate =
      historical?.impressionsPerObservedDay != null && recent.impressionsPerObservedDay != null
        ? ` Impressions per observed day: ${historical.impressionsPerObservedDay} before, ${recent.impressionsPerObservedDay} now.`
        : "";
    barriers.push({
      id: "CURRENT_DEMAND",
      kind: "DEMAND",
      label: "OBSERVED",
      statement: `Property-wide, the finalised recent window (${recent.window.start} to ${recent.window.end}, ${recent.windowDays} days) shows ${recent.clicks ?? "an unmeasured number of"} click(s) and ${recent.impressions} impression(s)${against}.${rate}`,
      evidence: ["Search Console capture: daily series and Pages table of both windows"],
    });
  }
  const sitemap = indexation.sitemap ? valueOf(indexation.sitemap) : null;
  if (sitemap) {
    barriers.push({
      id: "SITEMAP_READ",
      kind: "TECHNICAL",
      label: "OBSERVED",
      statement:
        sitemap.status === "SUCCESS"
          ? `Google read ${sitemap.url} on ${sitemap.lastRead} with status SUCCESS and discovered ${sitemap.discoveredPages} pages. The sitemap report shows no discovery error.`
          : `Google read ${sitemap.url} on ${sitemap.lastRead} with status ${sitemap.status} and discovered ${sitemap.discoveredPages} pages; that status needs attention before any content conclusion is drawn.`,
      evidence: ["Search Console sitemap report (sitemaps.json sidecar)"],
    });
  }
  const coverage = indexation.coverage ? valueOf(indexation.coverage) : null;
  if (coverage) {
    barriers.push({
      id: "INDEXATION_BACKLOG",
      kind: "INDEXATION",
      label: "OBSERVED",
      statement: `As of the report Google last updated on ${coverage.reportLastUpdated}, ${coverage.indexed} pages were indexed and ${coverage.notIndexed} known pages were not. "Crawled - currently not indexed" is a symptom to explain, not a root cause.`,
      evidence: ["Search Console page-indexing report (page-indexing.json sidecar)"],
    });
  }
  if (indexation.postReleaseCrawl) {
    const p = indexation.postReleaseCrawl;
    const stale = indexation.coverageReportOlderThanRelease === true;
    barriers.push({
      id: "NO_POST_RELEASE_CRAWL_OBSERVED",
      kind: "INDEXATION",
      label: p.crawledAfterRelease === 0 ? "OBSERVED" : "NOT_VERIFIED",
      statement:
        p.sampled === 0
          ? `No sampled last-crawl dates exist, so whether Google has crawled anything since the ${p.releaseDate} release is not known.`
          : `${p.crawledAfterRelease} of ${p.sampled} sampled URLs show a Google crawl on or after the ${p.releaseDate} release (newest sampled crawl ${p.newestCrawl}). The sample is not the whole site${stale ? ", and the page-indexing report was last updated before the release" : ""}.`,
      evidence: ["page-indexing report samples", "URL inspections (indexed version), when captured"],
    });
  }
  if (daily?.largestDrop) {
    const d = daily.largestDrop;
    barriers.push({
      id: "DAILY_DROP",
      kind: "DEMAND",
      label: "OBSERVED",
      statement: `The finalised daily series falls from ${d.fromImpressions} impressions on ${d.from} to ${d.toImpressions} on ${d.to} (${d.dropPercent}% lower), the largest one-day fall in the series. The timing is reported without asserting a cause; dating it against Google's published update history is a separate check that was not performed here.`,
      evidence: ["Search Console capture: daily series"],
    });
  }
  barriers.push({
    id: "CONTENT_QUALITY",
    kind: "CONTENT_HYPOTHESIS",
    label: "NOT_VERIFIED",
    statement: `Whether thin, templated or duplicated page content contributes to the loss is unproven. ${observationWindowPages} page(s) are inside a recent-change observation window, so Google has not yet been observed re-evaluating those treatments.`,
    evidence: ["lib/indexing-quality.ts", "protection snapshot: release-observation signals"],
  });
  return barriers;
}

export function runGoogleRecoveryAgent(inputs: GoogleRecoveryInputs): GoogleRecoveryReport {
  const config: RecoveryConfig = { ...DEFAULT_RECOVERY_CONFIG, ...inputs.config };
  const generatedAt = inputs.now.toISOString();
  const missing: GoogleRecoveryReport["missingInputs"] = [];
  const warnings: string[] = [];

  if (!inputs.gsc) missing.push({ input: "Search Console performance capture", howToProvide: GSC_IMPORT_HOW_TO });
  else {
    if (!findPagesTable(inputs.gsc, "historical")) missing.push({ input: "historical Pages table", howToProvide: GSC_IMPORT_HOW_TO });
    if (!findPagesTable(inputs.gsc, "recent")) missing.push({ input: "recent Pages table", howToProvide: GSC_IMPORT_HOW_TO });
  }
  if (!inputs.protection) missing.push({ input: "protection snapshot", howToProvide: "Run the director from a git checkout so protection-sources can read the registries and worktrees." });
  if (!inputs.inventory) missing.push({ input: "site inventory", howToProvide: "Run the director from the repository root so the data registries can be loaded." });

  if (missing.length > 0 || !inputs.gsc || !inputs.protection || !inputs.inventory) {
    return {
      status: "NEEDS_DATA",
      generatedAt,
      checkoutSha: inputs.inventory?.checkoutSha ?? null,
      config,
      missingInputs: missing,
      windows: { historical: null, recent: null, dataThrough: inputs.gsc?.dataThrough ?? null, capturedAt: inputs.gsc?.capturedAt ?? null, capturedVia: inputs.gsc?.manifest.capturedVia ?? null },
      daily: null,
      families: [],
      protectionSummary: null,
      indexation: { sitemap: null, coverage: null, crawlStats: null, postReleaseCrawl: null, coverageReportOlderThanRelease: null },
      barriers: [],
      candidates: [],
      shortlist: [],
      technicalTriage: [],
      cannibalization: { status: "NOT_MEASURED", reason: "no performance capture", howToMeasure: "" },
      keywordDifficulty: { status: "NOT_VERIFIED", reason: "no SERP or authority data was provided" },
      nextAction: {
        kind: "NEEDS_DATA",
        summary: "Search Console performance evidence is missing, so no ranking, loss or opportunity is computed. Nothing is reported as zero.",
        url: null,
        eligibleAfter: null,
        steps: missing.map((m) => `${m.input}: ${m.howToProvide}`),
      },
      warnings,
    };
  }

  const gsc = inputs.gsc;
  const historicalSummary = summarizeProperty(gsc, "historical");
  const recentSummary = summarizeProperty(gsc, "recent");
  const windows = { historical: historicalSummary, recent: recentSummary, dataThrough: gsc.dataThrough, capturedAt: gsc.capturedAt, capturedVia: gsc.manifest.capturedVia };
  const daily = observeDaily(gsc);
  for (const warning of gsc.warnings) warnings.push(warning);
  if (inputs.indexation) for (const warning of inputs.indexation.warnings) warnings.push(warning);

  const historicalTable = findPagesTable(gsc, "historical")!;
  const evalInputs: EvaluationInputs = { gsc, protection: inputs.protection, inventory: inputs.inventory, indexation: inputs.indexation, extras: inputs.extras, monetization: inputs.monetization, now: inputs.now };
  const candidates: PageEvaluation[] = [];
  const technicalTriage: GoogleRecoveryReport["technicalTriage"] = [];
  for (const record of historicalTable.pages.values()) {
    const kind = classifyPage(record.canonicalUrl, inputs.inventory.routes).kind;
    if (kind === "home" || kind === "legal" || kind === "other") continue;
    const ranked = record.metrics.position !== null && record.metrics.position <= 20 && record.metrics.impressions >= config.minImpressionsForRankedPage;
    if (record.metrics.impressions < config.minHistoricalImpressions && !ranked) continue;
    const evaluation = evaluatePage(record.canonicalUrl, evalInputs, config);
    candidates.push(evaluation);
    if (!evaluation.inventory.published) {
      technicalTriage.push({ url: record.canonicalUrl, historicalImpressions: record.metrics.impressions, reason: "Not published by the checked-out code; verify what the live URL returns." });
    }
  }
  // Unpublished pages below the candidate floor are still worth listing: a 404 on a URL Google once showed is a technical fact.
  for (const record of historicalTable.pages.values()) {
    if (record.metrics.impressions >= config.minHistoricalImpressions) continue;
    if (!inputs.inventory.pages.has(record.canonicalUrl) && !inputs.inventory.sitemapPaths.has(pathOf(record.canonicalUrl))) {
      technicalTriage.push({ url: record.canonicalUrl, historicalImpressions: record.metrics.impressions, reason: "Not published by the checked-out code; verify what the live URL returns." });
    }
  }
  candidates.sort(compareEvaluations);
  technicalTriage.sort((a, b) => b.historicalImpressions - a.historicalImpressions || a.url.localeCompare(b.url));
  const shortlist = candidates.slice(0, config.shortlistSize);
  const indexation = indexationFacts(inputs, inputs.releaseDate, shortlist.map((c) => c.url));

  const eligible = candidates.filter((c) => c.eligible);
  const eligibleEditorial = candidates.filter((c) => c.eligibleEditorial && !c.eligible);
  let nextAction: RecoveryNextAction;
  const evidenceOnly = candidates.filter((c) => !c.eligible && c.blockers.every((b) => b.resolvableBy === "AGENT_EVIDENCE"));
  const waiting = candidates
    .filter((c) => c.blockers.length > 0 && c.blockers.every((b) => b.resolvableBy === "WAIT_UNTIL" || b.resolvableBy === "AGENT_EVIDENCE"))
    .filter((c) => c.blockers.some((b) => b.resolvableBy === "WAIT_UNTIL"));
  if (eligible.length > 0) {
    const top = eligible[0]!;
    nextAction = {
      kind: "HANDOFF_TO_PAGE_UPGRADER",
      summary: `Hand ${pathOf(top.url)} to miloosh-money-page-upgrader: every gate passed and no protection source claims it.`,
      url: top.url,
      eligibleAfter: null,
      steps: ["Re-check protection at the implementation SHA.", "Verify the gap against current official vendor documentation.", "Make one local change and verify rendered output; release stays a separate, owner-approved step."],
    };
  } else if (eligibleEditorial.length > 0) {
    const top = eligibleEditorial[0]!;
    nextAction = {
      kind: "OWNER_DECISION",
      summary: `${pathOf(top.url)} is editable and has measured lost demand but no verified partner; improving it would be visibility-only work and needs the owner to choose that objective.`,
      url: top.url,
      eligibleAfter: null,
      steps: ["Decide whether a visibility-only recovery is wanted.", "If yes, hand the page to miloosh-money-page-upgrader with no CTA or partner change."],
    };
  } else if (evidenceOnly.length > 0) {
    const top = evidenceOnly[0]!;
    nextAction = {
      kind: "COLLECT_EVIDENCE",
      summary: `Collect the missing read-only evidence for ${pathOf(top.url)}; nothing blocks it except unverified facts.`,
      url: top.url,
      eligibleAfter: null,
      steps: [...new Set(top.blockers.map((b) => b.nextInput).filter((s): s is string => Boolean(s)))],
    };
  } else if (waiting.length > 0) {
    const earliest = waiting
      .flatMap((c) => c.blockers.filter((b) => b.eligibleAfter).map((b) => b.eligibleAfter as string))
      .sort()[0];
    nextAction = {
      kind: "WAIT_FOR_OBSERVATION",
      summary: `No candidate can be changed without confounding a running observation window; the earliest window ends ${earliest ?? "on an unknown date"}.`,
      url: waiting[0]!.url,
      eligibleAfter: earliest ?? null,
      steps: ["Do not edit pages inside an observation window.", "At the first observed Google recrawl, start the 14/28 day clocks and review with equivalent finalised windows."],
    };
  } else {
    nextAction = {
      kind: "OWNER_DECISION",
      summary: "Every ranked candidate is held by a protection, in-flight or derived-page rule that only the owner can lift.",
      url: candidates[0]?.url ?? null,
      eligibleAfter: null,
      steps: ["List the holds and decide which experiment or worktree to close, merge or abandon."],
    };
  }

  return {
    status: "OK",
    generatedAt,
    checkoutSha: inputs.inventory.checkoutSha,
    config,
    missingInputs: [],
    windows,
    daily,
    families: familyTable(gsc, inputs.inventory),
    protectionSummary: (() => {
      const results = [...historicalTable.pages.keys()].map((url) => protectionFor(url, inputs.protection!));
      return { pagesChecked: results.length, verdicts: summarizeVerdicts(results) };
    })(),
    indexation,
    barriers: buildBarriers(windows, daily, indexation, observationWindowPages(inputs.protection)),
    candidates,
    shortlist,
    technicalTriage,
    cannibalization: {
      status: "NOT_MEASURED",
      reason: "Cannibalization needs page-by-query rows. Search Console tables are single-dimension, so a query's competing pages were not captured.",
      howToMeasure: "For each query worth testing, filter the Pages table by that exact query; two or more of this site's pages above a minimum impression share is overlap. Choose one owner page per intent; never delete, redirect or noindex a page with demand without owner approval.",
    },
    keywordDifficulty: {
      status: "NOT_VERIFIED",
      reason: "No Domain Rating or current SERP observation was supplied, so no low-competition claim is made. Search position from Search Console is a measurement of this site, not of competitor strength.",
    },
    nextAction,
    warnings,
  };
}
