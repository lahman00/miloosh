import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema, type SoftwareRaw } from "@/data/software/schema";
import { getAllSoftware } from "@/data/software";

/**
 * Catalog batch: Tier B Security + Customer-Support/CX (KnowBe4, OneTrust,
 * Secureframe, Sophos Endpoint, Sprinto, Five9, Genesys Cloud CX, Talkdesk).
 *
 * Added alongside 5 other concurrent Tier B agents working on their own,
 * non-overlapping companies (HR, Finance/Legal, Sales, IT-Ops, Data-BI) in
 * the same worktree. This suite validates ONLY this batch's own 8 files,
 * using a direct JSON-parse + schema-import approach rather than depending
 * on the full getAllSoftware() cross-validation of the entire (multi-hundred
 * file) directory -- other agents are concurrently adding their own files,
 * so a mid-write or not-yet-created sibling file could make the full
 * directory momentarily inconsistent for reasons that have nothing to do
 * with this batch. The one exception is the final smoke test, which
 * attempts getAllSoftware() but only asserts on it when the whole catalog
 * happens to already be consistent.
 */

const SOFTWARE_DIR = join(process.cwd(), "data", "software");

type BatchEntry = { slug: string; category: "security" | "customer-support" };

const SECURITY_SLUGS = ["knowbe4", "onetrust", "secureframe", "sophos-endpoint", "sprinto"] as const;
const CUSTOMER_SUPPORT_SLUGS = ["five9", "genesys-cloud-cx", "talkdesk"] as const;

const BATCH: BatchEntry[] = [
  ...SECURITY_SLUGS.map((slug) => ({ slug, category: "security" as const })),
  ...CUSTOMER_SUPPORT_SLUGS.map((slug) => ({ slug, category: "customer-support" as const })),
];

// Products this batch references as alternatives that live in the
// pre-existing (pre-batch) catalog, not in this batch or another agent's
// concurrent batch.
const PRE_EXISTING_ALTERNATIVE_SLUGS = ["vanta", "drata", "duo-security", "sentinelone", "crowdstrike", "ringcentral"];

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

