import { describe, expect, it } from "vitest";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { PARTNER_MATERIAL_AUDIT } from "@/data/affiliate/partner-materials-audit";
import { getSoftware } from "@/data/software";

const bySlug = new Map(AFFILIATE_PROGRAMS.map(program => [program.slug, program]));
const relationshipById = new Map(CURRENT_AFFILIATE_LEDGER.map(program => [program.programId, program]));

describe("2026-10-01 affiliate evidence reconciliation", () => {
  it("activates Trainual only on the first-party issued asset", () => {
    const active = ACTIVE_PARTNERS.find(partner => partner.slug === "trainual");
    expect(active?.affiliateUrl).toBe("https://start.trainual.com/0j9to92n49iy");
    expect(active?.allowAdditionalTrackingParams).toBe(false);
    expect(relationshipById.get("trainual")?.status).toBe("ACTIVE");
    expect(relationshipById.get("trainual")?.decisionAt).toBe("2026-09-30");
    expect(PARTNER_MATERIAL_AUDIT.find(row => row.slug === "trainual")?.readiness).toBe("READY NOW");
  });

  it("holds MRPeasy despite the issued link until legal and payout questions are answered", () => {
    const mrpeasy = relationshipById.get("mrpeasy");
    expect(mrpeasy?.status).toBe("HOLD");
    expect(mrpeasy?.affiliateUrl).toBe("https://try.mrpeasy.com/rlmf8edfjcie");
    expect(mrpeasy?.productSlugs).toEqual([]);
    expect(mrpeasy?.ownerBlocker).toMatch(/sole proprietor|bank-transfer|seven-day|commission/i);
    expect(mrpeasy?.evidence.join(" ")).toContain("1a0f46ca9713bbb4");
    expect(ACTIVE_PARTNERS.some(partner => String(partner.slug) === "mrpeasy")).toBe(false);
  });

  it("locks the corrected network and advertising research details", () => {
    expect(bySlug.get("clockify")?.networkName).toContain("FirstPromoter");
    expect(bySlug.get("lovable")?.commissionModel).toContain("first-time subscriber");
    expect(bySlug.get("snov-io")?.notes).not.toContain("Organic-only");
    expect(bySlug.get("snov-io")?.notes).toMatch(/website, email, social|trademark\/PPC/i);
  });

  it("keeps Automattic approved but refuses to use a Marketplace link as the general WooCommerce CTA", () => {
    const automattic = relationshipById.get("automattic");
    expect(automattic?.status).toBe("APPROVED_NEEDS_LINK");
    expect(automattic?.affiliateUrl).toBeNull();
    expect(automattic?.ownerBlocker).toMatch(/deep link|link builder/i);
    expect(ACTIVE_PARTNERS.some(partner => String(partner.slug) === "woocommerce")).toBe(false);
    expect(PARTNER_MATERIAL_AUDIT.find(row => row.slug === "woocommerce")?.readiness).toBe("APPROVED BUT NEEDS LINK");
  });

  it("records new verified public programs without manufacturing approvals", () => {
    for (const slug of ["clockify", "lovable", "lemlist", "snov-io", "se-ranking", "pabbly", "systeme-io", "beehiiv", "surfer", "runway", "crazy-egg"]) {
      expect(bySlug.get(slug)?.programExists, slug).toBe("yes");
      expect(bySlug.get(slug)?.confidence, slug).toBe("high");
      expect(ACTIVE_PARTNERS.some(partner => String(partner.slug) === slug), slug).toBe(false);
    }
    expect(getSoftware("runway")).toBeDefined();
    expect(getSoftware("crazy-egg")).toBeDefined();
  });

  it("preserves exact economics and owner-only application gates for Runway", () => {
    const runway = bySlug.get("runway");
    expect(runway?.commissionModel).toContain("USD 15");
    expect(runway?.commissionModel).toContain("25% off");
    expect(runway?.payoutMethod).toContain("Stripe");
    expect(runway?.notes).toContain("NOT SUBMITTED");
    expect(runway?.notes).toContain("three-month pilot");
  });

  it("keeps Crazy Egg economics bounded to what the public signup actually states", () => {
    const crazyEgg = bySlug.get("crazy-egg");
    expect(crazyEgg?.commissionModel).toContain("15%");
    expect(crazyEgg?.recurrence).toBe("unknown");
    expect(crazyEgg?.notes).toContain("NOT SUBMITTED");
    expect(ACTIVE_PARTNERS.some(partner => String(partner.slug) === "crazy-egg")).toBe(false);
  });

  it("records Ahrefs as a confirmed closed route rather than inventing an application", () => {
    const ahrefs = bySlug.get("ahrefs");
    expect(ahrefs?.programExists).toBe("no");
    expect(ahrefs?.applicationUrl).toBeNull();
    expect(ahrefs?.notes).toMatch(/discontinued|old links no longer work/i);
  });

  it("does not mistake KnowledgeOwl's customer referral plan for an open publisher program", () => {
    const knowledgeOwl = bySlug.get("knowledgeowl");
    expect(knowledgeOwl?.programExists).toBe("yes");
    expect(knowledgeOwl?.eligibility).toContain("customers only");
    expect(knowledgeOwl?.commissionModel).toContain("USD 500");
    expect(ACTIVE_PARTNERS.some(partner => String(partner.slug) === "knowledgeowl")).toBe(false);
  });

  it("holds YouCanBookMe until its cash-versus-credit reward wording is reconciled", () => {
    const ycbm = bySlug.get("youcanbookme");
    expect(ycbm?.programExists).toBe("yes");
    expect(ycbm?.recurrence).toBe("unknown");
    expect(ycbm?.notes).toContain("HOLD FOR WRITTEN CLARIFICATION");
    expect(ycbm?.commissionModel).toMatch(/internally inconsistent|USD 25|USD 4/);
  });

  it("supersedes Softr pending state with a verified asset, not a fabricated public page", () => {
    const softr = bySlug.get("softr");
    expect(softr?.notes).toContain("get.softr.io/tbypfx55kgqo");
    expect(relationshipById.get("softr")?.status).toBe("APPROVED_NEEDS_EDITORIAL_CONTENT");
    expect(relationshipById.get("softr")?.affiliateUrl).toBe("https://get.softr.io/tbypfx55kgqo");
    expect(ACTIVE_PARTNERS.some(partner => String(partner.slug) === "softr")).toBe(false);
  });

  it("does not confuse researched offers with active commercial links", () => {
    const active = new Set(ACTIVE_PARTNERS.map(partner => String(partner.slug)));
    for (const slug of ["clockify", "lovable", "lemlist", "snov-io", "se-ranking", "pabbly", "systeme-io", "beehiiv", "surfer", "runway", "crazy-egg"]) {
      expect(active.has(slug), slug).toBe(false);
    }
  });
});
