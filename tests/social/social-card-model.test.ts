import { describe, expect, it } from "vitest";
import { BRAND_COLORS } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";
import {
  buildCardCopy, compactText, SOCIAL_CARD_VERSION, versionSocialCardUrl,
} from "@/lib/social/card-model";
import { readFileSync } from "node:fs";

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}
function contrast(a: string, b: string): number {
  const l = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l[0]! + 0.05) / (l[1]! + 0.05);
}

describe("Miloosh social visual standard", () => {
  it("uses high-contrast dark ink on the approved light background", () => {
    expect(contrast(BRAND_COLORS.ink, BRAND_COLORS.canvas)).toBeGreaterThan(7);
    expect(contrast(BRAND_COLORS.muted, BRAND_COLORS.canvas)).toBeGreaterThan(4.5);
    expect(contrast(BRAND_COLORS.ink, BRAND_COLORS.citrine)).toBeGreaterThan(7);
    expect(contrast("#ffffff", BRAND_COLORS.canvas)).toBeLessThan(1.5);
  });

  it("renders the actual screenshot example as two legible product names, not a clipped paragraph", () => {
    const copy = buildCardCopy({
      kind: "comparison",
      headline: "Asana vs Basecamp: what actually differs?",
      sub: "Asana best fits: Positioned for cross-functional teams operating at any scale, from small business to enterprise. Basecamp best fits: Teams, companies, and nonprofits who want centralized project coordination instead of",
    });
    expect(copy).toMatchObject({
      kind: "comparison", badge: "COMPARISON",
      left: "Asana", right: "Basecamp",
      subtitle: "What actually differs?",
    });
    expect(JSON.stringify(copy)).not.toContain("Positioned for cross-functional");
    expect(JSON.stringify(copy)).not.toContain("instead of");
  });

  it("also parses buyer-question-first comparison copy used by the current content engine", () => {
    expect(buildCardCopy({ kind: "comparison", headline: "Should you choose Asana or Basecamp?" })).toMatchObject({
      left: "Asana", right: "Basecamp", subtitle: "Which one fits your team?",
    });
  });

  it("does not invent a comparison if the headline is a product question", () => {
    const copy = buildCardCopy({ kind: "comparison", headline: "Is Monday worth considering?" });
    expect(copy.kind).toBe("default");
    expect(copy.headline).toBe("Is Monday worth considering?");
  });

  it("never renders mid-sentence vendor descriptions as a social graphic", () => {
    const copy = buildCardCopy({
      kind: "research", headline: "How current is Asana's pricing?",
      sub: "The price might change tomorrow and this paragraph continues for another 220 characters without a complete stop or anything that could fit in a readable social card",
    });
    expect(copy.subtitle).toBe("Evidence, sources and dates — not just opinions.");
  });

  it("keeps long copy within fixed layout budgets and truncates at word boundaries", () => {
    expect(compactText("A very long headline that contains many words and goes far beyond what a social card can show", 45)).toMatch(/…$/);
    const copy = buildCardCopy({ kind: "default", headline: "W".repeat(300), sub: "Q".repeat(300) });
    expect(copy.headline.length).toBeLessThanOrEqual(88);
    expect(copy.subtitle.length).toBeLessThanOrEqual(104);
  });

  it("supports category, migration, alternatives and pricing without unsourced claims", () => {
    expect(buildCardCopy({ kind: "category", headline: "12 CRM tools, worth comparing" })).toMatchObject({ count: "12", category: "CRM" });
    expect(buildCardCopy({ kind: "switching", headline: "Moving from Asana to Basecamp? Consider migration costs." })).toMatchObject({ left: "Asana", right: "Basecamp" });
    expect(buildCardCopy({ kind: "alternatives", headline: "Asana alternatives", sub: "ClickUp (teams); Monday (small teams); Notion (docs)" }).alternatives).toEqual(["ClickUp", "Monday", "Notion"]);
    expect(buildCardCopy({ kind: "pricing", headline: "What does Monday cost?", sub: "Starting at $12/month" }).price).toBe("$12/month");
  });

  it("cache-busts only Miloosh social cards, preserving source parameters", () => {
    const raw = SITE_URL + "/api/social/card?size=linkedin&kind=comparison&headline=Asana%20vs%20Basecamp";
    const next = versionSocialCardUrl(raw)!;
    const u = new URL(next);
    expect(u.searchParams.get("v")).toBe(SOCIAL_CARD_VERSION);
    expect(u.searchParams.get("headline")).toBe("Asana vs Basecamp");
    expect(versionSocialCardUrl(next)).toBe(next);
    expect(versionSocialCardUrl("https://other.example/api/social/card?size=linkedin")).toBe("https://other.example/api/social/card?size=linkedin");
    expect(versionSocialCardUrl("https://miloosh.com/api/other?size=linkedin")).toBe("https://miloosh.com/api/other?size=linkedin");
    expect(versionSocialCardUrl(null)).toBeNull();
  });

  it("locks both social image routes to the real wordmark, Manrope and warm palette", () => {
    const card = readFileSync("app/api/social/card/route.tsx", "utf8");
    const banner = readFileSync("app/api/social/linkedin-banner/route.tsx", "utf8");
    for (const source of [card, banner]) {
      expect(source).toContain("BRAND_COLORS");
      expect(source).toContain("loadBrandFonts");
      expect(source).not.toContain("loadInterFonts");
      expect(source).not.toContain('color: "white"');
    }
    expect(card).toContain("loadCanonicalWordmarkDataUri");
    expect(card).not.toContain("loadCanonicalLogoDataUri");
    expect(card).not.toContain("SITE_THEME_COLOR");
  });
});
