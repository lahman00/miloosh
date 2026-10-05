import { describe, expect, it } from "vitest";
import { CANONICAL_AFFILIATE_LEDGER } from "@/data/affiliate/canonical-ledger";
import { getAffiliateProgram } from "@/data/revenue/affiliate-programs";
import { buildApplicationPack } from "@/lib/revenue/application-pack";

describe("Gorgias current affiliate opportunity", () => {
  it("uses the current first-party content-affiliate program instead of the stale generic PartnerStack bucket", () => {
    const program = getAffiliateProgram("gorgias");
    expect(program?.lastVerifiedAt).toBe("2026-10-05");
    expect(program?.networkName).toBe("PartnerStack");
    expect(program?.commissionModel).toContain("20%");
    expect(program?.commissionModel).toContain("first two years");
    expect(program?.applicationUrl).toBe(
      "https://dash.partnerstack.com/handshake/signup?gref=page&group=affiliates&join=gorgias&source=gorgias",
    );
    expect(program?.notes).toContain("1a1081b987578bf7");
  });

  it("does not invent an application, approval or tracking asset", () => {
    expect(CANONICAL_AFFILIATE_LEDGER.some((row) => row.productSlugs.includes("gorgias"))).toBe(false);
    const pack = buildApplicationPack("gorgias");
    expect(pack?.currentRelationshipStatus).toBe("NO_RELATIONSHIP");
    expect(pack?.readyToApply).toBe(true);
  });
});
