import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getAllRoleGuides, getRoleGuide } from "@/data/guides/registry";
import { BUYER_PAIN_GUIDES } from "@/data/guides/buyer-pain-guides";
import { BUYER_PAIN_BRIEFS } from "@/data/guides/buyer-pain-briefs";
import { BUYER_DECISION_BRIEFS } from "@/data/guides/buyer-decision-briefs";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaUrl, getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

const cohort = Object.keys(BUYER_PAIN_GUIDES);
const officialHosts = new Set(["www.pipedrive.com", "www.close.com", "www.zoho.com", "www.hubspot.com", "monday.com", "clickup.com", "asana.com", "www.wrike.com", "www.setmore.com", "calendly.com", "cal.com", "acuityscheduling.com", "elevenlabs.io", "www.descript.com", "murf.ai", "www.synthesia.io", "airtable.com", "www.notion.com", "help.coda.io", "www.smartsheet.com", "www.whatconverts.com", "www.callrail.com", "www.ruleranalytics.com", "knowledge.hubspot.com"]);

describe("source-backed buyer-pain guide cohort", () => {
  it("updates six existing canonical guides without expanding the route inventory", () => {
    expect(cohort).toHaveLength(6);
    expect(getAllRoleGuides()).toHaveLength(34);
    for (const slug of cohort) {
      expect(getRoleGuide(slug)).toBe(BUYER_PAIN_GUIDES[slug]);
      expect(BUYER_DECISION_BRIEFS[slug]).toBe(BUYER_PAIN_BRIEFS[slug]);
      expect(getAllRoleGuides().filter((g) => g.slug === slug)).toHaveLength(1);
    }
  });

  for (const slug of cohort) {
    it(`${slug}: complete role-specific content, sources and internal links`, () => {
      const guide = BUYER_PAIN_GUIDES[slug];
      const brief = BUYER_PAIN_BRIEFS[slug];
      expect(guide.faqs).toHaveLength(6);
      expect(new Set(guide.faqs.map((faq) => faq.question)).size).toBe(6);
      expect(guide.products).toHaveLength(4);
      expect(guide.products.map((p) => p.ranking)).toEqual([1, 2, 3, 4]);
      expect(guide.keyCriteria).toHaveLength(4);
      expect(guide.title.length).toBeLessThanOrEqual(60);
      expect(guide.metaDescription.length).toBeLessThanOrEqual(170);
      expect(brief.sections).toHaveLength(4);
      expect(brief.checklist).toHaveLength(6);
      expect(brief.relatedGuides).toHaveLength(2);
      for (const product of guide.products) {
        expect(getSoftware(product.slug)).toBeDefined();
        expect(product.summaryPrice).toBeTruthy();
        expect(product.summaryAvailability).toBeTruthy();
        expect(product.summaryBestFor).toBeTruthy();
        expect(product.strengths).toHaveLength(3);
        // All rendered profile fields are curated; no stale catalog price/claims fallbacks.
        expect(product.fitReason).not.toMatch(/flawless|unmatched|market leader|Chloe/);
      }
      const ids = new Set(brief.sources.map((s) => s.id));
      expect(ids.size).toBe(brief.sources.length);
      for (const source of brief.sources) {
        const url = new URL(source.url);
        expect(url.protocol).toBe("https:");
        expect(officialHosts.has(url.hostname)).toBe(true);
        expect(url.search).toBe("");
      }
      for (const section of brief.sections) for (const id of section.sourceIds ?? []) expect(ids.has(id)).toBe(true);
      for (const row of brief.table.rows) expect(row).toHaveLength(brief.table.headers.length);
      for (const link of brief.relatedGuides ?? []) {
        expect(link.href).not.toBe(`/${slug}`);
        expect(getRoleGuide(link.href.slice(1))).toBeDefined();
      }
    });
  }

  it("preserves existing worksheet facts outside the cohort", () => {
    expect(BUYER_DECISION_BRIEFS["best-crm-for-small-business"].updatedAt).toBe("2026-09-10");
    expect(BUYER_DECISION_BRIEFS["best-email-marketing-for-small-business"].updatedAt).toBe("2026-09-10");
    expect(getRoleGuide("best-password-manager-for-families")?.updatedAt).toBe("2026-09-05");
  });

  it("uses canonical CTA resolution without changing relationships or injecting affiliate links into editorial data", () => {
    for (const guide of Object.values(BUYER_PAIN_GUIDES)) for (const product of guide.products) {
      const software = getSoftware(product.slug)!;
      expect(getSoftwareCtaUrl(software)).toMatch(/^https:\/\//);
      expect(getSoftwareCtaRel(software).includes("sponsored")).toBe(shouldShowAffiliateDisclosure(software));
    }
    expect(JSON.stringify(BUYER_PAIN_GUIDES)).not.toMatch(/affiliateUrl|partnerstack|partnerlinks|try\.elevenlabs/);
  });

  it("locks concrete corrected purchasing constraints", () => {
    const profile = (slug: string, product: string) => JSON.stringify(BUYER_PAIN_GUIDES[slug].products.find((p) => p.slug === product));
    expect(profile("best-crm-for-consultants", "pipedrive")).toContain("Lite, Growth, Premium and Ultimate");
    expect(profile("best-project-management-for-agencies", "asana")).toContain("two users");
    expect(profile("best-scheduling-software-for-consultants", "setmore")).toContain("two-way calendar sync and SMS reminders on Pro");
    expect(profile("best-voice-ai-for-creators", "elevenlabs")).toContain("commercial license starting with Starter");
    expect(profile("best-no-code-database-for-operations", "coda")).toContain("editors and viewers are free");
    expect(profile("best-lead-tracking-for-agencies", "callrail")).toContain("Lead Tracking Complete adds form tracking");
  });

  it("keeps jump navigation attached to real sections and existing tracked CTA slots", () => {
    const page = readFileSync("app/[guide]/page.tsx", "utf8");
    for (const id of ["quick-comparison", "product-shortlist", "buyer-questions"]) {
      expect(page).toContain(`href: "#${id}"`);
      expect(page).toContain(`id="${id}"`);
    }
    expect(page).toContain('ctaLocation="role-guide-summary-table"');
    expect(page).toContain('ctaLocation="role-guide-card-cta"');
    expect(page).toContain("getSoftwareCtaUrl(software)");
  });
});
