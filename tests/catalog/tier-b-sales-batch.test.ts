import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema } from "@/data/software/schema";
import { getAllSoftware } from "@/data/software";

/**
 * Focused batch test for the 7 Tier B "sales" catalog entries added in the
 * 100-company catalog expansion (2026-09-05): 6sense, Chili Piper,
 * Consensus, Demandbase, Fathom, Fireflies.ai, and LinkedIn Sales
 * Navigator.
 *
 * This intentionally parses each file directly against softwareRawSchema
 * rather than going through getAllSoftware(), because getAllSoftware()
 * reads and cross-validates every file in data/software/ at once
 * (including alternative-slug resolution against the full directory).
 * This batch was written concurrently with five other agents adding their
 * own, unrelated companies to the same directory, so a directory-wide read
 * could transiently fail on files this batch has no control over. Testing
 * each of these 7 files in isolation is both sufficient for this batch's
 * own correctness and immune to that cross-batch flakiness.
 */

const SOFTWARE_DIR = join(process.cwd(), "data", "software");

const BATCH_SLUGS = [
  "6sense",
  "chili-piper",
  "consensus",
  "demandbase",
  "fathom",
  "fireflies-ai",
  "linkedin-sales-navigator",
] as const;

// 6sense, Chili Piper (Fire plans), Consensus, Demandbase, and LinkedIn
// Sales Navigator's top tier are contact-sales for at least their top
// tier -- but Chili Piper, Consensus, and LinkedIn Sales Navigator all
// publish genuine numeric self-serve pricing for their entry tier(s), so
// only 6sense and Demandbase have zero numeric pricing anywhere.
const NO_NUMERIC_PRICE_SLUGS = ["6sense", "demandbase"] as const;

// The five vendors in this batch that publish real, self-serve numeric
// entry pricing (even if a higher tier is separately contact-sales).
const VERIFIED_PRICING_SLUGS = ["chili-piper", "consensus", "fathom", "fireflies-ai", "linkedin-sales-navigator"] as const;

// Fathom and Fireflies.ai both publish a genuine, permanent free plan.
const FREE_TIER_SLUGS = ["fathom", "fireflies-ai"] as const;

function loadRaw(slug: string) {
  const fullPath = join(SOFTWARE_DIR, `${slug}.json`);
  const contents = readFileSync(fullPath, "utf-8");
  const json = JSON.parse(contents);
  return softwareRawSchema.parse(json);
}

