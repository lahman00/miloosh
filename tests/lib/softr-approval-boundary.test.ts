import { describe, expect, it } from "vitest";
import { CANONICAL_AFFILIATE_LEDGER } from "@/data/affiliate/canonical-ledger";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";

describe("Softr October 1 approval boundary", () => {
  it("records the issued asset without inventing a public product", () => {
    const softr = CANONICAL_AFFILIATE_LEDGER.find((p) => p.programId === "softr");
    expect(softr?.status).toBe("APPROVED_NEEDS_EDITORIAL_CONTENT");
    expect(softr?.decisionAt).toBe("2026-10-01");
    expect(softr?.affiliateUrl).toBe("https://get.softr.io/tbypfx55kgqo");
    expect(softr?.ownerBlocker).toBeNull();
    expect(softr?.commissionModel).toContain("unverified");
    expect(softr?.productSlugs).toEqual([]);
    expect(softr?.evidence.join(" ")).toContain("1a0f63e54ff1ce56");
    expect(ACTIVE_PARTNERS.some((p) => String(p.slug) === "softr")).toBe(false);
  });
});
