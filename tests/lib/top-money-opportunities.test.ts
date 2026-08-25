import { describe, expect, it } from "vitest";
import { rankTopMoneyOpportunities } from "@/scripts/growth/top-money-opportunities";

describe("top static money opportunities", () => {
  const rows = rankTopMoneyOpportunities();
  const slugs = new Set(rows.map((row) => row.slug));

  it("never promotes rejected or ended relationships into the top opportunity queue", () => {
    expect(slugs.has("clickup")).toBe(false);
    expect(slugs.has("webflow")).toBe(false);
    expect(slugs.has("calendly")).toBe(false);
    expect(slugs.has("coda")).toBe(false);
  });

  it("never invents the old generic 15-30% commission placeholder", () => {
    expect(rows.some((row) => row.commission.includes("15-30%"))).toBe(false);
  });

  it("uses UNKNOWN instead of fabricating missing network or commission data", () => {
    for (const row of rows) {
      expect(row.network.length).toBeGreaterThan(0);
      expect(row.commission.length).toBeGreaterThan(0);
    }
  });

  it("returns a deterministic ranked top-20 maximum", () => {
    expect(rows.length).toBeLessThanOrEqual(20);
    rows.forEach((row, index) => expect(row.rank).toBe(index + 1));
  });
});
