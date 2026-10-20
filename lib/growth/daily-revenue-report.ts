import type { FirstPartyEvent } from "@/lib/analytics/events";
import { classifySessions } from "@/lib/analytics/human-classification";
import type { StoredOutboundEvent } from "@/lib/revenue/events";
import { buildFunnelByLanding, type FunnelRow } from "./funnel-by-landing";

/**
 * Daily revenue-evidence report: one dated, denominated answer to "what happened, who is a real buyer, how far did they
 * get, and what did the partner networks say".
 *
 * Rules:
 * - Two equal-length windows, [start, end) in UTC. Comparisons use the previous window of the same length.
 * - Strict-qualified, probable-human and excluded sessions are always separate. Thresholds are never touched here.
 * - First-party events and the legacy outbound ledger describe the same clicks differently: both are shown, never added.
 * - A site click is not a partner click, a lead, a conversion, an approved or a paid commission. The partner-side figures
 *   come only from a supplied network observation; otherwise each is NOT_MEASURED. Missing is never zero.
 * - A read that was incomplete is reported as PARTIAL or UNAVAILABLE and the figures say so.
 */

export type ReadStatus = "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
export type Measured<T> = T | "NOT_MEASURED";

export type SourceRead = { status: ReadStatus; listed: number | null; read: number | null; failed: number | null; note?: string };

/** A hand-entered or exported partner-network observation. Never inferred from site data. */
export type NetworkObservation = {
  partner: string;
  network: string;
  source: string;
  asOf: string;
  windowStart: string | null;
  windowEnd: string | null;
  clicks?: number;
  leads?: number;
  conversions?: number;
  /** Approved and paid commission by currency. Never summed across currencies. */
  approvedCommission?: Record<string, number>;
  paidCommission?: Record<string, number>;
};

export type PartnerLine = {
  slug: string;
  payoutReadiness: "VERIFIED" | "UNVERIFIED" | "OWNER_ACTION_REQUIRED";
  revenueReady: boolean;
  siteHandoffs: { firstPartyAffiliate: number; ledgerAffiliateNonTest: number; ledgerTest: number };
  network: {
    observed: boolean;
    source: string | null;
    asOf: string | null;
    clicks: Measured<number>;
    leads: Measured<number>;
    conversions: Measured<number>;
    approvedCommission: Measured<Record<string, number>>;
    paidCommission: Measured<Record<string, number>>;
  };
};

export type WindowSummary = {
  start: string;
  end: string;
  events: number;
  sessions: { qualified: number; probableHuman: number; excluded: number; total: number };
  byChannel: Record<string, { qualified: number; probableHuman: number; excluded: number }>;
  /** Distinct strict-qualified plus probable sessions that viewed a software, comparison or guide page. */
  commercialPageSessions: { qualified: number; probableHuman: number };
  ctaImpressionEvents: number;
  ctaClickEvents: number;
  firstPartyOutbound: { affiliate: number; official: number; testMarked: number };
  ledger: Measured<{ stored: number; test: number; explicitNonTest: number; unmarked: number; affiliateNonTest: number; officialNonTest: number }>;
};

export type Delta = { qualifiedSessions: number | null; probableSessions: number | null; ctaClickEvents: number | null; firstPartyAffiliateHandoffs: number | null };

export type DailyRevenueReport = {
  generatedAt: string;
  windowDays: number;
  reads: { firstParty: SourceRead; ledger: SourceRead };
  captureIntegrity: "NOT_VERIFIED";
  /** NOT_MEASURED when the first-party read was unavailable: an unread store is not an empty one. */
  current: Measured<WindowSummary>;
  previous: Measured<WindowSummary>;
  /** current minus previous; null when either side is not comparable. */
  delta: Delta;
  topLandings: FunnelRow[];
  partners: PartnerLine[];
  statements: string[];
};

const COMMERCIAL = new Set(["software_view", "comparison_view", "guide_view"]);
const QUALIFIED = new Set(["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE"]);

const inWindow = (timestamp: string, start: string, end: string) => timestamp >= start && timestamp < end;

