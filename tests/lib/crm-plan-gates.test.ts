import { describe, it, expect } from "vitest";
import { buildCrmPlanGateDataset } from "@/lib/crm-plan-gates/build";
import { CRM_PLAN_GATES } from "@/lib/crm-plan-gates/data";

/**
 * Overnight Research + Trust Factory (2026-09-27) — regression suite for
 * the CRM Plan-Gate Dataset. This is explicitly not a ranking, so the
 * tests guard against that as much as against factual drift: no score
 * field should ever appear, and every stat must be a plain count derived
 * directly from the hand-verified rows.
 */
describe("buildCrmPlanGateDataset", () => {
  const d = buildCrmPlanGateDataset();

  it("sample is exactly the 7 vendors named in the mission brief", () => {
    expect(d.sampleSize).toBe(7);
    expect(d.rows.map((r) => r.key).sort()).toEqual(
      ["close", "freshsales", "hubspot", "monday-crm", "pipedrive", "salesforce-sales-cloud", "zoho-crm"].sort(),
    );
  });

  it("every row has a unique key", () => {
    const keys = d.rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("catalogSlug is only set when it does not misrepresent the researched product (monday CRM has none)", () => {
    const monday = d.rows.find((r) => r.key === "monday-crm")!;
    expect(monday.catalogSlug).toBeNull();
  });

  it("no row exposes a score, rank, or weighted total -- this dataset is not a ranking", () => {
    for (const row of d.rows as unknown as Record<string, unknown>[]) {
      expect(row).not.toHaveProperty("score");
      expect(row).not.toHaveProperty("rank");
      expect(row).not.toHaveProperty("totalScore");
    }
  });

  it("every boolStat's true/false/unknown counts sum to the full sample size", () => {
    for (const s of d.stats) {
      expect(s.trueCount + s.falseCount + s.unknownCount).toBe(d.sampleSize);
    }
  });

  it("trueVendors lists exactly the vendors whose underlying field is true, no more and no less", () => {
    const sequencesStat = d.stats.find((s) => s.label.startsWith("Sales sequences"))!;
    const expected = CRM_PLAN_GATES.filter((r) => r.sequencesOnEntryPlan === true).map((r) => r.vendor);
    expect(sequencesStat.trueVendors.sort()).toEqual(expected.sort());
  });

  it("minimumSeatsStatus is internally consistent with the minimumSeats string field", () => {
    for (const r of d.rows) {
      if (r.minimumSeatsStatus === "confirmed_minimum") {
        expect(r.minimumSeats).not.toBeNull();
      }
      if (r.minimumSeatsStatus === "confirmed_none") {
        expect(r.minimumSeats).toBeNull();
      }
    }
  });

  it("confirmedMinimumSeatVendors and confirmedNoMinimumSeatVendors never overlap", () => {
    const a = new Set(d.confirmedMinimumSeatVendors);
    const b = new Set(d.confirmedNoMinimumSeatVendors);
    for (const v of a) expect(b.has(v)).toBe(false);
  });

  it("every row with confidence \"high\" still lists honest unknowns where they exist, not zero unknowns by default", () => {
    const highConfidenceWithNoUnknowns = d.rows.filter((r) => r.confidence === "high" && r.unknownFields.length === 0);
    // Zoho CRM and monday CRM are the two vendors this session found genuinely complete records for.
    expect(highConfidenceWithNoUnknowns.map((r) => r.key).sort()).toEqual(["monday-crm", "zoho-crm"]);
  });

  it("inclusion rule is always present and non-empty", () => {
    expect(d.inclusionRule.length).toBeGreaterThan(0);
  });
});
