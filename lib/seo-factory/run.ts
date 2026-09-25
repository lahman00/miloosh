import { createHash, randomUUID } from "node:crypto";
import { getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { buildMoneyMap } from "@/lib/revenue/money-map";
import { computeInboundCounts } from "@/scripts/agents/growth/internal-link-opportunity";
import { GoogleSearchConsoleClient, type SearchAnalyticsRow } from "@/scripts/agents/seo/lib/google-search-console-client";
import { recentAndPriorWindows } from "@/scripts/agents/seo/lib/date-windows";
import { classifySeoIntent, normalizeQuery, softwareEntitiesForQuery } from "@/lib/seo-factory/intent";
import { assessPublicationThreshold } from "@/lib/seo-factory/policy";
import { readSeoExperiments, writeSeoFactoryRun } from "@/lib/seo-factory/store";
import { SEO_ACTIONS, SEO_INTENTS, type ScoreComponent, type SeoAction, type SeoFactoryRun, type SeoIntent, type SeoOpportunity } from "@/lib/seo-factory/types";

const SITE_ORIGIN = "https://miloosh.com";

function canonicalPath(value: string): string | null {
  try {
    const url = new URL(value, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) return null;
    return url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : "/";
  } catch { return null; }
}

function expectedCtr(position: number): number {
  if (position <= 3) return 0.11;
  if (position <= 5) return 0.07;
  if (position <= 10) return 0.03;
  if (position <= 20) return 0.015;
  return 0.005;
}

function commercialValue(intent: SeoIntent): number {
  if (["PRICING", "COMPARISON", "ALTERNATIVES", "REVIEW", "DECISION", "MIGRATION"].includes(intent)) return 1;
  if (["SOFTWARE_BRAND", "FEATURE", "INTEGRATION", "CATEGORY", "USE_CASE"].includes(intent)) return 0.65;
  if (intent === "SUPPORT_HOW_TO") return 0.2;
  return 0.1;
}

export function computeOpportunityScore(components: ScoreComponent[]): number {
  const available = components.filter((component) => component.value !== null);
  const weights = available.reduce((sum, component) => sum + component.weight, 0);
  if (!weights) return 0;
  return Math.round(available.reduce((sum, component) => sum + component.value! * component.weight, 0) / weights * 100);
}

export function selectCanonicalWinner(rows: SearchAnalyticsRow[]): string | null {
  const winner = [...rows].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions || a.position - b.position)[0];
  return canonicalPath(winner?.keys[1] ?? "");
}

function opportunityId(query: string, page: string | null): string {
  return createHash("sha256").update(`${normalizeQuery(query)}|${page ?? "missing"}`).digest("hex").slice(0, 20);
}

const ACTION_PRIORITY: Record<SeoAction, number> = { MERGE: 10, REDIRECT: 9, META_TEST: 8, INTERNAL_LINK: 7, IMPROVE: 6, REFRESH: 5, MONETIZE: 4, CREATE: 3, WAIT: 2, IGNORE: 1 };

