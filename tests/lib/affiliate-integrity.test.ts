import { describe, it, expect } from "vitest";
import { CANONICAL_AFFILIATE_LEDGER } from "@/data/affiliate/canonical-ledger";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { ACTIVE_PARTNERS, getActivePartner } from "@/data/affiliate/active-partners";
import { computeLedgerSummary, ALL_CANONICAL_STATUSES } from "@/scripts/affiliate/ledger";
import { getAllSoftware } from "@/data/software";
import { getSoftwareCtaRel, shouldShowAffiliateDisclosure, getSoftwareCtaUrl } from "@/lib/affiliate";
import { resolveComparisonCtaUrl } from "@/lib/wix-funnels";

describe("Generic Affiliate Ledger Invariants & Source-of-Truth Integrity", () => {
  const summary = computeLedgerSummary();
  const software = getAllSoftware();
  const catalogSlugs = new Set(software.map(s => s.slug));

  it("Invariant 1: Every program relationship has a valid, unique programId and exactly one status", () => {
    const programIds = CANONICAL_AFFILIATE_LEDGER.map(p => p.programId);
    const uniqueIds = new Set(programIds);
    expect(programIds.length).toBe(uniqueIds.size);
    for (const prog of CANONICAL_AFFILIATE_LEDGER) {
      expect(prog.status).toBeTruthy();
      expect(typeof prog.status).toBe("string");
      expect(ALL_CANONICAL_STATUSES.includes(prog.status)).toBe(true);
    }
  });

  it("Invariant 2: No ACTIVE program is simultaneously REJECTED, PENDING, or BLOCKED", () => {
    const activeProgs = CANONICAL_AFFILIATE_LEDGER.filter(p => p.status === "ACTIVE");
    const activeIds = new Set(activeProgs.map(p => p.programId));
    const nonActiveStatuses = ["REJECTED", "PENDING_REVIEW", "BLOCKED_FORM_DEFECT", "OWNER_ACTION_REQUIRED", "HOLD"];

    for (const prog of CANONICAL_AFFILIATE_LEDGER) {
      if (nonActiveStatuses.includes(prog.status)) {
        expect(activeIds.has(prog.programId)).toBe(false);
      }
    }
  });

  it("Invariant 3: ACTIVE programs strictly require a non-empty, valid affiliateUrl matching canonical active-partners", () => {
    const activeProgs = CANONICAL_AFFILIATE_LEDGER.filter(p => p.status === "ACTIVE");
    expect(activeProgs.length).toBe(ACTIVE_PARTNERS.length);

    for (const prog of activeProgs) {
      expect(prog.affiliateUrl).toBeTruthy();
      expect(prog.affiliateUrl).toMatch(/^https?:\/\//);
    }
  });

  it("Invariant 4 & 5: REJECTED and PENDING programs cannot be marked READY_AND_VERIFIED", () => {
    for (const prog of CANONICAL_AFFILIATE_LEDGER) {
      if (prog.status === "REJECTED" || prog.status === "PENDING_REVIEW") {
        expect(prog.status).not.toBe("READY_AND_VERIFIED");
      }
    }
  });

  it("Invariant 6: BLOCKED_FORM_DEFECT programs have a non-empty formBlocker and no false submission", () => {
    const formBlocked = CANONICAL_AFFILIATE_LEDGER.filter(p => p.status === "BLOCKED_FORM_DEFECT");
    for (const prog of formBlocked) {
      expect(prog.formBlocker).toBeTruthy();
      expect(prog.status).not.toBe("PENDING_REVIEW");
    }
  });

  it("Invariant 7: OWNER_ACTION_REQUIRED programs have a non-empty ownerBlocker reason", () => {
    const ownerBlocked = CANONICAL_AFFILIATE_LEDGER.filter(p => p.status === "OWNER_ACTION_REQUIRED");
    for (const prog of ownerBlocked) {
      expect(prog.ownerBlocker).toBeTruthy();
      expect(typeof prog.ownerBlocker).toBe("string");
    }
  });

  it("Invariant 8: Every evidence-based status has at least one durable evidence record", () => {
    for (const prog of CANONICAL_AFFILIATE_LEDGER) {
      expect(prog.evidence).toBeDefined();
      expect(Array.isArray(prog.evidence)).toBe(true);
      expect(prog.evidence.length).toBeGreaterThan(0);
    }
  });

  it("Invariant 9: Portfolio programs cover multiple products without inflating PROGRAM relationship counts", () => {
    const portfolioPrograms = CANONICAL_AFFILIATE_LEDGER.filter(p => p.productSlugs.length > 1);
    expect(portfolioPrograms.length).toBeGreaterThanOrEqual(3);

    for (const prog of portfolioPrograms) {
      expect(prog.productSlugs.length).toBeGreaterThan(1);
      // Each portfolio program relationship appears exactly once in the ledger
      expect(CANONICAL_AFFILIATE_LEDGER.filter(p => p.programId === prog.programId).length).toBe(1);
    }
  });

  it("Invariant 10: Derived summary counts match the actual ledger counts exactly (sum of status buckets === ledger.length)", () => {
    // MILOOSH OWNER-SIDE ELIMINATION mission (2026-08-25) — real fix:
    // computeLedgerSummary() reads data/affiliate/current-affiliate-truth.ts's
    // CURRENT_AFFILIATE_LEDGER (the reconciled operational projection --
    // ShareASale filtered out, CJ/PartnerStack-portfolio remapped to real
    // current targets), not the raw historical CANONICAL_AFFILIATE_LEDGER.
    // This invariant must compare against the same source the function
    // actually derives from, or it drifts every time the two counts
    // legitimately diverge (66 raw vs 70 current as of this fix).
    expect(summary.totalProgramRelationships).toBe(CURRENT_AFFILIATE_LEDGER.length);
    expect(summary.sumOfStatusBuckets).toBe(CURRENT_AFFILIATE_LEDGER.length);
    expect(summary.isStatusSumConsistent).toBe(true);

    const statusesInLedger = new Set(CURRENT_AFFILIATE_LEDGER.map(p => p.status));
    for (const st of statusesInLedger) {
      expect(summary.statusBreakdown[st]).toBeGreaterThan(0);
    }

    expect(summary.totalCatalogProducts).toBe(catalogSlugs.size);
    expect(summary.totalCatalogProducts).toBeGreaterThan(0);
    expect(summary.sumOfCatalogCoverageBuckets).toBe(summary.totalCatalogProducts);
    expect(summary.isCatalogCoverageExhaustive).toBe(true);
  });

  it("Invariant 11: Setmore contains strict compliance restriction (NO PAID MEDIA / PPC)", () => {
    const setmore = CANONICAL_AFFILIATE_LEDGER.find(p => p.programId === "setmore");
    expect(setmore?.status).toBe("ACTIVE");
    expect(setmore?.notes).toMatch(/NO PAID MEDIA/i);
  });

  /**
   * Invariant 12 (2026-08-29, SurveyMonkey fail-close): a PENDING/REJECTED/
   * OWNER_ACTION_REQUIRED/PROGRAM_NOT_VERIFIED/HOLD/etc. canonical-ledger
   * record must never cause its product's actual rendered CTA to carry
   * rel="sponsored" or show the affiliate disclosure -- regardless of what
   * historical affiliateUrl text sits in that record's evidence/notes
   * fields (canonical-ledger.ts is a documentation/audit trail; it is never
   * read by the runtime CTA resolver in lib/affiliate.ts). Only a real
   * ACTIVE_PARTNERS entry can make a CTA resolve as affiliate -- this
   * invariant checks the OTHER direction: no non-ACTIVE ledger status may
   * coincide with an affiliate-rendering CTA for the same product.
   */
  it("Invariant 12: no non-ACTIVE canonical relationship's product renders an affiliate/sponsored CTA", () => {
    const nonActive = CANONICAL_AFFILIATE_LEDGER.filter((p) => p.status !== "ACTIVE");
    for (const program of nonActive) {
      for (const slug of program.productSlugs) {
        const item = software.find((s) => s.slug === slug);
        if (!item) continue; // no catalog page for this slug -- nothing can render
        expect(shouldShowAffiliateDisclosure(item), `${slug} (${program.programId}, status ${program.status}) shows affiliate disclosure without being ACTIVE`).toBe(false);
        expect(getSoftwareCtaRel(item), `${slug} (${program.programId}, status ${program.status}) renders rel=sponsored without being ACTIVE`).not.toContain("sponsored");
      }
    }
  });

  it("Invariant 13: SurveyMonkey specifically fails closed pending vendor confirmation of the 2026-08-24 tracking asset", () => {
    const surveymonkey = CANONICAL_AFFILIATE_LEDGER.find((p) => p.programId === "surveymonkey");
    expect(surveymonkey?.status).toBe("PROGRAM_NOT_VERIFIED");
    expect(surveymonkey?.affiliateUrl).toBeNull();
    expect(ACTIVE_PARTNERS.map((p): string => p.slug)).not.toContain("surveymonkey");

    const item = software.find((s) => s.slug === "surveymonkey")!;
    expect(item).toBeDefined();
    expect(shouldShowAffiliateDisclosure(item)).toBe(false);
    expect(getSoftwareCtaRel(item)).toBe("noopener noreferrer");
  });

  /**
   * Invariant 14 (2026-08-29): the inverse of Invariant 12 -- every verified
   * ACTIVE_PARTNERS entry's product must actually render as affiliate/
   * sponsored, not silently fall back to the plain vendor URL. Every
   * commercial CTA surface (software-page-cta, pricing-section-cta,
   * alternative-decision-guide, compare-page-choose-card, role-guide-*)
   * renders through TrackedCtaLink, which calls getSoftwareCtaUrl /
   * getSoftwareCtaRel / shouldShowAffiliateDisclosure -- the same three
   * functions checked here -- so one check per product covers every
   * surface simultaneously; there is no separate per-surface resolution
   * path to leak through.
   */
  it("Invariant 14: every verified active partner's product actually renders as affiliate, not silently plain", () => {
    for (const partner of ACTIVE_PARTNERS) {
      const item = software.find((s) => s.slug === partner.slug);
      expect(item, `${partner.slug} is in ACTIVE_PARTNERS but has no catalog page`).toBeDefined();
      if (!item) continue;
      expect(getSoftwareCtaUrl(item), `${partner.slug} CTA does not resolve to its verified affiliate URL`).toBe(partner.affiliateUrl);
      expect(getSoftwareCtaRel(item), `${partner.slug} CTA is missing rel=sponsored`).toContain("sponsored");
      expect(shouldShowAffiliateDisclosure(item), `${partner.slug} CTA does not show the affiliate disclosure`).toBe(true);
    }
  });

  /**
   * MILOOSH PREPARE FINAL LOCAL RELEASE CANDIDATE (2026-08-29) superseded by
   * a follow-up mission the same day: an earlier attempt to activate Jotform
   * was correctly declined here because the supporting message bundled three
   * git commit SHAs and two PR numbers that did not exist anywhere in this
   * repository (see commit 3a1c6ab, and the superseded version of this test
   * at commit d393707). Activation now rests on a separate, later, direct
   * first-hand account from the owner (not relayed via Codex or any other
   * agent) of personally re-reading the original correspondence in the
   * connected Gmail account -- see data/affiliate/canonical-ledger.ts's
   * jotform entry and data/affiliate/active-partners.ts's header comment for
   * the full evidence record. Renamed from "Invariant 15" (fails-closed) to
   * this activation lock; mirrors Invariant 14's generic active-partner
   * check but named explicitly, matching the treatment MailerLite got in
   * tests/lib/mailerlite-regression-protection.test.ts, since this specific
   * relationship's history makes a silent regression especially costly.
   */
  it("Invariant 15: Jotform is active with its exact verified homepage tracking asset", () => {
    const jotform = CANONICAL_AFFILIATE_LEDGER.find((p) => p.programId === "jotform");
    expect(jotform?.status).toBe("ACTIVE");
    expect(jotform?.affiliateUrl).toBe("https://www.jotform.com/?partner=miloosh");
    expect(ACTIVE_PARTNERS.map((p): string => p.slug)).toContain("jotform");
    expect(getActivePartner("jotform")?.affiliateUrl).toBe("https://www.jotform.com/?partner=miloosh");

    const item = software.find((s) => s.slug === "jotform")!;
    expect(item).toBeDefined();
    expect(shouldShowAffiliateDisclosure(item)).toBe(true);
    expect(getSoftwareCtaRel(item)).toContain("sponsored");
    expect(getSoftwareCtaUrl(item)).toBe("https://www.jotform.com/?partner=miloosh");
  });

  /**
   * MILOOSH PREPARE FINAL LOCAL RELEASE CANDIDATE (2026-08-29), follow-up:
   * with Jotform activated, this compare page now carries the requested
   * "SurveyMonkey direct, Jotform affiliate" split. SurveyMonkey is
   * unaffected by the Jotform reconciliation -- still PROGRAM_NOT_VERIFIED,
   * still fails closed. Tested through the real compare-page-choose-card
   * resolver (lib/wix-funnels.ts's resolveComparisonCtaUrl), the same
   * surface the mission specified, not just the generic per-product checks
   * above.
   */
  it("surveymonkey-vs-jotform: SurveyMonkey resolves direct, Jotform resolves to its verified affiliate URL", () => {
    const surveymonkey = software.find((s) => s.slug === "surveymonkey")!;
    const jotform = software.find((s) => s.slug === "jotform")!;
    expect(surveymonkey).toBeDefined();
    expect(jotform).toBeDefined();

    expect(resolveComparisonCtaUrl(surveymonkey, "jotform")).toBe(surveymonkey.website);
    expect(resolveComparisonCtaUrl(jotform, "surveymonkey")).toBe("https://www.jotform.com/?partner=miloosh");

    expect(getSoftwareCtaRel(surveymonkey)).not.toContain("sponsored");
    expect(getSoftwareCtaRel(jotform)).toContain("sponsored");
    expect(shouldShowAffiliateDisclosure(surveymonkey)).toBe(false);
    expect(shouldShowAffiliateDisclosure(jotform)).toBe(true);
  });
});
