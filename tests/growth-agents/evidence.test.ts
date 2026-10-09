import { describe, expect, it } from "vitest";
import {
  addDays,
  ageInDays,
  compareDates,
  ctrOf,
  inclusiveDays,
  isDecisionGrade,
  measured,
  notMeasured,
  notObserved,
  parseIsoDate,
  round,
  unavailable,
  valueOf,
  windowsOverlap,
  withFreshness,
} from "@/lib/growth-agents/evidence";

const provenance = { source: "test", locator: "fixture", capturedAt: "2026-10-01T00:00:00Z" };

describe("Measured<T>: a number that was not measured is never a number", () => {
  it("only a measurement carries a value", () => {
    expect(valueOf(measured(7, provenance))).toBe(7);
    for (const missing of [unavailable<number>("no access"), notMeasured<number>("never captured"), notObserved<number>("absent from the table")]) {
      expect(valueOf(missing)).toBeNull();
      expect("value" in missing).toBe(false);
    }
  });

  it("keeps zero distinct from missing", () => {
    expect(valueOf(measured(0, provenance))).toBe(0);
    expect(valueOf(unavailable<number>("no access"))).not.toBe(0);
  });

  it("treats only a fresh complete measurement as decision-grade", () => {
    expect(isDecisionGrade(measured(1, provenance))).toBe(true);
    expect(isDecisionGrade(unavailable("x"))).toBe(false);
    const stale = withFreshness(measured(1, provenance), new Date("2026-12-01T00:00:00Z"), 14);
    expect(stale.state).toBe("STALE");
    expect(isDecisionGrade(stale)).toBe(false);
    expect(valueOf(stale)).toBe(1);
  });

  it("demotes an old reading to STALE and leaves a fresh or never-measured one unchanged", () => {
    const now = new Date("2026-10-09T00:00:00Z");
    expect(withFreshness(measured(1, provenance), now, 14).state).toBe("MEASURED");
    expect(withFreshness(measured(1, provenance), now, 3).state).toBe("STALE");
    const never = notMeasured<number>("never");
    expect(withFreshness(never, now, 1)).toBe(never);
  });
});

describe("date arithmetic works on calendar strings", () => {
  it("rejects dates that do not exist", () => {
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("26-01-01")).toBeNull();
    expect(parseIsoDate("2026-10-09")).toEqual({ y: 2026, m: 10, d: 9 });
  });

  it("counts days inclusively, as the measurement contract does", () => {
    expect(inclusiveDays("2026-07-23", "2026-08-19")).toBe(28);
    expect(inclusiveDays("2026-09-08", "2026-10-05")).toBe(28);
    expect(inclusiveDays("2026-10-09", "2026-10-09")).toBe(1);
  });

  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-10-05", 3)).toBe("2026-10-08");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(compareDates("2026-10-09", "2026-10-08")).toBeGreaterThan(0);
  });

  it("detects overlapping windows including a shared boundary day", () => {
    expect(windowsOverlap({ start: "2026-07-23", end: "2026-08-19" }, { start: "2026-08-19", end: "2026-09-01" })).toBe(true);
    expect(windowsOverlap({ start: "2026-07-23", end: "2026-08-19" }, { start: "2026-08-20", end: "2026-09-01" })).toBe(false);
  });

  it("ages a timestamp in whole days and treats an unreadable one as infinitely old", () => {
    expect(ageInDays("2026-10-01T00:00:00Z", new Date("2026-10-09T12:00:00Z"))).toBe(8);
    expect(ageInDays("not a date", new Date("2026-10-09T00:00:00Z"))).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("rates", () => {
  it("leaves CTR undefined for zero or unknown impressions instead of inventing zero", () => {
    expect(ctrOf(0, 0)).toBeNull();
    expect(ctrOf(3, null)).toBeNull();
    expect(ctrOf(null, 10)).toBeNull();
    expect(ctrOf(1, 4)).toBe(0.25);
  });

  it("rounds to the requested digits", () => {
    expect(round(2.3456)).toBe(2.35);
    expect(round(2.3456, 1)).toBe(2.3);
  });
});
