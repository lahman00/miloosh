import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getSoftware } from "@/data/software";
import { getBuyerDeskComparisons, getBuyerDeskProducts } from "@/lib/buyer-desk-catalog";
import { getPublishedComparisonSlugs } from "@/data/comparisons";
import { BUYER_DESK_KEY, DESK_CATEGORIES, addDeskPair, categorySaved, cleanContext, cleanSaved, deskCategory, deskMotionAllowed, emptyDesk, hasDeskResearch, makeDeskBrief, parseDesk, toggleDeskProduct, validateDeskPair } from "@/lib/buyer-desk";

describe("production buyer desk", () => {
  it("uses a separate production storage namespace, not demo or analytics state", () => {
    expect(BUYER_DESK_KEY).toBe("miloosh-buyer-desk-v1");
    expect(BUYER_DESK_KEY).not.toMatch(/demo|vid|sid/);
  });
  it("allows clearing context-only research, including after the last tool is removed", () => {
    const contexts = { crm: cleanContext({ note: "Private priorities" }) };
    expect(hasDeskResearch({ ...emptyDesk(), contexts })).toBe(true);
    expect(hasDeskResearch({ ...emptyDesk(), saved: toggleDeskProduct(["close"], "close"), contexts })).toBe(true);
    expect(hasDeskResearch(parseDesk(JSON.stringify(emptyDesk())))).toBe(false);
    expect(readFileSync("components/BuyerDesk.tsx", "utf8")).toContain("{hasDeskResearch(state) &&");
  });
  it.each([null, "{broken", "null", "42", "[]", "x".repeat(8193)])("recovers malformed persisted state: %s", raw => {
    expect(parseDesk(raw)).toEqual(emptyDesk());
  });
  it("whitelists known products, deduplicates and ignores arbitrary paths", () => {
    expect(cleanSaved(["pipedrive", "pipedrive", "close", "/api/admin", "javascript:alert(1)", {}, null])).toEqual(["pipedrive", "close"]);
    expect(deskCategory("__proto__")).toBe("crm");
  });
  it("roundtrips separate category lists without discarding another list", () => {
    const state = { ...emptyDesk(), saved: ["pipedrive", "close", "todoist", "brevo"] };
    expect(categorySaved(parseDesk(JSON.stringify(state)).saved, "crm")).toEqual(["pipedrive", "close"]);
    expect(categorySaved(state.saved, "email")).toEqual(["brevo"]);
    expect(toggleDeskProduct(state.saved, "close")).toEqual(["pipedrive", "todoist", "brevo"]);
  });
  it.each([["pipedrive", "pipedrive"], ["pipedrive", "todoist"], ["bad", "close"]])("rejects unsafe comparison %s / %s", (a, b) => {
    expect(validateDeskPair(a, b)).not.toBe("");
    expect(addDeskPair(["brevo"], a, b)).toEqual(["brevo"]);
  });
  it("adds a valid pair without deleting an existing third selection or other category", () => {
    expect(addDeskPair(["nutshell", "brevo"], "pipedrive", "close")).toEqual(["nutshell", "brevo", "pipedrive", "close"]);
  });
  it("only retains answers relevant to the submitted intent, with bounded free text", () => {
    expect(cleanContext({ intent: "switch", team: "hidden default", current: " My tool ", note: "a".repeat(400) })).toMatchObject({ team: "", current: "My tool", note: "a".repeat(180) });
    expect(cleanContext({ intent: "compare", current: "hidden default" }).current).toBe("");
  });
  it("projects the nine approved starting points from canonical research only", () => {
    const products = getBuyerDeskProducts();
    expect(products).toHaveLength(9);
    expect(products.map(p => p.slug)).toEqual(DESK_CATEGORIES.flatMap(c => [...c.slugs]));
    for (const p of products) {
      const source = getSoftware(p.slug)!;
      expect(p.description).toBe(source.description);
      expect(p.bestFor).toBe(source.bestFor);
      expect(p.checkedAt).toBe(source.accessedAt);
      expect(p.features).toEqual(source.features.slice(0, 3));
      expect(p).not.toHaveProperty("affiliateUrl");
      expect(p).not.toHaveProperty("price");
    }
  });
  it("only links existing canonical comparison pages, including Pipedrive/Close", () => {
    const links = getBuyerDeskComparisons();
    expect(links.some(pair => [pair.a, pair.b].includes("pipedrive") && [pair.a, pair.b].includes("close"))).toBe(true);
    for (const pair of links) expect(getPublishedComparisonSlugs()).toContain(pair.href.replace("/compare/", ""));
  });
  it("exports only the active category and submitted context; no invented fit or fresh pricing", () => {
    const state = { ...emptyDesk(), saved: ["pipedrive", "close", "todoist"], contexts: { crm: cleanContext({ intent: "new", note: "Need a handoff" }) } };
    const brief = makeDeskBrief(state, getBuyerDeskProducts());
    expect(brief).toContain("Need a handoff");
    expect(brief).toContain("https://miloosh.com/software/pipedrive");
    expect(brief).not.toContain("https://miloosh.com/software/todoist");
    expect(brief).toContain("Team: Not specified");
    expect(brief).toContain("not a fresh vendor quote");
  });
  it.each([
    [false, false, true, true, true], [true, false, true, true, false],
    [false, true, true, true, false], [false, false, false, true, false],
    [false, false, true, false, false],
  ])("motion respects pause/reduction/visibility/intersection", (paused, reduced, visible, inView, expected) => {
    expect(deskMotionAllowed(paused, reduced, visible, inView)).toBe(expected);
  });
  it("uses scoped styles, client-only storage, escaped brief text and normal internal tracking", () => {
    const component = readFileSync("components/BuyerDesk.tsx", "utf8");
    expect(component).toContain("TrackedInternalCtaLink");
    expect(component).toContain('sourcePath="/"');
    expect(component).toContain('<pre>{briefText}</pre>');
    expect(component).not.toMatch(/dangerouslySetInnerHTML|localStorage\.clear|fetch\(|trackEvent\(/);
    expect(component).toContain("localStorage.setItem(BUYER_DESK_KEY");
    const css = readFileSync("components/BuyerDesk.module.css", "utf8");
    expect(css).toContain("prefers-reduced-motion:reduce");
    expect(css).toContain("animation-play-state: paused");
  });
});
