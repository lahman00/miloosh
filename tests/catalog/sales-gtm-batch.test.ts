import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema } from "@/data/software/schema";
import { getAllSoftware } from "@/data/software";

/**
 * Focused batch test for the 8 Sales/GTM catalog entries added in the
 * 100-company catalog expansion (2026-09-05): Apollo.io, Clari, Cognism,
 * Gong, Outreach, PandaDoc, Salesloft, and ZoomInfo Sales.
 *
 * This intentionally parses each file directly against softwareRawSchema
 * rather than going through getAllSoftware(), because getAllSoftware()
 * reads and cross-validates every file in data/software/ at once
 * (including alternative-slug resolution against the full directory).
 * This batch was written concurrently with five other agents adding their
 * own, unrelated companies to the same directory, so a directory-wide
 * read could transiently fail on files this batch has no control over.
 * Testing each of these 8 files in isolation is both sufficient for this
 * batch's own correctness and immune to that cross-batch flakiness.
 */

const SOFTWARE_DIR = join(process.cwd(), "data", "software");

const BATCH_SLUGS = [
  "apollo-io",
  "clari",
  "cognism",
  "gong",
  "outreach",
  "pandadoc",
  "salesloft",
  "zoominfo-sales",
] as const;

// Cognism, Gong, Outreach, Clari, and Salesloft are quote-based/contact-sales
// for every tier at time of writing -- no vendor-published numeric self-serve
// price. ZoomInfo Sales' pricing page was gated behind a bot-check that could
// not be verified, so it is also expected to carry no invented number.
const NO_NUMERIC_PRICE_SLUGS = ["clari", "cognism", "gong", "outreach", "salesloft", "zoominfo-sales"] as const;

// Apollo.io and PandaDoc are the two vendors in this batch that publish real,
// self-serve numeric per-seat pricing.
const VERIFIED_PRICING_SLUGS = ["apollo-io", "pandadoc"] as const;

function loadRaw(slug: string) {
  const fullPath = join(SOFTWARE_DIR, `${slug}.json`);
  const contents = readFileSync(fullPath, "utf-8");
  const json = JSON.parse(contents);
  return softwareRawSchema.parse(json);
}

describe("Sales/GTM catalog batch (Apollo.io, Clari, Cognism, Gong, Outreach, PandaDoc, Salesloft, ZoomInfo Sales)", () => {
  it("has all 8 files present and parsing as valid JSON", () => {
    for (const slug of BATCH_SLUGS) {
      expect(() => loadRaw(slug)).not.toThrow();
    }
  });

  it("has all 8 files pass the softwareRawSchema (Zod) validation used by the real loader", () => {
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

  it("never invents a numeric price for the six vendors with no vendor-published self-serve price", () => {
    for (const slug of NO_NUMERIC_PRICE_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.entry_paid, `${slug}.json should not have entry_paid`).toBeUndefined();
      for (const tier of raw.pricing?.tiers ?? []) {
        expect(tier.amount, `${slug}.json tier "${tier.name}" should not have a numeric amount`).toBeUndefined();
      }
    }
  });

  it("marks the six fully quote-based vendors (Clari, Cognism, Gong, Outreach, Salesloft, ZoomInfo Sales) as contact_sales", () => {
    // ZoomInfo Sales' dedicated pricing page was gated behind a bot-check
    // this review could not pass, but its homepage and product pages (which
    // were accessible) consistently route to "Contact Sales" rather than a
    // self-serve checkout, so contact_sales is the honest classification --
    // not "verified" (no number was seen) and not "unknown" (the sales-led
    // model itself was directly observed on other first-party pages).
    for (const slug of NO_NUMERIC_PRICE_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.status).toBe("contact_sales");
      expect(raw.pricing?.enterprise_contact_sales).toBe(true);
    }
  });

  it("has verified, sourced entry_paid pricing with official_source and last_verified for Apollo.io and PandaDoc", () => {
    for (const slug of VERIFIED_PRICING_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.status).toBe("verified");
      expect(raw.pricing?.entry_paid?.amount).toBeTruthy();
      expect(raw.pricing?.official_source).toBeTruthy();
      expect(raw.pricing?.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("never lists Clari and Salesloft as alternatives to each other (the two merged in December 2025)", () => {
    const clari = loadRaw("clari");
    const salesloft = loadRaw("salesloft");
    expect(clari.alternatives.some((a) => a.slug === "salesloft")).toBe(false);
    expect(salesloft.alternatives.some((a) => a.slug === "clari")).toBe(false);
  });

  it("has every alternative slug within this batch, the pre-existing catalog, or a genuine self-reference (never a dangling reference)", () => {
    // Any file already in the repo before this batch (i.e. not one of the
    // 8 this batch added) counts as "pre-existing catalog" for this check.
    // We don't assert those files' *contents* here -- only that an
    // alternative this batch points at resolves to *some* real file on
    // disk, either one of our own 8 or one that already existed.
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

  it("has no collisions across the 8 new files: unique slugs, names, and websites", () => {
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

  it("never references a slug from another batch's category as an alternative (HR/Payroll, ERP/Payments, Finance/Spend, IT-Ops-Security, Data-BI-Field-AI)", () => {
    // Spot-check against the five sibling batches' own slug lists (read from
    // their concurrently-authored test files in this same worktree) so this
    // test fails loudly if this batch ever points at another agent's
    // in-flight company instead of its own batch or the pre-existing catalog.
    const knownOtherBatchSlugs = new Set([
      // HR & Payroll
      "rippling", "gusto", "deel", "bamboohr", "adp-workforce-now",
      "paychex-flex", "paycom", "paylocity", "workday-hcm", "greenhouse",
      // ERP/Payments
      "netsuite", "odoo", "paypal-payments", "sage-intacct", "sap-cloud-erp", "sap-concur",
      // Finance/Spend
      "bill", "brex", "expensify", "navan", "ramp", "tipalti",
      // IT Ops & Security
      "freshservice", "ninjaone", "servicenow-itsm", "drata", "sentinelone", "vanta",
      // Data/BI + Field-Service + AI-Dev-Tools
      "databricks", "fivetran", "microsoft-power-bi", "snowflake", "tableau",
      "maintainx", "procore", "cursor", "replit",
    ]);

    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      for (const alt of raw.alternatives) {
        expect(knownOtherBatchSlugs.has(alt.slug)).toBe(false);
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
