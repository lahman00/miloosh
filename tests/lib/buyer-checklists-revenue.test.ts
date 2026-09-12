import { describe, expect, it } from "vitest";
import { BUYER_CHECKLISTS } from "@/data/seo/buyer-checklists";
import { getActivePartner } from "@/data/affiliate/active-partners";

const TARGETS = ["smartsheet", "ecwid", "zoho-crm", "calendly"] as const;

describe("source-backed revenue buyer checklists", () => {
  it("uses dated first-party sources and no empty decision checks", () => {
    for (const slug of TARGETS) {
      const checklist = BUYER_CHECKLISTS[slug];
      expect(checklist, slug).toBeDefined();
      expect(checklist.verifiedAt).toBe("2026-09-12");
      expect(checklist.checks.length).toBeGreaterThanOrEqual(3);
      for (const check of checklist.checks) {
        expect(check.question.trim().length).toBeGreaterThan(10);
        expect(check.answer.trim().length).toBeGreaterThan(30);
        expect(check.source).toMatch(/^https:\/\//);
        expect(new URL(check.source).hostname).not.toBe("miloosh.com");
      }
    }
  });

  it("only monetizes checklist options through already-active partner records", () => {
    for (const slug of TARGETS) {
      for (const option of BUYER_CHECKLISTS[slug]!.options) {
        const partner = getActivePartner(option.slug);
        expect(partner, `${slug} -> ${option.slug}`).toBeDefined();
        expect(partner?.status).toBe("active");
        expect(partner?.affiliateUrl).toMatch(/^https:\/\//);
      }
    }
  });
});
