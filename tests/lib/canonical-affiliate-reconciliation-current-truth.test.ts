import { describe, expect, it } from "vitest";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";
import { buildCanonicalAffiliateState } from "@/scripts/growth/canonical-affiliate-reconciliation";

describe("canonical affiliate reconciliation current truth", () => {
  const state = buildCanonicalAffiliateState();
  const bySlug = new Map(state.records.map(record => [record.slug, record]));

  it("classifies every canonical active partner as ACTIVE with a real affiliate URL", () => {
    // 2026-08-29: SurveyMonkey removed (was 20) -- fail-closed pending
    // first-party vendor confirmation the existing tracking asset genuinely
    // belongs to Miloosh on the correct PartnerStack account. See
    // data/affiliate/active-partners.ts and canonical-ledger.ts's
    // surveymonkey entry (status: PROGRAM_NOT_VERIFIED).
    expect(ACTIVE_PARTNER_SLUGS).toHaveLength(19);
    for (const slug of ACTIVE_PARTNER_SLUGS) {
      const record = bySlug.get(slug);
      expect(record, `missing reconciliation record for ${slug}`).toBeDefined();
      expect(record?.status, slug).toBe("ACTIVE");
      expect(record?.affiliateUrl, slug).toBeTruthy();
    }
  });

  it("does not fabricate a Freshworks rejection", () => {
    expect(bySlug.get("freshdesk")?.status).toBe("PENDING_REVIEW");
    expect(bySlug.get("freshsales")?.status).toBe("PENDING_REVIEW");
  });

  it("keeps verified rejections rejected", () => {
    expect(bySlug.get("clickup")?.status).toBe("REJECTED");
    expect(bySlug.get("help-scout")?.status).toBe("REJECTED");
  });

  it("does not resurrect the obsolete PartnerStack form-defect state", () => {
    expect(state.statusCounts.BLOCKED_FORM_DEFECT).toBe(0);
    expect(bySlug.get("xero")?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(bySlug.get("trainual")?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(bySlug.get("tidio")?.status).toBe("OWNER_ACTION_REQUIRED");
  });

  it("keeps owner-only account gates explicit", () => {
    expect(bySlug.get("gorgias")?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(bySlug.get("synthesia")?.status).toBe("OWNER_ACTION_REQUIRED");
  });
});
