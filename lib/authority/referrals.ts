import type { FirstPartyEvent } from "@/lib/analytics/events";
import { classifySessions } from "@/lib/analytics/human-classification";
import { eventFingerprint } from "@/lib/analytics/event-persistence";
import { isResearchPath } from "@/lib/analytics/research";

/** Complete export required by caller. Session-local observed paths only; no
 * Google-to-person, cross-session attribution, network conversion or revenue. */
export function authorityReferrals(history: FirstPartyEvent[], start: string, end: string, mode: "referral" | "research" = "referral") {
  const from = Date.parse(start), to = Date.parse(end);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) throw new Error("Invalid referral window");
  const classifications = classifySessions(history);
  const eligible = new Set(classifications.filter(c => ["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE", "PROBABLE_HUMAN"].includes(c.bucket)).map(c => `${c.visitorId}|${c.sessionId}`));
  const groups = new Map<string, FirstPartyEvent[]>(), seen = new Set<string>();
  for (const e of [...history].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))) {
    const fingerprint = eventFingerprint(e), key = `${e.visitorId}|${e.sessionId}`, t = Date.parse(e.timestamp);
    if (!eligible.has(key) || t < from || t >= to || !Number.isFinite(t) || (fingerprint && seen.has(fingerprint))) continue;
    if (fingerprint) seen.add(fingerprint);
    groups.set(key, [...groups.get(key) ?? [], e]);
  }
  type Row = { source: string; landing: string; campaign: string | null; sessions: number; researchVisits: number; engagedSessions: number; ctaExposure: number; ctaClick: number; handoff: number; researchToDecision: number; researchToComparison: number; completeResearchHandoffs: number };
  const rows = new Map<string, Row>();
  for (const events of groups.values()) {
    const landingEvent = events.find(e => e.type === "page_view");
    if (!landingEvent || landingEvent.type !== "page_view") continue;
    const acq = landingEvent.acquisition?.sessionId === landingEvent.sessionId ? landingEvent.acquisition : undefined;
    const traffic = acq?.trafficSource ?? landingEvent.trafficSource;
    if (mode === "referral" && !["referral", "social"].includes(traffic ?? "")) continue;
    if (mode === "research" && !events.some(e => e.type === "page_view" && isResearchPath(e.path))) continue;
    const source = acq?.utmSource ?? landingEvent.utmSource ?? acq?.referrerHost ?? landingEvent.referrerHost ?? traffic ?? "UNKNOWN";
    const landing = acq?.landingPath ?? landingEvent.path, campaign = acq?.utmCampaign ?? landingEvent.utmCampaign ?? null;
    const key = JSON.stringify([source, landing, campaign]);
    const row = rows.get(key) ?? { source, landing, campaign, sessions: 0, researchVisits: 0, engagedSessions: 0, ctaExposure: 0, ctaClick: 0, handoff: 0, researchToDecision: 0, researchToComparison: 0, completeResearchHandoffs: 0 };
    row.sessions++;
    const has = (type: string) => events.some(e => e.type === type);
    row.engagedSessions += Number(events.some(e => e.type === "engaged_view" && e.durationSeconds >= 10));
    row.ctaExposure += Number(has("cta_impression")); row.ctaClick += Number(has("cta_click")); row.handoff += Number(has("outbound_click"));
    row.researchVisits += Number(events.some(e => e.type === "page_view" && isResearchPath(e.path)));
    const research = new Set<string>(), clickedDecisions = new Set<string>(), visitedDecisions = new Set<string>(), clicks = new Set<string>();
    let completed = false, toDecision = false, toComparison = false;
    for (const e of events) {
      if (e.type === "page_view" && isResearchPath(e.path)) research.add(e.path);
      if ((e.type === "research_to_decision_click" || e.type === "research_to_comparison_click") && research.has(e.path) && "targetPath" in e && e.targetPath) {
        clickedDecisions.add(e.targetPath); toDecision ||= e.type === "research_to_decision_click"; toComparison ||= e.type === "research_to_comparison_click";
      }
      if (e.type === "page_view" && clickedDecisions.has(e.path)) visitedDecisions.add(e.path);
      const cta = "softwareSlug" in e ? `${e.path}|${e.softwareSlug}|${"ctaLocation" in e ? e.ctaLocation ?? "UNKNOWN" : "UNKNOWN"}` : "";
      if (e.type === "cta_click" && visitedDecisions.has(e.path)) clicks.add(cta);
      if (e.type === "outbound_click" && clicks.has(cta)) completed = true;
    }
    row.researchToDecision += Number(toDecision); row.researchToComparison += Number(toComparison); row.completeResearchHandoffs += Number(completed);
    rows.set(key, row);
  }
  return { status: "AVAILABLE", window: { start, endExclusive: end }, rows: [...rows.values()],
    exclusions: classifications.filter(c => !eligible.has(`${c.visitorId}|${c.sessionId}`)).length,
    note: "Classified session estimates, not proven humans; raw handoffs separate from complete observed sequence. No referrer permalink inference, conversions or Google causal attribution.", conversions: null };
}
