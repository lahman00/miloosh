import type { FirstPartyEvent } from "@/lib/analytics/events";
import { classifySessions } from "@/lib/analytics/human-classification";
import { eventFingerprint } from "@/lib/analytics/event-persistence";

const eligible = new Set(["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE", "PROBABLE_HUMAN"]);
/** Reporting only. No store read/write or Google-to-person join. Whole-history
 * QA classification precedes filtering. Handoff is a recorded attempt, NOT a
 * confirmed merchant arrival, signup, commission or conversion. */
export function organicMoneyFunnel(history: FirstPartyEvent[], start: string, end: string) {
  const startTime = Date.parse(start), endTime = Date.parse(end);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime >= endTime) throw new Error("Invalid funnel window");
  const allowed = new Set(classifySessions(history).filter(c => eligible.has(c.bucket)).map(c => c.sessionId));
  const seen = new Set<string>();
  const events = history.filter(e => {
    const id = eventFingerprint(e);
    if (id && seen.has(id)) return false;
    if (id) seen.add(id);
    const time = Date.parse(e.timestamp);
    return allowed.has(e.sessionId) && time >= startTime && time < endTime && Number.isFinite(time);
  }).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  type Session = { landing: string; visited: Set<string>; engaged: Set<string>; exposure: Set<string>; clicks: Set<string> };
  const sessions = new Map<string, Session>();
  const rows = new Map<string, Array<Set<string>>>();
  const observed = new Map<string, { exposure: Set<string>; click: Set<string>; handoff: Set<string> }>();
  const campaigns = new Map<string, Set<string>>();
  for (const e of events) {
    const sessionKey = `${e.visitorId}|${e.sessionId}`;
    const acquisition = e.acquisition?.sessionId === e.sessionId ? e.acquisition : undefined;
    if (e.type === "page_view" && !sessions.has(sessionKey)) {
      const source = acquisition?.trafficSource ?? e.trafficSource;
      const campaign = acquisition?.utmCampaign ?? e.utmCampaign;
      if (campaign && source !== "organic_search") {
        const key = JSON.stringify([acquisition?.utmSource ?? e.utmSource ?? null, acquisition?.utmMedium ?? e.utmMedium ?? null, campaign]);
        campaigns.set(key, (campaigns.get(key) ?? new Set()).add(sessionKey));
      }
      if (source !== "organic_search") continue;
      sessions.set(sessionKey, { landing: acquisition?.landingPath ?? e.path, visited: new Set(), engaged: new Set(), exposure: new Set(), clicks: new Set() });
    }
    const session = sessions.get(sessionKey);
    if (!session) continue;
    const path = e.path;
    if (e.type === "page_view") session.visited.add(path);
    if (!session.visited.has(path)) continue;
    const stages = rows.get(path) ?? Array.from({ length: 5 }, () => new Set<string>());
    const rawStages = observed.get(path) ?? { exposure: new Set<string>(), click: new Set<string>(), handoff: new Set<string>() };
    if (e.type === "cta_impression") rawStages.exposure.add(sessionKey);
    if (e.type === "cta_click") rawStages.click.add(sessionKey);
    if (e.type === "outbound_click") rawStages.handoff.add(sessionKey);
    observed.set(path, rawStages);
    stages[0].add(sessionKey);
    if (e.type === "engaged_view" && e.durationSeconds >= 10) session.engaged.add(path);
    if (session.engaged.has(path)) stages[1].add(sessionKey);
    const cta = "softwareSlug" in e ? `${path}|${e.softwareSlug}|${"ctaLocation" in e ? e.ctaLocation ?? "UNKNOWN" : "UNKNOWN"}` : "";
    if (e.type === "cta_impression") session.exposure.add(cta);
    if (session.engaged.has(path) && [...session.exposure].some(k => k.startsWith(`${path}|`))) stages[2].add(sessionKey);
    if (e.type === "cta_click" && session.exposure.has(cta) && session.engaged.has(path)) { session.clicks.add(cta); stages[3].add(sessionKey); }
    if (e.type === "outbound_click" && session.clicks.has(cta)) stages[4].add(sessionKey);
    rows.set(path, stages);
  }
  return {
    window: { start, endExclusive: end }, eligibleOrganicSessions: sessions.size,
    rows: [...rows].map(([page, s]) => ({ page, classifiedOrganicVisits: s[0].size, decisionEngagement: s[1].size, ctaExposureAfterEngagement: s[2].size, exposedCtaClicks: s[3].size, recordedMerchantHandoffs: s[4].size,
      observedCtaExposureSessions: observed.get(page)!.exposure.size, observedCtaClickSessions: observed.get(page)!.click.size,
      observedMerchantHandoffSessions: observed.get(page)!.handoff.size, handoffsWithoutCompleteSequence: observed.get(page)!.handoff.size - s[4].size })),
    referralCampaigns: [...campaigns].map(([campaign, set]) => ({ dimensions: JSON.parse(campaign), classifiedSessions: set.size })),
    identity: "Session estimates from existing classifier, not proven people. GSC aggregates stay separate. No causal attribution to rankings.",
    merchantArrivals: null, affiliateConversions: null,
  };
}
