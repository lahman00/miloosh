import { describe, expect, it } from "vitest";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";
import { PAYOUT_RAILS, getPayoutRailForPartner } from "@/data/affiliate/payout-rails";
import { OWNER_ACTION_PACKS } from "@/data/affiliate/owner-action-packs";

describe("payout rail integrity", () => {
  it("assigns every active partner to exactly one payout rail", () => {
    const assigned = PAYOUT_RAILS.flatMap((rail) => rail.partnerSlugs);
    expect(assigned).toHaveLength(ACTIVE_PARTNER_SLUGS.length);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned].sort()).toEqual([...ACTIVE_PARTNER_SLUGS].sort());
  });

  it("resolves every active partner without fallback or guessing", () => {
    for (const slug of ACTIVE_PARTNER_SLUGS) {
      expect(getPayoutRailForPartner(slug).partnerSlugs).toContain(slug);
    }
  });

  it("links every payout rail to a real owner action pack", () => {
    const ownerPackIds = new Set(OWNER_ACTION_PACKS.map((pack) => pack.id));
    for (const rail of PAYOUT_RAILS) {
      expect(ownerPackIds.has(rail.ownerActionPackId)).toBe(true);
    }
  });

  it("keeps CJ outside the active-partner payout rails", () => {
    expect(PAYOUT_RAILS.some((rail) => rail.id === ("cj" as never))).toBe(false);
    expect(OWNER_ACTION_PACKS.find((pack) => pack.id === "cj-dual-account-reconciliation")?.productsCovered).toEqual([
      "1password",
      "quickbooks-online",
    ]);
  });
});
