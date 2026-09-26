import { z } from "zod";
import { scopeSchema, windowSchema } from "@/lib/google-war/query-store";
import { resolveEvidence, recrawlState, type InspectionEvidence } from "@/lib/google-war/resolver";
import type { SearchSnapshot } from "@/lib/google-war/evidence";
import { authorityState, type AuthorityEntry } from "./registry";

export const brandSchema = z.object({
  capturedAt: z.iso.datetime({ offset: true }), source: z.string().min(1), window: windowSchema,
  scope: scopeSchema.extend({ dataState: z.enum(["final", "unknown"]) }), filter: z.object({ dimension: z.literal("query"), operator: z.literal("contains"), expression: z.literal("miloosh") }),
  impressions: z.number().int().nonnegative(), clicks: z.number().int().nonnegative(),
}).refine(r => r.clicks <= r.impressions, "Clicks exceed impressions");
export type BrandObservation = z.infer<typeof brandSchema>;
const days = (w: { start: string; end: string }) => (Date.parse(w.end) - Date.parse(w.start)) / 86400000 + 1;
export function brandMovement(before: BrandObservation | undefined, after: BrandObservation | undefined) {
  if (!before || !after) return { status: "UNKNOWN", firstObservedBrandSignal: false };
  const a = brandSchema.parse(before), b = brandSchema.parse(after);
  const firstObservedBrandSignal = a.impressions === 0 && b.impressions > 0 && a.window.end < b.window.start;
  if (a.scope.dataState !== "final" || b.scope.dataState !== "final" || days(a.window) !== days(b.window) || a.window.end >= b.window.start || JSON.stringify(a.scope) !== JSON.stringify(b.scope) || a.capturedAt.slice(0, 10) <= a.window.end || b.capturedAt.slice(0, 10) <= b.window.end)
    return { status: "INCOMPATIBLE_WINDOWS", firstObservedBrandSignal: false };
  const ctr = (r: BrandObservation) => r.impressions ? r.clicks / r.impressions : null;
  return { status: "COMPARABLE", firstObservedBrandSignal, impressionsDelta: b.impressions - a.impressions, clicksDelta: b.clicks - a.clicks,
    beforeCtr: ctr(a), afterCtr: ctr(b), note: "Filtered visible-query observations, not exhaustive brand demand or causal lift; no percent gain from zero" };
}
export function appendBrand(prior: BrandObservation[], incoming: unknown) {
  const rows = new Map(prior.map(r => [JSON.stringify([r.capturedAt, r.window, r.scope, r.filter]), brandSchema.parse(r)]));
  for (const r of brandSchema.array().parse(incoming)) {
    const id = JSON.stringify([r.capturedAt, r.window, r.scope, r.filter]);
    if (rows.has(id) && JSON.stringify(rows.get(id)) !== JSON.stringify(r)) throw new Error("Conflicting immutable brand capture");
    rows.set(id, r);
  }
  return [...rows.values()].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}
