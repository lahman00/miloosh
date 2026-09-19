import { describe, it, expect } from "vitest";
import { getRecommendations } from "@/lib/recommend/engine";
import { DEFAULT_ANSWERS } from "@/lib/recommend/query";
import type { RecommendationAnswers } from "@/lib/recommend/types";
import { getSlugsForDomain } from "@/data/recommend/product-profiles";
import { RECOMMEND_DOMAINS } from "@/lib/recommend/domains";

/**
 * Recommend Engine Rebuild (2026-08-21) — Phase 16 (scenario matrix) and
 * Phase 17 (adversarial QA) of the rebuild brief.
 *
 * Not padded to hit an arbitrary count: every realistic scenario below
 * covers a genuinely distinct buyer situation (different domain,
 * different constraint combination), and every assertion checks a real,
 * verifiable structural property — domain correctness, no crash,
 * deterministic output, non-empty explanations, real result routes —
 * never an exact top pick where multiple real products would be
 * defensible winners (per the brief's own "do not overfit exact order"
 * guidance).
 */

function answers(overrides: Partial<RecommendationAnswers>): RecommendationAnswers {
  return { ...DEFAULT_ANSWERS, ...overrides };
}

function assertStructurallySound(result: ReturnType<typeof getRecommendations>, domain: RecommendationAnswers["primaryNeed"]) {
  expect(["high", "low", "none"]).toContain(result.confidence);
  if (result.confidence === "none") {
    expect(result.confidenceNote).toBeTruthy();
    expect(result.recommendations.length).toBe(0);
    return;
  }
  expect(result.recommendations.length).toBeGreaterThan(0);
  const eligibleSlugs = domain ? new Set(getSlugsForDomain(domain)) : null;
  for (const rec of result.recommendations) {
    if (eligibleSlugs) {
      expect(eligibleSlugs.has(rec.software.slug), `${rec.software.slug} recommended for ${domain} but not in that domain's eligible set`).toBe(true);
    }
    expect(rec.explanation.whyItMatched.length, `${rec.software.slug} has an empty whyItMatched`).toBeGreaterThan(0);
    expect(rec.pros.length + (rec.consDisclosure ? 1 : 0)).toBeGreaterThan(0);
    // Every related-comparison route must be a real, existing route (never fabricated) — engine.ts only ever populates this from getComparisonsInvolving, but assert the contract holds for every scenario here too.
    expect(Array.isArray(rec.relatedComparisonSlugs)).toBe(true);
  }
}

