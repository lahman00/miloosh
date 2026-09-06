import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { softwareRawSchema } from "@/data/software/schema";

const DIR = join(process.cwd(), "data", "software");
const SLUGS = [
  "aircall", "birdeye", "entrata", "yardi-breeze", "rent-manager",
  "workiz", "fieldedge", "samsara", "motive", "verizon-connect",
  "geotab", "azuga-fleet", "windsurf", "lovable", "mycase",
] as const;

const FLEET = ["samsara", "motive", "verizon-connect", "geotab", "azuga-fleet"] as const;
const QUOTE_BASED = [
  "birdeye", "entrata", "rent-manager", "workiz", "fieldedge",
  "samsara", "motive", "verizon-connect", "geotab",
] as const;

function load(slug: string) {
  return softwareRawSchema.parse(JSON.parse(readFileSync(join(DIR, `${slug}.json`), "utf8")));
}

describe("Tier C catalog expansion", () => {
  it("contains all 15 approved Tier C records with valid schemas", () => {
    expect(SLUGS).toHaveLength(15);
    for (const slug of SLUGS) expect(() => load(slug)).not.toThrow();
  });

  it("uses coherent categories", () => {
    for (const slug of FLEET) expect(load(slug).category).toBe("fleet-management");
    expect(load("aircall").category).toBe("communication");
    expect(load("birdeye").category).toBe("marketing");
    for (const slug of ["entrata", "yardi-breeze", "rent-manager"]) expect(load(slug).category).toBe("property-management");
    for (const slug of ["workiz", "fieldedge"]) expect(load(slug).category).toBe("field-service-management");
    for (const slug of ["windsurf", "lovable"]) expect(load(slug).category).toBe("developer-tools");
    expect(load("mycase").category).toBe("legal");
  });

  it("has source coverage and preserves editorial independence", () => {
    for (const slug of SLUGS) {
      const raw = load(slug);
      expect(raw.sources.length).toBeGreaterThan(0);
      for (const source of raw.sources) expect(() => new URL(source)).not.toThrow();
      expect(raw.affiliate_url).toBeUndefined();
      expect(raw.sponsored).toBeUndefined();
      expect(raw.featured).toBeUndefined();
    }
  });

  it("has no dangling alternative references", () => {
    const all = new Set(readdirSync(DIR).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, "")));
    for (const slug of SLUGS) for (const alt of load(slug).alternatives) expect(all.has(alt.slug), `${slug} -> ${alt.slug}`).toBe(true);
  });

  it("does not invent numeric pricing for quote-based products", () => {
    for (const slug of QUOTE_BASED) {
      const p = load(slug).pricing;
      expect(p?.status).toBe("contact_sales");
      expect(p?.entry_paid).toBeUndefined();
    }
  });

  it("retains verified published entry prices where first-party pages expose them", () => {
    expect(load("aircall").pricing?.entry_paid?.amount).toBe("30");
    expect(load("yardi-breeze").pricing?.entry_paid?.amount).toBe("1");
    expect(load("azuga-fleet").pricing?.entry_paid?.amount).toBe("25");
    expect(load("windsurf").pricing?.entry_paid?.amount).toBe("20");
    expect(load("lovable").pricing?.entry_paid?.amount).toBe("25");
    expect(load("mycase").pricing?.entry_paid?.amount).toBe("50");
  });

  it("records the Windsurf rename without creating a second product", () => {
    const w = load("windsurf");
    expect(w.name).toMatch(/Windsurf/);
    expect(w.name).toMatch(/Devin Desktop/);
  });

  it("has unique slugs, names, and websites and reaches 354 catalog files", () => {
    const rows = SLUGS.map(load);
    expect(new Set(rows.map(x => x.slug)).size).toBe(15);
    expect(new Set(rows.map(x => x.name)).size).toBe(15);
    expect(new Set(rows.map(x => x.website)).size).toBe(15);
    expect(readdirSync(DIR).filter(f => f.endsWith(".json")).length).toBe(354);
  });
});