export function authorityObservatory(entries: AuthorityEntry[], inspections: InspectionEvidence[], snapshot: SearchSnapshot, now: string) {
  return entries.filter(e => e.targetUrl).map(e => {
    const state = authorityState(e, now), google = resolveEvidence(e.targetUrl!, inspections, snapshot, now);
    const mention = e.observations.filter(o => o.status === "VERIFIED_LIVE" && Date.parse(o.at) <= Date.parse(now)).sort((a, b) => a.at.localeCompare(b.at))[0];
    return { id: e.id, targetUrl: e.targetUrl, externalUrl: e.externalUrl, externalState: state.status,
      firstVerifiedMentionAt: mention?.at ?? null, mentionDateMeaning: "First observed verification, not publication time",
      crawlAfterMention: recrawlState(google.inspected, mention?.at ?? null), googleState: google.state,
      rankingEligible: google.rankingEligible, lane: google.lane,
      performance: google.search, performanceWindow: snapshot.window,
      performanceRelation: !mention ? "UNKNOWN" : snapshot.window.start > mention.at.slice(0, 10) ? "AFTER_OBSERVATION" : "BEFORE_OR_OVERLAPPING_OBSERVATION",
      lastCrawlTime: google.inspected?.lastCrawlTime ?? null, note: "Temporal sequence only; external placement does not prove causation" };
  });
}
export function deepLinkPriority(entries: AuthorityEntry[], snapshot: SearchSnapshot, pages: { url: string; category: string; commercial: boolean }[], inspections: InspectionEvidence[], now: string) {
  const supported = new Set(entries.map(e => authorityState(e, now)).filter(e => e.status === "VERIFIED_LIVE" && !e.stale && e.linkPresent).map(e => e.targetUrl));
  return pages.filter(p => p.commercial && !supported.has(p.url)).flatMap(p => {
    const resolved = resolveEvidence(p.url, inspections, snapshot, now);
    return (resolved.search?.impressions ?? 0) > 0 ? [{ ...p, impressions: resolved.search!.impressions!, position: resolved.search!.position,
      knownVerifiedExternalDeepLinks: 0, googleState: resolved.state, lane: resolved.lane, rankingEligible: resolved.rankingEligible,
      note: "Support research queue, NOT content rewrite/indexing/outreach authorization; zero KNOWN links is not zero web links" }] : [];
  }).sort((a, b) => b.impressions - a.impressions || a.url.localeCompare(b.url));
}
const median = (values: number[]) => { const a = [...values].sort((x, y) => x - y), i = Math.floor(a.length / 2); return a.length ? a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2 : null; };
export function categoryPositions(snapshot: SearchSnapshot, pages: { url: string; category: string }[], scope: z.infer<typeof scopeSchema> | null = null) {
  const groups = new Map<string, { url: string; position: number }[]>();
  for (const p of pages) {
    const row = snapshot.rows.find(r => r.url === p.url);
    if (!row || !row.impressions || row.position === null || row.position <= 0) continue;
    groups.set(p.category, [...groups.get(p.category) ?? [], { url: p.url, position: row.position }]);
  }
  return { window: snapshot.window, source: snapshot.source, capturedAt: snapshot.capturedAt, scope: scope ? scopeSchema.parse(scope) : null,
    method: "Unweighted median of per-page GSC average positions; historical demand sample, not a domain authority score or current indexation proof",
    categories: [...groups].map(([category, rows]) => ({ category, n: rows.length, median: median(rows.map(r => r.position)), members: rows.map(r => r.url).sort() })).filter(g => g.n >= 3).sort((a, b) => a.category.localeCompare(b.category)) };
}
export function compareCategoryPositions(a: ReturnType<typeof categoryPositions>, b: ReturnType<typeof categoryPositions>) {
  if (!a.scope || !b.scope || JSON.stringify(a.scope) !== JSON.stringify(b.scope)) return { status: "INCOMPATIBLE_SCOPES", rows: [] };
  if (days(a.window) !== days(b.window) || a.window.end >= b.window.start) return { status: "INCOMPATIBLE_WINDOWS", rows: [] };
  return { status: "MATCHED_WINDOWS", rows: a.categories.map(x => { const y = b.categories.find(g => g.category === x.category);
    return { category: x.category, nBefore: x.n, nAfter: y?.n ?? null,
      status: y && JSON.stringify(x.members) === JSON.stringify(y.members) ? "COMPARABLE" : "CHANGED_SAMPLE",
      medianDelta: y && JSON.stringify(x.members) === JSON.stringify(y.members) ? y.median! - x.median! : null }; }) };
}
export function indexingEligibility(input: { deployedAt: string | null; verifiedAt: string | null; httpStatus: number | null; canonical: string | null; url: string; indexable: boolean | null; inSitemap: boolean; quotaRemaining: number | null; previousRequests: string[] }) {
  if (input.previousRequests.includes(input.url)) return "ALREADY_REQUESTED";
  if (!input.deployedAt || !input.verifiedAt || Date.parse(input.verifiedAt) < Date.parse(input.deployedAt) || !Number.isFinite(Date.parse(input.deployedAt)) || !Number.isFinite(Date.parse(input.verifiedAt))) return "WAIT_DEPLOYMENT_VERIFICATION";
  if (input.httpStatus !== 200 || input.canonical !== input.url || input.indexable !== true || !input.inSitemap) return "TECHNICAL_BLOCK";
  return input.quotaRemaining !== null && input.quotaRemaining > 0 ? "ELIGIBLE_FOR_ONE_CONTROLLED_REQUEST" : "WAIT_QUOTA";
}