function summarize(
  events: readonly FirstPartyEvent[],
  ledger: readonly StoredOutboundEvent[] | null,
  start: string,
  end: string,
): { summary: WindowSummary; classifications: ReturnType<typeof classifySessions>; windowEvents: FirstPartyEvent[] } {
  const windowEvents = events.filter((e) => inWindow(e.timestamp, start, end));
  const classifications = classifySessions(windowEvents);
  const bucket = new Map(classifications.map((c) => [c.sessionId, c.bucket]));
  const kind = (id: string) => (QUALIFIED.has(bucket.get(id) ?? "") ? "qualified" : bucket.get(id) === "PROBABLE_HUMAN" ? "probableHuman" : "excluded");
  const sessions = { qualified: 0, probableHuman: 0, excluded: 0, total: classifications.length };
  const byChannel: WindowSummary["byChannel"] = {};
  const firstPageView = new Map<string, FirstPartyEvent>();
  for (const e of [...windowEvents].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) if (e.type === "page_view" && !firstPageView.has(e.sessionId)) firstPageView.set(e.sessionId, e);
  for (const c of classifications) {
    const k = kind(c.sessionId);
    sessions[k] += 1;
    const landing = firstPageView.get(c.sessionId);
    const channel = (landing && landing.type === "page_view" ? landing.trafficSource : undefined) ?? "unknown";
    (byChannel[channel] ??= { qualified: 0, probableHuman: 0, excluded: 0 })[k] += 1;
  }
  const commercial = { qualified: new Set<string>(), probableHuman: new Set<string>() };
  let impressions = 0;
  let clicks = 0;
  const outbound = { affiliate: 0, official: 0, testMarked: 0 };
  for (const e of windowEvents) {
    const k = kind(e.sessionId);
    if (COMMERCIAL.has(e.type) && k !== "excluded") commercial[k].add(e.sessionId);
    if (k === "excluded") continue;
    if (e.type === "cta_impression") impressions += 1;
    if (e.type === "cta_click") clicks += 1;
    if (e.type === "outbound_click") {
      if (e.isTest) outbound.testMarked += 1;
      else outbound[e.destination === "affiliate" ? "affiliate" : "official"] += 1;
    }
  }
  const ledgerRows = ledger?.filter((e) => inWindow(e.timestamp, start, end));
  const summary: WindowSummary = {
    start,
    end,
    events: windowEvents.length,
    sessions,
    byChannel,
    commercialPageSessions: { qualified: commercial.qualified.size, probableHuman: commercial.probableHuman.size },
    ctaImpressionEvents: impressions,
    ctaClickEvents: clicks,
    firstPartyOutbound: outbound,
    ledger: ledgerRows
      ? {
          stored: ledgerRows.length,
          test: ledgerRows.filter((e) => e.isTest === true).length,
          explicitNonTest: ledgerRows.filter((e) => e.isTest === false).length,
          unmarked: ledgerRows.filter((e) => e.isTest === undefined).length,
          affiliateNonTest: ledgerRows.filter((e) => e.isTest === false && e.destination === "affiliate").length,
          officialNonTest: ledgerRows.filter((e) => e.isTest === false && e.destination === "official").length,
        }
      : "NOT_MEASURED",
  };
  return { summary, classifications, windowEvents };
}

