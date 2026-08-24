import { describe, expect, it } from "vitest";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";

const byId = (programId: string) =>
  CURRENT_AFFILIATE_LEDGER.find((relationship) => relationship.programId === programId);

describe("current operational affiliate truth", () => {
  it("does not resurrect the closed ShareASale portfolio", () => {
    expect(byId("shareasale-portfolio")).toBeUndefined();
    expect(byId("shift4shop")?.network).toBe("Awin");
    expect(byId("later")?.network).toBe("PartnerStack");
    expect(byId("weebly")?.status).toBe("PROGRAM_NOT_VERIFIED");
  });

  it("keeps CJ optional and restricted to current CJ-required publisher targets", () => {
    const cj = byId("cj-portfolio");
    expect(cj?.productSlugs).toEqual(["1password", "quickbooks-online"]);
    expect(cj?.eligibility).toContain("Optional network");
  });

  it("removes disproven routes from the generic PartnerStack acquisition portfolio", () => {
    const slugs = byId("partnerstack-portfolio")?.productSlugs ?? [];
    expect(slugs).not.toContain("calendly");
    expect(slugs).not.toContain("coda");
    expect(slugs).not.toContain("quickbooks-online");
  });

  it("records Calendly as no current program and Coda as ended", () => {
    expect(byId("calendly-affiliate")?.status).toBe("NO_REAL_PROGRAM_FOUND");
    expect(byId("coda-affiliate")?.status).toBe("PROGRAM_ENDED");
    expect(byId("coda-affiliate")?.decisionAt).toBe("2026-04-13");
  });
});
