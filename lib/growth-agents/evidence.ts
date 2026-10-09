/**
 * Evidence primitives shared by the growth agents (Google Recovery,
 * Affiliate Revenue, Director, Guardian).
 *
 * The one rule this file exists to enforce: a number that was not measured
 * is never a number. Every metric travels as a `Measured<T>` whose state says
 * whether it was measured, could not be read, was never captured, or is
 * absent from a capture; none of the non-measured states carries a value, so
 * downstream code cannot add them up or divide by them by accident.
 *
 * Dates are plain `YYYY-MM-DD` strings. Google Search Console days are
 * Pacific-time days, so no timezone conversion happens here: the calendar
 * arithmetic below works on the date strings themselves.
 */

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Where a measurement came from and when. Locators are repo-relative paths or public URLs, never credentials. */
export type Provenance = {
  /** Short source id, for example "gsc-ui-capture", "repo-registry", "git". */
  source: string;
  /** Repo-relative file path, URL, or command that reproduces the reading. */
  locator: string;
  /** ISO timestamp (UTC) of the reading. */
  capturedAt: string;
  /** Free text limits of the reading. */
  caveat?: string;
};

export type MeasuredState = "MEASURED" | "UNAVAILABLE" | "NOT_MEASURED" | "NOT_OBSERVED" | "STALE" | "PARTIAL";

export type Measured<T> =
  | { state: "MEASURED"; value: T; provenance: Provenance }
  | { state: "PARTIAL"; value: T; provenance: Provenance; reason: string }
  | { state: "STALE"; value: T; provenance: Provenance; reason: string }
  | { state: "UNAVAILABLE"; reason: string; provenance?: Provenance }
  | { state: "NOT_MEASURED"; reason: string }
  | { state: "NOT_OBSERVED"; reason: string; provenance?: Provenance };

/** Claim labels used in receipts. They describe the strength of a statement, not the state of a metric. */
export type ClaimLabel = "VERIFIED" | "OBSERVED" | "ESTIMATED" | "INFERRED" | "NOT_VERIFIED" | "NOT_APPLICABLE";

export function measured<T>(value: T, provenance: Provenance): Measured<T> {
  return { state: "MEASURED", value, provenance };
}

export function unavailable<T = never>(reason: string, provenance?: Provenance): Measured<T> {
  return { state: "UNAVAILABLE", reason, ...(provenance ? { provenance } : {}) };
}

export function notMeasured<T = never>(reason: string): Measured<T> {
  return { state: "NOT_MEASURED", reason };
}

export function notObserved<T = never>(reason: string, provenance?: Provenance): Measured<T> {
  return { state: "NOT_OBSERVED", reason, ...(provenance ? { provenance } : {}) };
}

/** The value of a measurement that actually carries one, otherwise null. Never a zero. */
export function valueOf<T>(m: Measured<T>): T | null {
  return m.state === "MEASURED" || m.state === "PARTIAL" || m.state === "STALE" ? m.value : null;
}

/** True only for a fresh, complete measurement. PARTIAL and STALE values exist but must not be treated as decision-grade. */
export function isDecisionGrade<T>(m: Measured<T>): m is Extract<Measured<T>, { state: "MEASURED" }> {
  return m.state === "MEASURED";
}

export function parseIsoDate(value: string): { y: number; m: number; d: number } | null {
  if (!ISO_DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

function toEpochDay(value: string): number {
  const parts = parseIsoDate(value);
  if (!parts) throw new Error(`Invalid ISO date: ${value}`);
  return Math.round(Date.UTC(parts.y, parts.m - 1, parts.d) / 86_400_000);
}

export function addDays(value: string, days: number): string {
  const parts = parseIsoDate(value);
  if (!parts) throw new Error(`Invalid ISO date: ${value}`);
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d + days)).toISOString().slice(0, 10);
}

/** Inclusive day count, as the Miloosh measurement contract defines it: (end - start) + 1. */
export function inclusiveDays(start: string, end: string): number {
  return toEpochDay(end) - toEpochDay(start) + 1;
}

export function compareDates(a: string, b: string): number {
  return toEpochDay(a) - toEpochDay(b);
}

export type DateWindow = { start: string; end: string };

export function windowDays(window: DateWindow): number {
  return inclusiveDays(window.start, window.end);
}

export function windowsOverlap(a: DateWindow, b: DateWindow): boolean {
  return compareDates(a.start, b.end) <= 0 && compareDates(b.start, a.end) <= 0;
}

/** Whole days between an ISO timestamp and `now`, floored. Negative when the timestamp is in the future. */
export function ageInDays(isoTimestamp: string, now: Date): number {
  const then = Date.parse(isoTimestamp);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - then) / 86_400_000);
}

/**
 * Demotes a measured value to STALE when its reading is older than `maxAgeDays`.
 * Other states are returned unchanged: a metric that was never measured does not become fresher with time.
 */
export function withFreshness<T>(m: Measured<T>, now: Date, maxAgeDays: number): Measured<T> {
  if (m.state !== "MEASURED") return m;
  const age = ageInDays(m.provenance.capturedAt, now);
  if (age <= maxAgeDays) return m;
  return {
    state: "STALE",
    value: m.value,
    provenance: m.provenance,
    reason: `Read ${age} day(s) before the report date; the freshness limit for this source is ${maxAgeDays} day(s).`,
  };
}

/** CTR as a fraction. Undefined (null) for zero or unknown impressions, as the measurement contract requires. */
export function ctrOf(clicks: number | null, impressions: number | null): number | null {
  if (clicks === null || impressions === null || impressions <= 0) return null;
  return clicks / impressions;
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
