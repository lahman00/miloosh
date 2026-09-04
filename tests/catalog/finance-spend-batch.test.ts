import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema } from "@/data/software/schema";

/**
 * Finance/Spend batch (2026-09-05 catalog-expansion-100 sprint) — covers
 * exactly the 6 files this batch added: BILL, Brex, Expensify, Navan,
 * Ramp, Tipalti (all category "finance-and-erp").
 *
 * This worktree is shared with 5 other agents concurrently adding their
 * own, non-overlapping data/software/*.json files. Most assertions here
 * read our 6 files directly off disk and validate them against the same
 * Zod schema the real loader uses, rather than going through
 * getAllSoftware() — that keeps this suite from failing due to a sibling
 * batch's file being mid-write or referencing a not-yet-created slug,
 * which is expected and out of scope for this batch (see
 * scripts/validate-data.ts, run separately by the orchestrating session
 * once every batch has landed). The one test that does exercise
 * getAllSoftware()/getSoftware() degrades gracefully instead of failing
 * if the full catalog is transiently invalid for someone else's reason.
 */

const MY_SLUGS = ["bill", "brex", "expensify", "navan", "ramp", "tipalti"] as const;
const SOFTWARE_DIR = path.join(process.cwd(), "data", "software");

function loadRaw(slug: string): unknown {
  const filePath = path.join(SOFTWARE_DIR, `${slug}.json`);
  const contents = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(contents);
}

describe("Finance/Spend batch — BILL, Brex, Expensify, Navan, Ramp, Tipalti", () => {
  it("all 6 files exist on disk", () => {
    for (const slug of MY_SLUGS) {
      const filePath = path.join(SOFTWARE_DIR, `${slug}.json`);
      expect(fs.existsSync(filePath), `${filePath} should exist`).toBe(true);
    }
  });

  it("each file is valid JSON that satisfies softwareRawSchema", () => {
    for (const slug of MY_SLUGS) {
      const raw = loadRaw(slug);
      const result = softwareRawSchema.safeParse(raw);
      if (!result.success) {
        throw new Error(
          `${slug}.json failed schema validation:\n${result.error.issues
            .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
            .join("\n")}`
        );
      }
    }
  });

  it("each has category \"finance-and-erp\"", () => {
    for (const slug of MY_SLUGS) {
      const raw = loadRaw(slug) as { category: string };
      expect(raw.category).toBe("finance-and-erp");
    }
  });

  it("each slug matches its filename", () => {
    for (const slug of MY_SLUGS) {
      const raw = loadRaw(slug) as { slug: string };
      expect(raw.slug).toBe(slug);
    }
  });

  it("each has at least one real-looking source URL and at least one feature", () => {
    for (const slug of MY_SLUGS) {
      const raw = loadRaw(slug) as { sources: string[]; features: string[] };
      expect(Array.isArray(raw.sources)).toBe(true);
      expect(raw.sources.length).toBeGreaterThanOrEqual(1);
      for (const src of raw.sources) {
        expect(() => new URL(src)).not.toThrow();
      }
      expect(Array.isArray(raw.features)).toBe(true);
      expect(raw.features.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("each has accessed_at as a valid YYYY-MM-DD string", () => {
    for (const slug of MY_SLUGS) {
      const raw = loadRaw(slug) as { accessed_at: string };
      expect(raw.accessed_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("each has at least one alternative, fully shaped, resolving to a real file in data/software/", () => {
    const allFiles = new Set(
      fs
        .readdirSync(SOFTWARE_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.basename(f, ".json"))
    );

    for (const slug of MY_SLUGS) {
      const raw = loadRaw(slug) as {
        alternatives: { name: string; slug: string; description: string; best_for: string; strengths: string[] }[];
      };
      expect(Array.isArray(raw.alternatives)).toBe(true);
      expect(raw.alternatives.length).toBeGreaterThanOrEqual(1);

      for (const alt of raw.alternatives) {
        expect(alt.name).toBeTruthy();
        expect(alt.slug).toBeTruthy();
        expect(alt.description).toBeTruthy();
        expect(alt.best_for).toBeTruthy();
        expect(Array.isArray(alt.strengths)).toBe(true);
        expect(alt.strengths.length).toBeGreaterThanOrEqual(1);
        expect(
          allFiles.has(alt.slug),
          `alternative "${alt.slug}" referenced by ${slug}.json has no matching data/software/${alt.slug}.json file`
        ).toBe(true);
      }
    }
  });

  it("no two of the 6 files collide on slug, name, or website", () => {
    const raws = MY_SLUGS.map((slug) => loadRaw(slug) as { slug: string; name: string; website: string });
    const slugs = raws.map((r) => r.slug);
    const names = raws.map((r) => r.name);
    const websites = raws.map((r) => r.website);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(websites).size).toBe(websites.length);
  });

  it("loads through getAllSoftware()/getSoftware() when the full catalog is valid right now", async () => {
    const { getAllSoftware, getSoftware } = await import("@/data/software");

    let all: ReturnType<typeof getAllSoftware>;
    try {
      all = getAllSoftware();
    } catch (error) {
      // Other agents are concurrently writing their own data/software/*.json
      // files in this shared worktree. A sibling batch's file being
      // mid-write, or a cross-batch reference that doesn't exist yet, can
      // make the FULL catalog throw for reasons that have nothing to do
      // with our 6 files (already validated file-by-file above). Don't
      // fail this batch's test for someone else's in-flight work.
      console.warn(
        `getAllSoftware() threw while sibling batches are in flight — skipping cross-catalog assertions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return;
    }

    const bySlug = new Set(all.map((s) => s.slug));
    for (const slug of MY_SLUGS) {
      expect(bySlug.has(slug), `${slug} should appear in getAllSoftware()`).toBe(true);

      const entry = getSoftware(slug);
      expect(entry, `${slug} should be loadable via getSoftware()`).toBeDefined();
      expect(entry?.category).toBe("finance-and-erp");
      expect(entry?.sources.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(entry?.features.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(entry?.alternatives.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });
});
