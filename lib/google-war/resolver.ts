import { indexState, type Inspection, type SearchSnapshot } from "./evidence";

export type InspectionEvidence = Inspection & { provenance?: "LIVE_INSPECTION" | "COMMITTED_INSPECTION" | "GSC_PAGE_REPORT" | "REPORTED" };
const DAY = 86_400_000;
const priority = { LIVE_INSPECTION: 4, COMMITTED_INSPECTION: 3, GSC_PAGE_REPORT: 2, REPORTED: 1 };
export function classifyInspectionEvidence(row: Inspection): InspectionEvidence {
  return { ...row, provenance: /bulk authenticated GSC Pages report export|individually confirmed via the authenticated GSC Pages report/.test(row.source)
    ? "GSC_PAGE_REPORT" : row.source.startsWith("REPORTED_INSPECTION:") ? "REPORTED" : "COMMITTED_INSPECTION" };
}

/** Latest observation wins within the authoritative inspection tier; live wins
 * timestamp ties. A cached "live" label cannot outrank a newer committed check.
 * GSC performance is evidence of historical appearance, never current inclusion.
 * Reported panels are kept separate, not promoted to authenticated inspections. */
export function resolveEvidence(url: string, inspections: InspectionEvidence[], snapshot: SearchSnapshot | null, now: string) {
  const clock = Date.parse(now);
  if (!Number.isFinite(clock)) throw new Error("Invalid evidence clock");
  const candidates = inspections.filter(r => r.url === url && Date.parse(r.checkedAt) <= clock)
    .sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt) ||
      priority[b.provenance ?? "COMMITTED_INSPECTION"] - priority[a.provenance ?? "COMMITTED_INSPECTION"] || a.source.localeCompare(b.source));
  const individual = candidates.find(r => !["REPORTED", "GSC_PAGE_REPORT"].includes(r.provenance ?? "COMMITTED_INSPECTION") && indexState(r) !== "UNKNOWN") ?? null;
  const pagesReport = candidates.find(r => r.provenance === "GSC_PAGE_REPORT" && indexState(r) !== "UNKNOWN") ?? null;
  // Fresh individual inspection > committed GSC Pages evidence. An old
  // inspection cannot mask a newer Pages report after its freshness TTL.
  const inspected = individual && clock - Date.parse(individual.checkedAt) <= 14 * DAY ? individual :
    pagesReport && (!individual || Date.parse(pagesReport.checkedAt) > Date.parse(individual.checkedAt)) ? pagesReport : individual;
  const reported = candidates.find(r => r.provenance === "REPORTED") ?? null;
  const search = snapshot && Date.parse(snapshot.capturedAt) <= clock ? snapshot.rows.find(r => r.url === url) ?? null : null;
  // GSC dates are Pacific calendar dates. End + 08:00 next day is a conservative
  // upper bound across PST/PDT; never compare export time to measurement time.
  const signalEnd = snapshot ? Date.parse(`${snapshot.window.end}T00:00:00Z`) + DAY + 8 * 3_600_000 : Infinity;
  const historicalSignal = Boolean(search && (search.impressions ?? 0) > 0);
  const state = indexState(inspected);
  const excluded = !["INDEXED", "UNKNOWN"].includes(state);
  const isPagesReport = inspected?.provenance === "GSC_PAGE_REPORT";
  const pagesDataAsOf = isPagesReport ? inspected.source.match(/GSC processing date (\d{4}-\d{2}-\d{2})/)?.[1] ?? null : null;
  const lostIndexation = historicalSignal && excluded && (Date.parse(inspected!.checkedAt) >= signalEnd ||
    Boolean(isPagesReport && snapshot && Date.parse(inspected!.checkedAt) > Date.parse(snapshot.capturedAt)));
  const newerPerformanceThanInspection = historicalSignal && inspected !== null && signalEnd > Date.parse(inspected.checkedAt);
  const fresh = inspected !== null && clock - Date.parse(inspected.checkedAt) <= 14 * DAY;
  const tieConflict = inspected !== null && candidates.some(r => r.provenance !== "REPORTED" && r.checkedAt === inspected.checkedAt && indexState(r) !== "UNKNOWN" && indexState(r) !== state);
  const reportLagConflict = Boolean(isPagesReport && snapshot && (!pagesDataAsOf || pagesDataAsOf < snapshot.window.end));
  const suspectedLostIndexation = !inspected && historicalSignal && reported !== null && !["INDEXED", "UNKNOWN"].includes(indexState(reported));
  return {
    state, inspected, reported, search, historicalSignal, lostIndexation, suspectedLostIndexation,
    evidenceTier: inspected?.provenance ?? (inspected ? "COMMITTED_INSPECTION" : "NONE"), pagesDataAsOf, reportLagConflict,
    rankingEligible: state === "INDEXED" && fresh && !tieConflict && !newerPerformanceThanInspection && !reportLagConflict,
    needsInspection: !fresh || tieConflict || newerPerformanceThanInspection || reportLagConflict,
    freshness: fresh ? "FRESH_WITHIN_14D" : "STALE_OR_UNKNOWN",
    lane: lostIndexation || suspectedLostIndexation ? "INDEX_SELECTION" : state === "DISCOVERED_NOT_INDEXED" ? "CRAWL_RECOVERY" : excluded ? "INDEX_SELECTION" : "REVIEW",
    reason: lostIndexation ? "Newer non-indexed evidence overrides historical ranking for queue safety; this is not an exact loss date. Pages report processing lag is retained." :
      tieConflict ? "Conflicting same-time inspections: ranking held" :
      newerPerformanceThanInspection ? "Performance window extends beyond inspection: obtain a fresh inspection" :
      "Inspection > GSC page observation > historical position > inference; HTTP 200 is not indexation proof",
  };
}

/** No interpretation of localized crawl dates without a proven timezone. */
export function recrawlState(inspection: Inspection | null, deployedAt: string | null) {
  if (!inspection || !deployedAt || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(inspection.lastCrawlTime ?? "")) return "UNKNOWN";
  const crawl = Date.parse(inspection.lastCrawlTime!), deploy = Date.parse(deployedAt), checked = Date.parse(inspection.checkedAt);
  if (![crawl, deploy, checked].every(Number.isFinite) || checked < deploy || crawl > checked) return "UNKNOWN";
  if (crawl <= deploy) return "NOT_RECRAWLED";
  const state = indexState(inspection);
  return state === "INDEXED" ? "INDEXED" : state === "UNKNOWN" ? "UNKNOWN" : "RECRAWLED_EXCLUDED";
}
