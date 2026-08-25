import { describe, expect, it } from "vitest";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";
import { runFullAffiliateSweep } from "@/scripts/growth/full-affiliate-sweep";

describe("full affiliate sweep current truth", () => {
  const sweep = runFullAffiliateSweep();
  const bySlug = new Map(sweep.allProducts.map((row) => [row.slug, row]));

  it("matches the verified active-partner registry exactly", () => {
    expect(new Set(sweep.activePartners.map((row) => row.slug))).toEqual(new Set(ACTIVE_PARTNER_SLUGS));
  });

  it("keeps first-party rejected programs rejected instead of ready/pending", () => {
    expect(bySlug.get("clickup")?.classification).toBe("REJECTED");
    expect(bySlug.get("webflow")?.classification).toBe("REJECTED");
  });

  it("keeps Gorgias as owner action rather than silently ready-to-apply", () => {
    expect(bySlug.get("gorgias")?.classification).toBe("OWNER_ACTION_REQUIRED");
  });

  it("does not resurrect ended or absent programs", () => {
    expect(bySlug.get("calendly")?.classification).toBe("NO_REAL_PROGRAM_FOUND");
    expect(bySlug.get("coda")?.classification).toBe("NO_REAL_PROGRAM_FOUND");
  });

  it("preserves Freshworks as pending from the current relationship record", () => {
    expect(bySlug.get("freshdesk")?.classification).toBe("APPLICATION_PENDING");
  });

  it("never puts an active partner in the ready-to-apply queue", () => {
    const active = new Set(ACTIVE_PARTNER_SLUGS);
    expect(sweep.eligibleToApply.some((row) => active.has(row.slug as never))).toBe(false);
  });
});
