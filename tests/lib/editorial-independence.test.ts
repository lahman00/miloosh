import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getComparisonBySlug, generateProsList, generateWhoShouldChoose } from "@/lib/comparison";
import { getSoftware } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";

/**
 * Phase 7 (Miloosh Affiliate Monetization Deployment) — proves affiliate
 * status can never influence editorial content. Two layers of proof:
 * (1) structural — the comparison-generation module doesn't even import
 * anything affiliate-related, so it has no way to branch on partner
 * status; (2) behavioral — a real published pair mixing a REJECTED
 * partner (HubSpot) and an ACTIVE partner (Pipedrive) produces identical,
 * complete, unbiased content for both sides.
 */
describe("editorial independence from affiliate status", () => {
  it("lib/comparison.ts has no import of anything affiliate/partner-related", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "lib", "comparison.ts"), "utf-8");
    const importBlock = source.slice(0, source.indexOf("\nexport"));
    expect(importBlock).not.toMatch(/affiliate/i);
    expect(importBlock).not.toMatch(/active-partners/i);
  });

  it("a rejected partner (HubSpot) and an active partner (Pipedrive) get equally complete, unbiased comparison content", () => {
    // Sanity-check the premise: one side really is rejected, the other really is active.
    const activeSlugs: readonly string[] = ACTIVE_PARTNERS.map((p) => p.slug);
    expect(activeSlugs).not.toContain("hubspot");
    expect(activeSlugs).toContain("pipedrive");

    const data = getComparisonBySlug("hubspot-vs-pipedrive");
    expect(data).not.toBeNull();

    const hubspot = getSoftware("hubspot")!;
    const pipedrive = getSoftware("pipedrive")!;

    // Pros lists are the vendor's own documented features, full stop — no
    // trimming, padding, or reordering based on which side monetizes.
    expect(generateProsList(hubspot)).toEqual(hubspot.features);
    expect(generateProsList(pipedrive)).toEqual(pipedrive.features);
    expect(generateProsList(hubspot).length).toBeGreaterThan(0);
    expect(generateProsList(pipedrive).length).toBeGreaterThan(0);

    // "Who should choose" text is derived from the vendor's own stated
    // positioning (best_for) for both sides, not skewed toward the
    // monetized product.
    expect(generateWhoShouldChoose(hubspot)).toBe(`Choose HubSpot if this fits: ${hubspot.bestFor}`);
    expect(generateWhoShouldChoose(pipedrive)).toBe(`Choose Pipedrive if this fits: ${pipedrive.bestFor}`);

    // The comparison object itself carries no affiliate/partner/score field
    // that could later be used to bias rendering.
    expect(Object.keys(data!)).not.toContain("affiliateStatus");
    expect(Object.keys(data!)).not.toContain("winner");
    expect(Object.keys(data!)).not.toContain("score");
  });

  it("every comparison row is generated the same way regardless of which side (if any) is an active partner", () => {
    const active = getComparisonBySlug("hubspot-vs-pipedrive"); // rejected vs active
    // Control pair: neither side is a partner, but -- like the pair above --
    // exactly one side (Help Scout) has real sourced pricing data and the
    // other (Front) doesn't. This isolates the variable the test actually
    // cares about (partner status) from an unrelated one (which products
    // happen to have pricing data yet), so the row-label comparison below
    // is a fair apples-to-apples check rather than being tripped by a
    // legitimate per-product data difference.
    const neitherPartner = getComparisonBySlug("front-vs-help-scout");
    expect(active).not.toBeNull();
    expect(neitherPartner).not.toBeNull();

    // Same row labels regardless of partner status on either side — proves
    // generateComparisonRows() doesn't add/remove/reorder rows based on it.
    expect(active!.rows.map((r) => r.label)).toEqual(neitherPartner!.rows.map((r) => r.label));
  });
});
