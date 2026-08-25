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

  it("keeps the two evidenced PartnerStack accounts as separate payout rails", () => {
    const hello = PAYOUT_RAILS.find((rail) => rail.id === "partnerstack-hello");
    const personal = PAYOUT_RAILS.find((rail) => rail.id === "partnerstack-personal");
    expect(hello?.accountIdentity).toBe("hello@miloosh.com");
    expect(personal?.accountIdentity).toBe("lahman00@gmail.com");
    expect(personal?.partnerSlugs).toEqual(["monday", "whatconverts", "elevenlabs", "wrike"]);
    expect(new Set(hello?.partnerSlugs).has("monday")).toBe(false);
  });

  it("keeps CJ outside the active-partner payout rails", () => {
    expect(PAYOUT_RAILS.some((rail) => rail.id === ("cj" as never))).toBe(false);
    expect(OWNER_ACTION_PACKS.find((pack) => pack.id === "cj-dual-account-reconciliation")?.productsCovered).toEqual([
      "1password",
      "quickbooks-online",
    ]);
  });

  // MILOOSH MONEY SPRINT (2026-08-26) -- Wrike was added to PAYOUT_RAILS's
  // partnerstack-personal.partnerSlugs but the linked owner action pack's
  // productsCovered was never updated, so the owner-facing checklist for
  // that account silently omitted it. Guards every rail with a real
  // (non-CJ) active-partner scope against this exact class of drift.
  it("keeps every active-partner payout rail's owner action pack productsCovered in sync with partnerSlugs", () => {
    const ownerPacksById = new Map(OWNER_ACTION_PACKS.map((pack) => [pack.id, pack]));
    for (const rail of PAYOUT_RAILS) {
      const pack = ownerPacksById.get(rail.ownerActionPackId);
      expect(pack, `rail "${rail.id}" has no linked owner action pack`).toBeDefined();
      expect([...pack!.productsCovered].sort(), `rail "${rail.id}" vs owner action pack "${pack!.id}"`).toEqual(
        [...rail.partnerSlugs].sort(),
      );
    }
  });
});
