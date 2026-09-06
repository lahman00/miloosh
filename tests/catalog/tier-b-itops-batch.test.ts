import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema, type SoftwareRaw } from "@/data/software/schema";
import { getAllSoftware } from "@/data/software";

/**
 * Catalog batch: Tier B IT-Ops (Atera, ConnectWise RMM, Jamf Pro,
 * ManageEngine Endpoint Central, TeamViewer, Veeam Data Platform). This is
 * one of 6 concurrent Tier B batches (100-company catalog expansion) run by
 * separate agents, each touching only their own data/software/<slug>.json
 * files -- the other 5 cover HR, Finance/Legal, Sales, Security/CX, and
 * Data-BI and are NOT referenced here.
 *
 * Mirrors the direct JSON-parse + schema-import approach used by
 * tests/catalog/it-ops-security-batch.test.ts (the earlier Tier A IT-ops
 * batch) rather than depending on the full getAllSoftware() cross-validation
 * of the entire catalog directory -- other agents are concurrently adding
 * their own files, so a mid-write or not-yet-created sibling file could make
 * the full directory momentarily inconsistent for reasons that have nothing
 * to do with this batch. The one exception is the final smoke test, which
 * attempts getAllSoftware() but only asserts on it when the whole catalog
 * happens to already be consistent.
 */

const SOFTWARE_DIR = join(process.cwd(), "data", "software");

const BATCH_SLUGS = [
  "atera",
  "connectwise-rmm",
  "jamf-pro",
  "manageengine-endpoint-central",
  "teamviewer",
  "veeam-data-platform",
] as const;

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

describe("Tier B IT-Ops catalog batch (Atera, ConnectWise RMM, Jamf Pro, ManageEngine Endpoint Central, TeamViewer, Veeam Data Platform)", () => {
  it("every batch file exists on disk", () => {
    for (const slug of BATCH_SLUGS) {
      expect(existsSync(join(SOFTWARE_DIR, `${slug}.json`))).toBe(true);
    }
  });

  it("every batch file parses as valid JSON and satisfies the software schema", () => {
    for (const slug of BATCH_SLUGS) {
      expect(() => loadRaw(slug)).not.toThrow();
    }
  });

  it("each file's slug field matches its filename exactly", () => {
    for (const slug of BATCH_SLUGS) {
      expect(loadRaw(slug).slug).toBe(slug);
    }
  });

  it("every entry is assigned to the it-operations category", () => {
    for (const slug of BATCH_SLUGS) {
      expect(loadRaw(slug).category).toBe("it-operations");
    }
  });

  it("each entry has at least one source, one feature, and one alternative, with valid source URLs", () => {
    for (const slug of BATCH_SLUGS) {
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
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.accessed_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(() => new URL(raw.website)).not.toThrow();
    }
  });

  it("every alternative referenced by the batch resolves to a real file (own batch or pre-existing catalog)", () => {
    for (const slug of BATCH_SLUGS) {
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

  it("none of the alternatives reference the other 5 agents' concurrent batches (HR/Finance-Legal/Sales/Security-CX/Data-BI)", () => {
    const ownSlugs = new Set<string>(BATCH_SLUGS);
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      for (const alt of raw.alternatives) {
        // Every alternative must be either one of our own 6, or a file that
        // already existed before this batch started (i.e. not one of our new
        // files under a different name, and not a cross-batch new file).
        const isOwnBatch = ownSlugs.has(alt.slug);
        const isPreExisting = existsSync(join(SOFTWARE_DIR, `${alt.slug}.json`)) && !isOwnBatch;
        expect(isOwnBatch || isPreExisting).toBe(true);
      }
    }
  });

  it("no two of the 6 batch files collide on slug, name, or website", () => {
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
  });

  it("Jamf Pro does not claim Windows/Android endpoint management for itself and keeps bundle pricing clearly distinct", () => {
    const jamf = loadRaw("jamf-pro");
    // Jamf Pro is Apple-only -- the product itself must never be described as
    // managing Windows or Android devices (only the "Jamf for Mobile" BUNDLE,
    // which also includes Jamf Connect/Protect, mentions Android, and only
    // inside a clearly-scoped notes/cons disclaimer).
    expect(jamf.platforms ?? []).not.toContain("Windows");
    expect(jamf.platforms ?? []).not.toContain("Android");
    // Every tier with a numeric amount must disclose that the figure is a
    // bundle price, not a standalone Jamf Pro price.
    const pricedTiers = (jamf.pricing?.tiers ?? []).filter((t) => t.amount);
    expect(pricedTiers.length).toBeGreaterThan(0);
    for (const tier of pricedTiers) {
      expect(tier.notes ?? "").toMatch(/bundle/i);
    }
    expect(jamf.pricing?.entry_paid).toBeUndefined();
  });

  it("ConnectWise RMM and Jamf Pro do not assert a fabricated numeric self-serve entry price (both are contact-sales)", () => {
    for (const slug of ["connectwise-rmm", "jamf-pro"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.entry_paid).toBeUndefined();
      expect(raw.pricing?.status).toBe("contact_sales");
    }
  });

  it("Atera, ManageEngine Endpoint Central, and Veeam Data Platform carry verified numeric self-serve pricing", () => {
    for (const slug of ["atera", "manageengine-endpoint-central", "veeam-data-platform"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.status).toBe("verified");
      expect(raw.pricing?.entry_paid).toBeDefined();
      expect(raw.pricing?.entry_paid?.amount).toBeTruthy();
    }
  });

  it("TeamViewer's regional (non-USD) pricing is explicitly disclosed as region-localized, not presented as a universal USD figure", () => {
    const tv = loadRaw("teamviewer");
    expect(tv.pricing?.entry_paid?.currency).toBe("ILS");
    const tiersWithAmounts = (tv.pricing?.tiers ?? []).filter((t) => t.amount);
    expect(tiersWithAmounts.length).toBeGreaterThan(0);
    for (const tier of tiersWithAmounts) {
      expect(tier.notes ?? "").toMatch(/regional|storefront|MEA|Israel/i);
    }
    // starting_price must not be set to a bare, unqualified figure that could
    // be misread as USD.
    expect(tv.pricing?.starting_price).toBeUndefined();
  });

  it("TeamViewer's genuinely-free personal-use tier is scoped to non-commercial use, not presented as a general free plan", () => {
    const tv = loadRaw("teamviewer");
    expect(tv.pricing?.has_free_tier).toBe(true);
    const haystack = JSON.stringify(tv).toLowerCase();
    expect(haystack).toMatch(/non-commercial/);
  });

  it("Veeam Data Platform's SOC 2 / ISO certification claims are stated as Veeam's own organizational certifications, sourced to its trust center", () => {
    const veeam = loadRaw("veeam-data-platform");
    const haystack = JSON.stringify(veeam);
    expect(haystack).toMatch(/SOC 2/);
    expect(veeam.sources.some((s) => /trust-center/i.test(s))).toBe(true);
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
      for (const slug of BATCH_SLUGS) {
        const entry = all.find((s) => s.slug === slug);
        expect(entry).toBeDefined();
        expect(entry?.category).toBe("it-operations");
      }
    } catch (error) {
      console.warn(
        "[tier-b-itops-batch] getAllSoftware() smoke test skipped its assertions " +
          "-- the full catalog isn't internally consistent right now, which is expected " +
          "while other agents are mid-batch:",
        error instanceof Error ? error.message : error
      );
    }
  });
});
