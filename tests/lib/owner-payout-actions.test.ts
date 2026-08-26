import { describe, expect, it } from "vitest";
import { OWNER_ACTION_PACKS } from "@/data/affiliate/owner-action-packs";
import { PAYOUT_RAILS } from "@/data/affiliate/payout-rails";

const EXPECTED_PAYOUT_PACKS = [
  "partnerstack-hello-payout-rail",
  "partnerstack-personal-payout-rail",
  "impact-payout-rail",
  "setmore-payout-method",
  "mailerlite-tipalti-payout",
  "jotform-payout-verification",
  "cj-dual-account-reconciliation",
] as const;

describe("owner payout action queue", () => {
  it("contains only the current payout/account checkpoints", () => {
    expect(OWNER_ACTION_PACKS.map((pack) => pack.id)).toEqual(EXPECTED_PAYOUT_PACKS);
    for (const rail of PAYOUT_RAILS) {
      expect(OWNER_ACTION_PACKS.some((pack) => pack.id === rail.ownerActionPackId), rail.id).toBe(true);
    }
  });

  it("does not resurrect dead or unrelated acquisition work", () => {
    const serialized = JSON.stringify(OWNER_ACTION_PACKS).toLowerCase();
    expect(serialized).not.toContain("shareasale-account-creation");
    expect(serialized).not.toContain("calendly");
    expect(serialized).not.toContain("coda");
    expect(serialized).not.toContain("zoho-affiliate-ecosystem");
  });

  it("keeps both evidenced PartnerStack accounts separate", () => {
    const hello = OWNER_ACTION_PACKS.find((pack) => pack.id === "partnerstack-hello-payout-rail");
    const personal = OWNER_ACTION_PACKS.find((pack) => pack.id === "partnerstack-personal-payout-rail");
    expect(hello?.preFilledFields["Account email"]).toBe("hello@miloosh.com");
    expect(personal?.preFilledFields["Account email"]).toBe("lahman00@gmail.com");
    expect(personal?.productsCovered).toEqual(["monday", "whatconverts", "elevenlabs", "wrike"]);
  });

  it("keeps Jotform link readiness separate from payout readiness", () => {
    const jotform = OWNER_ACTION_PACKS.find((pack) => pack.id === "jotform-payout-verification");
    expect(jotform?.loginOrSignupUrl).toContain("Eyal_hello");
    expect(jotform?.productsCovered).toEqual(["jotform"]);
    expect(JSON.stringify(jotform)).toMatch(/do not infer|unverified|only after/i);
  });

  it("keeps CJ optional and restricted to current CJ-required targets", () => {
    const cj = OWNER_ACTION_PACKS.find((pack) => pack.id === "cj-dual-account-reconciliation");
    expect(cj?.priority).toBe(7);
    expect(cj?.productsCovered).toEqual(["1password", "quickbooks-online"]);
    expect(cj?.title.toLowerCase()).toContain("optional");
  });

  it("pins Setmore to first-party PayPal verification rather than generic payout guessing", () => {
    const setmore = OWNER_ACTION_PACKS.find((pack) => pack.id === "setmore-payout-method");
    expect(JSON.stringify(setmore)).toContain("PayPal");
    expect(JSON.stringify(setmore)).not.toContain("Payoneer may be used");
  });
});
