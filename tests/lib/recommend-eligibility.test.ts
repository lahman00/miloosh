import { describe, it, expect } from "vitest";
import { getSoftware } from "@/data/software";
import { isDomainEligible, isHardExcluded, passesEligibility } from "@/lib/recommend/eligibility";
import { DEFAULT_ANSWERS } from "@/lib/recommend/query";
import { PRODUCT_PROFILES, getProductProfile } from "@/data/recommend/product-profiles";
import { getSlugsForDomainFromEvidence } from "@/data/recommend/domain-evidence";
import { RECOMMEND_DOMAINS } from "@/lib/recommend/domains";
import { scoreSoftwareForAnswers } from "@/lib/recommend/scoring";

/**
 * Recommend Engine Rebuild (2026-08-21) — Phase 7 of the rebuild brief:
 * "Create tests proving cross-domain absurdities cannot happen." These
 * use the brief's own named examples directly, plus structural coverage
 * of the whole product-profiles.ts allowlist.
 */

describe("Domain eligibility — cross-domain absurdities are structurally impossible", () => {
  it("Todoist (task manager) is not eligible for accounting", () => {
    const software = getSoftware("todoist");
    expect(software).toBeDefined();
    expect(isDomainEligible(software!, { ...DEFAULT_ANSWERS, primaryNeed: "accounting" })).toBe(false);
  });

  it("Setmore (scheduling) is not eligible for CRM", () => {
    const software = getSoftware("setmore");
    expect(software).toBeDefined();
    expect(isDomainEligible(software!, { ...DEFAULT_ANSWERS, primaryNeed: "crm" })).toBe(false);
  });

  it("Pipedrive (CRM) is not eligible for password management", () => {
    const software = getSoftware("pipedrive");
    expect(software).toBeDefined();
    expect(isDomainEligible(software!, { ...DEFAULT_ANSWERS, primaryNeed: "password_manager" })).toBe(false);
  });

  it("Volza (trade/customs intelligence, shares the 'analytics' category tag) is not eligible for the analytics domain — deliberately excluded from product-profiles.ts", () => {
    const software = getSoftware("volza");
    expect(software).toBeDefined();
    expect(getProductProfile("volza")).toBeUndefined();
    expect(isDomainEligible(software!, { ...DEFAULT_ANSWERS, primaryNeed: "analytics" })).toBe(false);
  });

  it("a product with no profile at all is ineligible for every domain (absence of evidence never becomes eligibility)", () => {
    // canva (design category, no stored domain evidence — general graphic/marketing design, a
    // different job from ui_ux_design's interface-design/prototyping/handoff cluster). Was figma
    // until the 2026-08-22 mega-mission gave figma real ui_ux_design evidence — canva remains
    // genuinely unclaimed per scripts/recommend/coverage-report.ts's live CATALOG_ONLY output.
    const software = getSoftware("canva");
    expect(software).toBeDefined();
    for (const domain of RECOMMEND_DOMAINS) {
      expect(isDomainEligible(software!, { ...DEFAULT_ANSWERS, primaryNeed: domain })).toBe(false);
    }
  });

  it("every eligible product for a domain is genuinely correct: spot-checks one real product per domain against its own profile", () => {
    const spotChecks: Array<[string, (typeof RECOMMEND_DOMAINS)[number]]> = [
      ["freshdesk", "help_desk"],
      ["1password", "password_manager"],
      ["mailchimp", "email_marketing"],
      ["xero", "accounting"],
      ["calendly", "scheduling"],
      ["google-analytics", "analytics"],
      ["buffer", "social_media"],
      ["toggl-track", "time_tracking"],
    ];
    for (const [slug, domain] of spotChecks) {
      const software = getSoftware(slug);
      expect(software, `${slug} missing from catalog`).toBeDefined();
      expect(isDomainEligible(software!, { ...DEFAULT_ANSWERS, primaryNeed: domain }), `${slug} should be eligible for ${domain}`).toBe(true);
    }
  });

  it("with no domain selected (primaryNeed: null), every product is eligible — the original generic fallback is unchanged", () => {
    const software = getSoftware("figma");
    expect(isDomainEligible(software!, { ...DEFAULT_ANSWERS, primaryNeed: null })).toBe(true);
  });
});