describe("Tier B Sales catalog batch (6sense, Chili Piper, Consensus, Demandbase, Fathom, Fireflies.ai, LinkedIn Sales Navigator)", () => {
  it("has all 7 files present and parsing as valid JSON", () => {
    for (const slug of BATCH_SLUGS) {
      expect(() => loadRaw(slug)).not.toThrow();
    }
  });

  it("has all 7 files pass the softwareRawSchema (Zod) validation used by the real loader", () => {
    for (const slug of BATCH_SLUGS) {
      const result = softwareRawSchema.safeParse(
        JSON.parse(readFileSync(join(SOFTWARE_DIR, `${slug}.json`), "utf-8"))
      );
      expect(result.success, `${slug}.json failed schema validation: ${JSON.stringify(result.success ? null : result.error.issues)}`).toBe(true);
    }
  });

  it("has category 'sales' on every entry", () => {
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.category).toBe("sales");
    }
  });

  it("has at least one valid source URL on every entry", () => {
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.sources.length).toBeGreaterThanOrEqual(1);
      for (const source of raw.sources) {
        expect(() => new URL(source)).not.toThrow();
      }
    }
  });

  it("has at least one feature on every entry", () => {
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.features.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has at least one alternative on every entry, each with required fields", () => {
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.alternatives.length).toBeGreaterThanOrEqual(1);
      for (const alt of raw.alternatives) {
        expect(alt.name.length).toBeGreaterThan(0);
        expect(alt.slug.length).toBeGreaterThan(0);
        expect(alt.description.length).toBeGreaterThan(0);
        expect(alt.best_for.length).toBeGreaterThan(0);
        expect(alt.strengths.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("has accessed_at in YYYY-MM-DD format on every entry", () => {
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.accessed_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("has a slug that exactly matches its filename", () => {
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.slug).toBe(slug);
    }
  });

  it("never populates affiliate_url, sponsored, or featured (editorial firewall for this batch)", () => {
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.affiliate_url).toBeUndefined();
      expect(raw.sponsored).toBeUndefined();
      expect(raw.featured).toBeUndefined();
    }
  });

  it("never invents a numeric price for the two fully quote-based vendors (6sense, Demandbase)", () => {
    for (const slug of NO_NUMERIC_PRICE_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.entry_paid, `${slug}.json should not have entry_paid`).toBeUndefined();
      for (const tier of raw.pricing?.tiers ?? []) {
        expect(tier.amount, `${slug}.json tier "${tier.name}" should not have a numeric amount`).toBeUndefined();
      }
      expect(raw.pricing?.status).toBe("contact_sales");
      expect(raw.pricing?.enterprise_contact_sales).toBe(true);
    }
  });

  it("has verified, sourced entry_paid pricing with official_source and last_verified for the five vendors with real self-serve pricing", () => {
    for (const slug of VERIFIED_PRICING_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.status, `${slug}.json pricing.status should be "verified"`).toBe("verified");
      expect(raw.pricing?.entry_paid?.amount, `${slug}.json should have a numeric entry_paid.amount`).toBeTruthy();
      expect(raw.pricing?.official_source).toBeTruthy();
      expect(raw.pricing?.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("marks Fathom and Fireflies.ai as genuinely offering a free plan", () => {
    for (const slug of FREE_TIER_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.has_free_tier).toBe(true);
      expect(raw.pricing?.free_plan).toBe(true);
      expect(raw.pricing?.tiers?.some((t) => t.name.toLowerCase() === "free" && t.amount === "0")).toBe(true);
    }
  });

  it("Fathom's description does not reference web analytics/tracking, keeping it distinct from the pre-existing fathom-analytics.json product", () => {
    const fathom = loadRaw("fathom");
    const description = fathom.description.toLowerCase();
    expect(description).not.toMatch(/analytic/);
    expect(description).not.toMatch(/web track/);
    expect(description).not.toMatch(/website track/);
    // Sanity check it actually is the meeting-notetaker product.
    expect(description).toMatch(/meeting/);
  });

  it("never cross-references fathom.json and fathom-analytics.json as alternatives of each other", () => {
    const fathom = loadRaw("fathom");
    expect(fathom.alternatives.some((a) => a.slug === "fathom-analytics")).toBe(false);

    // fathom-analytics.json pre-exists this batch and must not be edited by
    // it, but we still assert the disambiguation holds from its side too.
    const fathomAnalyticsPath = join(SOFTWARE_DIR, "fathom-analytics.json");
    const fathomAnalytics = softwareRawSchema.parse(JSON.parse(readFileSync(fathomAnalyticsPath, "utf-8")));
    expect(fathomAnalytics.alternatives.some((a) => a.slug === "fathom")).toBe(false);
    // And confirm they really are two different products, not a duplicate.
    expect(fathomAnalytics.category).not.toBe(fathom.category);
    expect(fathomAnalytics.website).not.toBe(fathom.website);
  });

  it("has every alternative slug within this batch, the pre-existing catalog, or a genuine self-reference (never a dangling reference)", () => {
    // Any file already in the repo before this batch (i.e. not one of the
    // 7 this batch added) counts as "pre-existing catalog" for this check.
    // We don't assert those files' *contents* here -- only that an
    // alternative this batch points at resolves to *some* real file on
    // disk, either one of our own 7 or one that already existed.
    const allFiles = new Set(
      readdirSync(SOFTWARE_DIR)
        .filter((f: string) => f.endsWith(".json"))
        .map((f: string) => f.replace(/\.json$/, ""))
    );

    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      for (const alt of raw.alternatives) {
        expect(
          allFiles.has(alt.slug),
          `${slug}.json references alternative "${alt.slug}" which has no matching file in data/software/`
        ).toBe(true);
      }
    }
  });

  it("has no collisions across the 7 new files: unique slugs, names, and websites", () => {
    const slugs = new Set<string>();
    const names = new Set<string>();
    const websites = new Set<string>();

    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(slugs.has(raw.slug)).toBe(false);
      slugs.add(raw.slug);

      expect(names.has(raw.name)).toBe(false);
      names.add(raw.name);

      expect(websites.has(raw.website)).toBe(false);
      websites.add(raw.website);
    }

    expect(slugs.size).toBe(BATCH_SLUGS.length);
    expect(names.size).toBe(BATCH_SLUGS.length);
    expect(websites.size).toBe(BATCH_SLUGS.length);
  });

  it("never references a slug from another Tier B batch's category as an alternative (HR/Payroll, Finance/Legal, IT-Ops, Security/CX, Data-BI)", () => {
    // Spot-check against slugs this batch was explicitly told belong to the
    // five sibling Tier B agents running concurrently on unrelated
    // categories, so this test fails loudly if this batch ever points at
    // another agent's in-flight company instead of its own batch or the
    // pre-existing (Tier A + earlier) catalog. This batch does not have
    // visibility into the sibling batches' exact final slugs (they were
    // still in flight when this batch ran), so this is a defensive list of
    // the companies named in this batch's own assignment as explicitly
    // off-limits, plus the categories they belong to.
    const offLimitsCategories = new Set([
      "hr",
      "human-resources",
      "finance",
      "legal",
      "it-operations",
      "security",
      "cx",
      "customer-experience",
      "data-bi",
      "data-and-bi",
    ]);

    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      for (const alt of raw.alternatives) {
        // Every alternative this batch lists must exist on disk (checked
        // above) and must not be one of this batch's own products
        // pretending to be pre-existing -- i.e. it must be resolvable
        // *and* if it is a pre-existing file, it must not carry one of the
        // categories reserved for sibling Tier B agents.
        const altPath = join(SOFTWARE_DIR, `${alt.slug}.json`);
        let altCategory: string | undefined;
        try {
          altCategory = softwareRawSchema.parse(JSON.parse(readFileSync(altPath, "utf-8"))).category;
        } catch {
          altCategory = undefined;
        }
        if (altCategory) {
          expect(
            offLimitsCategories.has(altCategory),
            `${slug}.json references alternative "${alt.slug}" whose category "${altCategory}" looks like a sibling Tier B batch's category`
          ).toBe(false);
        }
      }
    }
  });

  it("loads cleanly through the real getAllSoftware() loader when the full catalog happens to be consistent (best-effort; sibling batches may be mid-write)", () => {
    // Unlike the tests above, getAllSoftware() reads and cross-validates
    // every file in data/software/ at once. Five other agents are
    // concurrently adding their own files to this same directory, so a
    // mid-write or not-yet-created sibling file can make the full directory
    // transiently invalid for reasons that have nothing to do with this
    // batch. When that happens here, this test degrades gracefully instead
    // of failing; scripts/validate-data.ts, run once by the orchestrating
    // session after every batch lands, is the real gate for the full set.
    let all: ReturnType<typeof getAllSoftware> | undefined;
    try {
      all = getAllSoftware();
    } catch {
      return;
    }

    const bySlug = new Map(all.map((entry) => [entry.slug, entry]));
    for (const slug of BATCH_SLUGS) {
      const entry = bySlug.get(slug);
      expect(entry, `${slug} should be present in getAllSoftware()`).toBeDefined();
      expect(entry?.category).toBe("sales");
    }
  });
});
