/**
 * Held pages the owner released from the measurement hold before 2026-11-04.
 *
 * Owner decision, 2026-10-12: Coda and Segment no longer match what their vendors publish (Segment's recorded price is
 * no longer published at all), and a site that says every claim is sourced and dated should not keep an inaccurate price to
 * protect a measurement. Only these comparisons are released; no other held page changes. They are out of the
 * comparison-quality experiment analysis (see EXPERIMENT_EXCLUSIONS in data/experiments/comparison-quality-cohort.ts).
 */
export const HOLD_RELEASES: Readonly<Record<string, { reason: string; releasedOn: string }>> = {
  "adobe-analytics-vs-segment": { reason: "Segment's recorded pricing is no longer published; data updated to what Twilio shows.", releasedOn: "2026-10-12" },
  "clickup-vs-coda": { reason: "Coda's pricing page now shows Superhuman Docs prices that differ from the recorded ones.", releasedOn: "2026-10-12" },
  "coda-vs-todoist": { reason: "Coda's pricing page now shows Superhuman Docs prices that differ from the recorded ones.", releasedOn: "2026-10-12" },
  "notion-vs-coda": { reason: "Coda's pricing page now shows Superhuman Docs prices that differ from the recorded ones.", releasedOn: "2026-10-12" },
};