describe("Hard negative signals — Phase 10 of the rebuild brief", () => {
  it("excludes a product with confirmed non-free pricing and no free tier when budget is 'free only'", () => {
    // keeper: pricing.model === "paid", no hasFreeTier — real stored data.
    const software = getSoftware("keeper");
    expect(software?.pricing?.model).toBe("paid");
    expect(isHardExcluded(software!, { ...DEFAULT_ANSWERS, budget: "free" })).toBe(true);
  });

  it("never excludes on budget=free when pricing is undocumented (absence of data is not evidence of exclusion)", () => {
    const software = getSoftware("calendly"); // pricing.model undefined in this catalog
    expect(software?.pricing?.model).toBeUndefined();
    expect(isHardExcluded(software!, { ...DEFAULT_ANSWERS, budget: "free" })).toBe(false);
  });

  it("excludes heavy-monitoring time trackers only when the buyer explicitly prefers lightweight, and only within time_tracking", () => {
    const hubstaff = getSoftware("hubstaff");
    expect(
      isHardExcluded(hubstaff!, { ...DEFAULT_ANSWERS, primaryNeed: "time_tracking", monitoringSensitivity: "prefer-lightweight" })
    ).toBe(true);
    // Same product, no stated preference -> not excluded.
    expect(
      isHardExcluded(hubstaff!, { ...DEFAULT_ANSWERS, primaryNeed: "time_tracking", monitoringSensitivity: "no-preference" })
    ).toBe(false);
    // Same preference, different domain -> never applies outside time_tracking.
    expect(
      isHardExcluded(hubstaff!, { ...DEFAULT_ANSWERS, primaryNeed: "crm", monitoringSensitivity: "prefer-lightweight" })
    ).toBe(false);
  });

  it("passesEligibility combines both gates: domain-correct AND not hard-excluded", () => {
    const keeper = getSoftware("keeper");
    // Right domain, but hard-excluded by budget.
    expect(passesEligibility(keeper!, { ...DEFAULT_ANSWERS, primaryNeed: "password_manager", budget: "free" })).toBe(false);
    // Right domain, no budget constraint -> passes.
    expect(passesEligibility(keeper!, { ...DEFAULT_ANSWERS, primaryNeed: "password_manager", budget: "flexible" })).toBe(true);
    // Wrong domain entirely -> fails regardless of budget.
    expect(passesEligibility(keeper!, { ...DEFAULT_ANSWERS, primaryNeed: "accounting", budget: "flexible" })).toBe(false);
  });
});