/** One executable page intervention, not one row per synonymous query. */
export function clusterOpportunities(items: SeoOpportunity[]): SeoOpportunity[] {
  const groups = new Map<string, SeoOpportunity[]>();
  for (const item of items) {
    const key = `${item.existingUrl ?? item.targetUrl ?? "missing"}|${item.intent}|${[...item.relatedSoftware].sort().join(",") || "no-entity"}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].map((group) => {
    const sorted = [...group].sort((a, b) => b.gsc.impressions - a.gsc.impressions || b.opportunityScore - a.opportunityScore || a.id.localeCompare(b.id));
    const representative = sorted[0]!;
    const impressions = group.reduce((sum, item) => sum + item.gsc.impressions, 0);
    const clicks = group.reduce((sum, item) => sum + item.gsc.clicks, 0);
    const position = impressions > 0 ? group.reduce((sum, item) => sum + item.gsc.position * item.gsc.impressions, 0) / impressions : representative.gsc.position;
    const strongestAction = [...group].sort((a, b) => ACTION_PRIORITY[b.action] - ACTION_PRIORITY[a.action])[0]!.action;
    const confirmed = group.find((item) => item.cannibalizationRisk === "confirmed");
    return {
      ...representative,
      id: opportunityId(`${representative.existingUrl ?? representative.targetUrl}|${representative.intent}`, representative.existingUrl ?? representative.targetUrl),
      action: strongestAction,
      gsc: { impressions, clicks, ctr: impressions > 0 ? clicks / impressions : 0, position },
      opportunityScore: Math.min(100, Math.max(...group.map((item) => item.opportunityScore)) + Math.min(5, Math.floor(Math.log2(group.length + 1)))),
      cannibalizationRisk: confirmed ? "confirmed" : representative.cannibalizationRisk,
      canonicalWinner: confirmed?.canonicalWinner ?? representative.canonicalWinner,
      confidence: impressions >= 50 ? "high" : representative.confidence,
      evidence: [...representative.evidence, `Clustered ${group.length} query variant(s): ${sorted.slice(0, 8).map((item) => `"${item.query}"`).join(", ")}`],
    };
  });
}

export function suppressActiveExperimentRecommendations(items: SeoOpportunity[], experiments: Array<{ page: string; decision: string; measurementWindowDays: number; recordedAt: string }>): SeoOpportunity[] {
  const active = new Map(experiments.filter((item) => item.decision === "MEASURING").map((item) => [item.page, item]));
  return items.map((item) => {
    const experiment = active.get(item.existingUrl ?? item.targetUrl ?? "");
    if (!experiment || !["CREATE", "IMPROVE", "MERGE", "REDIRECT", "META_TEST", "REFRESH"].includes(item.action)) return item;
    const measurementEnds = new Date(new Date(experiment.recordedAt).getTime() + experiment.measurementWindowDays * 86_400_000).toISOString();
    return { ...item, action: "WAIT", recommendation: `Active SEO experiment is measuring until ${measurementEnds}; suppress another major intervention unless a factual, technical, legal, or indexability defect is confirmed.` };
  });
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

const CLOSED_RELATIONSHIP_STATUSES = new Set(["REJECTED", "NOT_ELIGIBLE", "PROGRAM_ENDED", "NO_REAL_PROGRAM_FOUND"]);

/** Public program exists and Miloosh's current relationship is not closed. A rejected or ended relationship is not "viable" affiliate readiness. */
export function viableAffiliateProgramSlugs(): Set<string> {
  const closed = new Set(
    CURRENT_AFFILIATE_LEDGER.filter((row) => CLOSED_RELATIONSHIP_STATUSES.has(row.status)).flatMap((row) => row.productSlugs),
  );
  return new Set(AFFILIATE_PROGRAMS.filter((program) => program.programExists === "yes" && !closed.has(program.slug)).map((program) => program.slug));
}

export async function runSeoFactory(options: { persist?: boolean } = {}): Promise<SeoFactoryRun> {
  const client = GoogleSearchConsoleClient.fromEnv();
  if (!client) throw new Error("SEO Factory fails closed: Google Search Console credentials are unavailable in this runtime.");

  const software = getAllSoftware();
  const categories = getAllCategories();
  const inventory = new Set<string>(["/", "/compare", "/recommend"]);
  for (const item of software) inventory.add(`/software/${item.slug}`);
  for (const category of categories) inventory.add(`/category/${category.slug}`);
  for (const [a, b] of PUBLISHED_COMPARISONS) inventory.add(`/compare/${getComparisonSlug(a, b)}`);

  const { recent } = recentAndPriorWindows(28);
  const [rows, moneyMap] = await Promise.all([
    client.queryAllSearchAnalytics({ ...recent, dimensions: ["query", "page"], rowLimit: 25_000 }, 25_000),
    buildMoneyMap(),
  ]);
  if (moneyMap.gscFetchAvailability !== "real") throw new Error(`SEO Factory fails closed: Money Map GSC input unavailable. ${moneyMap.gscFetchNote}`);

  const moneyByUrl = new Map(moneyMap.pages.map((page) => [page.url, page.moneyScore]));
  const inbound = computeInboundCounts(software);
  const active = new Set<string>(ACTIVE_PARTNER_SLUGS);
  const viable = viableAffiliateProgramSlugs();
  const queryPages = new Map<string, SearchAnalyticsRow[]>();
  for (const row of rows) {
    const query = normalizeQuery(row.keys[0] ?? "");
    if (!query) continue;
    queryPages.set(query, [...(queryPages.get(query) ?? []), row]);
  }

  const evaluated: SeoOpportunity[] = [];
  for (const row of rows) {
    const query = row.keys[0] ?? "";
    const path = canonicalPath(row.keys[1] ?? "");
    if (!query || !path) continue;
    const entities = softwareEntitiesForQuery(query, software);
    const intent = classifySeoIntent(query, entities);
    const matchingRows = queryPages.get(normalizeQuery(query)) ?? [];
    const winner = selectCanonicalWinner(matchingRows);
    const distinctPages = new Set(matchingRows.map((item) => canonicalPath(item.keys[1] ?? "")).filter(Boolean));
    const cannibalizationRisk = distinctPages.size > 1 ? "confirmed" as const : "none" as const;
    const isWinner = !winner || winner === path;
    const exists = inventory.has(path);
    const relatedSlugs = entities.map((entity) => entity.slug);
    const affiliateStatus = relatedSlugs.some((slug) => active.has(slug)) ? "ACTIVE" as const : relatedSlugs.some((slug) => viable.has(slug)) ? "VIABLE" as const : relatedSlugs.length ? "NONE" as const : "UNKNOWN" as const;
    const maxInbound = Math.max(0, ...relatedSlugs.map((slug) => inbound.get(slug) ?? 0));
    const ctrGap = Math.max(0, Math.min(1, (expectedCtr(row.position) - row.ctr) / Math.max(expectedCtr(row.position), 0.001)));
    const components: ScoreComponent[] = [
      { name: "search demand", value: Math.min(1, Math.log10(row.impressions + 1) / 3.5), weight: 3, kind: "real", source: "GSC query+page impressions", confidence: "high" },
      { name: "ranking opportunity", value: row.position <= 3 ? 0.25 : row.position <= 20 ? 1 : row.position <= 40 ? 0.65 : 0.25, weight: 2, kind: "derived", source: "GSC average position band", confidence: "high" },
      { name: "CTR gap", value: ctrGap, weight: 2, kind: "heuristic", source: "observed CTR versus documented factory curve", confidence: "medium" },
      { name: "commercial intent", value: commercialValue(intent), weight: 2, kind: "heuristic", source: `deterministic intent=${intent}`, confidence: intent === "UNKNOWN" ? "low" : "medium" },
      { name: "affiliate readiness", value: affiliateStatus === "ACTIVE" ? 1 : affiliateStatus === "VIABLE" ? 0.5 : 0, weight: 1, kind: "derived", source: "canonical active registry / researched program ledger", confidence: affiliateStatus === "ACTIVE" ? "high" : "medium" },
      { name: "internal-link support", value: relatedSlugs.length ? Math.min(1, maxInbound / 12) : null, weight: 1, kind: relatedSlugs.length ? "derived" : "unavailable", source: "existing deterministic inbound-link graph", confidence: "medium" },
      { name: "Money Map", value: moneyByUrl.has(path) ? Math.min(1, (moneyByUrl.get(path) ?? 0) / 100) : null, weight: 1, kind: moneyByUrl.has(path) ? "derived" : "unavailable", source: "current production Money Map", confidence: "high" },
      { name: "cannibalization", value: cannibalizationRisk === "confirmed" && !isWinner ? 0 : 1, weight: 2, kind: "real", source: "GSC query-to-page multiplicity", confidence: "high" },
    ];

    let action: SeoAction = "WAIT";
    let recommendation = "Wait for stronger evidence; do not modify or create a page.";
    if (cannibalizationRisk === "confirmed" && !isWinner) {
      action = "MERGE"; recommendation = `Treat ${winner} as the canonical winner; review this URL for intent consolidation before changing anything.`;
    } else if (exists && row.impressions >= 20 && row.position <= 20 && ctrGap >= 0.5) {
      action = "META_TEST"; recommendation = "Queue one controlled title/meta experiment; change one variable and measure for at least 28 days.";
    } else if (exists && row.position > 7 && row.position <= 30 && maxInbound < 8) {
      action = "INTERNAL_LINK"; recommendation = "Add a small number of contextually relevant links from existing entity/category surfaces after human review.";
    } else if (exists && row.impressions >= 10 && intent !== "UNKNOWN" && intent !== "SUPPORT_HOW_TO") {
      action = "IMPROVE"; recommendation = `Improve the existing page for ${intent.toLowerCase().replace(/_/g, " ")} intent using first-party evidence; do not create a competing URL.`;
    } else if (!exists && row.impressions >= 25 && commercialValue(intent) >= 0.65) {
      action = "CREATE"; recommendation = "Potential missing intent page. Block publication until unique value, evidence, canonical URL, and internal-link support pass review.";
    } else if (intent === "UNKNOWN" || intent === "SUPPORT_HOW_TO") {
      action = "IGNORE"; recommendation = "Outside Miloosh's proven commercial/editorial fit or too ambiguous; do nothing.";
    }

    const opportunityScore = computeOpportunityScore(components);
    const publication = assessPublicationThreshold({
      impressions: row.impressions,
      intent,
      existingCanonical: exists ? path : null,
      factualSources: 0,
      internalLinkSources: maxInbound,
      uniqueDecisionValue: false,
      cannibalizationRisk,
    });
    evaluated.push({
      id: opportunityId(query, path), query, intent, action, targetUrl: exists ? path : null, existingUrl: exists ? path : null,
      relatedSoftware: relatedSlugs, category: entities[0]?.category ?? null,
      gsc: { impressions: row.impressions, clicks: row.clicks, ctr: row.ctr, position: row.position }, affiliateStatus,
      moneyScore: moneyByUrl.get(path) ?? null, opportunityScore, scoreComponents: components,
      cannibalizationRisk, canonicalWinner: cannibalizationRisk === "confirmed" ? winner : null,
      recommendation, evidence: [`GSC ${row.impressions} impressions / ${row.clicks} clicks / ${(row.ctr * 100).toFixed(2)}% CTR / position ${row.position.toFixed(1)}`, `Existing inventory: ${exists ? "yes" : "no"}`, `Matching GSC pages for query: ${distinctPages.size}`, `Publication blockers: ${publication.blockers.join("; ")}`],
      confidence: intent === "UNKNOWN" ? "low" : cannibalizationRisk === "confirmed" || row.impressions >= 50 ? "high" : "medium",
      state: action === "CREATE" ? "BLOCKED" : "ANALYZED", publicationEligible: false,
    });
  }

  const clustered = clusterOpportunities(evaluated);
  const experiments = await readSeoExperiments();
  const opportunities = suppressActiveExperimentRecommendations(clustered, experiments)
    .sort((a, b) => b.opportunityScore - a.opportunityScore || b.gsc.impressions - a.gsc.impressions || a.id.localeCompare(b.id))
    .slice(0, 100);
  const comparisonRows = rows.filter((row) => canonicalPath(row.keys[1] ?? "")?.startsWith("/compare/"));
  const visibleComparisons = new Set(comparisonRows.map((row) => canonicalPath(row.keys[1] ?? "")).filter(Boolean));
  const actionCounts = Object.fromEntries(SEO_ACTIONS.map((action) => [action, opportunities.filter((item) => item.action === action).length])) as Record<SeoAction, number>;
  const intentCounts = Object.fromEntries(SEO_INTENTS.map((intent) => [intent, opportunities.filter((item) => item.intent === intent).length])) as Record<SeoIntent, number>;
  const now = new Date();
  const run: SeoFactoryRun = {
    schemaVersion: 1, id: `${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`, generatedAt: now.toISOString(), window: recent,
    autonomyLevel: 0, massPublishingEnabled: false, gscRowsAnalyzed: rows.length, pagesAnalyzed: inventory.size,
    inventory: { software: software.length, comparisons: PUBLISHED_COMPARISONS.length, categories: categories.length, total: inventory.size },
    comparisonDiagnosis: { pagesWithVisibility: visibleComparisons.size, impressions: comparisonRows.reduce((sum, row) => sum + row.impressions, 0), clicks: comparisonRows.reduce((sum, row) => sum + row.clicks, 0), medianPosition: median(comparisonRows.map((row) => row.position)) },
    actionCounts, intentCounts, leaveAloneCount: clustered.filter((item) => item.action === "WAIT" || item.action === "IGNORE").length,
    opportunities, errors: [],
  };
  if (options.persist !== false) await writeSeoFactoryRun(run);
  return run;
}
