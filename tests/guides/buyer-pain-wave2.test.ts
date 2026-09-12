import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BUYER_PAIN_WAVE2_GUIDES as guides } from "@/data/guides/buyer-pain-wave2-guides";
import { BUYER_PAIN_WAVE2_BRIEFS as briefs } from "@/data/guides/buyer-pain-wave2-briefs";
import { BUYER_DECISION_BRIEFS } from "@/data/guides/buyer-decision-briefs";
import { getAllRoleGuides, getRoleGuide, getRoleGuidesForCategory } from "@/data/guides/registry";
import { getSoftware } from "@/data/software";
import { isPublishedComparison } from "@/data/comparisons";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

const cohort = Object.keys(guides);
const officialDomains = ["pipedrive.com", "close.com", "hubspot.com", "salesforce.com", "helpscout.com", "freshworks.com", "zendesk.com", "intercom.com", "zapier.com", "make.com", "n8n.io", "zoho.com", "klaviyo.com", "omnisend.com", "mailerlite.com", "brevo.com", "shopify.com", "woocommerce.com", "wix.com", "ecwid.com", "getharvest.com", "toggl.com", "clockify.me", "hubstaff.com"];

describe("Wave 2 buyer-decision release", () => {
  it("reuses six canonical routes, preserving the 34-guide inventory", () => {
    expect(cohort).toHaveLength(6);
    expect(Object.keys(briefs).sort()).toEqual([...cohort].sort());
    expect(getAllRoleGuides()).toHaveLength(34);
    for (const slug of cohort) {
      expect(getRoleGuide(slug)).toBe(guides[slug]);
      expect(BUYER_DECISION_BRIEFS[slug]).toBe(briefs[slug]);
      expect(getAllRoleGuides().filter(g => g.slug === slug)).toHaveLength(1);
      expect(getRoleGuidesForCategory(guides[slug].categorySlug)).toContain(guides[slug]);
    }
  });

  for (const slug of cohort) {
    it(`${slug}: complete editorial profiles, unique worksheet and valid link graph`, () => {
      const guide = guides[slug], brief = briefs[slug];
      expect(guide.title.length).toBeLessThanOrEqual(60);
      expect(guide.metaDescription.length).toBeLessThanOrEqual(170);
      expect(guide.products).toHaveLength(4);
      expect(guide.products.map(p => p.ranking)).toEqual([1, 2, 3, 4]);
      expect(guide.keyCriteria).toHaveLength(4);
      expect(guide.faqs).toHaveLength(6);
      expect(new Set(guide.faqs.map(f => f.question)).size).toBe(6);
      expect(brief.sections).toHaveLength(4);
      expect(brief.checklist).toHaveLength(6);
      expect(brief.relatedGuides).toHaveLength(2);
      for (const p of guide.products) {
        expect(getSoftware(p.slug)).toBeDefined();
        for (const field of [p.fitReason, p.limitations, p.pricingNote, p.summaryBestFor, p.summaryPrice, p.summaryAvailability]) expect(field?.length).toBeGreaterThan(15);
        expect(p.pricingNote).toMatch(/Before paying|Before committing/i);
        expect(p.strengths).toHaveLength(3);
      }
      const ids = new Set(brief.sources.map(s => s.id));
      expect(ids.size).toBe(brief.sources.length);
      expect(brief.sources.length).toBeGreaterThanOrEqual(5);
      for (const s of brief.sources) {
        const url = new URL(s.url);
        expect(url.protocol).toBe("https:");
        expect(officialDomains.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`))).toBe(true);
        expect(url.search).toBe("");
      }
      for (const section of brief.sections) for (const id of section.sourceIds ?? []) expect(ids.has(id)).toBe(true);
      for (const row of brief.table.rows) expect(row).toHaveLength(brief.table.headers.length);
      for (const link of brief.relatedGuides ?? []) {
        expect(getRoleGuide(link.href.slice(1))).toBeDefined();
        expect(link.href).not.toBe(`/${slug}`);
      }
      for (const comparison of guide.comparisons) {
        const [a, b] = comparison.split("-vs-");
        // The reverse pair can exist in the catalog but still be a 404 URL.
        expect(isPublishedComparison(a, b)).toBe(true);
      }
    });
  }

  it("protects the two Wave 1 modules byte-for-byte and introduces no redesign", () => {
    const frozen = {
      "data/guides/buyer-pain-guides.ts": "8bdfc128be0e34ee3deed2d5e9e0ad147c32057f00ed058fa0451c04706c8fd6",
      "data/guides/buyer-pain-briefs.ts": "2f2876fa8e5b6fc43872c81d7ea241c0352e3653511286b91a6f42648707be90",
    };
    for (const [file, hash] of Object.entries(frozen)) expect(createHash("sha256").update(readFileSync(file)).digest("hex")).toBe(hash);
    // The deployed template already owns tracking and mobile table behavior.
    const page = readFileSync("app/[guide]/page.tsx", "utf8");
    expect(page).toContain('ctaLocation="role-guide-summary-table"');
    expect(page).toContain('ctaLocation="role-guide-card-cta"');
    expect(page).toContain("getSoftwareCtaUrl(software)");
  });

  it("has six distinct mechanisms, 36 FAQs and 42 official source references", () => {
    expect(new Set(Object.values(briefs).map(b => b.table.caption)).size).toBe(6);
    expect(new Set(Object.values(briefs).flatMap(b => b.checklist)).size).toBe(36);
    expect(Object.values(guides).flatMap(g => g.faqs)).toHaveLength(36);
    expect(Object.values(briefs).flatMap(b => b.sources)).toHaveLength(42);
  });

  it("keeps unavailable guide baselines null and the opportunity score auditable", () => {
    const manifest = JSON.parse(readFileSync("docs/growth/seo-buyer-pain-wave2-cohort-20260913.json", "utf8"));
    expect(manifest.guardrails).toMatchObject({ autonomyLevel: 0, massPublishing: false, privateBlobWrites: false, wave1Rewrites: false });
    expect(manifest.pages.map((p: { slug: string }) => p.slug).sort()).toEqual([...cohort].sort());
    for (const page of manifest.pages) {
      expect(Object.values(page.prePublicationMetrics).every(value => value === null)).toBe(true);
      expect(page.historicalMetricsStatus).toBe("UNKNOWN_NOT_ZERO");
      expect(page.checkpoints.map((c: { daysAfterPublication: number }) => c.daysAfterPublication)).toEqual([7, 14, 28]);
    }
    const research = readFileSync("docs/growth/seo-buyer-pain-wave2-research-20260913.md", "utf8");
    const scores = [...research.matchAll(/^\| (\d+) \| ([\d/−]+) \| (\d+) \| (.+)$/gm)];
    expect(scores).toHaveLength(30);
    expect(scores.filter(s => s[4].startsWith("EXECUTE"))).toHaveLength(6);
    for (const score of scores) expect(score[2].split("/").reduce((sum, n) => sum + Number(n.replace("−", "-")), 0)).toBe(Number(score[3]));
  });

  it("uses canonical gated CTAs for 24 profiles / 48 placements without embedding tracking assets", () => {
    let affiliateProfiles = 0;
    for (const guide of Object.values(guides)) for (const profile of guide.products) {
      const product = getSoftware(profile.slug)!;
      const affiliate = shouldShowAffiliateDisclosure(product);
      if (affiliate) affiliateProfiles++;
      expect(getSoftwareCtaUrl(product)).toMatch(/^https:\/\//);
      expect(getSoftwareCtaRel(product).includes("sponsored")).toBe(affiliate);
      expect(getSoftwareCtaRel(product)).toContain("noopener");
      expect(getSoftwareCtaRel(product)).toContain("noreferrer");
    }
    expect(affiliateProfiles).toBe(7);
    expect(JSON.stringify([guides, briefs])).not.toMatch(/affiliateUrl|partnerstack|partnerlinks|pxf\.io/);
    // Two evidence-led winners have no affiliate relationship in this release.
    for (const slug of ["best-help-desk-for-small-business", "best-automation-software-for-small-business"])
      expect(guides[slug].products.some(p => shouldShowAffiliateDisclosure(getSoftware(p.slug)!))).toBe(false);
  });

  it("locks the corrected decision boundaries and explicitly modeled arithmetic", () => {
    expect(JSON.stringify(guides["best-crm-for-sales-teams"])).toContain("one plan per organization");
    expect(JSON.stringify(guides["best-help-desk-for-small-business"])).toContain("cannot send customer replies");
    expect(JSON.stringify(guides["best-email-marketing-for-ecommerce"])).toContain("returning customers with a previous order");
    expect(JSON.stringify(guides["best-ecommerce-platform-for-small-business"])).toContain("Venture at one hundred");
    expect(JSON.stringify(guides["best-time-tracking-for-agencies"])).toContain("Teams and Enterprise");
    expect(briefs["best-automation-software-for-small-business"].table.rows.map(r => r[2])).toEqual(["1,000 × 3 = 3,000 tasks", "1,000 × 4 = 4,000 credits", "1,000 × 1 = 1,000 executions", "1,000 × 3 = 3,000 tasks"]);
    expect(briefs["best-time-tracking-for-agencies"].table.note).toContain("No revenue amount is inferred");
  });
});
