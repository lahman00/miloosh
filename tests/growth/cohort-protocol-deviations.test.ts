import { describe, expect, it } from "vitest";
import { cohortRegistry } from "@/lib/google-war/cohorts";
import { cohortResult, rankingDelta, type Period } from "@/lib/google-war/measurement";
import deviations from "@/data/growth/cohort-protocol-deviations.json";

describe("integrated control-arm protocol guard", () => {
  it("keeps the changed control in its original cohort and exposes exact evidence", () => {
    const c = cohortRegistry().find(c => c.id === deviations[0].cohortId)!;
    expect(c.control).toContain(deviations[0].page);
    expect(deviations[0].sourceCommit).toBe("4d34fd163ee3149e665ab0172f94b848ff6280bc");
    expect(deviations[0].beforeGitBlob).not.toBe(deviations[0].afterGitBlob);
  });
  it("does not calculate a treatment/control contrast from a changed control, even with complete metrics", () => {
    const before: Period = { page: "https://miloosh.com/software/reamaze", query: null, window: { start: "2026-09-13", end: "2026-09-19" }, scope: { property: "sc-domain:miloosh.com", country: null, device: null, searchType: "web", dataState: "final", timezone: "America/Los_Angeles" }, impressions: 5, clicks: 0, position: 50, source: "authenticated test fixture", captured_at: "2026-09-29T00:00:00Z" };
    const after = { ...before, window: { start: "2026-09-21", end: "2026-09-27" }, impressions: 10 };
    const delta = rankingDelta(before, after, "2026-09-20T12:00:00Z", 7);
    expect(delta.status).toBe("COMPARABLE");
    expect(cohortResult([delta], [delta]).differenceInMeanChange).toBe(0);
    expect(cohortResult([delta], [delta], deviations)).toMatchObject({ measurementStatus: "CONTROL_PROTOCOL_REVIEW", differenceInMeanChange: null });
  });
});
