import { z } from "zod";
import { scopeSchema, windowSchema } from "./query-store";

export const periodSchema = z.object({
  page: z.string().url(), query: z.string().nullable(), window: windowSchema, scope: scopeSchema,
  impressions: z.number().int().nonnegative(), clicks: z.number().int().nonnegative(),
  position: z.number().nonnegative().nullable(), source: z.string().min(1), captured_at: z.iso.datetime({ offset: true }),
});
export type Period = z.infer<typeof periodSchema>;
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
export function checkpointWindows(deployedAt: string, days: 7 | 14 | 28) {
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(deployedAt) || !Number.isFinite(Date.parse(deployedAt))) throw new Error("Exact deployment timestamp with timezone required");
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(deployedAt));
  return { before: { start: shift(date, -days), end: shift(date, -1) }, after: { start: shift(date, 1), end: shift(date, days) }, days };
}
export function rankingDelta(beforeInput: Period, afterInput: Period, deployedAt: string | null, days: 7 | 14 | 28) {
  const before = periodSchema.parse(beforeInput), after = periodSchema.parse(afterInput);
  if (!deployedAt) return { status: "WAIT_DEPLOYMENT" as const };
  const windows = checkpointWindows(deployedAt, days);
  if (before.page !== after.page || before.query !== after.query || JSON.stringify(before.scope) !== JSON.stringify(after.scope) ||
    JSON.stringify(before.window) !== JSON.stringify(windows.before) || JSON.stringify(after.window) !== JSON.stringify(windows.after) ||
    before.captured_at.slice(0, 10) <= before.window.end || after.captured_at.slice(0, 10) <= after.window.end)
    return { status: "INCOMPATIBLE_WINDOWS" as const };
  const ctr = (p: Period) => p.impressions ? p.clicks / p.impressions : null;
  const a = ctr(after), b = ctr(before);
  return { status: "COMPARABLE" as const, windows, before, after,
    impressionsDelta: after.impressions - before.impressions, clicksDelta: after.clicks - before.clicks,
    ctrPointDelta: a === null || b === null ? null : a - b,
    positionDelta: after.position === null || before.position === null ? null : after.position - before.position,
    note: "Negative position delta is directional improvement; observational, not a causal estimate. No percentage from a zero baseline." };
}
export type MeasurementResult = ReturnType<typeof rankingDelta> | { status: "WAIT_RECRAWL" | "WAIT_MATCHING_DATA" | "WAIT_INTERVENTION_VERIFICATION" };
export function cohortResult(treatment: MeasurementResult[], control: MeasurementResult[], controlProtocolDeviations: readonly { page: string; reason: string }[] = []) {
  const summarize = (rows: typeof treatment) => {
    const eligible = rows.filter(r => r.status === "COMPARABLE");
    return { assigned: rows.length, measured: eligible.length, missing: rows.length - eligible.length,
      meanImpressionsDelta: eligible.length ? eligible.reduce((s, r) => s + r.impressionsDelta, 0) / eligible.length : null,
      beforeImpressions: eligible.length ? eligible.reduce((s, r) => s + r.before.impressions, 0) : null,
      afterImpressions: eligible.length ? eligible.reduce((s, r) => s + r.after.impressions, 0) : null };
  };
  const t = summarize(treatment), c = summarize(control);
  return { treatment: t, control: c,
    measurementStatus: controlProtocolDeviations.length ? "CONTROL_PROTOCOL_REVIEW" : "DESCRIPTIVE_ONLY",
    controlProtocolDeviations,
    differenceInMeanChange: controlProtocolDeviations.length || t.meanImpressionsDelta === null || c.meanImpressionsDelta === null ? null : t.meanImpressionsDelta - c.meanImpressionsDelta,
    interpretation: "Descriptive treatment/control change only. Nonrandom selection, missing data, recrawl timing and overlapping interventions prevent a causal claim." };
}
