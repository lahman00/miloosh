import { authorityState, type AuthorityEntry } from "./registry";
export function authorityAlerts(entries: AuthorityEntry[], now: string, routes: Set<string>, research: { url: string; noindex: boolean }[], firstBrandSignal: boolean, referrals?: { previous: number | null; current: number | null; comparable: boolean }) {
  const alerts: { code: string; target: string; reason: string }[] = [];
  for (const e of entries) {
    const state = authorityState(e, now);
    if (state.status === "REMOVED") alerts.push({ code: "PLACEMENT_REMOVED", target: e.externalUrl, reason: "Exact public removal observed; no moderation-cause inference" });
    if (state.conflict) alerts.push({ code: "VISIBILITY_CONFLICT", target: e.externalUrl, reason: "Authenticated and public observations disagree; do not count live" });
    if (e.targetUrl && !routes.has(new URL(e.targetUrl).pathname)) alerts.push({ code: "BROKEN_DEEP_LINK_TARGET", target: e.targetUrl, reason: "Target absent from emitted route set; historical record retained" });
  }
  for (const r of research) if (r.noindex) alerts.push({ code: "RESEARCH_NOINDEX", target: r.url, reason: "Rendered research robots contains noindex" });
  if (firstBrandSignal) alerts.push({ code: "BRANDED_QUERY_FIRST_OBSERVED", target: "sc-domain:miloosh.com", reason: "First observed positive filtered signal after zero in comparable windows; not universal first-ever search" });
  if (referrals?.comparable && referrals.previous !== null && referrals.current !== null && referrals.previous >= 10 && referrals.current >= Math.max(50, referrals.previous * 3)) alerts.push({ code: "REFERRAL_SPIKE", target: "classified-referral-sessions", reason: "Operator threshold >=50 and >=3x matched prior window (prior >=10); not a causal/success verdict" });
  return alerts;
}
