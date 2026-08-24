import { describe, expect, it } from "vitest";
import { getVerifiedStartingPrice } from "@/components/AlternativeDecisionGuide";
import type { Software } from "@/data/software";

function software(pricing: Software["pricing"]): Software {
  return {
    name: "Example",
    slug: "example",
    category: "crm",
    description: "Example CRM.",
    website: "https://example.com",
    pricing,
    platforms: ["Web"],
    bestFor: "sales teams",
    features: ["Pipeline"],
    alternatives: [],
    sources: ["https://example.com"],
    accessedAt: "2026-08-24",
  };
}

describe("getVerifiedStartingPrice", () => {
  it("surfaces an existing starting price only when the pricing record is verified", () => {
    expect(getVerifiedStartingPrice(software({ status: "verified", startingPrice: "$14/seat/month" }))).toBe("$14/seat/month");
  });

  it("does not surface an unverified starting price", () => {
    expect(getVerifiedStartingPrice(software({ status: "unknown", startingPrice: "$14/seat/month" }))).toBeNull();
  });

  it("does not derive or invent a price when a verified record lacks startingPrice", () => {
    expect(getVerifiedStartingPrice(software({ status: "verified", entryPaid: { amount: "14", currency: "USD", billingPeriod: "annual", perSeat: true } }))).toBeNull();
  });
});