export function buildDailyRevenueReport(input: {
  now: Date;
  windowDays?: number;
  events: readonly FirstPartyEvent[] | null;
  ledger: readonly StoredOutboundEvent[] | null;
  reads: { firstParty: SourceRead; ledger: SourceRead };
  partners: ReadonlyArray<{ slug: string; payoutReadiness: PartnerLine["payoutReadiness"]; revenueReady: boolean }>;
  network?: readonly NetworkObservation[];
}): DailyRevenueReport {
  const days = input.windowDays ?? 7;
  const end = input.now.toISOString();
  const start = new Date(input.now.getTime() - days * 86400000).toISOString();
  const prevStart = new Date(input.now.getTime() - 2 * days * 86400000).toISOString();
  const usable = input.events !== null && input.reads.firstParty.status !== "UNAVAILABLE";
  const events = usable ? input.events! : [];
  const ledger = input.reads.ledger.status === "UNAVAILABLE" ? null : input.ledger;
  const cur = summarize(events, ledger, start, end);
  const prev = summarize(events, ledger, prevStart, start);
  const comparable = usable && input.reads.firstParty.status === "COMPLETE";
  const diff = (a: number, b: number) => (comparable ? a - b : null);
  const topLandings = usable ? buildFunnelByLanding({ events: cur.windowEvents, classifications: cur.classifications, now: input.now }).rows.slice(0, 15) : [];

  const curBucket = new Map(cur.classifications.map((c) => [c.sessionId, c.bucket]));
  /** Strict-qualified or probable-human sessions only; QA, automation and suspicious sessions never count. */
  const countable = (sessionId: string) => QUALIFIED.has(curBucket.get(sessionId) ?? "") || curBucket.get(sessionId) === "PROBABLE_HUMAN";
  const partners: PartnerLine[] = input.partners.map((p) => {
    const obs = (input.network ?? []).filter((n) => n.partner === p.slug).sort((a, b) => b.asOf.localeCompare(a.asOf))[0];
    const fpAffiliate = cur.windowEvents.filter((e) => e.type === "outbound_click" && e.softwareSlug === p.slug && e.destination === "affiliate" && !e.isTest && countable(e.sessionId)).length;
    const ledgerRows = ledger?.filter((e) => e.softwareSlug === p.slug && inWindow(e.timestamp, start, end) && e.destination === "affiliate") ?? [];
    return {
      slug: p.slug,
      payoutReadiness: p.payoutReadiness,
      revenueReady: p.revenueReady,
      siteHandoffs: { firstPartyAffiliate: fpAffiliate, ledgerAffiliateNonTest: ledgerRows.filter((e) => e.isTest === false).length, ledgerTest: ledgerRows.filter((e) => e.isTest === true).length },
      network: {
        observed: Boolean(obs),
        source: obs?.source ?? null,
        asOf: obs?.asOf ?? null,
        clicks: obs?.clicks ?? "NOT_MEASURED",
        leads: obs?.leads ?? "NOT_MEASURED",
        conversions: obs?.conversions ?? "NOT_MEASURED",
        approvedCommission: obs?.approvedCommission ?? "NOT_MEASURED",
        paidCommission: obs?.paidCommission ?? "NOT_MEASURED",
      },
    };
  });

  const statements = [
    "A site click is not a partner click, a lead, a conversion, an approved commission or a paid commission; each is reported on its own.",
    "First-party events and the legacy outbound ledger describe the same clicks differently and are never added together.",
    "Strict-qualified, probable-human and excluded sessions are separate. Classification thresholds were not changed.",
    "captureIntegrity is NOT_VERIFIED: a complete storage read does not prove every visit was captured.",
  ];
  if (!comparable) statements.push("The first-party read was not COMPLETE, so no change against the previous window is stated.");
  if (!partners.some((p) => p.network.observed)) statements.push("No partner-network observation was supplied: partner clicks, leads, conversions and commissions are NOT_MEASURED.");

  return {
    generatedAt: input.now.toISOString(),
    windowDays: days,
    reads: input.reads,
    captureIntegrity: "NOT_VERIFIED",
    current: usable ? cur.summary : "NOT_MEASURED",
    previous: usable ? prev.summary : "NOT_MEASURED",
    delta: {
      qualifiedSessions: diff(cur.summary.sessions.qualified, prev.summary.sessions.qualified),
      probableSessions: diff(cur.summary.sessions.probableHuman, prev.summary.sessions.probableHuman),
      ctaClickEvents: diff(cur.summary.ctaClickEvents, prev.summary.ctaClickEvents),
      firstPartyAffiliateHandoffs: diff(cur.summary.firstPartyOutbound.affiliate, prev.summary.firstPartyOutbound.affiliate),
    },
    topLandings,
    partners,
    statements,
  };
}
