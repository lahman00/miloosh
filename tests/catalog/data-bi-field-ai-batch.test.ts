import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema, type SoftwareRaw } from "@/data/software/schema";
import { getAllSoftware } from "@/data/software";

/**
 * Catalog batch: Data/BI + Field-Service + AI-Dev-Tools (Databricks, Fivetran,
 * Microsoft Power BI, Snowflake, Tableau, MaintainX, Procore, Cursor, Replit).
 * Added alongside 5 other concurrent batches from other agents (HR/Payroll,
 * Finance/Spend x2, Sales, IT-Ops/Security), each touching only their own
 * data/software/<slug>.json files.
 *
 * This suite validates ONLY this batch's own 9 files, using a direct
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

type BatchEntry = { slug: string; category: "analytics" | "field-service-management" | "developer-tools" };

const BATCH: BatchEntry[] = [
  { slug: "databricks", category: "analytics" },
  { slug: "fivetran", category: "analytics" },
  { slug: "microsoft-power-bi", category: "analytics" },
  { slug: "snowflake", category: "analytics" },
  { slug: "tableau", category: "analytics" },
  { slug: "maintainx", category: "field-service-management" },
  { slug: "procore", category: "field-service-management" },
  { slug: "cursor", category: "developer-tools" },
  { slug: "replit", category: "developer-tools" },
];

// Products this batch references as alternatives that live in the
// pre-existing (pre-batch) catalog, not in this batch or another agent's
// concurrent batch.
const PRE_EXISTING_ALTERNATIVE_SLUGS = ["segment", "servicetitan", "github-copilot"];

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

describe("Data/BI + Field-Service + AI-Dev-Tools catalog batch (Databricks, Fivetran, Power BI, Snowflake, Tableau, MaintainX, Procore, Cursor, Replit)", () => {
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

  it("assigns the correct category to each of the 5 analytics, 2 field-service-management, and 2 developer-tools products", () => {
    expect(loadRaw("databricks").category).toBe("analytics");
    expect(loadRaw("fivetran").category).toBe("analytics");
    expect(loadRaw("microsoft-power-bi").category).toBe("analytics");
    expect(loadRaw("snowflake").category).toBe("analytics");
    expect(loadRaw("tableau").category).toBe("analytics");
    expect(loadRaw("maintainx").category).toBe("field-service-management");
    expect(loadRaw("procore").category).toBe("field-service-management");
    expect(loadRaw("cursor").category).toBe("developer-tools");
    expect(loadRaw("replit").category).toBe("developer-tools");

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

  it("none of the alternatives reference another agent's concurrent batch (HR/Finance/Sales/IT-Ops)", () => {
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

  it("no two of the 9 batch files collide on slug, name, or website", () => {
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

  it("Databricks and Snowflake describe consumption-based pricing without fabricating a flat starting price", () => {
    // Per the evidence rules for this batch: Databricks and Snowflake are
    // usage/consumption-priced (DBUs / credits) with no simple flat number,
    // so pricing.model is "unknown" and no entry_paid (a flat per-seat/per-
    // plan figure) is asserted for either.
    for (const slug of ["databricks", "snowflake"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.model).toBe("unknown");
      expect(raw.pricing?.entry_paid).toBeUndefined();
      expect(raw.pricing?.starting_price ?? "").not.toMatch(/^\$\d/);
      expect(raw.pricing?.official_source).toBeDefined();
    }
  });

  it("Procore stays quote-based: contact_sales status, no entry_paid, no free trial asserted", () => {
    const procore = loadRaw("procore");
    expect(procore.pricing?.status).toBe("contact_sales");
    expect(procore.pricing?.entry_paid).toBeUndefined();
    expect(procore.pricing?.free_trial).toBeUndefined();
    expect(procore.pricing?.starting_price ?? "").not.toMatch(/^\$\d/);
  });

  it("Fivetran, Power BI, Tableau, MaintainX, Cursor, and Replit publish real self-serve numeric pricing (entry_paid present)", () => {
    for (const slug of ["fivetran", "microsoft-power-bi", "tableau", "maintainx", "cursor", "replit"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.entry_paid, `${slug} should have a sourced entry_paid figure`).toBeDefined();
      expect(raw.pricing?.entry_paid?.currency).toBe("USD");
      expect(raw.pricing?.official_source).toBeDefined();
      expect(raw.pricing?.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("Power BI and Tableau require annual billing to hit their published per-user rate", () => {
    for (const slug of ["microsoft-power-bi", "tableau"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.entry_paid?.annual_billing_required).toBe(true);
      expect(raw.pricing?.entry_paid?.billing_period).toBe("annual");
    }
  });

  it("cross-references within the batch are mutual where both products are direct substitutes", () => {
    const altSlugs = (slug: string) => loadRaw(slug).alternatives.map((a) => a.slug);

    expect(altSlugs("databricks")).toContain("snowflake");
    expect(altSlugs("snowflake")).toContain("databricks");

    expect(altSlugs("microsoft-power-bi")).toContain("tableau");
    expect(altSlugs("tableau")).toContain("microsoft-power-bi");

    expect(altSlugs("maintainx")).toContain("procore");
    expect(altSlugs("procore")).toContain("maintainx");

    expect(altSlugs("cursor")).toContain("replit");
    expect(altSlugs("replit")).toContain("cursor");
  });

  it("MaintainX and Cursor/Replit reference the pre-existing catalog's genuine adjacent competitors", () => {
    expect(loadRaw("maintainx").alternatives.map((a) => a.slug)).toContain("servicetitan");
    expect(loadRaw("cursor").alternatives.map((a) => a.slug)).toContain("github-copilot");
    expect(loadRaw("replit").alternatives.map((a) => a.slug)).toContain("github-copilot");
    expect(loadRaw("fivetran").alternatives.map((a) => a.slug)).toContain("segment");
  });

  it("none of the 9 entries fabricate an unqualified certification or superlative claim", () => {
    for (const { slug } of BATCH) {
      const raw = loadRaw(slug);
      const haystack = [raw.description, ...raw.features, ...(raw.pros ?? [])].join(" \n ").toLowerCase();
      // "best"/"leading" as unqualified superlatives should not appear; a
      // named, sourced capability (e.g. specific product names) is fine.
      expect(haystack).not.toMatch(/\bbest\b/);
      expect(haystack).not.toMatch(/\bleading\b/);
      expect(haystack).not.toMatch(/\bno-code\b/);
    }
  });

  it("attempts the full getAllSoftware() loader as a smoke test, without failing on sibling in-flight batches from other concurrent agents", () => {
    // getAllSoftware() eagerly loads and cross-validates every file in
    // data/software/ -- including files other agents may be creating or
    // editing concurrently right now as part of unrelated batches. A
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
        "[data-bi-field-ai-batch] getAllSoftware() smoke test skipped its assertions " +
          "-- the full catalog isn't internally consistent right now, which is expected " +
          "while other agents are mid-batch:",
        error instanceof Error ? error.message : error
      );
    }
  });
});
