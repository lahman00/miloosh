import type { PersistedPainCandidate } from "./pain-candidate-store";

/**
 * MILOOSH OVERNIGHT MONSTER mission (2026-08-24), P2 + P3 — merges pain
 * clustering and velocity into one module since velocity is inherently
 * a per-cluster measure (P3's own feature list -- new mentions/hour,
 * unique communities, engagement velocity -- only makes sense once
 * signals about the same real-world event are already grouped).
 *
 * Clustering key: vendor + normalizedPainClass + a rolling time window
 * (CLUSTER_WINDOW_MS). Two real posts about the same underlying event
 * (e.g. ten different r/sysadmin threads about Freshdesk's free-plan
 * change) collapse into one cluster; two unrelated pains about the same
 * vendor (a pricing complaint and a support complaint) do not, since
 * normalizedPainClass differs.
 *
 * This is pure, deterministic grouping over whatever candidates the
 * caller passes in (typically getAllPainCandidates()) -- it does not
 * fetch, discover, or persist anything itself.
 */

const CLUSTER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days -- matches pain-forecast.ts's longest forecast horizon

export type TrendDirection = "isolated" | "stable" | "rising" | "accelerating" | "exploding" | "cooling";

export type PainCluster = {
  id: string;
  vendor: string;
  normalizedPainClass: string;
  candidateIds: string[];
  signalCount: number;
  uniqueSourceCount: number;
  earliestSignalAt: string;
  latestSignalAt: string;
  engagementVelocityPerDay: number;
  averageSeverity: number;
  averageCommercialIntent: number;
  reliabilityMix: { high: number; medium: number; low: number };
  trendDirection: TrendDirection;
  painVelocityScore: number;
  painVelocityExplanation: string;
};

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function reliabilityBucket(value: number | undefined): "high" | "medium" | "low" {
  const v = value ?? 50;
  if (v >= 75) return "high";
  if (v >= 45) return "medium";
  return "low";
}

/**
 * Groups candidates whose discoveredAt timestamps fall within
 * CLUSTER_WINDOW_MS of the cluster's running earliest signal -- a single
 * pass, order-independent (candidates are sorted by discoveredAt first),
 * so a slow trickle that never has two signals within the window forms
 * many small clusters rather than one artificially long-lived one.
 */
export function clusterPainCandidates(candidates: PersistedPainCandidate[]): PainCluster[] {
  const withVendor = candidates.filter((c) => c.vendor && c.normalizedPainClass !== "unclassified");
  const byKey = new Map<string, PersistedPainCandidate[]>();
  for (const candidate of withVendor) {
    const key = `${candidate.vendor!.trim().toLowerCase()}::${candidate.normalizedPainClass}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(candidate);
  }

  const clusters: PainCluster[] = [];
  for (const [key, group] of byKey) {
    const sorted = [...group].sort((a, b) => (parseTime(a.discoveredAt) ?? 0) - (parseTime(b.discoveredAt) ?? 0));
    let current: PersistedPainCandidate[] = [];
    let windowStart: number | null = null;

    const flush = () => {
      if (current.length === 0) return;
      clusters.push(buildCluster(key, current));
      current = [];
      windowStart = null;
    };

    for (const candidate of sorted) {
      const t = parseTime(candidate.discoveredAt);
      if (t === null) continue;
      if (windowStart === null || t - windowStart <= CLUSTER_WINDOW_MS) {
        if (windowStart === null) windowStart = t;
        current.push(candidate);
      } else {
        flush();
        windowStart = t;
        current.push(candidate);
      }
    }
    flush();
  }

  return clusters.sort((a, b) => b.painVelocityScore - a.painVelocityScore);
}

function buildCluster(key: string, group: PersistedPainCandidate[]): PainCluster {
  const [vendor, normalizedPainClass] = key.split("::");
  const times = group.map((c) => parseTime(c.discoveredAt)).filter((t): t is number => t !== null);
  const earliest = Math.min(...times);
  const latest = Math.max(...times);
  const spanDays = Math.max(1 / 24, (latest - earliest) / (24 * 60 * 60 * 1000));

  const uniqueSources = new Set(group.map((c) => c.sourceUrl)).size;
  const totalEngagement = group.reduce((sum, c) => sum + (c.engagement ?? 0), 0);
  const engagementVelocityPerDay = Math.round((totalEngagement / spanDays) * 10) / 10;

  const reliabilityMix = { high: 0, medium: 0, low: 0 };
  for (const c of group) reliabilityMix[reliabilityBucket(c.sourceReliability)]++;

  const { trendDirection, painVelocityScore, explanation } = computeVelocity(group, times, spanDays);

  return {
    id: `cluster_${key.replace(/[^a-z0-9]+/g, "-")}_${earliest}`,
    vendor,
    normalizedPainClass,
    candidateIds: group.map((c) => c.id),
    signalCount: group.length,
    uniqueSourceCount: uniqueSources,
    earliestSignalAt: new Date(earliest).toISOString(),
    latestSignalAt: new Date(latest).toISOString(),
    engagementVelocityPerDay,
    averageSeverity: average(group.map((c) => c.severity ?? 0)),
    averageCommercialIntent: average(group.map((c) => c.commercialIntent ?? 0)),
    reliabilityMix,
    trendDirection,
    painVelocityScore,
    painVelocityExplanation: explanation,
  };
}

/**
 * Defensible, explainable heuristics -- not fake ML. Compares signal
 * frequency in the first half of the cluster's window against the
 * second half; a single-signal cluster is always "isolated" (there is
 * no trend to measure from one data point), matching the mission's own
 * "avoid fake precision" instruction.
 */
function computeVelocity(
  group: PersistedPainCandidate[],
  times: number[],
  spanDays: number,
): { trendDirection: TrendDirection; painVelocityScore: number; explanation: string } {
  if (group.length === 1) {
    return { trendDirection: "isolated", painVelocityScore: 10, explanation: "Single signal -- no trend measurable yet." };
  }

  const midpoint = Math.min(...times) + (Math.max(...times) - Math.min(...times)) / 2;
  const earlierHalf = times.filter((t) => t <= midpoint).length;
  const laterHalf = times.filter((t) => t > midpoint).length;
  const ratio = earlierHalf === 0 ? laterHalf : laterHalf / earlierHalf;

  const signalsPerDay = group.length / spanDays;
  const uniqueSources = new Set(group.map((c) => c.sourceUrl)).size;
  const sourceDiversityBonus = Math.min(20, uniqueSources * 4);
  const frequencyScore = Math.min(50, signalsPerDay * 12);
  const accelerationScore = Math.min(30, Math.max(0, (ratio - 1) * 20));

  const painVelocityScore = Math.round(Math.min(100, frequencyScore + accelerationScore + sourceDiversityBonus));

  let trendDirection: TrendDirection;
  if (ratio >= 2.5 && signalsPerDay >= 1) trendDirection = "exploding";
  else if (ratio >= 1.5) trendDirection = "accelerating";
  else if (ratio >= 0.85) trendDirection = "rising";
  else if (ratio >= 0.5) trendDirection = "stable";
  else trendDirection = "cooling";

  const explanation = `${group.length} signals across ${uniqueSources} unique source(s) over ${spanDays.toFixed(1)}d (${signalsPerDay.toFixed(2)}/day); later-half:earlier-half signal ratio ${ratio.toFixed(2)}.`;

  return { trendDirection, painVelocityScore, explanation };
}
