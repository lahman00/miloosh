import { z } from "zod";
import { canonicalPath } from "./evidence";

export const windowSchema = z.object({ start: z.iso.date(), end: z.iso.date() }).refine(w => w.start <= w.end, "Reversed window");
export const scopeSchema = z.object({
  property: z.string().min(1), searchType: z.enum(["web", "image", "video", "news"]),
  country: z.string().nullable(), device: z.string().nullable(),
  timezone: z.literal("America/Los_Angeles"), dataState: z.literal("final"),
});
export const queryObservationSchema = z.object({
  query: z.string().min(1), page: z.string().refine(u => canonicalPath(u) !== null, "Exact canonical Miloosh URL required"),
  window: windowSchema, scope: scopeSchema,
  impressions: z.number().int().nonnegative(), clicks: z.number().int().nonnegative().nullable(),
  ctr: z.number().min(0).max(1).nullable(), position: z.number().nonnegative().nullable(),
  source: z.string().min(1), captured_at: z.union([z.iso.datetime({ offset: true }), z.iso.date()]),
  capturePrecision: z.enum(["instant", "day"]), evidence: z.enum(["API_QUERY_PAGE", "COMMITTED_PAGE_FILTERED_UI"]),
  coverage: z.enum(["TOP_ROWS_ONLY", "API_AVAILABLE_ROWS"]),
}).superRefine((r, ctx) => {
  if (r.clicks !== null && r.clicks > r.impressions) ctx.addIssue({ code: "custom", message: "Clicks exceed impressions" });
  if (r.capturePrecision === "day" !== (r.captured_at.length === 10)) ctx.addIssue({ code: "custom", message: "Capture precision mismatch" });
  if (r.captured_at.slice(0, 10) < r.window.end) ctx.addIssue({ code: "custom", message: "Capture precedes window end" });
  if (r.ctr !== null && r.clicks !== null && r.impressions > 0 && Math.abs(r.ctr - r.clicks / r.impressions) > 0.002) ctx.addIssue({ code: "custom", message: "CTR inconsistent with counts" });
});
export type QueryObservation = z.infer<typeof queryObservationSchema>;
export const queryScopeKey = (r: QueryObservation) => JSON.stringify([r.query, r.window, r.scope]);
const identity = (r: QueryObservation) => JSON.stringify([queryScopeKey(r), r.page, r.captured_at, r.source]);
export function appendQueries(previous: QueryObservation[], incoming: unknown): QueryObservation[] {
  const rows = queryObservationSchema.array().parse(incoming);
  const result = new Map(previous.map(r => [identity(queryObservationSchema.parse(r)), r]));
  for (const row of rows) {
    const key = identity(row), existing = result.get(key);
    if (existing && JSON.stringify(existing) !== JSON.stringify(row)) throw new Error("Conflicting immutable query observation");
    result.set(key, row);
  }
  return [...result.values()].sort((a, b) => identity(a).localeCompare(identity(b)));
}
export function latestQueries(rows: QueryObservation[]) {
  const latest = new Map<string, QueryObservation>();
  for (const row of appendQueries([], rows).sort((a, b) => a.captured_at.localeCompare(b.captured_at))) {
    const key = `${queryScopeKey(row)}|${row.page}`;
    latest.set(key, row); // Same observation re-exported is not more impressions.
  }
  return [...latest.values()];
}
export type IntentPage = { page: string; kind: "software" | "comparison" | "other"; products: string[] };
export function queryOwnership(row: QueryObservation | null, pages: IntentPage[], products: Array<{ slug: string; name: string }>) {
  if (!row) return { classification: "NO_DATA", expected: [] as string[], reason: "No measured query×page observation" };
  const q = ` ${row.query.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  const mentioned = products.filter(p => [p.name, p.slug.replaceAll("-", " ")].some(n => q.includes(` ${n.toLowerCase()} `))).map(p => p.slug);
  const comparison = /\b(vs|versus)\b/.test(q);
  const alternatives = /\b(alternatives?|competitors?)\b/.test(q);
  const owners = comparison && mentioned.length === 2
    ? pages.filter(p => p.kind === "comparison" && p.products.length === 2 && mentioned.every(s => p.products.includes(s)))
    : alternatives && mentioned.length === 1 ? pages.filter(p => p.kind === "software" && p.products[0] === mentioned[0]) : [];
  return {
    classification: owners.length !== 1 ? "AMBIGUOUS" : owners[0].page === row.page ? "CORRECT_OWNER" : "LIKELY_WRONG_OWNER",
    expected: owners.map(p => p.page),
    reason: owners.length === 1 ? "Measured landing compared with an existing exact product-intent owner; editorial review required" : "No unique existing exact-intent owner; no semantic cannibalization inference",
  };
}
export function cannibalization(rows: QueryObservation[]) {
  const groups = new Map<string, QueryObservation[]>();
  for (const row of latestQueries(rows).filter(r => r.impressions > 0)) {
    const key = queryScopeKey(row); groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].filter(g => new Set(g.map(r => r.page)).size > 1).map(g => ({
    query: g[0].query, window: g[0].window, scope: g[0].scope,
    pages: g.map(r => ({ page: r.page, impressions: r.impressions, source: r.source })),
    status: "OBSERVED_MULTI_PAGE_IMPRESSIONS", harm: "UNPROVEN", coverage: "Partial query exports can miss other owners; absence is not proof of no split",
  }));
}
