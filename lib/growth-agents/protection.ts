import { compareDates } from "./evidence";
import { canonicalPageUrl } from "./urls";

/**
 * Protection model for experiments, observation windows and unfinished work.
 *
 * A page is only EDITABLE when every protection source was read and none of
 * them claims the page. If a source could not be read the verdict is UNKNOWN,
 * which blocks an executable recommendation exactly as a protected page does:
 * "not listed anywhere I could read" is not clearance.
 *
 * This module is pure. The adapter in `protection-sources.ts` reads the
 * repository registries and git state and hands the result in as signals.
 */

export type ProtectionSourceId =
  | "legacy-cohort"
  | "measuring-receipts"
  | "first-revenue-cohort"
  | "comparison-quality-cohort"
  | "decision-money-pages"
  | "release-observation"
  | "in-flight-work";

export type ProtectionKind = "PROTECTED" | "OBSERVATION_WINDOW" | "IN_FLIGHT";

export type ProtectionVerdict = "EDITABLE" | "PROTECTED" | "OBSERVATION_WINDOW" | "IN_FLIGHT" | "UNKNOWN";

export type ProtectionSignal = {
  source: ProtectionSourceId;
  kind: ProtectionKind;
  /** Page URLs this signal claims. Non-Miloosh URLs are ignored. */
  urls: string[];
  detail: string;
  /** Repo-relative path, commit or worktree that justifies the signal. */
  evidence: string;
  /** For OBSERVATION_WINDOW signals: the first day the page may be reconsidered (YYYY-MM-DD). */
  until?: string;
  /** True when an experiment record is still MEASURING although its declared window has ended: only the owner can close it. */
  needsClosure?: boolean;
};

export type ProtectionSourceStatus = {
  id: ProtectionSourceId;
  /** False when the registry or git state could not be read. */
  ok: boolean;
  /** Number of URLs (or slugs) the source contributed. */
  count: number;
  locator: string;
  note?: string;
};

export type ProtectionReason = Pick<ProtectionSignal, "source" | "kind" | "detail" | "evidence" | "until" | "needsClosure">;

export type SharedInputInFlight = {
  /** Shared template/data file that another unfinished change touches. */
  file: string;
  evidence: string;
};

export type ProtectionSnapshot = {
  checkoutSha: string;
  generatedAt: string;
  sources: ProtectionSourceStatus[];
  byUrl: Map<string, ProtectionReason[]>;
  sharedInputsInFlight: SharedInputInFlight[];
};

export function buildProtectionSnapshot(input: {
  checkoutSha: string;
  generatedAt: string;
  sources: ProtectionSourceStatus[];
  signals: ProtectionSignal[];
  sharedInputsInFlight?: SharedInputInFlight[];
}): ProtectionSnapshot {
  const byUrl = new Map<string, ProtectionReason[]>();
  for (const signal of input.signals) {
    for (const raw of signal.urls) {
      const url = canonicalPageUrl(raw);
      if (!url) continue;
      const list = byUrl.get(url) ?? [];
      list.push({
        source: signal.source,
        kind: signal.kind,
        detail: signal.detail,
        evidence: signal.evidence,
        ...(signal.until ? { until: signal.until } : {}),
        ...(signal.needsClosure ? { needsClosure: true } : {}),
      });
      byUrl.set(url, list);
    }
  }
  for (const list of byUrl.values()) {
    list.sort((a, b) => a.source.localeCompare(b.source) || a.evidence.localeCompare(b.evidence));
  }
  return {
    checkoutSha: input.checkoutSha,
    generatedAt: input.generatedAt,
    sources: [...input.sources].sort((a, b) => a.id.localeCompare(b.id)),
    byUrl,
    sharedInputsInFlight: [...(input.sharedInputsInFlight ?? [])].sort((a, b) => a.file.localeCompare(b.file)),
  };
}

export type ProtectionResult = {
  url: string;
  verdict: ProtectionVerdict;
  reasons: ProtectionReason[];
  /** Sources that could not be read; non-empty means no EDITABLE verdict is possible. */
  unreadSources: ProtectionSourceId[];
  /** For OBSERVATION_WINDOW: the latest end date among the page's windows. Null for every other verdict. */
  eligibleAfter: string | null;
};

const PRECEDENCE: ProtectionKind[] = ["PROTECTED", "OBSERVATION_WINDOW", "IN_FLIGHT"];

export function protectionFor(rawUrl: string, snapshot: ProtectionSnapshot): ProtectionResult {
  const url = canonicalPageUrl(rawUrl) ?? rawUrl;
  const reasons = snapshot.byUrl.get(url) ?? [];
  const unreadSources = snapshot.sources.filter((s) => !s.ok).map((s) => s.id);
  for (const kind of PRECEDENCE) {
    if (reasons.some((r) => r.kind === kind)) {
      const eligibleAfter =
        kind === "OBSERVATION_WINDOW" && !reasons.some((r) => r.kind === "PROTECTED")
          ? reasons
              .filter((r) => r.kind === "OBSERVATION_WINDOW" && r.until)
              .map((r) => r.until as string)
              .reduce<string | null>((latest, day) => (latest === null || compareDates(day, latest) > 0 ? day : latest), null)
          : null;
      return { url, verdict: kind, reasons, unreadSources, eligibleAfter };
    }
  }
  if (unreadSources.length > 0) return { url, verdict: "UNKNOWN", reasons, unreadSources, eligibleAfter: null };
  return { url, verdict: "EDITABLE", reasons, unreadSources, eligibleAfter: null };
}

/** A page may be changed by an opportunity only when it and every derived page it would re-render are EDITABLE. */
export function isChangeSafe(results: readonly ProtectionResult[]): boolean {
  return results.length > 0 && results.every((r) => r.verdict === "EDITABLE");
}

export function summarizeVerdicts(results: readonly ProtectionResult[]): Record<ProtectionVerdict, number> {
  const counts: Record<ProtectionVerdict, number> = { EDITABLE: 0, PROTECTED: 0, OBSERVATION_WINDOW: 0, IN_FLIGHT: 0, UNKNOWN: 0 };
  for (const r of results) counts[r.verdict] += 1;
  return counts;
}
