import { z } from "zod";
import { inspectionSchema, indexState, type Inspection } from "@/lib/google-war/evidence";
import { rankingDelta, type Period } from "@/lib/google-war/measurement";
import type { Protection } from "@/lib/google-war/protection";
import { classifyInspectionEvidence, resolveEvidence, recrawlState } from "@/lib/google-war/resolver";

export const outreachSchema = z.object({
  organization: z.string().min(1), email: z.email(), status: z.enum(["SENT", "REJECTED_PAID_DOFOLLOW"]),
  sentAt: z.iso.datetime({ offset: true }), messageId: z.string().min(1),
  replyIds: z.array(z.string()), evidence: z.string().min(1),
});
export type Outreach = z.infer<typeof outreachSchema>;
export const outreachCaptureSchema = z.object({ checkedAt: z.iso.datetime({ offset: true }), mailbox: z.email(), coverage: z.string().min(1), contacts: outreachSchema.array() });
/** Read-only eligibility; a missing entry is NOT permission to send. */
export function outreachDisposition(email: string, registry: Outreach[]) {
  const normalized = email.trim().toLowerCase();
  const existing = registry.filter(r => r.email.toLowerCase() === normalized);
  return existing.some(r => r.status === "REJECTED_PAID_DOFOLLOW") ? "DO_NOT_CONTACT" :
    existing.length ? "ALREADY_CONTACTED_DO_NOT_RESEND" : "NOT_IN_REGISTRY_REQUIRES_REVIEW";
}
export function replyWatch(previous: Outreach[] | null, current: Outreach[]) {
  const known = new Set(previous?.flatMap(c => c.replyIds));
  const observedReplies = current.flatMap(c => c.replyIds.map(id => ({ organization: c.organization, id })));
  return { status: previous ? "COMPARED_CAPTURED_IDS" : "BASELINE_ONLY", observedReplies,
    newReplies: previous ? observedReplies.filter(r => !known.has(r.id)) : null };
}
/** A failed fresh check must not silently inherit an older live-link label.
 * Missing HTML anchors can be caused by rendering/access, so request review,
 * not an unsupported removal claim. The immutable registry stays intact. */
export function placementCheckAlerts(checks: Array<{ id: string; status: number | null; exactLinks: unknown[] }>) {
  return checks.flatMap(row => row.status === 200 && row.exactLinks.length ? [] : [{
    code: row.status === 200 ? "PLACEMENT_ANCHOR_NOT_OBSERVED" : "PLACEMENT_CHECK_UNAVAILABLE",
    target: row.id,
    reason: `Latest HTTP check: ${row.status ?? "UNKNOWN"}; exact anchor count: ${row.exactLinks.length}. Historical verification is not a successful current check; review required, removal not inferred.`,
  }]);
}
export function cohortWatch(url: string, inspections: Inspection[], deployedAt: string | null, now: string) {
  const resolved = resolveEvidence(url, inspections.map(classifyInspectionEvidence), null, now);
  return { state: recrawlState(resolved.inspected, deployedAt), googleState: resolved.state,
    checkedAt: resolved.inspected?.checkedAt ?? null, evidenceTier: resolved.evidenceTier,
    reported: resolved.reported, deployedAt };
}
export function researchWatch(previous: Inspection | null, current: Inspection, requestedAt: string | null) {
  const row = inspectionSchema.parse(current);
  const authoritative = classifyInspectionEvidence(row).provenance === "COMMITTED_INSPECTION";
  const google = authoritative ? indexState(row) : "UNKNOWN";
  const changedCrawl = Boolean(authoritative && row.lastCrawlTime && row.lastCrawlTime !== previous?.lastCrawlTime && (!previous || row.checkedAt > previous.checkedAt));
  // Displayed UI times have no proved timezone. Keep text, don't invent ISO ordering.
  if (requestedAt !== null) z.iso.datetime({ offset: true }).parse(requestedAt);
  const isoCrawl = row.lastCrawlTime && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.lastCrawlTime) &&
    Number.isFinite(Date.parse(row.lastCrawlTime)) && Date.parse(row.lastCrawlTime) <= Date.parse(row.checkedAt) ? row.lastCrawlTime : null;
  return { url: row.url, checkedAt: row.checkedAt, requestedAt, lastCrawl: row.lastCrawlTime,
    lastCrawlTimezone: isoCrawl ? "EXPLICIT" : "UNKNOWN",
    state: google === "INDEXED" ? "INDEXED" : google === "CRAWLED_NOT_INDEXED" ? "CRAWLED" : google === "DISCOVERED_NOT_INDEXED" ? "DISCOVERED" : "UNKNOWN",
    coverageState: row.coverageState, source: row.source,
    crawlAfterRequest: isoCrawl && requestedAt ? Date.parse(isoCrawl) > Date.parse(requestedAt) : null,
    newCrawlObserved: changedCrawl, requestsAllowed: false,
    alert: changedCrawl ? "NEW_CRAWL_OBSERVED" : null,
  };
}
/** Existing strict matched-window engine owns comparability. Threshold is an
 * operational alert (>=3 places, >=20 impressions each), not significance. */
