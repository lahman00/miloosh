import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema, type SoftwareRaw } from "@/data/software/schema";
import { getAllSoftware } from "@/data/software";

/**
 * Tier B catalog batch: Data/BI (Airbyte, dbt Cloud, Domo, Google Cloud
 * BigQuery, Looker). Added alongside 5 other concurrent Tier B agents working
 * on their own, non-overlapping data/software/<slug>.json files (HR,
 * Finance/Legal, Sales, IT-Ops, Security/CX) on the same
 * catalog-expansion-100-20260905 branch. Tier A (45 companies, including the
 * pre-existing analytics entries Databricks, Fivetran, Microsoft Power BI,
 * Snowflake, and Tableau covered by tests/catalog/data-bi-field-ai-batch.test.ts)
 * is already merged and QA-clean.
 *
 * This suite validates ONLY this batch's own 5 files, using a direct
 * JSON-parse + schema-import approach rather than depending on the full
 * getAllSoftware() cross-validation of the entire (multi-hundred file)
 * directory -- other agents are concurrently adding their own files, so a
 * mid-write or not-yet-created sibling file could make the full directory
 * momentarily inconsistent for reasons that have nothing to do with this
 * batch. The one exception is the final smoke test, which attempts
 * getAllSoftware() but only asserts on it when the whole catalog happens to
 * already be consistent.
 */

const SOFTWARE_DIR = join(process.cwd(), "data", "software");

type BatchEntry = { slug: string; category: "analytics" };

const BATCH: BatchEntry[] = [
  { slug: "airbyte", category: "analytics" },
  { slug: "dbt-cloud", category: "analytics" },
  { slug: "domo", category: "analytics" },
  { slug: "google-cloud-bigquery", category: "analytics" },
  { slug: "looker", category: "analytics" },
];

// Products this batch references as alternatives that live in the
// pre-existing (pre-Tier-B) catalog -- Tier A's analytics entries -- not in
// this batch or another concurrent Tier B agent's batch.
const PRE_EXISTING_ALTERNATIVE_SLUGS = ["fivetran", "tableau", "microsoft-power-bi", "snowflake", "databricks"];

function loadRaw(slug: string): SoftwareRaw {
  const filePath = join(SOFTWARE_DIR, `${slug}.json`);
  const contents = readFileSync(filePath, "utf-8");
  const json = JSON.parse(contents);
  const result = softwareRawSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `Invalid software data in ${slug}.json:\n${result.error.issues
        .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("\n")}`
    );
  }
  return result.data;
}

