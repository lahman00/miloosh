import { describe, expect, it } from "vitest";
import { ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";
import { getSoftware } from "@/data/software";
import { isPublishedComparison } from "@/data/comparisons";

function shingles(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return new Set(words.slice(0, -4).map((_, index) => words.slice(index, index + 5).join(" ")));
}

function similarity(a: string, b: string): number {
  const left = shingles(a); const right = shingles(b);
  const overlap = [...left].filter((item) => right.has(item)).length;
  return overlap / Math.max(1, new Set([...left, ...right]).size);
}

describe("SEO execution cohort alternatives guides", () => {
  it("contains exactly the approved cohort with valid targets", () => {
    // Organic Traffic Breakthrough Mission (2026-08-21) added activecampaign,
    // clickup, setmore, sprout-social, todoist. Growth War Room mission
    // (2026-08-21) added confluence, lastpass, mulesoft, salesforce, tidio —
    // both batches real GSC evidence (deep ranking + real impressions + 0%
    // CTR for "X alternatives" queries), non-protected-cohort, action=IMPROVE
    // per the seo-factory's own deterministic scoring. See data/seo/
    // alternative-guides.ts's comments.
    //
    // MILOOSH REVENUE STRIKE mission (2026-08-24) added woocommerce: real
    // GSC evidence (81 impressions across 4 real queries including the
    // exact "woocommerce alternatives" intent), and the newly-activated
    // Shopify affiliate partnership makes one of its two real alternatives
    // (Shopify, PrestaShop) directly monetizable. Only 2 decisions, not 3 --
    // woocommerce.json's real `alternatives` array has exactly two entries,
    // and a third was never invented to hit a round number the other
    // cohort members happen to share.
    expect(Object.keys(ALTERNATIVE_GUIDES).sort()).toEqual(["activecampaign", "airtable", "buffer", "clickup", "confluence", "freshdesk", "front", "help-scout", "intercom", "lastpass", "mulesoft", "pipedrive", "ringcentral", "salesforce", "semrush", "setmore", "sprout-social", "tidio", "todoist", "woocommerce"]);
    for (const [slug, guide] of Object.entries(ALTERNATIVE_GUIDES)) {
      expect(getSoftware(slug)).toBeDefined();
      expect(guide.decisions.length).toBeGreaterThanOrEqual(2); // real editorial minimum -- most real cohorts have 3, woocommerce honestly has 2
      expect(guide.whySeekAlternative).toHaveLength(3);
      for (const decision of guide.decisions) {
        expect(getSoftware(decision.alternativeSlug)).toBeDefined();
        const [a, b] = decision.comparisonSlug.split("-vs-");
        expect(isPublishedComparison(a!, b!)).toBe(true);
      }
    }
  });

  it("does not clone five-word editorial phrases across products", () => {
    const entries = Object.entries(ALTERNATIVE_GUIDES);
    for (let i = 0; i < entries.length; i += 1) for (let j = i + 1; j < entries.length; j += 1) {
      const [leftSlug, left] = entries[i]!; const [rightSlug, right] = entries[j]!;
      const text = (guide: typeof left) => [guide.heading, guide.introduction, ...guide.whySeekAlternative, ...guide.decisions.flatMap((item) => [item.heading, item.fit])].join(" ");
      expect(similarity(text(left), text(right)), `${leftSlug} vs ${rightSlug}`).toBeLessThan(0.08);
    }
  });

  it("stores only first-party evidence URLs", () => {
    for (const guide of Object.values(ALTERNATIVE_GUIDES)) for (const source of guide.evidenceSources) expect(new URL(source).hostname).not.toMatch(/g2|capterra|trustpilot|reddit/i);
  });
});
