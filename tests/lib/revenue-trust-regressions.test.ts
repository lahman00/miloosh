import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import type { Software } from "@/data/software/types";
import { buildPricingIndex } from "@/lib/pricing-index/build";
import { formatIndexMoney } from "@/lib/pricing-index/format";
import { BUYER_DECISION_BRIEFS } from "@/data/guides/buyer-decision-briefs";
import { getPayoutRailForPartner } from "@/data/affiliate/payout-rails";

function fixture(slug: string, amount: string, currency = "USD", billingPeriod = "monthly"): Software {
  const base = getSoftware("pipedrive")!;
  return { ...base, slug, pricing: { ...base.pricing!, status: "verified", hasFreeTier: undefined, freePlan: undefined, freeTrial: undefined, enterpriseContactSales: undefined, entryPaid: { ...base.pricing!.entryPaid!, amount, currency, billingPeriod, perSeat: true } } } as Software;
}

describe("revenue trust and source-basis regression locks", () => {
  it("excludes foreign currencies, annual billing and malformed amounts from USD monthly aggregates", () => {
    const index = buildPricingIndex([fixture("usd", "20"), fixture("eur", "1000", "EUR"), fixture("annual", "1200", "USD", "annual"), fixture("bad", "99oops")]);
    expect(index.sampleSize).toBe(4);
    expect(index.monthlyUsdSampleSize).toBe(1);
    expect(index.medianStartingPrice).toBe(20);
    expect(index.modeledTeamCosts.map((p) => p.slug)).toEqual(["usd"]);
    expect(index.modeledTeamCosts[0].cost10).toBe(200);
  });
  it("does not turn missing free-plan or enterprise flags into negative observations", () => {
    const index = buildPricingIndex([fixture("unknown", "10")]);
    expect(index.products[0].hasFreeTier).toBeNull();
    expect(index.products[0].hasFreeTrial).toBeNull();
    expect(index.products[0].enterpriseContactSales).toBeNull();
    expect(index.stats.find((stat) => stat.label === "Free tier available")!.denominator).toBe(0);
    expect(index.stats.find((stat) => stat.label === "Free trial available")!.denominator).toBe(0);
  });
  it("handles an empty verified sample without a fabricated price", () => {
    const index = buildPricingIndex([]);
    expect(index.sampleSize).toBe(0);
    expect(index.medianStartingPrice).toBeNull();
    expect(index.highestModeledCost50Seats).toBeNull();
  });
  it("formats currency to cents without binary floating-point artifacts", () => {
    expect(formatIndexMoney(19.494999999999997)).toBe("$19.50");
    expect(formatIndexMoney(5.495)).toBe("$5.50");
    expect(formatIndexMoney(0)).toBe("$0.00");
    expect(formatIndexMoney(14, "EUR")).toBe("€14.00");
    expect(formatIndexMoney(null)).toBe("—");
    expect(formatIndexMoney(Number.NaN)).toBe("—");
  });
  it("resolves every worksheet citation to a unique first-party source", () => {
    for (const brief of Object.values(BUYER_DECISION_BRIEFS)) {
      const ids = brief.sources.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const section of brief.sections) for (const id of section.sourceIds ?? []) expect(ids).toContain(id);
      for (const source of brief.sources) expect(source.url).toMatch(/^https:\/\//);
      for (const row of brief.table.rows) expect(row).toHaveLength(brief.table.headers.length);
    }
  });
  it("keeps affiliate-link confirmation separate from payout readiness", () => {
    expect(getPayoutRailForPartner("surveymonkey").id).toBe("partnerstack-hello");
    expect(getPayoutRailForPartner("surveymonkey").readiness).toBe("UNVERIFIED");
    expect(getPayoutRailForPartner("shopify").readiness).toBe("OWNER_ACTION_REQUIRED");
    expect(getPayoutRailForPartner("shopify").notes).toContain("missing the city");
  });
});
