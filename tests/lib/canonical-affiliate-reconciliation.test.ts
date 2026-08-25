import { describe, expect, it } from "vitest";
import { buildCanonicalAffiliateState } from "@/scripts/growth/canonical-affiliate-reconciliation";

const bySlug = new Map(buildCanonicalAffiliateState().records.map((record) => [record.slug, record]));

describe("canonical affiliate reconciliation projection", () => {
  it("keeps active relationships active", () => {
    expect(bySlug.get("pipedrive")?.status).toBe("ACTIVE");
    expect(bySlug.get("wix")?.status).toBe("ACTIVE");
  });

  it("keeps rejected relationships rejected", () => {
    expect(bySlug.get("clickup")?.status).toBe("REJECTED");
    expect(bySlug.get("webflow")?.status).toBe("REJECTED");
  });

  it("does not resurrect ended/no-program relationships", () => {
    expect(bySlug.get("calendly")?.status).toBe("NO_REAL_PROGRAM_FOUND");
    expect(bySlug.get("coda")?.status).toBe("NO_REAL_PROGRAM_FOUND");
  });

  it("does not fabricate commission values for unknown economics", () => {
    const records = [...bySlug.values()];
    expect(records.some((record) => record.commission.includes("15-30%"))).toBe(false);
  });

  it("does not use the old hard-coded 2026-08-24 evidence timestamp for every record", () => {
    const timestamps = new Set([...bySlug.values()].map((record) => record.evidenceTimestamp));
    expect(timestamps.size).toBeGreaterThan(1);
  });
});