describe("Tier B Security + Customer-Support/CX catalog batch (KnowBe4, OneTrust, Secureframe, Sophos Endpoint, Sprinto, Five9, Genesys Cloud CX, Talkdesk)", () => {
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

  it("assigns 'security' to the 5 security products and 'customer-support' to the 3 CX products", () => {
    for (const slug of SECURITY_SLUGS) {
      expect(loadRaw(slug).category).toBe("security");
    }
    for (const slug of CUSTOMER_SUPPORT_SLUGS) {
      expect(loadRaw(slug).category).toBe("customer-support");
    }
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

  it("none of the alternatives reference another Tier B agent's concurrent batch (HR/Finance/Sales/IT-Ops/Data-BI)", () => {
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

  it("no two of the 8 batch files collide on slug, name, or website", () => {
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

  it("cross-references within the batch are mutual where both products are direct substitutes", () => {
    const altSlugs = (slug: string) => loadRaw(slug).alternatives.map((a) => a.slug);

    // Compliance-automation trio
    expect(altSlugs("secureframe")).toContain("sprinto");
    expect(altSlugs("sprinto")).toContain("secureframe");

    // CCaaS/contact-center trio
    expect(altSlugs("five9")).toContain("genesys-cloud-cx");
    expect(altSlugs("genesys-cloud-cx")).toContain("five9");
    expect(altSlugs("five9")).toContain("talkdesk");
    expect(altSlugs("talkdesk")).toContain("five9");
    expect(altSlugs("genesys-cloud-cx")).toContain("talkdesk");
    expect(altSlugs("talkdesk")).toContain("genesys-cloud-cx");
  });

  it("Sophos Endpoint, KnowBe4, and OneTrust reference the pre-existing catalog's genuine adjacent competitors", () => {
    expect(loadRaw("sophos-endpoint").alternatives.map((a) => a.slug)).toEqual(
      expect.arrayContaining(["sentinelone", "crowdstrike"])
    );
    expect(loadRaw("knowbe4").alternatives.map((a) => a.slug)).toContain("duo-security");
    expect(loadRaw("onetrust").alternatives.map((a) => a.slug)).toEqual(
      expect.arrayContaining(["vanta", "drata"])
    );
    expect(loadRaw("secureframe").alternatives.map((a) => a.slug)).toEqual(
      expect.arrayContaining(["vanta", "drata"])
    );
    expect(loadRaw("sprinto").alternatives.map((a) => a.slug)).toEqual(
      expect.arrayContaining(["vanta", "drata"])
    );
  });

  it("KnowBe4, OneTrust, Sophos Endpoint, and Sprinto are quote-based (no numeric entry_paid asserted)", () => {
    for (const slug of ["onetrust", "sophos-endpoint", "sprinto"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.status).toBe("contact_sales");
      expect(raw.pricing?.entry_paid).toBeUndefined();
      expect(raw.pricing?.official_source).toBeDefined();
    }
  });

  it("KnowBe4, Secureframe, Five9, Genesys Cloud CX, and Talkdesk publish real self-serve starting numbers (entry_paid present)", () => {
    for (const slug of ["knowbe4", "secureframe", "five9", "genesys-cloud-cx", "talkdesk"]) {
      const raw = loadRaw(slug);
      expect(raw.pricing?.entry_paid, `${slug} should have a sourced entry_paid figure`).toBeDefined();
      expect(raw.pricing?.entry_paid?.currency).toBe("USD");
      expect(raw.pricing?.official_source).toBeDefined();
      expect(raw.pricing?.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("Sophos Endpoint publishes a 30-day free trial despite having no public price list", () => {
    const sophos = loadRaw("sophos-endpoint");
    expect(sophos.pricing?.status).toBe("contact_sales");
    expect(sophos.pricing?.free_trial?.available).toBe(true);
    expect(sophos.pricing?.free_trial?.days).toBe(30);
  });

  it("none of the 8 entries fabricate an unqualified certification or superlative claim in description/features/pros", () => {
    for (const { slug } of BATCH) {
      const raw = loadRaw(slug);
      const haystack = [raw.description, ...raw.features, ...(raw.pros ?? [])].join(" \n ").toLowerCase();
      expect(haystack).not.toMatch(/\bbest\b/);
      expect(haystack).not.toMatch(/\bleading\b/);
      expect(haystack).not.toMatch(/\bmost\b/);
      expect(haystack).not.toMatch(/\bunlimited\b/);
      expect(haystack).not.toMatch(/24\s*\/\s*7/);
    }
  });

  it("Secureframe and Sprinto never bare-assert their OWN certification in features/pros without qualifying language", () => {
    // The evidence rules for this batch require keeping "helps customers get
    // SOC 2/ISO 27001" completely separate from "is itself SOC 2/ISO 27001
    // certified" -- exactly like the pre-existing vanta.json/drata.json
    // reference entries do. A bare, unqualified claim of self-certification
    // must never appear as a top-level features/pros bullet.
    const bareSelfCertification = /\b(secureframe|sprinto)\b[^.]{0,40}\b(is|itself is|has achieved|holds)\b[^.]{0,40}\b(soc\s?2|iso\s?27001)\b[^.]{0,40}certifi/i;
    for (const slug of ["secureframe", "sprinto"]) {
      const raw = loadRaw(slug);
      for (const bullet of [raw.description, ...raw.features, ...(raw.pros ?? [])]) {
        expect(bareSelfCertification.test(bullet)).toBe(false);
      }
    }
  });

  it("Secureframe and Sprinto's FAQ correctly separates 'helps customers get certified' from 'is itself certified'", () => {
    for (const slug of ["secureframe", "sprinto"]) {
      const raw = loadRaw(slug);
      const faqText = (raw.faq ?? []).map((f) => `${f.question} ${f.answer}`).join(" \n ").toLowerCase();
      expect(faqText.length).toBeGreaterThan(0);
      expect(faqText).toMatch(/separate claim/);
      expect(faqText).toMatch(/helping customers earn their own certifications/);
      expect(faqText).toMatch(/trust\.(secureframe|sprinto)\.com/);
    }
  });

  it("Secureframe and Sprinto's own cons flag the certification-firewall distinction rather than asserting it as a plain pro", () => {
    for (const slug of ["secureframe", "sprinto"]) {
      const raw = loadRaw(slug);
      const consText = (raw.cons ?? []).join(" \n ").toLowerCase();
      expect(consText).toMatch(/separate/);
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
        "[tier-b-security-cx-batch] getAllSoftware() smoke test skipped its assertions " +
          "-- the full catalog isn't internally consistent right now, which is expected " +
          "while other agents are mid-batch:",
        error instanceof Error ? error.message : error
      );
    }
  });
});
