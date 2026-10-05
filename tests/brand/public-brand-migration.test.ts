import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { BRAND_COLORS, BRAND_FONT_FAMILY, SOCIAL_BRAND_VERSION } from "@/lib/brand";
import { withCurrentSocialBrand } from "@/lib/social/brand-version";
import { SITE_CANVAS_COLOR, SITE_THEME_COLOR } from "@/lib/site";

const read = (path: string) => readFileSync(path, "utf8");

describe("Miloosh public brand migration", () => {
  it("locks the redesigned visual tokens", () => {
    expect(BRAND_FONT_FAMILY).toBe("Manrope");
    expect(BRAND_COLORS).toMatchObject({
      canvas: "#f8f9f4",
      stage: "#dfe8d4",
      ink: "#173b2c",
      citrine: "#e4f267",
      logoInk: "#203a2d",
      logoPeriod: "#818d46",
    });
    expect(SITE_THEME_COLOR).toBe(SITE_CANVAS_COLOR);
    expect(SOCIAL_BRAND_VERSION).toBe("20261005-wordmark");
  });

  it("cache-busts every trusted social-card URL onto the current visual system", () => {
    const updated = withCurrentSocialBrand("https://miloosh.com/api/social/card?size=linkedin&kind=research");
    expect(updated).toContain("brand=20261005-wordmark");
    expect(withCurrentSocialBrand("https://example.com/card.png")).toBe("https://example.com/card.png");
  });

  it("removes the retired dark/blue social system from public artwork code", () => {
    const files = [
      "components/SocialImageContent.tsx",
      "components/SocialBannerContent.tsx",
      "app/api/social/card/route.tsx",
      "app/api/social/linkedin-banner/route.tsx",
      "app/api/social/banner/route.tsx",
      "app/api/social/avatar/route.tsx",
      "app/opengraph-image.tsx",
      "app/twitter-image.tsx",
      "app/software/[slug]/opengraph-image.tsx",
      "app/compare/[comparison]/opengraph-image.tsx",
      "app/category/[slug]/opengraph-image.tsx",
    ];
    const source = files.map(read).join("\n");
    expect(source).not.toContain("#09090b");
    expect(source).not.toContain("#3458a8");
    expect(source).not.toContain("loadInterFonts");
    expect(source).toContain("loadBrandFonts");
    expect(source).toContain("BRAND_COLORS");
  });

  it("uses the new wordmark in site chrome instead of the legacy image asset", () => {
    for (const file of ["components/Navbar.tsx", "components/Footer.tsx"]) {
      const source = read(file);
      expect(source).not.toContain("/logo-icon.png");
      expect(source).toContain("brand-period");
      expect(source).toContain("miloosh");
    }
  });

  it("ships reusable profile and cover art for all supported public networks", () => {
    const banner = read("app/api/social/banner/route.tsx");
    for (const channel of ["linkedin", "facebook", "x", "youtube"]) {
      expect(banner).toContain(channel);
    }
    const avatarRoute = read("app/api/social/avatar/route.tsx");
    expect(avatarRoute).toContain("logo-icon.png");
    expect(avatarRoute).not.toContain(">M</span>");

    const avatar = readFileSync("public/logo-icon.png");
    expect(avatar.readUInt32BE(16)).toBe(800);
    expect(avatar.readUInt32BE(20)).toBe(800);
    expect(avatar.length).toBeGreaterThan(1000);
    expect(statSync("public/miloosh-logo.png").size).toBeGreaterThan(1000);
  });

  it("bundles Manrope weights for generated artwork", () => {
    const loader = read("lib/social/fonts.ts");
    for (const weight of ["Regular", "SemiBold", "Bold", "ExtraBold"]) {
      expect(loader).toContain(`Manrope-${weight}.ttf`);
    }
  });
});
