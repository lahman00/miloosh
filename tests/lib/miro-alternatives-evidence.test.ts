import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { generateFaq, generateMetaDescription, META_DESCRIPTION_MAX_LENGTH } from "@/lib/generators";

const EXPECTED = ["figjam", "mural", "lucidspark", "whimsical", "lucidchart"];
const NEW_PROFILES = ["figjam", "mural", "lucidspark"];
const VENDOR_HOSTS: Record<string, string> = {
  figjam: "figma.com",
  mural: "mural.co",
  lucidspark: "lucid.co",
  whimsical: "whimsical.com",
  lucidchart: "lucid.co",
};

describe("Miro alternatives: sourced, editorially independent selection", () => {
  const miro = getSoftware("miro");

  it("lists five distinct, directly relevant alternatives in editorial order", () => {
    expect(miro).toBeDefined();
    const slugs = miro!.alternatives.map((alt) => alt.slug);
    expect(slugs).toEqual(EXPECTED);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).not.toContain("novastart"); // Product has not been independently verified.
    expect(slugs).not.toContain("figma"); // FigJam is the dedicated whiteboard, not Figma Design.
  });

  it("resolves every alternative to a product with official vendor evidence", () => {
    for (const alt of miro!.alternatives) {
      const product = getSoftware(alt.slug);
      expect(product, alt.slug).toBeDefined();
      expect(product!.name).toBe(alt.name);
      expect(alt.strengths.length).toBeGreaterThanOrEqual(2);
      expect(product!.sources.some((source) => new URL(source).hostname.endsWith(VENDOR_HOSTS[alt.slug]))).toBe(true);
      expect(miro!.sources.some((source) => new URL(source).hostname.endsWith(VENDOR_HOSTS[alt.slug]))).toBe(true);
    }
  });

  it("dates new vendor records and never adds unsupported commercial claims", () => {
    for (const slug of NEW_PROFILES) {
      const product = getSoftware(slug)!;
      expect(product.accessedAt).toBe("2026-10-22");
      expect(product.sources.length).toBeGreaterThanOrEqual(2);
      expect(product.affiliateUrl).toBeUndefined();
      expect(product.sponsored).toBeUndefined();
      expect(product.featured).toBeUndefined();
      expect(product.pricing).toBeUndefined(); // No prices inferred from marketing pages.
    }
  });

  it("keeps the Miro SEO summary accurate and within snippet limits", () => {
    expect(miro!.accessedAt).toBe("2026-10-23");
    const meta = generateMetaDescription(miro!);
    expect(meta.startsWith("5 Miro alternatives compared:")).toBe(true);
    expect(meta.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
  });

  it("states Miro migration limits rather than promising a lossless import", () => {
    const faq = generateFaq(miro!);
    const migration = faq.find((item) => item.question.includes("Whimsical"));
    expect(migration?.answer).toContain("images");
    expect(migration?.answer).toContain("comments");
    expect(miro!.sources).toContain("https://whimsical.com/learn/imports-exports/miro-to-whimsical");
  });
});
