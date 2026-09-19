import { describe, expect, it } from "vitest";
import { getAllSoftware } from "@/data/software";
import { getSlugsForDomain } from "@/data/recommend/product-profiles";
import { ECOMMERCE_SITUATIONS, type EcommerceSituation } from "@/lib/recommend/types";
import { DEFAULT_ANSWERS, answersToSearchParams, searchParamsToAnswers } from "@/lib/recommend/query";
import { isHardExcluded, passesEligibility } from "@/lib/recommend/eligibility";
import { scoreSoftwareForAnswers } from "@/lib/recommend/scoring";
import { getRecommendations } from "@/lib/recommend/engine";

const answers = (ecommerceSituation: EcommerceSituation) => ({ ...DEFAULT_ANSWERS, primaryNeed: "ecommerce_platform" as const, ecommerceSituation });
const slugs = getSlugsForDomain("ecommerce_platform");
const getSoftwareBySlug = (slug: string) => getAllSoftware().find(product => product.slug === slug);

describe("ecommerce situation: context, never a hard exclusion", () => {
  it("covers the current 11-product eligibility set", () => { expect(slugs).toHaveLength(11); });
  it.each(ECOMMERCE_SITUATIONS.flatMap(situation => slugs.map(slug => ({ situation, slug }))))("$situation / $slug stays eligible", ({ situation, slug }) => {
    const product = getSoftwareBySlug(slug)!;
    expect(isHardExcluded(product, answers(situation))).toBe(false);
    expect(passesEligibility(product, answers(situation))).toBe(true);
  });
  it.each(ECOMMERCE_SITUATIONS)("safe query roundtrip: %s", situation => {
    expect(searchParamsToAnswers(answersToSearchParams(answers(situation)))).toEqual(answers(situation));
  });
  it.each([undefined, "garbage", "NEW", "", "repair<script>"])("missing/invalid query falls back: %s", value => {
    expect(searchParamsToAnswers({ need: "ecommerce_platform", ecommerceSituation: value }).ecommerceSituation).toBe("not-sure");
  });
  it("normalizes stale situation on non-ecommerce parse and serialization", () => {
    expect(searchParamsToAnswers({ need: "crm", ecommerceSituation: "repair" }).ecommerceSituation).toBe("not-sure");
    expect(answersToSearchParams({ ...answers("migrate"), primaryNeed: "crm" }).has("ecommerceSituation")).toBe(false);
  });
  it("new and default leave complete scoring and ranking unchanged", () => {
    expect(DEFAULT_ANSWERS.ecommerceSituation).toBe("not-sure");
    expect(getRecommendations(answers("new"), 11)).toEqual(getRecommendations(answers("not-sure"), 11));
    expect(searchParamsToAnswers({ need: "ecommerce_platform" })).toEqual(answers("not-sure"));
  });
  it.each(["embed", "migrate"] as const)("%s grants only one +6 signal, never a penalty", situation => {
    for (const slug of slugs) {
      const product = getSoftwareBySlug(slug)!;
      const base = scoreSoftwareForAnswers(product, answers("not-sure"));
      const next = scoreSoftwareForAnswers(product, answers(situation));
      expect([0, 6]).toContain(next.totalScore - base.totalScore);
      expect(next.matchPercent).toBeLessThanOrEqual(100);
      expect(next.maxPossibleScore).toBe(base.maxPossibleScore + 6);
      expect(next.factors.filter(f => f.direction === "negative")).toEqual(base.factors.filter(f => f.direction === "negative"));
    }
  });
  it("embed evidence belongs to Ecwid, not competitors' alternative descriptions or embedded payments", () => {
    for (const slug of ["ecwid", "bigcommerce", "prestashop", "shopify", "wix", "woocommerce"]) {
      const product = getSoftwareBySlug(slug)!;
      expect(scoreSoftwareForAnswers(product, answers("embed")).totalScore - scoreSoftwareForAnswers(product, answers("not-sure")).totalScore).toBe(slug === "ecwid" ? 6 : 0);
    }
  });
  it.each(["shift4shop", "prestashop"])("migration evidence in %s receives soft credit", slug => {
    const product = getSoftwareBySlug(slug)!;
    expect(scoreSoftwareForAnswers(product, answers("migrate")).totalScore - scoreSoftwareForAnswers(product, answers("not-sure")).totalScore).toBe(6);
  });
  it("absence of owned text never inherits evidence from alternatives", () => {
    const product = { ...getSoftwareBySlug("ecwid")!, description: "Store platform", bestFor: "Merchants", features: [] };
    expect(scoreSoftwareForAnswers(product, answers("embed")).totalScore).toBe(30);
  });
  it("repair remains nonempty and low-confidence even with detailed constraints", () => {
    const result = getRecommendations({ ...answers("repair"), teamSize: "small", budget: "free", companyStage: "growth" });
    expect(result.confidence).toBe("low");
    expect(result.confidenceNote).toMatch(/Repair first.*WooCommerce repair check/);
    expect(result.recommendations.length).toBeGreaterThan(0);
    for (const rec of result.recommendations) {
      expect(rec.explanation.whyItMatched).not.toContain("Best fit");
      expect(rec.explanation.tradeoff).toContain("Repairing or keeping");
    }
  });
  it.each(ECOMMERCE_SITUATIONS)("%s cannot affect other domains or affiliate neutrality", situation => {
    const commerce = answers(situation);
    for (const product of getAllSoftware()) {
      const baseline = { ...DEFAULT_ANSWERS, primaryNeed: "crm" as const };
      expect(scoreSoftwareForAnswers(product, { ...baseline, ecommerceSituation: situation })).toEqual(scoreSoftwareForAnswers(product, baseline));
      const commercialVariant = { ...product, affiliateUrl: "https://example.invalid/affiliate", affiliateStatus: "ACTIVE", commission: 9999, isAffiliate: true };
      expect(scoreSoftwareForAnswers(commercialVariant, commerce)).toEqual(scoreSoftwareForAnswers({ ...product, affiliateUrl: undefined }, commerce));
    }
  });
});
