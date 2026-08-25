import { getAllSoftware, type Software } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getOutboundEvents, type StoredOutboundEvent } from "@/lib/revenue/events";
import { GoogleSearchConsoleClient, type SearchAnalyticsRow } from "@/scripts/agents/seo/lib/google-search-console-client";
import { recentAndPriorWindows } from "@/scripts/agents/seo/lib/date-windows";
import { SITE_URL } from "@/lib/site";

/**
 * Phase 12 — Money Map. A page-level revenue-opportunity dataset built
 * ONLY from data this project can actually produce today:
 *
 *   - REAL: fetched/measured directly (live Google Search Console and the
 *     canonical active-affiliate registry).
 *   - STORED EVIDENCE: non-test outbound events from lib/revenue/events.ts.
 *     These prove a non-test event was stored, but that log carries no
 *     session/visitor classifier and therefore MUST NOT be described as a
 *     verified-human click. Human-qualified revenue ranking belongs to
 *     lib/growth/money-priority-engine.ts.
 *   - DERIVED: mechanically computed from real stored facts (e.g.
 *     monetization coverage from the affiliate registry, a commercial-
 *     intent tier from a product's stored pricing model).
 *   - HEURISTIC: a documented rule of thumb, not a measured fact (e.g.
 *     "comparison pages carry stronger buying intent than software pages").
 *   - unavailable: explicitly absent, never silently defaulted to a
 *     neutral/zero value.
 *
 * GSC note: the live Search Analytics call only succeeds when this code
 * runs on Vercel (GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT /
 * GOOGLE_SEARCH_CONSOLE_PROPERTY are Sensitive Vercel env vars). Locally
 * and in tests GSC is honestly unavailable; nothing here is estimated as a
 * substitute.
 */

export type DataAvailability = "real" | "derived" | "heuristic" | "unavailable";

export type MoneyMapPageType = "software" | "comparison";

export type MoneyMapProductRef = {
  slug: string;
  name: string;
  /** From data/affiliate/active-partners.ts — the source of truth for whether an active affiliate CTA exists today. */
  affiliateStatus: "active" | "not-active";
  network: string | null;
};

