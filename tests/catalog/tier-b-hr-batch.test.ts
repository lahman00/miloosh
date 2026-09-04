import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema } from "@/data/software/schema";

/**
 * Focused batch test for the 6 HR & Payroll catalog entries added in Tier B
 * of the 100-company catalog expansion (2026-09-05): Culture Amp, HiBob,
 * Lattice, Lever, Papaya Global, and Remote.
 *
 * This intentionally parses each file directly against softwareRawSchema
 * rather than going through getAllSoftware(), because getAllSoftware()
 * reads and cross-validates every file in data/software/ at once
 * (including alternative-slug resolution against the full directory).
 * This batch was written concurrently with five other agents adding their
 * own, unrelated companies to the same directory, so a directory-wide read
 * could transiently fail on files this batch has no control over. Testing
 * each of these 6 files in isolation is both sufficient for this batch's
 * own correctness and immune to that cross-batch flakiness.
 */

const SOFTWARE_DIR = join(process.cwd(), "data", "software");

const BATCH_SLUGS = [
  "culture-amp",
  "hibob",
  "lattice",
  "lever",
  "papaya-global",
  "remote",
] as const;

function loadRaw(slug: string) {
  const fullPath = join(SOFTWARE_DIR, `${slug}.json`);
  const contents = readFileSync(fullPath, "utf-8");
  const json = JSON.parse(contents);
  return softwareRawSchema.parse(json);
}

describe("HR & Payroll catalog Tier B batch (Culture Amp, HiBob, Lattice, Lever, Papaya Global, Remote)", () => {
  it("has all 6 files present and parsing as valid JSON", () => {
    for (const slug of BATCH_SLUGS) {
      expect(() => loadRaw(slug)).not.toThrow();
    }
  });

  it("has all 6 files pass the softwareRawSchema (Zod) validation used by the real loader", () => {
    for (const slug of BATCH_SLUGS) {
      const result = softwareRawSchema.safeParse(
        JSON.parse(readFileSync(join(SOFTWARE_DIR, `${slug}.json`), "utf-8"))
      );
      expect(result.success, `${slug}.json failed schema validation: ${JSON.stringify(result.success ? null : result.error.issues)}`).toBe(true);
    }
  });

  it("has category 'hr-and-payroll' on every entry", () => {
    for (const slug of BATCH_SLUGS) {
      const raw = loadRaw(slug);
      expect(raw.category).toBe("hr-and-payroll");
    }
  });

  it("has at least one source URL on every entry", () => {
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

  it("never invents a numeric price for the two vendors known to require a sales quote (Culture Amp, Lever)", () => {
    for (const slug of ["culture-amp", "lever"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.status).toBe("contact_sales");
      expect(raw.pricing?.entry_paid).toBeUndefined();
      expect(raw.pricing?.tiers ?? []).toHaveLength(0);
    }
  });

  it("marks HiBob as contact_sales (no self-serve numeric pricing published)", () => {
    const raw = loadRaw("hibob");
    expect(raw.pricing?.status).toBe("contact_sales");
    expect(raw.pricing?.entry_paid).toBeUndefined();
  });

  it("records verified, sourced starting prices for the three vendors that do publish numbers (Lattice, Papaya Global, Remote)", () => {
    for (const slug of ["lattice", "papaya-global", "remote"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.status).toBe("verified");
      expect(raw.pricing?.official_source).toBeTruthy();
      expect(raw.pricing?.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect((raw.pricing?.tiers ?? []).length).toBeGreaterThan(0);
    }
  });

  it("has every alternative slug within this batch, the pre-existing catalog, or a genuine self-reference (never a dangling reference)", () => {
    // Any file already in the repo before this batch (i.e. not one of the 6
    // this batch added) counts as "pre-existing catalog" for this check. We
    // don't assert those files' *contents* here -- only that an alternative
    // this batch points at resolves to *some* real file on disk, either one
    // of our own 6 or one that already existed.
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

  it("has no collisions across the 6 new files: unique slugs, names, and websites", () => {
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
});
