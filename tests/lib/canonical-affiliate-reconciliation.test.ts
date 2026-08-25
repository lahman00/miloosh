import { describe, expect, it } from "vitest";
import { buildCanonicalAffiliateState } from "@/scripts/growth/canonical-affiliate-reconciliation";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";

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

  it("projects relationship economics verbatim instead of inventing a numeric rate", () => {
    const relationship = CURRENT_AFFILIATE_LEDGER.find((entry) => entry.productSlugs.includes("asana"));
    expect(relationship).toBeDefined();
    expect(bySlug.get("asana")?.commission).toBe(relationship!.commissionModel);
    expect(bySlug.get("asana")?.commission).not.toMatch(/\d+\s*%|\$\s*\d+/);
  });

  it("does not use one hard-coded evidence timestamp for every record", () => {
    const timestamps = new Set([...bySlug.values()].map((record) => record.evidenceTimestamp));
    expect(timestamps.size).toBeGreaterThan(1);
  });
});
