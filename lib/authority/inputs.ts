import { z } from "zod";
import { canonicalPath } from "@/lib/google-war/evidence";
import { indexingEligibility } from "./measurement";
import type { authorityReferrals } from "./referrals";

export const eventExportSchema = z.object({
  coverage: z.literal("COMPLETE"), fullHistory: z.literal(true),
  start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }),
  events: z.array(z.object({ type: z.string(), path: z.string(), visitorId: z.string(), sessionId: z.string(), timestamp: z.iso.datetime({ offset: true }) }).passthrough()),
}).refine(r => Date.parse(r.start) < Date.parse(r.end), "Invalid export window");

export function referralMovement(before: ReturnType<typeof authorityReferrals> | null, after: ReturnType<typeof authorityReferrals> | null) {
  if (!before || !after) return { status: "UNKNOWN", previous: null, current: null, comparable: false };
  const duration = (r: typeof before) => Date.parse(r.window.endExclusive) - Date.parse(r.window.start);
  const comparable = duration(before) === duration(after) && Date.parse(before.window.endExclusive) <= Date.parse(after.window.start);
  const sum = (r: typeof before) => r.rows.reduce((n, row) => n + row.sessions, 0);
  return { status: comparable ? "COMPARABLE" : "INCOMPATIBLE_WINDOWS", previous: sum(before), current: sum(after), comparable };
}

const canonical = z.string().refine(u => canonicalPath(u) !== null, "Exact Miloosh canonical required");
export const indexingProofSchema = z.object({
  url: canonical, source: z.string().min(1), deploymentId: z.string().min(1),
  deployedAt: z.iso.datetime({ offset: true }), verifiedAt: z.iso.datetime({ offset: true }),
  httpStatus: z.number().int(), canonical: canonical, indexable: z.boolean(), inSitemap: z.boolean(),
  quotaRemaining: z.number().int().nonnegative().nullable(), quotaCheckedAt: z.iso.datetime({ offset: true }).nullable(),
  requestHistoryComplete: z.boolean(), previousRequests: z.array(canonical),
});
/** Eligibility report only. Never calls Google or records a submission. */
export function indexingFromProof(url: string, raw: unknown, now: string) {
  if (!raw) return "WAIT_DEPLOYMENT_VERIFICATION";
  const p = indexingProofSchema.parse(raw), clock = Date.parse(now);
  if (p.url !== url) throw new Error("Indexing proof target mismatch");
  if (!p.requestHistoryComplete) return "WAIT_REQUEST_HISTORY";
  if (p.previousRequests.includes(url)) return "ALREADY_REQUESTED";
  if (Date.parse(p.verifiedAt) > clock || clock - Date.parse(p.verifiedAt) > 86400000) return "WAIT_DEPLOYMENT_VERIFICATION";
  const quotaFresh = p.quotaCheckedAt && Date.parse(p.quotaCheckedAt) <= clock && clock - Date.parse(p.quotaCheckedAt) <= 86400000;
  return indexingEligibility({ ...p, quotaRemaining: quotaFresh ? p.quotaRemaining : null });
}
