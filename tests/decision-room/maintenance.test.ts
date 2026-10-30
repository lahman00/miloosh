import { describe, expect, it } from "vitest";
import { flagEvidence } from "@/lib/decision-room/maintenance";
import type { Software } from "@/data/software";

const base = { name: "A", slug: "a", category: "crm", description: "d", website: "https://a.example", bestFor: "x", features: [], alternatives: [], sources: [], accessedAt: "2026-10-20" } as unknown as Software;
const withPricing = (pricing: Software["pricing"], extra: Partial<Software> = {}): Software => ({ ...base, ...extra, pricing });

describe("evidence maintenance flags", () => {
  it("flags old pricing, an unrecorded price scale, unclear billing, missing source and unsupported currency", () => {
    const s = withPricing({ status: "verified", lastVerified: "2026-08-01", entryPaid: { amount: "10", currency: "JPY", billingPeriod: "unknown" } });
    const flags = flagEvidence([s], "2026-10-30").map((f) => f.flag).sort();
    expect(flags).toEqual(["billing_basis_unclear", "currency_not_supported", "price_scale_unrecorded", "pricing_source_missing", "pricing_stale"]);
  });
  it("flags nothing for fresh, complete pricing", () => {
    const s = withPricing({ status: "verified", lastVerified: "2026-10-20", officialSource: "https://a.example/pricing", entryPaid: { amount: "10", currency: "USD", billingPeriod: "monthly", perSeat: true } });
    expect(flagEvidence([s], "2026-10-30")).toEqual([]);
  });
  it("flags a recorded price that is not verified, and ignores products with no price at all", () => {
    expect(flagEvidence([withPricing({ status: "unknown", entryPaid: { amount: "1", currency: "USD", billingPeriod: "monthly" } })], "2026-10-30").map((f) => f.flag)).toEqual(["pricing_unverified"]);
    expect(flagEvidence([{ ...base }], "2026-10-30")).toEqual([]);
  });
  it("is read-only: it returns flags and never changes its input", () => {
    const s = withPricing({ status: "verified", lastVerified: "2026-01-01" });
    const before = JSON.stringify(s);
    flagEvidence([s], "2026-10-30");
    expect(JSON.stringify(s)).toBe(before);
  });
});
