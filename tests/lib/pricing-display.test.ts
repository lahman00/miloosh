import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import {
  formatStartingPrice,
  formatTierPrice,
  formatVerifiedStartingPrice,
} from "@/lib/pricing-display";

describe("pricing display semantics", () => {
  it("keeps the numeric unit monthly while disclosing annual commitment", () => {
    const pipedrive = getSoftware("pipedrive")!;
    expect(formatStartingPrice(pipedrive)).toBe("$14/seat/month · annual billing required");
    expect(formatVerifiedStartingPrice(pipedrive)).toBe("$14/seat/month · annual billing required");
    expect(formatTierPrice(pipedrive.pricing!.tiers![0]!)).toContain("seat / month");
    expect(formatTierPrice(pipedrive.pricing!.tiers![0]!)).toMatch(/annual/i);
  });

  it("does not turn a true yearly lump sum into a monthly price", () => {
    const volza = getSoftware("volza")!;
    expect(volza.pricing?.entryPaid?.billingPeriod).toBe("annual");
    expect(formatTierPrice(volza.pricing!.tiers![0]!)).toMatch(/year/i);
    expect(formatTierPrice(volza.pricing!.tiers![0]!)).not.toMatch(/month/i);
  });

  it("does not duplicate annual wording already present in the source-backed label", () => {
    const label = formatTierPrice({
      name: "Annual plan",
      amount: "10",
      currency: "USD",
      billingPeriod: "monthly",
      annualBillingRequired: true,
      unit: "per seat/month, billed annually",
    });
    expect(label).toBe("USD 10 / seat/month · annual billing required");
  });

  it("never surfaces an unverified starting price through the verified helper", () => {
    const appfolio = getSoftware("appfolio")!;
    expect(formatVerifiedStartingPrice(appfolio)).toBeNull();
  });
});
