import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema } from "@/data/software/schema";

const SOFTWARE_DIR = join(process.cwd(), "data", "software");
const BATCH = [
  "acumatica",
  "clio-manage",
  "coupa",
  "floqast",
  "microsoft-dynamics-365-business-central",
  "stampli",
  "docusign",
  "dropbox",
] as const;

function load(slug: string) {
  const raw = JSON.parse(readFileSync(join(SOFTWARE_DIR, `${slug}.json`), "utf-8"));
  return softwareRawSchema.parse(raw);
}

describe("Tier B Finance/Legal recovery batch", () => {
  it("has all 8 files and valid raw schemas", () => {
    for (const slug of BATCH) expect(() => load(slug)).not.toThrow();
  });
  it("keeps categories coherent", () => {
    for (const slug of ["acumatica", "coupa", "floqast", "microsoft-dynamics-365-business-central", "stampli"]) {
      expect(load(slug).category).toBe("finance-and-erp");
    }
    expect(load("clio-manage").category).toBe("legal");
    expect(load("docusign").category).toBe("legal");
    expect(load("dropbox").category).toBe("productivity");
  });

  it("uses first-party source URLs and no commercial ranking fields", () => {
    for (const slug of BATCH) {
      const raw = load(slug);
      expect(raw.sources.length).toBeGreaterThan(0);
      for (const source of raw.sources) expect(() => new URL(source)).not.toThrow();
      expect(raw.affiliate_url).toBeUndefined();
      expect(raw.sponsored).toBeUndefined();
      expect(raw.featured).toBeUndefined();
    }
  });

  it("has no dangling alternatives", () => {
    const slugs = new Set(readdirSync(SOFTWARE_DIR).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, "")));
    for (const slug of BATCH) {
      for (const alt of load(slug).alternatives) expect(slugs.has(alt.slug), `${slug} -> ${alt.slug}`).toBe(true);
    }
  });
  it("keeps Docusign pricing tied to the annual-commitment U.S. storefront", () => {
    const d = load("docusign");
    expect(d.pricing?.status).toBe("verified");
    expect(d.pricing?.entry_paid?.amount).toBe("11");
    expect(d.pricing?.entry_paid?.billing_period).toBe("annual");
    expect(d.pricing?.entry_paid?.annual_billing_required).toBe(true);
    expect(d.pricing?.has_free_tier).toBe(false);
  });

  it("keeps Dropbox freemium and does not invent a universal paid price", () => {
    const d = load("dropbox");
    expect(d.pricing?.status).toBe("verified");
    expect(d.pricing?.has_free_tier).toBe(true);
    expect(d.pricing?.free_plan).toBe(true);
    expect(d.pricing?.entry_paid).toBeUndefined();
    expect(d.pricing?.starting_price).toMatch(/varies by region/i);
  });

  it("has unique names, slugs, and websites within the batch", () => {
    const rows = BATCH.map(load);
    expect(new Set(rows.map(x => x.slug)).size).toBe(BATCH.length);
    expect(new Set(rows.map(x => x.name)).size).toBe(BATCH.length);
    expect(new Set(rows.map(x => x.website)).size).toBe(BATCH.length);
  });
});