export type MoneyMapGscMetrics = {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

export type MoneyMapClickMetrics = {
  affiliateClicks: number;
  officialClicks: number;
  totalClicks: number;
};

export type MoneyScoreComponent = {
  label: string;
  weight: number;
  /** 0-10, or null when unavailable — never a faked neutral value. */
  value: number | null;
  availability: DataAvailability;
  note: string;
};

export type MoneyMapBucket = "A" | "B" | "C" | "D" | "E" | "F" | null;

export type MoneyMapPage = {
  url: string;
  fullUrl: string;
  pageType: MoneyMapPageType;
  products: MoneyMapProductRef[];
  monetizationCoverage: "both" | "one" | "none";
  commercialIntent: "high" | "medium" | "low";
  commercialIntentAvailability: DataAvailability;
  gsc: MoneyMapGscMetrics | null;
  gscAvailability: DataAvailability;
  /** Non-test events from the separate revenue log; not human-qualified. */
  clicks: MoneyMapClickMetrics;
  clicksAvailability: DataAvailability;
  moneyScore: number;
  scoreComponents: MoneyScoreComponent[];
  /** How many of the 6 scoring components had real/derived/heuristic data, out of 6. */
  componentsAvailable: number;
  bucket: MoneyMapBucket;
  bucketReason: string;
  recommendedAction: string;
};

export type MoneyMapDataset = {
  generatedAt: string;
  gscFetchAvailability: DataAvailability;
  gscFetchNote: string;
  totalPagesAnalyzed: number;
  /** Non-test revenue-log events included in page-level click evidence. */
  totalOutboundEventsSitewide: number;
  /** QA/test revenue-log events deliberately excluded from all page metrics and scoring. */
  totalTestOutboundEventsSitewide: number;
  pages: MoneyMapPage[];
};

export type MoneyMapOutboundSummary = {
  clicksBySourcePage: Map<string, MoneyMapClickMetrics>;
  nonTestEvents: number;
  excludedTestEvents: number;
};

/**
 * Canonical Money Map projection of the revenue click log. Test events are
 * visible as an excluded count but can never enter page click totals or score.
 * This deliberately does NOT call the remaining events human: the revenue log
 * has no visitor/session evidence to join to the human classifier.
 */
export function summarizeMoneyMapOutboundEvents(events: readonly StoredOutboundEvent[]): MoneyMapOutboundSummary {
  const clicksBySourcePage = new Map<string, MoneyMapClickMetrics>();
  let nonTestEvents = 0;
  let excludedTestEvents = 0;

  for (const event of events) {
    if (event.isTest) {
      excludedTestEvents += 1;
      continue;
    }

    nonTestEvents += 1;
    const existing = clicksBySourcePage.get(event.sourcePage) ?? {
      affiliateClicks: 0,
      officialClicks: 0,
      totalClicks: 0,
    };
    if (event.type === "affiliate_link_click") existing.affiliateClicks += 1;
    else existing.officialClicks += 1;
    existing.totalClicks += 1;
    clicksBySourcePage.set(event.sourcePage, existing);
  }

  return { clicksBySourcePage, nonTestEvents, excludedTestEvents };
}

// ---------------------------------------------------------------------
// Expected-CTR curve for the CTR-gap component. This is an industry
// heuristic, not a Miloosh-measured fact.
// ---------------------------------------------------------------------
function heuristicExpectedCtr(position: number): number {
  if (position <= 1) return 0.28;
  if (position <= 2) return 0.15;
  if (position <= 3) return 0.11;
  if (position <= 5) return 0.07;
  if (position <= 10) return 0.03;
  if (position <= 20) return 0.015;
  return 0.005;
}

function bucketFromCount(n: number, breaks: number[], scores: number[]): number {
  for (let i = 0; i < breaks.length; i++) {
    if (n < breaks[i]!) return scores[i]!;
  }
  return scores[scores.length - 1]!;
}

function commercialIntentTierFromSoftware(software: Software): { tier: "high" | "medium" | "low"; availability: DataAvailability; note: string } {
  const model = software.pricing?.model;
  if (!model || model === "unknown") {
    return {
      tier: "low",
      availability: "heuristic",
      note: "No stored pricing model for this product; commercial intent cannot be derived from real data, so a conservative 'low' assumption is used instead of guessing high.",
    };
  }
  if (model === "paid" || model === "freemium") {
    return { tier: "medium", availability: "derived", note: `Derived from stored pricing.model = "${model}".` };
  }
  return { tier: "low", availability: "derived", note: `Derived from stored pricing.model = "${model}".` };
}

async function fetchLiveGscByPage(): Promise<{ rows: Map<string, MoneyMapGscMetrics>; availability: DataAvailability; note: string }> {
  const client = GoogleSearchConsoleClient.fromEnv();
  if (!client) {
    return {
      rows: new Map(),
      availability: "unavailable",
      note: "GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT / GOOGLE_SEARCH_CONSOLE_PROPERTY not available in this runtime — real per-page Search Console data requires Vercel production credentials. Locally/in tests this is unavailable by design; nothing is estimated as a substitute.",
    };
  }

  try {
    const { recent } = recentAndPriorWindows(28);
    const rawRows: SearchAnalyticsRow[] = await client.queryAllSearchAnalytics({
      startDate: recent.startDate,
      endDate: recent.endDate,
      dimensions: ["page"],
      rowLimit: 5000,
    });
    const rows = new Map<string, MoneyMapGscMetrics>();
    for (const row of rawRows) {
      const url = row.keys[0];
      if (!url) continue;
      rows.set(url, { impressions: row.impressions, clicks: row.clicks, ctr: row.ctr, position: row.position });
    }
    return {
      rows,
      availability: "real",
      note: `Live Search Console Search Analytics, ${recent.startDate} to ${recent.endDate} (28-day window), dimension="page", ${rawRows.length} rows returned. A page with no row had zero recorded impressions in this returned window.`,
    };
  } catch (error) {
    return {
      rows: new Map(),
      availability: "unavailable",
      note: `Live Search Console call failed: ${error instanceof Error ? error.message : String(error)}. Treated as unavailable, not estimated.`,
    };
  }
}

function toProductRef(software: Software): MoneyMapProductRef {
  const partner = getActivePartner(software.slug);
  return {
    slug: software.slug,
    name: software.name,
    affiliateStatus: partner?.affiliateUrl ? "active" : "not-active",
    network: partner?.affiliateUrl ? "See data/affiliate/active-partners.ts" : null,
  };
}

function buildScoreComponents(page: {
  gsc: MoneyMapGscMetrics | null;
  gscAvailability: DataAvailability;
  monetizationCoverage: "both" | "one" | "none";
  commercialIntent: "high" | "medium" | "low";
  commercialIntentAvailability: DataAvailability;
  clicks: MoneyMapClickMetrics;
  clicksAvailability: DataAvailability;
}): MoneyScoreComponent[] {
  const components: MoneyScoreComponent[] = [];

  // 1. Search visibility (weight 3) — REAL when GSC is available.
  if (page.gscAvailability === "unavailable") {
    components.push({ label: "Search visibility (impressions)", weight: 3, value: null, availability: "unavailable", note: "GSC data unavailable in this run." });
  } else {
    const impressions = page.gsc?.impressions ?? 0;
    const value = bucketFromCount(impressions, [1, 10, 50, 200, 1000], [0, 2, 4, 6, 8, 10]);
    components.push({ label: "Search visibility (impressions)", weight: 3, value, availability: "real", note: `${impressions} impressions, last 28 days (live GSC).` });
  }

  // 2. Ranking proximity (weight 2).
  if (page.gscAvailability === "unavailable" || !page.gsc || page.gsc.impressions === 0) {
    components.push({
      label: "Ranking proximity",
      weight: 2,
      value: null,
      availability: page.gscAvailability === "unavailable" ? "unavailable" : "real",
      note: page.gscAvailability === "unavailable" ? "GSC data unavailable." : "Zero recorded impressions in this window — no meaningful position to score.",
    });
  } else {
    const position = page.gsc.position;
    const value = position <= 3 ? 10 : position <= 10 ? 7 : position <= 20 ? 4 : position <= 50 ? 2 : 0.5;
    components.push({ label: "Ranking proximity", weight: 2, value, availability: "real", note: `Average position ${position.toFixed(1)} (live GSC).` });
  }

  // 3. CTR gap vs. heuristic expected CTR (weight 1.5).
  if (page.gscAvailability === "unavailable" || !page.gsc || page.gsc.impressions === 0) {
    components.push({ label: "CTR opportunity gap", weight: 1.5, value: null, availability: page.gscAvailability === "unavailable" ? "unavailable" : "real", note: "No impressions to compute a CTR from." });
  } else {
    const expected = heuristicExpectedCtr(page.gsc.position);
    const gap = Math.max(0, expected - page.gsc.ctr);
    const value = Math.min(10, (gap / expected) * 10);
    components.push({ label: "CTR opportunity gap", weight: 1.5, value: Math.round(value * 10) / 10, availability: "heuristic", note: `Live GSC CTR ${(page.gsc.ctr * 100).toFixed(1)}% at position ${page.gsc.position.toFixed(1)} vs. heuristic expected CTR ${(expected * 100).toFixed(1)}%.` });
  }

  // 4. Commercial intent (weight 2).
  const intentValue = page.commercialIntent === "high" ? 8 : page.commercialIntent === "medium" ? 6 : 3;
  components.push({ label: "Commercial intent", weight: 2, value: intentValue, availability: page.commercialIntentAvailability, note: `Classified "${page.commercialIntent}".` });

  // 5. Monetization readiness (weight 2.5).
  const readinessValue = page.monetizationCoverage === "both" ? 10 : page.monetizationCoverage === "one" ? 6 : 0;
  components.push({ label: "Monetization readiness", weight: 2.5, value: readinessValue, availability: "real", note: `Affiliate coverage: ${page.monetizationCoverage} (active-partner registry).` });

  // 6. Non-test revenue-log outbound evidence (weight 1, deliberately low).
  if (page.clicksAvailability === "unavailable") {
    components.push({ label: "Non-test outbound-log evidence", weight: 1, value: null, availability: "unavailable", note: "Outbound-click log unavailable in this run." });
  } else {
    const value = page.clicks.affiliateClicks > 0 ? 10 : page.clicks.officialClicks > 0 ? 3 : 0;
    components.push({
      label: "Non-test outbound-log evidence",
      weight: 1,
      value,
      availability: "real",
      note: `${page.clicks.affiliateClicks} non-test affiliate event(s), ${page.clicks.officialClicks} non-test official/vendor event(s) recorded for this exact page. QA/test events are excluded. This revenue log is not human-qualified, so treat it only as weak stored evidence.`,
    });
  }

  return components;
}

function computeMoneyScore(components: MoneyScoreComponent[]): { score: number; componentsAvailable: number } {
  const available = components.filter((component) => component.value !== null);
  if (available.length === 0) return { score: 0, componentsAvailable: 0 };
  const weightedSum = available.reduce((sum, component) => sum + component.value! * component.weight, 0);
  const weightTotal = available.reduce((sum, component) => sum + component.weight, 0);
  const score = (weightedSum / weightTotal) * 10;
  return { score: Math.round(score * 10) / 10, componentsAvailable: available.length };
}

function classifyBucket(page: {
  pageType: MoneyMapPageType;
  gsc: MoneyMapGscMetrics | null;
  gscAvailability: DataAvailability;
  monetizationCoverage: "both" | "one" | "none";
  clicks: MoneyMapClickMetrics;
  clicksAvailability: DataAvailability;
}): { bucket: MoneyMapBucket; reason: string; action: string } {
  const hasRealGsc = page.gscAvailability === "real";
  const impressions = page.gsc?.impressions ?? 0;
  const searchClicks = page.gsc?.clicks ?? 0;
  const position = page.gsc?.position ?? null;
  const ctr = page.gsc?.ctr ?? null;

  // D. MONETIZATION GAP — registry data only, no traffic required.
  if (page.monetizationCoverage === "one" && page.pageType === "comparison") {
    return {
      bucket: "D",
      reason: "One compared product has an active affiliate link and the other does not — registry gap, independent of traffic.",
      action: "Check current affiliate relationship truth for the non-monetized product; pursue only a verified viable route.",
    };
  }

  // A. MONEY NOW — live GSC traffic AND active monetization.
  if (hasRealGsc && searchClicks > 0 && page.monetizationCoverage !== "none") {
    return { bucket: "A", reason: `Live GSC recorded ${searchClicks} search click(s) in 28 days on a monetized page.`, action: "Protect and reinforce — verify CTA prominence and keep commercial facts accurate." };
  }

  // C. RANKING STRIKE ZONE.
  if (hasRealGsc && impressions >= 10 && position !== null && position > 10 && position <= 20 && page.monetizationCoverage !== "none") {
    return { bucket: "C", reason: `Live average position ${position.toFixed(1)} with ${impressions} impressions — inside striking distance of page one.`, action: "Strengthen query relevance/depth and internal links from stronger pages." };
  }

  // B. CTR OPPORTUNITY.
  if (hasRealGsc && impressions >= 10 && position !== null && position <= 20 && ctr !== null && ctr < heuristicExpectedCtr(position)) {
    return { bucket: "B", reason: `Live position ${position.toFixed(1)} with ${impressions} impressions but CTR ${(ctr * 100).toFixed(1)}% is below the heuristic expected rate.`, action: "Improve title/meta alignment with the ranking query and result-snippet intent." };
  }

  // E. CLICK OPTIMIZATION — non-test revenue-log events only. The threshold
  // remains deliberately high because these events are not human-qualified.
  if (page.clicksAvailability === "real" && page.clicks.totalClicks >= 20 && page.monetizationCoverage !== "none" && page.clicks.affiliateClicks / Math.max(1, page.clicks.totalClicks) < 0.1) {
    return { bucket: "E", reason: `${page.clicks.totalClicks} non-test revenue-log outbound events on this page but few affiliate events.`, action: "Treat as a weak diagnostic only; confirm with human-qualified first-party evidence before making a major CRO decision." };
  }

  // F. BUILD/EXPAND.
  if (page.pageType === "comparison" && page.monetizationCoverage === "both" && (!hasRealGsc || impressions === 0)) {
    return { bucket: "F", reason: "Fully monetized comparison but live Search Console shows zero impressions or is unavailable — a visibility/indexing opportunity, not proof of user demand.", action: "Check indexing and strengthen internal linking; do not infer demand from monetization coverage alone." };
  }

  return {
    bucket: null,
    reason: hasRealGsc ? "Does not meet the evidence threshold for any bucket today." : "Live Search Console data is unavailable and no registry-only bucket applies.",
    action: "No action recommended without more evidence.",
  };
}

export async function buildMoneyMap(): Promise<MoneyMapDataset> {
  const software = getAllSoftware();
  const softwareBySlug = new Map(software.map((item) => [item.slug, item]));

  const { rows: gscByUrl, availability: gscFetchAvailability, note: gscFetchNote } = await fetchLiveGscByPage();
  const outboundEvents = await getOutboundEvents();
  const outboundSummary = summarizeMoneyMapOutboundEvents(outboundEvents);
  const clicksAvailability: DataAvailability = "real";

  const pages: MoneyMapPage[] = [];

  function assemblePage(
    url: string,
    pageType: MoneyMapPageType,
    products: MoneyMapProductRef[],
    commercialIntent: "high" | "medium" | "low",
    commercialIntentAvailability: DataAvailability,
  ): MoneyMapPage {
    const fullUrl = `${SITE_URL}${url}`;
    const gsc = gscByUrl.get(fullUrl) ?? gscByUrl.get(url) ?? null;
    const monetizedCount = products.filter((product) => product.affiliateStatus === "active").length;
    const monetizationCoverage: "both" | "one" | "none" =
      pageType === "software"
        ? monetizedCount > 0 ? "both" : "none"
        : monetizedCount === 2 ? "both" : monetizedCount === 1 ? "one" : "none";
    const clicks = outboundSummary.clicksBySourcePage.get(url) ?? { affiliateClicks: 0, officialClicks: 0, totalClicks: 0 };

    const scoreComponents = buildScoreComponents({
      gsc,
      gscAvailability: gscFetchAvailability,
      monetizationCoverage,
      commercialIntent,
      commercialIntentAvailability,
      clicks,
      clicksAvailability,
    });
    const { score, componentsAvailable } = computeMoneyScore(scoreComponents);
    const { bucket, reason, action } = classifyBucket({
      pageType,
      gsc,
      gscAvailability: gscFetchAvailability,
      monetizationCoverage,
      clicks,
      clicksAvailability,
    });

    return {
      url,
      fullUrl,
      pageType,
      products,
      monetizationCoverage,
      commercialIntent,
      commercialIntentAvailability,
      gsc,
      gscAvailability: gsc ? "real" : gscFetchAvailability === "unavailable" ? "unavailable" : "real",
      clicks,
      clicksAvailability,
      moneyScore: score,
      scoreComponents,
      componentsAvailable,
      bucket,
      bucketReason: reason,
      recommendedAction: action,
    };
  }

  for (const item of software) {
    const intent = commercialIntentTierFromSoftware(item);
    pages.push(assemblePage(`/software/${item.slug}`, "software", [toProductRef(item)], intent.tier, intent.availability));
  }

  for (const [slugA, slugB] of PUBLISHED_COMPARISONS) {
    const a = softwareBySlug.get(slugA);
    const b = softwareBySlug.get(slugB);
    if (!a || !b) continue;
    const url = `/compare/${getComparisonSlug(slugA, slugB)}`;
    pages.push(assemblePage(url, "comparison", [toProductRef(a), toProductRef(b)], "high", "heuristic"));
  }

  pages.sort((x, y) => y.moneyScore - x.moneyScore);

  return {
    generatedAt: new Date().toISOString(),
    gscFetchAvailability,
    gscFetchNote,
    totalPagesAnalyzed: pages.length,
    totalOutboundEventsSitewide: outboundSummary.nonTestEvents,
    totalTestOutboundEventsSitewide: outboundSummary.excludedTestEvents,
    pages,
  };
}
