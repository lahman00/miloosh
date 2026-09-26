import { z } from "zod";
import { canonicalPath } from "./evidence";

export const offsiteSchema = z.object({
  id: z.string().min(1), sourceUrl: z.string().url(), targetUrl: z.string().refine(u => canonicalPath(u) !== null),
  kind: z.enum(["DIRECTORY", "COMMUNITY", "EDITORIAL", "OUTREACH"]),
  status: z.enum(["VERIFIED_LIVE", "REPORTED_UNVERIFIED", "PENDING"]),
  verifiedOn: z.iso.date().nullable(), evidence: z.string().min(1),
  publicLinkObserved: z.boolean(), removed: z.boolean().default(false), rel: z.string().nullable(),
  campaign: z.object({ source: z.string(), medium: z.string(), name: z.string() }).nullable(),
}).superRefine((r, ctx) => {
  if (r.status === "VERIFIED_LIVE" && (!r.verifiedOn || !r.publicLinkObserved || r.removed || r.kind === "OUTREACH")) ctx.addIssue({ code: "custom", message: "A send receipt or removed comment is not a verified public placement" });
});
export function ingestOffsite(input: unknown) {
  const rows = offsiteSchema.array().parse(input);
  if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error("Duplicate offsite ID");
  return rows;
}
const reportedSchema = z.object({
  target: z.string(), type: z.string(), status: z.string(),
  verified_live_url: z.string().url().optional(), reported_url: z.string().url().optional(),
  target_miloosh_url: z.string().optional(), evidence: z.string(),
}).refine(r => r.verified_live_url || r.reported_url, "A public source URL is required");
/** Imported action statuses never self-certify public visibility. Preserve known
 * independent verification (including removals) and quarantine unsupported DR,
 * 'dofollow' assumptions and thread-open results. No requests or sends occur. */
export function reconcileReportedOffsite(input: unknown, verified: z.infer<typeof offsiteSchema>[]) {
  const rows = reportedSchema.array().parse(input);
  const key = (raw: string) => { const u = new URL(raw); u.search = ""; u.hash = ""; return u.href.replace(/\/$/, ""); };
  return rows.map(row => {
    const url = row.verified_live_url ?? row.reported_url!;
    const prior = verified.find(v => key(v.sourceUrl) === key(url));
    return { sourceUrl: url, target: row.target, reportedStatus: row.status,
      effectiveStatus: prior?.status ?? "REPORTED_UNVERIFIED",
      conflict: row.status === "EXECUTED_LIVE" && prior?.status !== "VERIFIED_LIVE",
      reason: prior?.evidence ?? "Independent public visibility verification required; a submitted action / open thread is not a placement",
      verifiedEvidenceId: prior?.id ?? null,
    };
  });
}
/** Only our own landing URL, never a merchant tracking asset. */
export function outreachUrl(target: string, source: string, campaign: string) {
  if (!canonicalPath(target) || ![source, campaign].every(v => /^[a-z0-9_-]{1,64}$/.test(v))) throw new Error("Unsafe outreach attribution");
  const url = new URL(target);
  url.searchParams.set("utm_source", source); url.searchParams.set("utm_medium", "referral"); url.searchParams.set("utm_campaign", campaign);
  return url.href;
}
