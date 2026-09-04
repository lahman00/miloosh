import { describe, it, expect } from "vitest";
import { generateMetaDescription, META_DESCRIPTION_MAX_LENGTH, generateChoosingGuide } from "@/lib/generators";
import type { Software } from "@/data/software";

function software(overrides: Partial<Software>): Software {
  return {
    slug: "x",
    name: "X",
    category: "project-management",
    description: "X is a tool.",
    bestFor: "teams",
    website: "https://x.example",
    pricingUrl: "https://x.example/pricing",
    alternatives: [],
    ...overrides,
  } as Software;
}

describe("generateMetaDescription", () => {
  /**
   * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Track C real
   * finding: with the PREVIOUS (2026-08-21) version of this function, 244
   * of 247 real software pages' meta descriptions never mentioned
   * "alternative" at all — despite every one of those pages' own <title>
   * being "Best {X} Alternatives" — because the CTA carrying that word
   * only got appended when it fit, and it almost never did. Real cached
   * Search Console evidence (var/agents/gsc-opportunity-mining.json) shows
   * decent impressions on exactly these alternatives-intent queries with
   * 0 clicks. This is the permanent regression guard: the word
   * "alternative" must always appear, for every real catalog entry, full
   * stop — not "when it fits."
   */
  it("REGRESSION GUARD: every real software page's meta description mentions \"alternative\" — the 2026-08-21 version silently failed this for 244/247 pages", async () => {
    const { getAllSoftware } = await import("@/data/software");
    const failures = getAllSoftware()
      .map((s) => ({ slug: s.slug, description: generateMetaDescription(s) }))
      .filter(({ description }) => !description.toLowerCase().includes("alternative"));
    expect(failures).toEqual([]);
  });

  it("always leads with a fixed \"N {Name} alternatives compared\" prefix, never truncated away", () => {
    const s = software({ name: "Notion", description: "Notion combines docs and databases.", alternatives: [{ name: "A" } as never, { name: "B" } as never] });
    const result = generateMetaDescription(s);
    expect(result.startsWith(`2 Notion alternatives compared for ${new Date().getUTCFullYear()}: `)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
    expect(result.endsWith("…")).toBe(false);
  });

  it("never truncates a description that fits within the remaining budget after the prefix", () => {
    const description = "A".repeat(100) + " end.";
    const s = software({ description, alternatives: [{ name: "A" } as never] });
    const result = generateMetaDescription(s);
    expect(result).toBe(`1 X alternatives compared for ${new Date().getUTCFullYear()}: ${description}`);
  });

  it("truncates the description (not the prefix) at a word boundary with an ellipsis when it exceeds the remaining budget", () => {
    const description = "word ".repeat(60).trim();
    const s = software({ description, alternatives: [{ name: "A" } as never] });
    const result = generateMetaDescription(s);
    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
    expect(result.endsWith("…")).toBe(true);
    expect(result.startsWith(`1 X alternatives compared for ${new Date().getUTCFullYear()}: `)).toBe(true);
  });

  /**
   * Regression (2026-08-21 growth sprint, real finding from the full agent
   * swarm: "Meta description template truncates 84% of software pages,
   * 207/247 ending mid-sentence"): this catalog's descriptions are
   * consistently one long comma-joined sentence with no early period, so
   * truncation always lands mid-sentence — that part's unavoidable given
   * real content length, not a bug. But 34 of those 207 landed right after
   * a comma/semicolon ("...manage sales,…"), which reads worse than
   * landing on a plain word — that part is a real, fixable defect.
   */
  it("never leaves a dangling comma/semicolon right before the ellipsis when truncating", () => {
    const description =
      "HubSpot CRM is a customer-relationship platform where businesses store contact and company data, track deals through a sales pipeline, and manage sales, marketing, and service activity, with AI assistance built in.";
    const s = software({ description, alternatives: [{ name: "A" } as never] });
    const result = generateMetaDescription(s);
    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
    expect(result.endsWith("…")).toBe(true);
    expect(result).toMatch(/[^,;:]…$/);
  });
});

describe("generateChoosingGuide (Operation First Click, 2026-08-14: real per-alternative data instead of fixed boilerplate)", () => {
  it("names each real listed alternative and its own sourced bestFor text verbatim", () => {
    const s = software({
      name: "Sprout Social",
      alternatives: [
        { name: "Hootsuite", slug: "hootsuite", description: "d", bestFor: "Social media managers and enterprises.", strengths: ["a"] },
        { name: "Buffer", slug: "buffer", description: "d", bestFor: "Creators and small businesses.", strengths: ["a"] },
      ],
    });
    const result = generateChoosingGuide(s);
    expect(result).toContain("Hootsuite (Social media managers and enterprises)");
    expect(result).toContain("Buffer (Creators and small businesses)");
    expect(result).toContain("Sprout Social");
  });

  it("never lowercases bestFor's first letter — regression: comparison.ts hit this exact bug when a product's own name opens the sentence (e.g. 'HubSpot positions...' -> 'hubSpot positions...')", () => {
    const s = software({
      alternatives: [{ name: "HubSpot", slug: "hubspot", description: "d", bestFor: "HubSpot positions itself for growing teams.", strengths: ["a"] }],
    });
    const result = generateChoosingGuide(s);
    expect(result).toContain("HubSpot positions itself for growing teams");
    expect(result).not.toContain("hubSpot positions");
  });

  it("falls back to the generic guidance only when there are genuinely no alternatives on record", () => {
    const s = software({ alternatives: [] });
    const result = generateChoosingGuide(s);
    expect(result).toContain("Start with the workflow you need to improve");
  });

  it("still includes the platforms note when platforms are set", () => {
    const s = software({ platforms: ["Web", "macOS"], alternatives: [{ name: "A", slug: "a", description: "d", bestFor: "teams", strengths: ["x"] }] });
    const result = generateChoosingGuide(s);
    expect(result).toContain("Web, macOS");
  });
});
