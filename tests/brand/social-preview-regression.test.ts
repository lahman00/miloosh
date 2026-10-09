import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("warm Miloosh social and browser identity", () => {
  it("keeps the canonical logo, fonts and theme consistent with the site", () => {
    expect(read("lib/brand.ts")).toContain('canvas: "#f8f9f4"');
    expect(read("lib/brand.ts")).toContain('BRAND_FONT_FAMILY = "Manrope"');
    expect(read("lib/site.ts")).toContain('SITE_THEME_COLOR = "#f8f9f4"');
    const logo = read("lib/social/logo.ts");
    expect(logo).toContain("loadCanonicalWordmarkDataUri");
    expect(logo).toContain("wordmarkWidthForHeight");
    expect(logo).toContain("loadCanonicalAvatarDataUri");
    const fonts = read("lib/social/fonts.ts");
    expect(fonts).toContain("loadBrandFonts");
    // Existing social publishing routes still get their original font loader.
    expect(fonts).toContain("loadInterFonts");
    for (const weight of ["Regular", "SemiBold", "Bold", "ExtraBold"]) {
      expect(existsSync(`assets/fonts/Manrope-${weight}.ttf`)).toBe(true);
    }
  });

  it("keeps public root, category, software and comparison OG previews in the approved theme", () => {
    for (const path of [
      "app/opengraph-image.tsx", "app/twitter-image.tsx",
      "app/category/[slug]/opengraph-image.tsx",
      "app/software/[slug]/opengraph-image.tsx",
      "app/compare/[comparison]/opengraph-image.tsx",
    ]) {
      const source = read(path);
      expect(source).toContain("loadBrandFonts");
      expect(source).toContain("loadCanonicalWordmarkDataUri");
      expect(source).not.toContain("loadInterFonts");
    }
    const content = read("components/SocialImageContent.tsx");
    expect(content).toContain("BRAND_COLORS.canvas");
    expect(content).toContain("wordmarkWidthForHeight");
  });

  it("uses the canonical square logo for both application icons", () => {
    for (const path of ["app/icon.tsx", "app/apple-icon.tsx"]) {
      expect(read(path)).toContain("loadCanonicalAvatarDataUri");
    }
    expect(read("app/manifest.ts")).toContain("SITE_THEME_COLOR");
  });
});
