import type { FirstPartyEvent } from "@/lib/analytics/events";
import { classifySessions } from "@/lib/analytics/human-classification";

const ELIGIBLE = new Set(["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE", "PROBABLE_HUMAN"]);
const STAGES = [
  "1. CLASSIFIED HUMAN VISITORS (estimated)",
  "2. ENGAGED AFTER ARRIVAL (10s / distinct pages)",
  "3. REACHED 2 DISTINCT PAGES WITH ENGAGEMENT",
  "4. HIGH-INTENT EVALUATION AFTER 2+ PAGES",
  "5. MEANINGFUL CTA AFTER HIGH-INTENT",
  "6. VENDOR EXIT (including the qualifying CTA)",
  "7. AFFILIATE EXIT (subset of vendor exit)",
];

/** Chronological progression within ONE session; union visitor IDs only after
 * qualifying. Classify full history before windowing so late QA markers cannot
 * turn earlier events into humans. These remain estimates, not identity proof. */
export function sequentialFunnel(events: readonly FirstPartyEvent[], history: readonly FirstPartyEvent[], includeSynthetic = false) {
  const eligible = new Set(classifySessions(history).filter(c => ELIGIBLE.has(c.bucket)).map(c => c.sessionId));
  const stages = STAGES.map(() => new Set<string>());
  const sessions = new Map<string, { stage: number; paths: Set<string> }>();
  for (const event of [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    if (!includeSynthetic && !eligible.has(event.sessionId)) continue;
    if (!Number.isFinite(Date.parse(event.timestamp))) continue;
    const key = `${event.visitorId}:${event.sessionId}`;
    const state = sessions.get(key) ?? { stage: -1, paths: new Set<string>() };
    if (event.type === "page_view") {
      state.paths.add(event.path);
      state.stage = Math.max(state.stage, 0);
    }
    if (state.stage >= 0 && ((event.type === "engaged_view" && event.durationSeconds >= 10) || state.paths.size >= 2)) state.stage = Math.max(state.stage, 1);
    if (state.stage >= 1 && state.paths.size >= 2) state.stage = Math.max(state.stage, 2);
    if (state.stage >= 2 && (event.type === "software_view" || event.type === "comparison_view" || event.type.startsWith("recommend_"))) state.stage = Math.max(state.stage, 3);
    if (state.stage >= 3 && (event.type === "internal_cta_click" || event.type === "outbound_click")) state.stage = Math.max(state.stage, 4);
    if (state.stage >= 4 && event.type === "outbound_click") {
      state.stage = Math.max(state.stage, event.destination === "affiliate" ? 6 : 5);
    }
    for (let index = 0; index <= state.stage; index++) stages[index].add(event.visitorId);
    sessions.set(key, state);
  }
  const percent = (count: number, base: number) => base ? `${(100 * count / base).toFixed(1)}%` : "N/A";
  return stages.map((people, index) => ({
    stage: includeSynthetic ? `${STAGES[index]} [DEBUG: includes unclassified/QA]` : STAGES[index],
    uniquePeople: people.size,
    pctOfTotalVisitors: percent(people.size, stages[0].size),
    conversionFromPrev: percent(people.size, stages[Math.max(0, index - 1)].size),
  }));
}