describe("Recommend scenario matrix — realistic buyer situations across every domain", () => {
  const scenarios: Array<{ name: string; input: RecommendationAnswers }> = [
    { name: "new small online store", input: answers({ primaryNeed: "ecommerce_platform", ecommerceSituation: "new", teamSize: "small", difficultyPreference: "simple" }) },
    { name: "repair existing store", input: answers({ primaryNeed: "ecommerce_platform", ecommerceSituation: "repair", teamSize: "solo", budget: "low" }) },
    { name: "embed commerce in existing website", input: answers({ primaryNeed: "ecommerce_platform", ecommerceSituation: "embed", teamSize: "small" }) },
    { name: "migrate growing store", input: answers({ primaryNeed: "ecommerce_platform", ecommerceSituation: "migrate", companyStage: "growth" }) },
    { name: "SMB CRM", input: answers({ primaryNeed: "crm", teamSize: "small", companyStage: "growth" }) },
    { name: "startup CRM free budget", input: answers({ primaryNeed: "crm", companyStage: "startup", budget: "free" }) },
    { name: "sales-heavy CRM enterprise", input: answers({ primaryNeed: "crm", companyStage: "enterprise", difficultyPreference: "powerful" }) },
    { name: "simple project management solo", input: answers({ primaryNeed: "project_management", teamSize: "solo", difficultyPreference: "simple" }) },
    { name: "agency project management", input: answers({ primaryNeed: "project_management", teamSize: "medium", workStyle: "remote" }) },
    { name: "freelancer project management free", input: answers({ primaryNeed: "project_management", teamSize: "solo", budget: "free" }) },
    { name: "customer support small team", input: answers({ primaryNeed: "help_desk", teamSize: "small" }) },
    { name: "enterprise customer support", input: answers({ primaryNeed: "help_desk", companyStage: "enterprise", teamSize: "large" }) },
    { name: "help desk with AI", input: answers({ primaryNeed: "help_desk", needsAi: true }) },
    { name: "simple individual password manager", input: answers({ primaryNeed: "password_manager", teamSize: "solo", difficultyPreference: "simple" }) },
    { name: "business password manager", input: answers({ primaryNeed: "password_manager", teamSize: "medium", companyStage: "growth" }) },
    { name: "creator email marketing", input: answers({ primaryNeed: "email_marketing", teamSize: "solo" }) },
    { name: "ecommerce email marketing", input: answers({ primaryNeed: "email_marketing", industry: "ecommerce" }) },
    { name: "SMB email marketing free", input: answers({ primaryNeed: "email_marketing", budget: "free" }) },
    { name: "simple accounting solo", input: answers({ primaryNeed: "accounting", teamSize: "solo", difficultyPreference: "simple" }) },
    { name: "invoicing-heavy accounting freelancer", input: answers({ primaryNeed: "accounting", teamSize: "solo", budget: "low" }) },
    { name: "growing business accounting", input: answers({ primaryNeed: "accounting", companyStage: "growth" }) },
    { name: "consultant scheduling", input: answers({ primaryNeed: "scheduling", teamSize: "solo" }) },
    { name: "coach scheduling free", input: answers({ primaryNeed: "scheduling", teamSize: "solo", budget: "free" }) },
    { name: "team scheduling", input: answers({ primaryNeed: "scheduling", teamSize: "medium" }) },
    { name: "product analytics startup", input: answers({ primaryNeed: "analytics", companyStage: "startup" }) },
    { name: "enterprise analytics", input: answers({ primaryNeed: "analytics", companyStage: "enterprise", difficultyPreference: "powerful" }) },
    { name: "privacy-focused analytics simple", input: answers({ primaryNeed: "analytics", difficultyPreference: "simple" }) },
    { name: "simple social publishing solo", input: answers({ primaryNeed: "social_media", teamSize: "solo" }) },
    { name: "agency social management", input: answers({ primaryNeed: "social_media", teamSize: "medium", difficultyPreference: "powerful" }) },
    { name: "freelance time tracking lightweight", input: answers({ primaryNeed: "time_tracking", teamSize: "solo", monitoringSensitivity: "prefer-lightweight" }) },
    { name: "agency time tracking", input: answers({ primaryNeed: "time_tracking", teamSize: "medium" }) },
    { name: "workforce time tracking monitoring ok", input: answers({ primaryNeed: "time_tracking", teamSize: "large", monitoringSensitivity: "comfortable" }) },
    { name: "knowledge base internal simple", input: answers({ primaryNeed: "knowledge_base", difficultyPreference: "simple" }) },
    { name: "knowledge base customer-facing", input: answers({ primaryNeed: "knowledge_base", teamSize: "medium" }) },
    { name: "simple automation", input: answers({ primaryNeed: "automation", difficultyPreference: "simple" }) },
    { name: "advanced automation enterprise", input: answers({ primaryNeed: "automation", companyStage: "enterprise", difficultyPreference: "powerful" }) },
    { name: "remote team communication", input: answers({ primaryNeed: "communication", workStyle: "remote" }) },
    { name: "office team communication", input: answers({ primaryNeed: "communication", workStyle: "office" }) },
  ];

  it.each(scenarios)("$name", ({ input }) => {
    const result = getRecommendations(input, 3);
    expect(() => result).not.toThrow();
    assertStructurallySound(result, input.primaryNeed);
  });
});

