import fs from "node:fs";
import { describe, expect, it } from "vitest";
import nutshell from "@/data/software/nutshell.json";
import { getAllSoftware } from "@/data/software";
import { buildPricingIndex } from "@/lib/pricing-index/build";
import { buildCmsDecisionMatrix } from "@/lib/cms-decision-matrix/build";
import { assertCurrentMutation, currentProtectionSnapshot } from "@/lib/google-war/current-protection";
import receipt from "@/docs/growth/receipts/20260927-selective-safe-serp/reconciliation.json";

describe("selective SAFE-SERP integration", () => {
  it("retains the verified Nutshell monthly basis and separate annual equivalents", () => {
    expect(nutshell.pricing.entry_paid).toEqual({ amount: "19", currency: "USD", billing_period: "monthly", per_seat: true, annual_billing_required: false });
    expect(nutshell.pricing.tiers.map(t => [t.name, t.amount])).toEqual([
      ["Foundation", "19"], ["Growth", "32"], ["Pro", "49"], ["Business", "67"], ["Enterprise", "89"],
    ]);
    for (const [i, annual] of [13, 25, 42, 59, 79].entries()) {
      expect(nutshell.pricing.tiers[i].notes).toContain(`$${annual}/user/mo billed annually`);
      expect(nutshell.pricing.tiers[i].billing_period).toBe("monthly");
    }
    expect(nutshell.pricing.free_trial).toEqual({ available: true, days: 14 });
    expect(nutshell.pricing.official_source).toBe("https://www.nutshell.com/pricing");
    expect(nutshell.pricing.last_verified).toBe("2026-09-27");
  });

  it("propagates only the recorded monthly rate to the computed pricing index", () => {
    const all = getAllSoftware();
    const before = buildPricingIndex(all.filter(s => s.slug !== "nutshell"));
    const after = buildPricingIndex(all);
    expect(after.sampleSize).toBe(before.sampleSize + 1);
    expect(after.monthlyUsdSampleSize).toBe(before.monthlyUsdSampleSize + 1);
    expect(after.products.find(p => p.slug === "nutshell")).toMatchObject({
      startingMonthlyEquivalent: 19, perSeat: true, annualBillingRequired: false, hasFreeTier: false,
    });
    expect(after.modeledTeamCosts.find(p => p.slug === "nutshell")).toMatchObject({ cost10: 190, cost25: 475 });
    expect(after.products.filter(p => p.slug !== "nutshell")).toEqual(before.products);
  });

  it("does not treat Claude's stale SAFE_TO_EDIT classification as mutation permission", () => {
    const current = currentProtectionSnapshot();
    expect(() => assertCurrentMutation(current.fingerprint, ["/software/nutshell"])).not.toThrow();
    for (const slug of ["webex", "confluence", "basecamp"]) {
      expect(current.entries.find(e => e.page === `/software/${slug}`)).toMatchObject({ state: "RESERVED" });
      expect(() => assertCurrentMutation(current.fingerprint, [`/software/${slug}`])).toThrow("Protected mutation denied");
    }
    expect(() => assertCurrentMutation(undefined, ["/software/nutshell"])).toThrow("STALE_PROTECTION_SNAPSHOT");
  });

  it("preserves the newer seven-of-eight CMS finding and its scope caveat", () => {
    const matrix = buildCmsDecisionMatrix();
    expect(matrix.sampleSize).toBe(8);
    expect(matrix.importAndExportCount).toBe(7);
    expect(matrix.rows.filter(r => !r.documentsExportOutOfProduct).map(r => r.slug)).toEqual(["joomla"]);
    for (const file of ["app/research/cms-buying-decision-2026/page.tsx", "app/research/page.tsx", "lib/cms-decision-matrix/build.ts"])
      expect(fs.readFileSync(file, "utf8")).not.toMatch(/WordPress only|only WordPress documented/i);
    expect(fs.readFileSync("lib/cms-decision-matrix/build.ts", "utf8")).toContain("not a turnkey");
  });

  it("accounts for every source file and does not import source QA as release proof", () => {
    expect(receipt.files).toHaveLength(17);
    expect(new Set(receipt.files.map(f => f.file)).size).toBe(17);
    expect(receipt.files.filter(f => f.decision === "ACCEPTED").map(f => f.file)).toEqual(["data/software/nutshell.json"]);
    expect(receipt.files.filter(f => f.decision === "HELD_PROTECTED")).toHaveLength(3);
    expect(receipt.files.filter(f => f.decision === "REJECTED")).toHaveLength(13);
    expect(receipt.wholeCommitMerged).toBe(false);
    expect(receipt.sourceTestsChanged).toBe(0);
  });
});