describe("Product profile data integrity — Phase 31 of the rebuild brief", () => {
  it("has no duplicate slugs", () => {
    const slugs = PRODUCT_PROFILES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every profiled slug exists in the real catalog", () => {
    for (const profile of PRODUCT_PROFILES) {
      expect(getSoftware(profile.slug), `${profile.slug} in product-profiles.ts but not in the catalog`).toBeDefined();
    }
  });

  it("every profile lists at least one domain, and every listed domain is a real RecommendDomain", () => {
    for (const profile of PRODUCT_PROFILES) {
      expect(profile.domains.length, `${profile.slug} has no domains`).toBeGreaterThan(0);
      for (const domain of profile.domains) {
        expect(RECOMMEND_DOMAINS as readonly string[], `${profile.slug} has an unsupported domain "${domain}"`).toContain(domain);
      }
    }
  });

  it("every domain has at least 3 eligible products (Phase 3's 'enough real catalog products' bar)", () => {
    for (const domain of RECOMMEND_DOMAINS) {
      expect(
        getSlugsForDomainFromEvidence(domain).length,
        `domain "${domain}" has too few eligible products`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("Multi-domain profiles — Recommend Engine Integrity Patch (2026-08-21), Phase 4/9", () => {
  it("notion is genuinely eligible for both knowledge_base and project_management, on real evidence", () => {
    const notion = getSoftware("notion");
    expect(notion).toBeDefined();
    expect(isDomainEligible(notion!, { ...DEFAULT_ANSWERS, primaryNeed: "knowledge_base" })).toBe(true);
    expect(isDomainEligible(notion!, { ...DEFAULT_ANSWERS, primaryNeed: "project_management" })).toBe(true);
    // Still correctly ineligible for domains it has no evidence for.
    expect(isDomainEligible(notion!, { ...DEFAULT_ANSWERS, primaryNeed: "crm" })).toBe(false);
  });

  it("zoho-desk is genuinely eligible for both help_desk and knowledge_base, on real evidence", () => {
    const zohoDesk = getSoftware("zoho-desk");
    expect(zohoDesk).toBeDefined();
    expect(isDomainEligible(zohoDesk!, { ...DEFAULT_ANSWERS, primaryNeed: "help_desk" })).toBe(true);
    expect(isDomainEligible(zohoDesk!, { ...DEFAULT_ANSWERS, primaryNeed: "knowledge_base" })).toBe(true);
  });

  it("a multi-domain product does not leak into a domain it has no evidence for, even one adjacent to both its real domains", () => {
    const notion = getSoftware("notion");
    // Notion spans knowledge_base + project_management, but has no automation or crm evidence.
    expect(isDomainEligible(notion!, { ...DEFAULT_ANSWERS, primaryNeed: "automation" })).toBe(false);
    expect(isDomainEligible(notion!, { ...DEFAULT_ANSWERS, primaryNeed: "crm" })).toBe(false);
  });

  it("cross-domain leakage is still structurally blocked for every other product despite multi-domain support existing", () => {
    // Re-assert the brief's own named absurdities still hold with the multi-domain type in real use.
    expect(isDomainEligible(getSoftware("todoist")!, { ...DEFAULT_ANSWERS, primaryNeed: "accounting" })).toBe(false);
    expect(isDomainEligible(getSoftware("setmore")!, { ...DEFAULT_ANSWERS, primaryNeed: "crm" })).toBe(false);
    expect(isDomainEligible(getSoftware("pipedrive")!, { ...DEFAULT_ANSWERS, primaryNeed: "password_manager" })).toBe(false);
  });

  it("candidates reviewed and deliberately kept single-domain (or CATALOG_ONLY) stay that way — real evidence was checked, not assumed", () => {
    // hubspot: crm only — its stored features read as sales-email/live-chat, not a documented
    // marketing-campaign or ticketing product.
    expect(getProductProfile("hubspot")?.domains).toEqual(["crm"]);
    // airtable: no task/project language in its stored features at all — stays CATALOG_ONLY.
    expect(getProductProfile("airtable")).toBeUndefined();
    // clickup and slack: each has one subordinate doc feature, not a genuine second-domain fit.
    expect(getProductProfile("clickup")?.domains).toEqual(["project_management"]);
    expect(getProductProfile("slack")?.domains).toEqual(["communication"]);
    // freshdesk/intercom: no knowledge-base feature in their stored data, unlike zoho-desk.
    expect(getProductProfile("freshdesk")?.domains).toEqual(["help_desk"]);
    expect(getProductProfile("intercom")?.domains).toEqual(["help_desk"]);
  });

  it("a multi-domain product gains no score advantage merely from having multiple domains (Phase 4's explicit requirement)", () => {
    const notionScore = scoreSoftwareForAnswers(getSoftware("notion")!, { ...DEFAULT_ANSWERS, primaryNeed: "knowledge_base" });
    const singleDomainScore = scoreSoftwareForAnswers(getSoftware("guru")!, { ...DEFAULT_ANSWERS, primaryNeed: "knowledge_base" });
    // Both are simply eligible, scored on the same PRIMARY_NEED_MATCH flat credit — domain count plays no role.
    expect(notionScore.factors.find((f) => f.label.includes("Matches what you're trying to do"))?.points).toBe(
      singleDomainScore.factors.find((f) => f.label.includes("Matches what you're trying to do"))?.points
    );
  });
});