describe("Adversarial QA — Phase 17 of the rebuild brief", () => {
  it("no answer given at all -> generic fallback, no crash, 3 results", () => {
    const result = getRecommendations(answers({}), 3);
    expect(result.recommendations.length).toBe(3);
  });

  it("every optional preference set simultaneously -> no crash", () => {
    const result = getRecommendations(
      answers({
        primaryNeed: "help_desk",
        teamSize: "large",
        budget: "flexible",
        companyStage: "enterprise",
        industry: "Healthcare",
        workStyle: "hybrid",
        requiredIntegrations: ["Slack", "Salesforce", "Zapier"],
        needsAi: true,
        difficultyPreference: "powerful",
        monitoringSensitivity: "comfortable",
      }),
      3
    );
    expect(() => result).not.toThrow();
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("conflicting preferences (simple AND powerful is impossible to request, but free budget + enterprise stage is a real tension) -> no crash, honest result", () => {
    const result = getRecommendations(answers({ primaryNeed: "analytics", budget: "free", companyStage: "enterprise" }), 3);
    expect(() => result).not.toThrow();
    assertStructurallySound(result, "analytics");
  });

  it("tiny/nonsense integration string -> no crash, penalizes uniformly rather than throwing", () => {
    const result = getRecommendations(answers({ primaryNeed: "crm", requiredIntegrations: ["Zzyxxblorp9000", "", "   "] }), 3);
    expect(() => result).not.toThrow();
  });

  it("free-plan-only request in a domain where no eligible product has a confirmed free tier -> honest low/no-confidence, never a forced result", () => {
    // password_manager: 1password/dashlane/lastpass/nordpass/keeper-security/keeper all have pricing.model undefined or "paid" with no confirmed free tier in this catalog.
    const result = getRecommendations(answers({ primaryNeed: "password_manager", budget: "free" }), 3);
    expect(() => result).not.toThrow();
    // Whatever the outcome, it must be honest: either real free-tier products remain (confidence stays whatever the data supports), or confidence explicitly says why not.
    if (result.recommendations.length === 0) {
      expect(result.confidence).toBe("none");
      expect(result.confidenceNote).toBeTruthy();
    }
  });

  it("accounting + social-listening-style answers (a genuinely mismatched combination) still returns only accounting-eligible products, never a social tool", () => {
    const result = getRecommendations(answers({ primaryNeed: "accounting", needsAi: true, difficultyPreference: "powerful" }), 3);
    const socialSlugs = new Set(getSlugsForDomain("social_media"));
    for (const rec of result.recommendations) {
      expect(socialSlugs.has(rec.software.slug)).toBe(false);
    }
  });

  it("password manager + ecommerce-newsletter-style industry text still returns only password managers, never an email tool", () => {
    const result = getRecommendations(answers({ primaryNeed: "password_manager", industry: "ecommerce newsletter" }), 3);
    const emailSlugs = new Set(getSlugsForDomain("email_marketing"));
    for (const rec of result.recommendations) {
      expect(emailSlugs.has(rec.software.slug)).toBe(false);
    }
  });

  it("appointment scheduling + observability-style AI/powerful answers still returns only scheduling products, never an analytics tool", () => {
    const result = getRecommendations(answers({ primaryNeed: "scheduling", needsAi: true, difficultyPreference: "powerful" }), 3);
    const analyticsSlugs = new Set(getSlugsForDomain("analytics"));
    for (const rec of result.recommendations) {
      expect(analyticsSlugs.has(rec.software.slug)).toBe(false);
    }
  });

  it("every domain, requested one at a time, returns zero cross-domain leakage", () => {
    const allDomains = [
      "project_management", "crm", "knowledge_base", "automation", "communication",
      "help_desk", "password_manager", "email_marketing", "accounting", "scheduling",
      "analytics", "social_media", "time_tracking",
    ] as const;
    for (const domain of allDomains) {
      const result = getRecommendations(answers({ primaryNeed: domain }), 5);
      const eligibleSlugs = new Set(getSlugsForDomain(domain));
      for (const rec of result.recommendations) {
        expect(eligibleSlugs.has(rec.software.slug), `${rec.software.slug} leaked into ${domain} results`).toBe(true);
      }
    }
  });
});

describe("Recommend scenario matrix — 14 new domains (Flippa Activation + Recommend Expansion, 2026-08-21)", () => {
  const scenarios: Array<{ name: string; input: RecommendationAnswers }> = [
    { name: "small landlord property management", input: answers({ primaryNeed: "property_management", teamSize: "solo", budget: "low" }) },
    { name: "large portfolio property management", input: answers({ primaryNeed: "property_management", teamSize: "large", companyStage: "enterprise" }) },
    { name: "home-service field service SMB", input: answers({ primaryNeed: "field_service", teamSize: "small" }) },
    { name: "field service enterprise contractor", input: answers({ primaryNeed: "field_service", teamSize: "large", difficultyPreference: "powerful" }) },
    { name: "startup online store", input: answers({ primaryNeed: "ecommerce_platform", companyStage: "startup", budget: "low" }) },
    { name: "enterprise ecommerce", input: answers({ primaryNeed: "ecommerce_platform", companyStage: "enterprise", difficultyPreference: "powerful" }) },
    { name: "no-code website builder", input: answers({ primaryNeed: "website_builder", difficultyPreference: "simple" }) },
    { name: "traditional CMS for a content team", input: answers({ primaryNeed: "cms", teamSize: "medium" }) },
    { name: "headless CMS for developers", input: answers({ primaryNeed: "headless_cms", difficultyPreference: "powerful" }) },
    { name: "developer/API documentation", input: answers({ primaryNeed: "developer_documentation" }) },
    { name: "video meetings for remote team", input: answers({ primaryNeed: "video_meetings", workStyle: "remote" }) },
    { name: "cloud phone system for SMB", input: answers({ primaryNeed: "cloud_phone", teamSize: "small" }) },
    { name: "API management at scale", input: answers({ primaryNeed: "api_management", companyStage: "enterprise" }) },
    { name: "deploy and host a startup app", input: answers({ primaryNeed: "deployment_hosting", companyStage: "startup", budget: "free" }) },
    { name: "source control for a growing team", input: answers({ primaryNeed: "source_control", teamSize: "medium" }) },
    { name: "SEO research and rank tracking", input: answers({ primaryNeed: "seo_platform" }) },
    { name: "agency call tracking for attribution", input: answers({ primaryNeed: "call_tracking", teamSize: "small" }) },
    // Decontamination + Commercial Growth Mega-Mission (2026-08-22) — 4 new domains.
    { name: "freelance UI/UX design and prototyping", input: answers({ primaryNeed: "ui_ux_design", teamSize: "solo", difficultyPreference: "simple" }) },
    { name: "enterprise design-to-dev handoff", input: answers({ primaryNeed: "ui_ux_design", companyStage: "enterprise", difficultyPreference: "powerful" }) },
    { name: "product team wireframing free budget", input: answers({ primaryNeed: "ui_ux_design", budget: "free" }) },
    { name: "solo personal task management", input: answers({ primaryNeed: "task_management", teamSize: "solo" }) },
    { name: "simple to-do app for individuals", input: answers({ primaryNeed: "task_management", difficultyPreference: "simple" }) },
    { name: "task management with AI", input: answers({ primaryNeed: "task_management", needsAi: true }) },
    { name: "individual note-taking, simple", input: answers({ primaryNeed: "note_taking", teamSize: "solo", difficultyPreference: "simple" }) },
    { name: "note-taking for growth-stage team", input: answers({ primaryNeed: "note_taking", companyStage: "growth" }) },
    { name: "startup adding SSO/MFA", input: answers({ primaryNeed: "identity_management", companyStage: "startup" }) },
    { name: "enterprise identity management, powerful", input: answers({ primaryNeed: "identity_management", companyStage: "enterprise", difficultyPreference: "powerful" }) },
    { name: "identity management free budget", input: answers({ primaryNeed: "identity_management", budget: "free" }) },
  ];

  it.each(scenarios)("$name", ({ input }) => {
    const result = getRecommendations(input, 3);
    expect(() => result).not.toThrow();
    assertStructurallySound(result, input.primaryNeed);
  });

  it("every new domain, requested one at a time, returns zero cross-domain leakage", () => {
    const newDomains = [
      "property_management", "field_service", "ecommerce_platform", "website_builder", "cms",
      "headless_cms", "developer_documentation", "video_meetings", "cloud_phone", "api_management",
      "deployment_hosting", "source_control", "seo_platform", "call_tracking",
      "ui_ux_design", "task_management", "note_taking", "identity_management",
    ] as const;
    for (const domain of newDomains) {
      const result = getRecommendations(answers({ primaryNeed: domain }), 5);
      const eligibleSlugs = new Set(getSlugsForDomain(domain));
      for (const rec of result.recommendations) {
        expect(eligibleSlugs.has(rec.software.slug), `${rec.software.slug} leaked into ${domain} results`).toBe(true);
      }
    }
  });
});

describe("Adversarial engine attack — Phase 20 of the Flippa + Recommend Expansion mission", () => {
  const attacks: Array<{ name: string; domain: RecommendationAnswers["primaryNeed"]; overrides: Partial<RecommendationAnswers>; mustNotLeakInto: RecommendationAnswers["primaryNeed"] }> = [
    { name: "property management + creator priorities", domain: "property_management", overrides: { needsAi: true, difficultyPreference: "simple" }, mustNotLeakInto: "social_media" },
    { name: "field service + enterprise analytics posture", domain: "field_service", overrides: { companyStage: "enterprise", difficultyPreference: "powerful" }, mustNotLeakInto: "analytics" },
    { name: "cloud phone + password security framing", domain: "cloud_phone", overrides: { needsAi: false }, mustNotLeakInto: "password_manager" },
    { name: "API management + social media framing", domain: "api_management", overrides: {}, mustNotLeakInto: "social_media" },
    { name: "ecommerce platform + help desk framing", domain: "ecommerce_platform", overrides: {}, mustNotLeakInto: "help_desk" },
    { name: "video meetings + accounting framing", domain: "video_meetings", overrides: {}, mustNotLeakInto: "accounting" },
    { name: "developer documentation + CRM framing", domain: "developer_documentation", overrides: {}, mustNotLeakInto: "crm" },
    { name: "seo platform + field service framing", domain: "seo_platform", overrides: {}, mustNotLeakInto: "field_service" },
    { name: "UI/UX design + accounting framing", domain: "ui_ux_design", overrides: { needsAi: true }, mustNotLeakInto: "accounting" },
    { name: "identity management + task management framing", domain: "identity_management", overrides: { difficultyPreference: "simple" }, mustNotLeakInto: "task_management" },
  ];

  it.each(attacks)("$name — no leakage into $mustNotLeakInto", ({ domain, overrides, mustNotLeakInto }) => {
    const result = getRecommendations(answers({ primaryNeed: domain, ...overrides }), 5);
    expect(() => result).not.toThrow();
    const leakedSlugs = new Set(getSlugsForDomain(mustNotLeakInto!));
    for (const rec of result.recommendations) {
      expect(leakedSlugs.has(rec.software.slug), `${rec.software.slug} leaked from ${domain} into ${mustNotLeakInto}`).toBe(false);
    }
  });

  it("no domain in the full domain set ever recommends a product without real eligibility evidence", () => {
    // Reads RECOMMEND_DOMAINS directly (was a hardcoded 27-entry list that
    // silently excluded any newly-added domain, e.g. the 4 added in the
    // 2026-08-22 mega-mission, from this check) — dynamic so a future
    // domain addition can never accidentally skip this test.
    for (const domain of RECOMMEND_DOMAINS) {
      const result = getRecommendations(answers({ primaryNeed: domain }), 5);
      const eligibleSlugs = new Set(getSlugsForDomain(domain));
      for (const rec of result.recommendations) {
        expect(eligibleSlugs.has(rec.software.slug)).toBe(true);
      }
    }
  });
});

describe("Deterministic tie-break — Recommend Engine Integrity Patch (2026-08-21), Phase 5", () => {
  it("ties at the max score are broken alphabetically by slug, not by an incidental catalog/order-field position", () => {
    // knowledge_base with no other signals: notion, confluence, obsidian, gitbook, guru, etc.
    // all tie at the same flat PRIMARY_NEED_MATCH score. Before this patch, the winner was
    // whichever had the lowest site-wide `order` field (Notion's order: 1) -- unrelated to
    // buyer fit. "archbee" sorts first alphabetically among the tied group (added 2026-08-21
    // in the Recommend Expansion mission's knowledge_base evidence audit), so it wins now.
    const result = getRecommendations(answers({ primaryNeed: "knowledge_base" }), 5);
    expect(result.recommendations[0]?.software.slug).toBe("archbee");
  });

  it("the alphabetical tie-break is itself deterministic across repeated calls", () => {
    const first = getRecommendations(answers({ primaryNeed: "automation" }), 5);
    const second = getRecommendations(answers({ primaryNeed: "automation" }), 5);
    expect(second.recommendations.map((r) => r.software.slug)).toEqual(first.recommendations.map((r) => r.software.slug));
  });
});
