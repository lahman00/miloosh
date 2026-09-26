import { z } from "zod";
import { canonicalPath } from "@/lib/google-war/evidence";

const https = z.string().url().refine(v => { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password; });
const instant = z.iso.datetime({ offset: true });
export const authorityObservationSchema = z.object({
  at: instant,
  status: z.enum(["VERIFIED_LIVE", "REMOVED", "PENDING", "UNVERIFIED", "REJECTED"]),
  method: z.enum(["PUBLIC_BROWSER", "PUBLIC_HTTP", "PUBLIC_WEB_FETCH", "AUTHENTICATED_BROWSER", "REPORTED", "VENDOR_RESPONSE"]),
  exactTargetVerified: z.boolean(), linkPresent: z.boolean().nullable(),
  rel: z.enum(["DOFOLLOW", "NOFOLLOW", "MIXED", "UNKNOWN"]),
  evidence: z.string().min(1),
}).superRefine((o, ctx) => {
  if (o.status === "VERIFIED_LIVE" && (!o.exactTargetVerified || !["PUBLIC_BROWSER", "PUBLIC_HTTP", "PUBLIC_WEB_FETCH"].includes(o.method)))
    ctx.addIssue({ code: "custom", message: "Live requires public evidence of the exact placement, not a thread/account view" });
  if (o.status === "REMOVED" && (!o.exactTargetVerified || !["PUBLIC_BROWSER", "PUBLIC_HTTP", "PUBLIC_WEB_FETCH"].includes(o.method)))
    ctx.addIssue({ code: "custom", message: "Removal requires exact public placement evidence" });
  if (o.rel !== "UNKNOWN" && o.linkPresent !== true) ctx.addIssue({ code: "custom", message: "Cannot classify rel without an observed link" });
});
export const authorityEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), source: z.string().min(1),
  type: z.enum(["DIRECTORY", "EDITORIAL", "COMMUNITY", "OUTREACH", "INFRASTRUCTURE"]),
  targetUrl: z.string().nullable().refine(u => u === null || canonicalPath(u) !== null),
  externalUrl: https, firstObserved: z.iso.date(),
  utm: z.object({ source: z.string().regex(/^[a-z0-9_-]{1,64}$/), medium: z.literal("referral"), campaign: z.string().regex(/^[a-z0-9_-]{1,64}$/) }).nullable(),
  observations: z.array(authorityObservationSchema).min(1),
});
export type AuthorityEntry = z.infer<typeof authorityEntrySchema>;
export function parseRegistry(input: unknown) {
  const rows = authorityEntrySchema.array().parse(input);
  const identities = rows.map(r => `${r.externalUrl.replace(/\/$/, "")}|${r.targetUrl}`);
  if (new Set(rows.map(r => r.id)).size !== rows.length || new Set(identities).size !== rows.length) throw new Error("Duplicate authority identity");
  for (const r of rows) {
    if (r.observations.some(o => o.at.slice(0, 10) < r.firstObserved)) throw new Error("Observation precedes first observed date");
    const dates = r.observations.map(o => `${o.at}|${o.method}`);
    if (new Set(dates).size !== dates.length) throw new Error("Duplicate observation identity");
  }
  return rows;
}
/** Append, never overwrite/reinterpret an earlier capture. Repeated imports are idempotent. */
export function appendAuthority(prior: AuthorityEntry[], incoming: AuthorityEntry[]) {
  const rows = new Map(parseRegistry(prior).map(r => [r.id, r]));
  for (const r of parseRegistry(incoming)) {
    const old = rows.get(r.id);
    if (!old) { rows.set(r.id, r); continue; }
    if (JSON.stringify({ ...old, observations: [] }) !== JSON.stringify({ ...r, observations: [] })) throw new Error("Conflicting immutable placement identity");
    const observations = new Map(old.observations.map(o => [`${o.at}|${o.method}`, o]));
    for (const o of r.observations) {
      const key = `${o.at}|${o.method}`;
      if (observations.has(key) && JSON.stringify(observations.get(key)) !== JSON.stringify(o)) throw new Error("Conflicting immutable authority observation");
      observations.set(key, o);
    }
    rows.set(r.id, { ...old, observations: [...observations.values()].sort((a, b) => a.at.localeCompare(b.at)) });
  }
  return parseRegistry([...rows.values()]);
}
export function authorityState(entry: AuthorityEntry, now: string) {
  if (!Number.isFinite(Date.parse(now))) throw new Error("Invalid authority clock");
  const observations = entry.observations.filter(o => Date.parse(o.at) <= Date.parse(now)).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const publicCheck = observations.find(o => ["VERIFIED_LIVE", "REMOVED"].includes(o.status));
  // A newer authenticated view conflicting with a cached/signed-out removal
  // cannot prove visibility for other people. Preserve conflict, don't invent either truth.
  const conflictingView = publicCheck && observations.some(o => Date.parse(o.at) >= Date.parse(publicCheck.at) && o.method === "AUTHENTICATED_BROWSER" && o.status === "UNVERIFIED" && o.exactTargetVerified && publicCheck.status === "REMOVED");
  const status = conflictingView ? "UNVERIFIED" : publicCheck?.status ?? observations[0]?.status ?? "UNVERIFIED";
  const lastVerified = publicCheck?.at ?? null;
  const stale = !lastVerified || Date.parse(now) - Date.parse(lastVerified) > 14 * 86400000;
  return { ...entry, status, lastVerified, stale, conflict: Boolean(conflictingView),
    linkPresent: status === "VERIFIED_LIVE" ? publicCheck!.linkPresent : status === "REMOVED" ? false : null,
    rel: status === "VERIFIED_LIVE" ? publicCheck!.rel : "UNKNOWN",
    targetKind: entry.targetUrl === null ? "MENTION_ONLY" : canonicalPath(entry.targetUrl) === "/" ? "HOMEPAGE" : "DEEP_LINK",
    verificationMethod: publicCheck?.method ?? observations[0]?.method ?? null,
  };
}
/** Compatibility view only; canonical states/history live in this registry. */
export function legacyOffsiteView(entries: AuthorityEntry[], now: string) {
  return entries.map(e => {
    const r = authorityState(e, now);
    return { id: r.id, sourceUrl: r.externalUrl, targetUrl: r.targetUrl ?? "https://miloosh.com/", kind: r.type === "INFRASTRUCTURE" ? "DIRECTORY" : r.type,
      status: r.status === "VERIFIED_LIVE" && r.linkPresent && !r.stale ? "VERIFIED_LIVE" : r.status === "PENDING" ? "PENDING" : "REPORTED_UNVERIFIED",
      verifiedOn: r.lastVerified?.slice(0, 10) ?? null, evidence: r.observations.at(-1)!.evidence,
      publicLinkObserved: r.linkPresent === true, removed: r.status === "REMOVED", rel: r.rel, campaign: r.utm ? { source: r.utm.source, medium: r.utm.medium, name: r.utm.campaign } : null };
  });
}
export function authorityChanges(before: AuthorityEntry[], beforeAt: string, current: AuthorityEntry[], now: string) {
  if (!Number.isFinite(Date.parse(beforeAt)) || Date.parse(beforeAt) >= Date.parse(now)) throw new Error("Comparable earlier observation required");
  const previous = new Map(before.map(r => [r.id, authorityState(r, beforeAt)]));
  const states = current.map(r => authorityState(r, now));
  return { since: beforeAt, until: now,
    newlyVerified: states.filter(r => r.status === "VERIFIED_LIVE" && !r.stale && previous.get(r.id)?.status !== "VERIFIED_LIVE").map(r => r.id),
    newlyVerifiedDeepLinks: states.filter(r => r.status === "VERIFIED_LIVE" && !r.stale && r.linkPresent && r.targetKind === "DEEP_LINK" && previous.get(r.id)?.status !== "VERIFIED_LIVE").map(r => r.id),
    removed: states.filter(r => r.status === "REMOVED" && previous.get(r.id)?.status === "VERIFIED_LIVE").map(r => r.id),
    note: "Changes in verification between captures; not proof links were newly earned or exactly when removed" };
}
export function deepLinkBaseline(entries: AuthorityEntry[], now: string) {
  const rows = entries.map(e => authorityState(e, now));
  const links = rows.filter(r => r.status === "VERIFIED_LIVE" && !r.stale && r.linkPresent === true);
  return { scope: "Independently verified placement-target pairs, not GSC link totals; no exhaustive-web claim", capturedAt: now,
    homepagePlacements: links.filter(r => r.targetKind === "HOMEPAGE").length,
    deepLinkPlacements: links.filter(r => r.targetKind === "DEEP_LINK").length,
    supportedUrls: [...new Set(links.map(r => r.targetUrl!))].sort(),
    liveMentionsWithoutLinks: rows.filter(r => r.status === "VERIFIED_LIVE" && r.linkPresent === false).length,
    unresolved: rows.filter(r => r.status === "UNVERIFIED" || r.stale).length,
  };
}
