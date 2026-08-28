import { describe, expect, it } from "vitest";
import { CANONICAL_AFFILIATE_LEDGER } from "@/data/affiliate/canonical-ledger";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";

const byProgramId = new Map(CANONICAL_AFFILIATE_LEDGER.map((program) => [program.programId, program]));

describe("canonical affiliate ledger state invariants", () => {
  it("keeps pending relationships undecided and without affiliate URLs", () => {
    for (const program of CANONICAL_AFFILIATE_LEDGER.filter((p) => p.status === "PENDING_REVIEW")) {
      expect(program.decisionAt, `${program.programId} pending but has decisionAt`).toBeNull();
      expect(program.affiliateUrl, `${program.programId} pending but has affiliateUrl`).toBeNull();
      expect(program.notes, `${program.programId} pending but notes say rejected`).not.toMatch(/\b(rejected|declined)\b/i);
      expect(program.eligibility ?? "", `${program.programId} pending but eligibility says declined`).not.toMatch(/\b(rejected|declined)\b/i);
    }
  });

  it("keeps rejected relationships non-active and decision-backed", () => {
    for (const program of CANONICAL_AFFILIATE_LEDGER.filter((p) => p.status === "REJECTED")) {
      expect(program.affiliateUrl, `${program.programId} rejected but has affiliateUrl`).toBeNull();
      expect(program.decisionAt, `${program.programId} rejected but has no decisionAt`).toBeTruthy();
      expect(
        `${program.eligibility ?? ""} ${program.notes}`,
        `${program.programId} rejected but has no rejection/decline language`
      ).toMatch(/\b(rejected|declined|decline)\b/i);
    }
  });

  it("requires every ACTIVE canonical relationship to have a real URL", () => {
    for (const program of CANONICAL_AFFILIATE_LEDGER.filter((p) => p.status === "ACTIVE")) {
      expect(program.affiliateUrl, `${program.programId} ACTIVE without affiliateUrl`).toBeTruthy();
      expect(program.ownerBlocker, `${program.programId} ACTIVE but owner-blocked`).toBeNull();
      expect(program.formBlocker, `${program.programId} ACTIVE but form-blocked`).toBeNull();
    }
  });

  it("keeps active-partners registry exactly backed by an ACTIVE canonical relationship", () => {
    for (const active of ACTIVE_PARTNERS) {
      const matches = CANONICAL_AFFILIATE_LEDGER.filter(
        (program) => program.status === "ACTIVE" && program.productSlugs.includes(active.slug)
      );
      expect(matches, `${active.slug} has no unique ACTIVE canonical relationship`).toHaveLength(1);
      expect(matches[0]?.affiliateUrl, `${active.slug} canonical URL differs from active registry`).toBe(active.affiliateUrl);
    }
  });

  it("locks the corrected high-risk relationships", () => {
    expect(byProgramId.get("freshworks")?.status).toBe("PENDING_REVIEW");
    expect(byProgramId.get("freshworks")?.decisionAt).toBeNull();
    expect(byProgramId.get("help-scout")?.status).toBe("REJECTED");
    expect(byProgramId.get("clickup")?.status).toBe("REJECTED");
    expect(byProgramId.get("close")?.status).toBe("ACTIVE");
  });

  it("locks the 2026-08-28 suspension-period reconciliation (Zoho qualification stage, Sprout Social/RingCentral/Framer routes) against silent regression", () => {
    // Zoho: a human qualification questionnaire is a review step, not a
    // decision -- must stay pending, not drift to ACTIVE/APPROVED without a
    // real tracking asset.
    const zoho = byProgramId.get("zoho-ecosystem");
    expect(zoho?.status).toBe("PENDING_REVIEW");
    expect(zoho?.affiliateUrl).toBeNull();
    expect(zoho?.productSlugs).toContain("zoho-campaigns");

    // Sprout Social: re-modeled onto the CJ account, not the generic Impact
    // bucket -- both directions must hold, or the two ledgers disagree on
    // which network is responsible for this relationship.
    expect(byProgramId.get("cj-portfolio")?.productSlugs).toContain("sprout-social");
    expect(byProgramId.get("impact-portfolio")?.productSlugs).not.toContain("sprout-social");

    // RingCentral: carved out of the Impact bucket into its own
    // pending-clarification record -- Impact is no longer assumed correct.
    expect(byProgramId.get("ringcentral")?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(byProgramId.get("ringcentral")?.affiliateUrl).toBeNull();
    expect(byProgramId.get("impact-portfolio")?.productSlugs).not.toContain("ringcentral");

    // Framer: its own record, not buried in the generic
    // collaboration-and-design-portfolio bucket.
    expect(byProgramId.get("framer")?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(byProgramId.get("framer")?.affiliateUrl).toBeNull();
    expect(byProgramId.get("collaboration-and-design-portfolio")?.productSlugs).not.toContain("framer");

    // None of these five newly-touched relationships may be ACTIVE without
    // a verified tracking asset -- this session found none, so none should
    // claim one.
    for (const id of ["zoho-ecosystem", "cj-portfolio", "ringcentral", "framer", "buffer"]) {
      const program = byProgramId.get(id);
      expect(program?.status, `${id} marked ACTIVE without this test being updated to expect it`).not.toBe("ACTIVE");
      expect(program?.affiliateUrl, `${id} has a tracking URL but isn't ACTIVE`).toBeNull();
    }
  });
});
