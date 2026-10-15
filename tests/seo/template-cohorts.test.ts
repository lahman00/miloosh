import { describe, expect, it } from "vitest";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getAllSoftware } from "@/data/software";
import cohortFile from "@/data/seo/template-cohorts.json";
import { isProfileTemplateV2 } from "@/lib/template-cohorts";
import { buildTemplateCohorts, type ProtectionRow, type TemplateCohorts } from "@/lib/template-cohorts-build";

const row = (overrides: Partial<ProtectionRow>): ProtectionRow => ({ kind: "software", slug: "a", verdict: "EDITABLE", sources: [], eligibleAfter: null, softwareSlugs: ["a"], ...overrides });
const meta = { generatedAt: "2026-10-12T00:00:00.000Z", baseSha: "abc", holdUntil: "2026-11-04" };

describe("buildTemplateCohorts", () => {
  it("separates editable pages from held ones per page kind and keeps the reason a page is held", () => {
    const cohorts = buildTemplateCohorts(
      [
        row({ slug: "b" }),
        row({ slug: "a" }),
        row({ slug: "c", verdict: "OBSERVATION_WINDOW", sources: ["release-observation"], eligibleAfter: "2026-11-04", softwareSlugs: ["c"] }),
        row({ kind: "compare", slug: "a-vs-b", softwareSlugs: ["a", "b"] }),
        row({ kind: "compare", slug: "c-vs-d", verdict: "PROTECTED", sources: ["comparison-quality-cohort"], softwareSlugs: ["c", "d"] }),
        row({ kind: "category", slug: "crm" }),
        row({ kind: "home", slug: null }),
      ],
      meta,
    );
    expect(cohorts.software.editable).toEqual(["a", "b"]);
    expect(cohorts.software.held).toEqual({ c: { verdict: "OBSERVATION_WINDOW", sources: ["release-observation"], eligibleAfter: "2026-11-04" } });
    expect(cohorts.comparisons.editable).toEqual(["a-vs-b"]);
    expect(cohorts.comparisons.held).toEqual({ "c-vs-d": { verdict: "PROTECTED", sources: ["comparison-quality-cohort"], eligibleAfter: null } });
    expect(cohorts.productsSharedWithHeldPages).toEqual(["c", "d"]);
    expect(cohorts).toMatchObject(meta);
  });

  it("holds a page whose protection could not be read, rather than treating it as editable", () => {
    const cohorts = buildTemplateCohorts([row({ slug: "x", verdict: "UNKNOWN" }), row({ slug: "y", verdict: "IN_FLIGHT" })], meta);
    expect(cohorts.software.editable).toEqual([]);
    expect(Object.keys(cohorts.software.held)).toEqual(["x", "y"]);
  });

  it("lists a product once even when several held pages use it", () => {
    const cohorts = buildTemplateCohorts(
      [row({ slug: "p", verdict: "PROTECTED", softwareSlugs: ["p"] }), row({ kind: "compare", slug: "p-vs-q", verdict: "PROTECTED", softwareSlugs: ["p", "q"] })],
      meta,
    );
    expect(cohorts.productsSharedWithHeldPages).toEqual(["p", "q"]);
  });
});

describe("the committed template cohort file", () => {
  const cohorts = cohortFile as TemplateCohorts;
  const software = getAllSoftware().map((s) => s.slug);
  const comparisons = PUBLISHED_COMPARISONS.map(([a, b]) => getComparisonSlug(a, b));

  const hint = "Regenerate with: npm run seo:template-cohorts -- --base <the commit production runs>";

  it("covers every published software page and comparison exactly once, so a new or removed page is a visible gap", () => {
    const listed = (kind: TemplateCohorts["software"]) => [...kind.editable, ...Object.keys(kind.held)];
    for (const [label, published, kind] of [["software", software, cohorts.software], ["comparisons", comparisons, cohorts.comparisons]] as const) {
      const inFile = new Set(listed(kind));
      expect(published.filter((slug) => !inFile.has(slug)), `${label} not in the cohort file. ${hint}`).toEqual([]);
      expect([...inFile].filter((slug) => !published.includes(slug)), `${label} in the cohort file but no longer published. ${hint}`).toEqual([]);
      expect(listed(kind).length, `${label} listed more than once`).toBe(inFile.size);
    }
  });

  it("lists every product of a held page as shared, so editing that product's data is recognised as touching a held page", () => {
    const shared = new Set(cohorts.productsSharedWithHeldPages);
    for (const slug of Object.keys(cohorts.software.held)) expect(shared.has(slug), slug).toBe(true);
    for (const [a, b] of PUBLISHED_COMPARISONS) {
      if (getComparisonSlug(a, b) in cohorts.comparisons.held) {
        expect(shared.has(a), a).toBe(true);
        expect(shared.has(b), b).toBe(true);
      }
    }
  });

  it("records when it was generated and from which production commit", () => {
    expect(cohorts.baseSha).toMatch(/^[0-9a-f]{40}$/);
    expect(Date.parse(cohorts.generatedAt)).not.toBeNaN();
    expect(cohorts.holdUntil).toBe("2026-11-04");
  });
});

describe("isProfileTemplateV2", () => {
  const cohorts = cohortFile as TemplateCohorts;

  it("is true for an editable profile and false for a held or unknown one", () => {
    expect(isProfileTemplateV2(cohorts.software.editable[0]!)).toBe(true);
    expect(isProfileTemplateV2(Object.keys(cohorts.software.held)[0]!)).toBe(false);
    expect(isProfileTemplateV2("not-a-product")).toBe(false);
  });
});