export function movementAlerts(before: Period, after: Period, deployedAt: string | null, days: 7 | 14 | 28) {
  const delta = rankingDelta(before, after, deployedAt, days);
  if (delta.status !== "COMPARABLE") return { status: delta.status, alerts: [] as string[], delta };
  const alerts: string[] = [];
  if (before.clicks === 0 && after.clicks > 0) alerts.push("FIRST_OBSERVED_CLICK_IN_MATCHED_WINDOWS");
  if (before.impressions === 0 && after.impressions > 0 && after.query?.toLowerCase().includes("miloosh")) alerts.push("FIRST_OBSERVED_BRANDED_IMPRESSION");
  if (before.impressions >= 20 && after.impressions >= 20 && before.position !== null && after.position !== null && after.position > 0) {
    if (before.position - after.position >= 3) alerts.push("DIRECTIONAL_POSITION_IMPROVEMENT");
    for (const threshold of [20, 10]) if (before.position > threshold && after.position <= threshold) alerts.push(`QUERY_ENTERED_TOP_${threshold}`);
  }
  return { status: delta.status, alerts, delta };
}
/** File guard for release intake. Shared rendering/data edits require review
 * because they can alter protected URLs without touching their product file. */
export function protectedChangeFindings(files: string[], protections: Protection[]) {
  const protectedSlugs = new Set(protections.filter(p => p.page.startsWith("/software/")).map(p => p.page.slice(10)));
  return files.flatMap(file => {
    if (/^(lib\/google-war\/(protection|cohorts)|docs\/[^/]*experiment[^/]*\.json$|docs\/growth\/receipts\/20260926-(ranking-war\/(changes|controls)|google-war-phase2\/comparison-treatment)\.json$)/.test(file))
      return [{ file, reason: "PROTECTION_REGISTRY_CHANGE_REQUIRES_REVIEW" }];
    const slug = file.match(/^data\/software\/([^/]+)\.json$/)?.[1];
    if (slug && protectedSlugs.has(slug)) return [{ file, reason: "PROTECTED_PRODUCT" }];
    if (/^(app\/software\/\[slug\]|app\/compare\/\[slug\]|components\/(Software|Comparison)|data\/(comparisons|growth\/frozen-cohorts|experiments)|lib\/(affiliate|category|software|comparison))/.test(file))
      return [{ file, reason: "SHARED_OR_COHORT_CHANGE_REQUIRES_REVIEW" }];
    return [];
  });
}
type CrawlRow = { route: string; [key: string]: unknown };
export function crawlDelta(before: CrawlRow[], after: CrawlRow[]) {
  const old = new Map(before.map(r => [r.route, r])), next = new Map(after.map(r => [r.route, r]));
  const keys = ["status", "finalPath", "canonical", "h1Count", "noindex", "metadataMatches", "commercialLinksChecked", "ctaBlocks", "overflow", "error", "runtimeErrors"];
  return { before: before.length, after: after.length,
    added: after.filter(r => !old.has(r.route)).map(r => r.route),
    removed: before.filter(r => !next.has(r.route)).map(r => r.route),
    changed: after.flatMap(r => { const prior = old.get(r.route); if (!prior) return [];
      const fields = keys.filter(k => JSON.stringify(prior[k]) !== JSON.stringify(r[k]));
      return fields.length ? [{ route: r.route, fields }] : []; }),
  };
}
