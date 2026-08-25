import { describe, expect, it } from "vitest";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { PENDING_PROGRAMS } from "@/scripts/growth/pending-program-readiness";

describe("pending affiliate readiness current truth", () => {
  it("is derived exactly from current PENDING_REVIEW relationships", () => {
    const expected = CURRENT_AFFILIATE_LEDGER
      .filter((relationship) => relationship.status === "PENDING_REVIEW")
      .map((relationship) => relationship.programId)
      .sort();
    const actual = PENDING_PROGRAMS.map((program) => program.programId).sort();
    expect(actual).toEqual(expected);
  });

  it("cannot resurrect resolved active or rejected relationships as pending", () => {
    const ids = new Set(PENDING_PROGRAMS.map((program) => program.programId));
    expect(ids.has("close")).toBe(false);
    expect(ids.has("clickup")).toBe(false);
    expect(ids.has("help-scout")).toBe(false);
  });
});
