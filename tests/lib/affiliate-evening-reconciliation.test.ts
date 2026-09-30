import { describe, it, expect, afterEach, vi } from "vitest";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { ACTIVE_PARTNERS, getActivePartner } from "@/data/affiliate/active-partners";
import { PAYOUT_RAILS, getPayoutRailForPartner } from "@/data/affiliate/payout-rails";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { PARTNER_MATERIAL_AUDIT } from "@/data/affiliate/partner-materials-audit";
import { getFreshApplicationCandidates } from "@/lib/revenue/affiliate-priority";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";
const byId = new Map(CURRENT_AFFILIATE_LEDGER.map(row => [row.programId, row]));
afterEach(() => vi.unstubAllEnvs());
describe("2026-09-30 first-party partner reconciliation", () => {
  it("removes already-submitted or active programs from the fresh-application queue", async () => {
    const slugs = new Set((await getFreshApplicationCandidates([])).map(row => row.slug));
    for (const slug of ["apollo-io", "aircall", "softr", "fireflies-ai"]) expect(slugs.has(slug)).toBe(false);
  });
  it("activates only the exact vendor-issued Fireflies asset without changing its token", () => {
    vi.stubEnv("NEXT_PUBLIC_AFFILIATE_REF", "not-an-issued-fireflies-token");
    const url = "https://fireflies.ai/?fpr=eyal-haimovich-d08faa";
    const software = getSoftware("fireflies-ai")!;
    expect(getActivePartner(software.slug)?.affiliateUrl).toBe(url);
    expect(getSoftwareCtaUrl(software)).toBe(url);
    expect(getSoftwareCtaUrl(software, "pricing")).toBe(url);
    expect(shouldShowAffiliateDisclosure(software)).toBe(true);
    expect(byId.get(software.slug)?.commissionModel).toMatch(/^10% recurring/);
    expect(getPayoutRailForPartner("fireflies-ai").readiness).toBe("OWNER_ACTION_REQUIRED");
  });
  it.each(["apollo-io", "aircall", "softr"])("%s is submitted, not approved or activated", slug => {
    expect(byId.get(slug)?.status).toBe("PENDING_REVIEW");
    expect(byId.get(slug)?.applicationSubmittedAt).toBe("2026-09-30");
    expect(byId.get(slug)?.affiliateUrl).toBeNull();
    expect(getActivePartner(slug)).toBeUndefined();
  });
  it("does not manufacture a Softr catalog entry to support a pending application", () => {
    expect(byId.get("softr")?.productSlugs).toEqual([]);
    expect(getSoftware("softr")).toBeUndefined();
  });
  it("records owner's Setmore completion without inventing payout verification", () => {
    const rail = getPayoutRailForPartner("setmore");
    expect(rail.setupEvidence).toBe("OWNER_REPORTED_COMPLETE");
    expect(rail.readiness).toBe("UNVERIFIED");
  });
  it("keeps provider review and failed PayPal validation separate", () => {
    expect(PAYOUT_RAILS.find(rail => rail.id === "impact")?.setupEvidence).toBe("PROVIDER_REVIEW_PENDING");
    const mailerlite = getPayoutRailForPartner("mailerlite");
    expect(mailerlite.setupEvidence).toBe("PAYPAL_VALIDATION_FAILED");
    expect(mailerlite.notes).toContain("Cause remains UNKNOWN");
  });
  it("has synchronized Fireflies and Zendesk material status", () => {
    expect(PARTNER_MATERIAL_AUDIT.find(row => row.slug === "fireflies-ai")?.commission.value).toBe("10%");
    expect(PARTNER_MATERIAL_AUDIT.find(row => row.slug === "zendesk")?.currentStatus).toBe("REJECTED");
  });
  it("does not change the first-revenue cohort or activate Buddy Punch without content", () => {
    expect(FIRST_REVENUE_PAGES.map(row => row.slug)).toEqual(["airtable", "todoist", "close", "setmore", "elevenlabs"]);
    expect(ACTIVE_PARTNERS).toHaveLength(24);
    expect(getActivePartner("buddy-punch")).toBeUndefined();
    expect(getActivePartner("trainual")?.affiliateUrl).toBe("https://start.trainual.com/0j9to92n49iy");
  });
});
