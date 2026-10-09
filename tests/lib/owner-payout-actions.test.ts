import { describe, expect, it } from "vitest";
import { OWNER_ACTION_PACKS } from "@/data/affiliate/owner-action-packs";

const EXPECTED_PAYOUT_PACKS = [
  "partnerstack-hello-payout-rail",
  "partnerstack-personal-payout-rail",
  "impact-payout-rail",
  "setmore-payout-method",
  "mailerlite-tipalti-payout",
  "cj-dual-account-reconciliation",
  "jotform-tremendous-payout",
  "fireflies-firstpromoter-payout",
] as const;

describe("owner payout action queue", () => {
  it("contains only the current payout/account checkpoints", () => {
    expect(OWNER_ACTION_PACKS.map((pack) => pack.id)).toEqual(EXPECTED_PAYOUT_PACKS);
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
    expect(hello?.ownerRequiredFields).toEqual([]);
    expect(hello?.title.toLowerCase()).toContain("verified");
    expect(personal?.preFilledFields["Account email"]).toBe("lahman00@gmail.com");
    // Wrike joined this account 2026-08-25 (see data/affiliate/payout-rails.ts);
    // this checklist must name it too so the owner doesn't miss verifying it.
    expect(personal?.productsCovered).toEqual(["monday", "whatconverts", "elevenlabs", "wrike"]);
    expect(personal?.title).toContain("withdrawal readiness");
    expect(personal?.commissionEvidence).toContain("2026-10-09");
    expect(personal?.ownerRequiredFields.join(" ")).toContain("Do not reconnect or replace");
    expect(personal?.ownerRequiredFields.join(" ")).not.toContain("add the tax-registered location");
    expect(personal?.postCompletionAutomation).toContain("mark VERIFIED only after");

  });

  it("keeps CJ optional and restricted to current CJ-required targets", () => {
    const cj = OWNER_ACTION_PACKS.find((pack) => pack.id === "cj-dual-account-reconciliation");
    expect(cj?.priority).toBe(6);
    expect(cj?.productsCovered).toEqual(["1password", "quickbooks-online"]);
    expect(cj?.title.toLowerCase()).toContain("optional");
  });

  it("pins Setmore to first-party PayPal verification rather than generic payout guessing", () => {
    const setmore = OWNER_ACTION_PACKS.find((pack) => pack.id === "setmore-payout-method");
    expect(JSON.stringify(setmore)).toContain("PayPal");
    expect(JSON.stringify(setmore)).not.toContain("Payoneer may be used");
  });
});
