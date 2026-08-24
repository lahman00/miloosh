import { describe, expect, it } from "vitest";
import { OWNER_ACTION_PACKS } from "@/data/affiliate/owner-action-packs";

const EXPECTED_PAYOUT_PACKS = [
  "partnerstack-payout-rail",
  "impact-payout-rail",
  "setmore-payout-method",
  "mailerlite-tipalti-payout",
  "cj-dual-account-reconciliation",
] as const;

describe("owner payout action queue", () => {
  it("contains only the five current payout/account checkpoints", () => {
    expect(OWNER_ACTION_PACKS.map((pack) => pack.id)).toEqual(EXPECTED_PAYOUT_PACKS);
  });

  it("does not resurrect dead or unrelated acquisition work", () => {
    const serialized = JSON.stringify(OWNER_ACTION_PACKS).toLowerCase();
    expect(serialized).not.toContain("shareasale-account-creation");
    expect(serialized).not.toContain("calendly");
    expect(serialized).not.toContain("coda");
    expect(serialized).not.toContain("zoho-affiliate-ecosystem");
  });

  it("keeps CJ optional and restricted to current CJ-required targets", () => {
    const cj = OWNER_ACTION_PACKS.find((pack) => pack.id === "cj-dual-account-reconciliation");
    expect(cj?.priority).toBe(5);
    expect(cj?.productsCovered).toEqual(["1password", "quickbooks-online"]);
    expect(cj?.title.toLowerCase()).toContain("optional");
  });

  it("pins Setmore to first-party PayPal verification rather than generic payout guessing", () => {
    const setmore = OWNER_ACTION_PACKS.find((pack) => pack.id === "setmore-payout-method");
    expect(JSON.stringify(setmore)).toContain("PayPal");
    expect(JSON.stringify(setmore)).not.toContain("Payoneer may be used");
  });
});