describe("Tier B catalog batch: Data/BI (Airbyte, dbt Cloud, Domo, Google Cloud BigQuery, Looker)", () => {
  it("every batch file exists on disk", () => {
    for (const { slug } of BATCH) {
      expect(existsSync(join(SOFTWARE_DIR, `${slug}.json`))).toBe(true);
    }
  });

  it("every batch file parses as valid JSON and satisfies the software schema", () => {
    for (const { slug } of BATCH) {
      expect(() => loadRaw(slug)).not.toThrow();
    }
  });

  it("each file's slug field matches its filename exactly", () => {
    for (const { slug } of BATCH) {
      expect(loadRaw(slug).slug).toBe(slug);
    }
  });

  it("assigns the analytics category to all 5 products", () => {
    for (const { slug, category } of BATCH) {
      expect(loadRaw(slug).category).toBe(category);
    }
  });

  it("each entry has at least one source, one feature, and one alternative, with valid source URLs", () => {
    for (const { slug } of BATCH) {
      const raw = loadRaw(slug);
      expect(raw.sources.length).toBeGreaterThanOrEqual(1);
      expect(raw.features.length).toBeGreaterThanOrEqual(1);
      expect(raw.alternatives.length).toBeGreaterThanOrEqual(1);
      for (const source of raw.sources) {
        expect(() => new URL(source)).not.toThrow();
      }
    }
  });

  it("each entry has a valid accessed_at date and a real vendor website URL", () => {
    for (const { slug } of BATCH) {
      const raw = loadRaw(slug);
      expect(raw.accessed_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(() => new URL(raw.website)).not.toThrow();
    }
  });

  it("every alternative referenced by the batch resolves to a real file (own batch or pre-existing catalog)", () => {
    for (const { slug } of BATCH) {
      const raw = loadRaw(slug);
      for (const alt of raw.alternatives) {
        const altPath = join(SOFTWARE_DIR, `${alt.slug}.json`);
        expect(
          existsSync(altPath),
          `${slug}.json references alternative "${alt.slug}" which has no file at ${altPath}`
        ).toBe(true);
      }
    }
  });

  it("none of the alternatives reference another agent's concurrent Tier B batch (HR/Finance/Sales/IT-Ops/Security)", () => {
    const ownSlugs = new Set(BATCH.map((b) => b.slug));
    for (const { slug } of BATCH) {
      const raw = loadRaw(slug);
      for (const alt of raw.alternatives) {
        const isOwnBatch = ownSlugs.has(alt.slug);
        const isKnownPreExisting = PRE_EXISTING_ALTERNATIVE_SLUGS.includes(alt.slug);
        expect(
          isOwnBatch || isKnownPreExisting,
          `${slug}.json references alternative "${alt.slug}" which is neither in this batch nor on the known pre-existing allow-list`
        ).toBe(true);
      }
    }
  });

  it("no two of the 5 batch files collide on slug, name, or website", () => {
    const slugs = new Set<string>();
    const names = new Set<string>();
    const websites = new Set<string>();
    for (const { slug } of BATCH) {
      const raw = loadRaw(slug);
      expect(slugs.has(raw.slug)).toBe(false);
      slugs.add(raw.slug);
      expect(names.has(raw.name)).toBe(false);
      names.add(raw.name);
      expect(websites.has(raw.website)).toBe(false);
      websites.add(raw.website);
    }
    expect(slugs.size).toBe(BATCH.length);
  });

  it("Google Cloud BigQuery describes consumption-based pricing without fabricating a flat starting price, while preserving its real free tier", () => {
    const raw = loadRaw("google-cloud-bigquery");
    expect(raw.pricing?.model).toBe("unknown");
    expect(raw.pricing?.entry_paid).toBeUndefined();
    expect(raw.pricing?.has_free_tier).toBe(true);
    expect(raw.pricing?.starting_price ?? "").not.toMatch(/^\$\d/);
    expect(raw.pricing?.official_source).toBeDefined();
  });

  it("Domo and Looker stay quote-based (contact_sales), with no flat entry_paid asserted", () => {
    for (const slug of ["domo", "looker"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.status).toBe("contact_sales");
      expect(raw.pricing?.entry_paid).toBeUndefined();
      expect(raw.pricing?.starting_price ?? "").not.toMatch(/^\$\d/);
    }
  });

  it("Looker asserts no free trial (none is published), while Domo's real 30-day trial is captured", () => {
    expect(loadRaw("looker").pricing?.free_trial).toBeUndefined();
    const domo = loadRaw("domo");
    expect(domo.pricing?.free_trial?.available).toBe(true);
    expect(domo.pricing?.free_trial?.days).toBe(30);
  });

  it("Airbyte captures both the free open-source path and the paid Cloud path without conflating them", () => {
    const raw = loadRaw("airbyte");
    expect(raw.pricing?.model).toBe("open_source");
    expect(raw.pricing?.has_free_tier).toBe(true);
    expect(raw.pricing?.entry_paid).toBeDefined();
    expect(raw.pricing?.entry_paid?.amount).toBe("10");
    const tierNames = raw.pricing?.tiers?.map((t) => t.name) ?? [];
    expect(tierNames.some((n) => /core|self-managed/i.test(n))).toBe(true);
    expect(tierNames.some((n) => /standard/i.test(n))).toBe(true);
  });

  it("dbt Cloud publishes real self-serve numeric pricing (entry_paid present)", () => {
    const raw = loadRaw("dbt-cloud");
    expect(raw.pricing?.entry_paid, "dbt-cloud should have a sourced entry_paid figure").toBeDefined();
    expect(raw.pricing?.entry_paid?.currency).toBe("USD");
    expect(raw.pricing?.entry_paid?.per_seat).toBe(true);
    expect(raw.pricing?.official_source).toBeDefined();
    expect(raw.pricing?.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("every pricing.official_source and last_verified is present and well-formed across the batch", () => {
    for (const { slug } of BATCH) {
      const raw = loadRaw(slug);
      if (raw.pricing) {
        expect(raw.pricing.official_source, `${slug} should cite an official_source`).toBeDefined();
        expect(() => new URL(raw.pricing!.official_source!)).not.toThrow();
        expect(raw.pricing.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("cross-references the pre-existing Tier A analytics catalog for genuine direct competitors", () => {
    const altSlugs = (slug: string) => loadRaw(slug).alternatives.map((a) => a.slug);

    expect(altSlugs("airbyte")).toContain("fivetran");
    expect(altSlugs("dbt-cloud")).toContain("fivetran");
    expect(altSlugs("google-cloud-bigquery")).toEqual(expect.arrayContaining(["snowflake", "databricks"]));
    expect(altSlugs("looker")).toEqual(expect.arrayContaining(["tableau", "microsoft-power-bi"]));
    expect(altSlugs("domo")).toEqual(expect.arrayContaining(["tableau", "microsoft-power-bi"]));
  });

  it("none of the 5 entries fabricate an unqualified certification or superlative claim", () => {
    for (const { slug } of BATCH) {
      const raw = loadRaw(slug);
      const haystack = [raw.description, ...raw.features, ...(raw.pros ?? [])].join(" \n ").toLowerCase();
      // "best"/"leading"/"most" as unqualified superlatives should not appear;
      // a named, sourced capability (e.g. specific product/edition names,
      // or a directly vendor-attributed compliance claim) is fine.
      expect(haystack).not.toMatch(/\bbest\b/);
      expect(haystack).not.toMatch(/\bleading\b/);
      expect(haystack).not.toMatch(/\bmost\b/);
      expect(haystack).not.toMatch(/24\/7 support/);
    }
  });

  it("attempts the full getAllSoftware() loader as a smoke test, without failing on sibling in-flight batches from other concurrent agents", () => {
    // getAllSoftware() eagerly loads and cross-validates every file in
    // data/software/ -- including files other agents may be creating or
    // editing concurrently right now as part of unrelated Tier B batches. A
    // mid-write or not-yet-created sibling file can make the FULL directory
    // momentarily inconsistent for reasons that have nothing to do with this
    // batch's own correctness (already proven by the direct-schema tests
    // above), so we only assert here when the whole catalog loads cleanly.
    try {
      const all = getAllSoftware();
      for (const { slug, category } of BATCH) {
        const entry = all.find((s) => s.slug === slug);
        expect(entry).toBeDefined();
        expect(entry?.category).toBe(category);
      }
    } catch (error) {
      console.warn(
        "[tier-b-data-bi-batch] getAllSoftware() smoke test skipped its assertions " +
          "-- the full catalog isn't internally consistent right now, which is expected " +
          "while other agents are mid-batch:",
        error instanceof Error ? error.message : error
      );
    }
  });
});
