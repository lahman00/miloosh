import { describe, expect, it } from "vitest";
import { getPartnerMoneyMatrix } from "@/data/affiliate/money-matrix";
import { PAYOUT_RAILS } from "@/data/affiliate/payout-rails";

const matrix = getPartnerMoneyMatrix();

describe("affiliate money matrix readiness semantics", () => {
  it("covers every active partner exactly once", () => {
    expect(matrix).toHaveLength(20);
    expect(new Set(matrix.map((row) => row.slug)).size).toBe(matrix.length);
  });

  it("does not call a working technical CTA end-to-end revenue ready while its payout profile is unverified", () => {
    for (const row of matrix) {
      if (row.technicalPathReady && row.payoutReadiness !== "VERIFIED") {
        expect(row.revenueReady).toBe(false);
        expect(row.blocker).toMatch(/payout/i);
      }
    }
  });

  it("derives payout readiness from the canonical account-level payout profiles", () => {
    const readinessByPartner = new Map(
      PAYOUT_RAILS.flatMap((rail) => rail.partnerSlugs.map((slug) => [String(slug), rail.readiness] as const)),
    );
    for (const row of matrix) {
      expect(row.payoutReadiness).toBe(readinessByPartner.get(row.slug));
    }
  });
});
