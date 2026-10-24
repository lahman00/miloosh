import { describe, expect, it } from "vitest";
import hold from "@/data/seo/price-label-hold.json";
import { COMPARISON_V2_WAVE } from "@/data/seo/comparison-waves";
import { auditComparisonTemplateBuilds, isComparisonTemplateFile, routeToUrl } from "@/lib/growth-agents/comparison-template-render-audit";
import { SHA, U, makeProtection, signal } from "./fixtures";

const page = (body: string, head = "<title>T</title>") => `<html><head>${head}</head><body>${body}</body></html>`;
const SPONSORED = '<a href="https://partner.example/x" rel="sponsored noopener">Visit</a>';

function builds() {
  const before = new Map<string, string>();
  for (let i = 0; i < 1700; i += 1) before.set(`filler-${i}.html`, page(`filler ${i}`));
  for (const slug of hold.heldSoftware) before.set(`software/${slug}.html`, page(`held ${slug}`));
  for (const slug of COMPARISON_V2_WAVE) before.set(`compare/${slug}.html`, page(`old ${slug} ${SPONSORED}`));
  before.set("software/callrail.html", page("callrail $45"));
  before.set("research/saas-pricing-pressure-index-2026.html", page("index 34"));
  const after = new Map(before);
  for (const slug of COMPARISON_V2_WAVE) after.set(`compare/${slug}.html`, page(`new ${slug} verdict table ${SPONSORED}`));
  after.set("software/callrail.html", page("callrail $50"));
  after.set("research/saas-pricing-pressure-index-2026.html", page("index 34 updated"));
  return { before, after };
}

type Input = Parameters<typeof auditComparisonTemplateBuilds>[0];
type Mutable = Omit<Input, "before" | "after"> & { before: Map<string, string>; after: Map<string, string> };
const base = (extra: Partial<Input> = {}): Mutable => {
  const { before, after } = builds();
  return {
    before,
    after,
    baseCheckoutSha: "b".repeat(40),
    candidateCheckoutSha: SHA,
    baseClean: true,
    candidateClean: true,
    baseSha: "b".repeat(40),
    headSha: SHA,
    protection: makeProtection([signal({ urls: [U("/compare/some-held-vs-page")] })]),
    waveSlugs: COMPARISON_V2_WAVE,
    derivedRoutes: new Set(["software/callrail.html"]),
    ...extra,
  } as Mutable;
};

describe("auditComparisonTemplateBuilds", () => {
  it("passes when only the wave and the pages that render corrected data changed", () => {
    const audit = auditComparisonTemplateBuilds(base());
    expect(audit.errors).toEqual([]);
    expect(audit.ok).toBe(true);
    expect(audit.wavePagesChanged).toHaveLength(COMPARISON_V2_WAVE.length);
    expect(audit.derivedPagesChanged).toEqual(["research/saas-pricing-pressure-index-2026.html", "software/callrail.html"]);
    expect(audit.heldProfilesUnchanged).toBe(hold.heldSoftware.length);
  });

  it("fails when a protected page changes", () => {
    const input = base({ protection: makeProtection([signal({ urls: [U("/compare/held-a-vs-b")] })]) });
    input.before.set("compare/held-a-vs-b.html", page("held"));
    input.after.set("compare/held-a-vs-b.html", page("held but changed"));
    const audit = auditComparisonTemplateBuilds(input);
    expect(audit.ok).toBe(false);
    expect(audit.errors.join("|")).toContain("HELD_PAGE_CHANGED: compare/held-a-vs-b.html");
  });

  it("fails when a held profile changes even if protection does not list it", () => {
    const input = base();
    const slug = hold.heldSoftware[0]!;
    input.after.set(`software/${slug}.html`, page("changed"));
    expect(auditComparisonTemplateBuilds(input).errors.join("|")).toContain(`HELD_PAGE_CHANGED: software/${slug}.html`);
  });

  it("fails when a held page that lists a corrected product (its starting price) changes", () => {
    const input = base({ protection: makeProtection([signal({ urls: [U("/software/ringcentral")] })]) });
    input.before.set("software/ringcentral.html", page("alternatives: KrispCall $12/month"));
    input.after.set("software/ringcentral.html", page("alternatives: KrispCall $12/user/month (billed annually)"));
    const audit = auditComparisonTemplateBuilds(input);
    expect(audit.ok).toBe(false);
    expect(audit.errors.join("|")).toContain("HELD_PAGE_CHANGED: software/ringcentral.html (PROTECTED)");
  });

  it("fails when an editable page outside the reviewed scope changes", () => {
    const input = base();
    input.after.set("filler-7.html", page("quietly changed"));
    expect(auditComparisonTemplateBuilds(input).errors.join("|")).toContain("UNEXPECTED_RENDERED_CHANGE: filler-7.html");
  });

  it("fails when a wave page is protected or in flight", () => {
    const wave = COMPARISON_V2_WAVE[0]!;
    const audit = auditComparisonTemplateBuilds(base({ protection: makeProtection([signal({ kind: "IN_FLIGHT", urls: [U(`/compare/${wave}`)] })]) }));
    expect(audit.errors.join("|")).toContain(`WAVE_PAGE_NOT_EDITABLE: ${wave}`);
  });

  it("fails when a wave page did not change, so a gated page cannot silently drop out", () => {
    const input = base();
    const wave = COMPARISON_V2_WAVE[1]!;
    input.after.set(`compare/${wave}.html`, input.before.get(`compare/${wave}.html`)!);
    expect(auditComparisonTemplateBuilds(input).errors.join("|")).toContain(`WAVE_PAGE_UNCHANGED: compare/${wave}.html`);
  });

  it("fails when an affiliate link is removed, altered or added", () => {
    const wave = COMPARISON_V2_WAVE[0]!;
    const removed = base();
    removed.after.set(`compare/${wave}.html`, page("no link"));
    expect(auditComparisonTemplateBuilds(removed).errors.join("|")).toContain("LINK_REMOVED_OR_ALTERED");
    const altered = base();
    altered.after.set(`compare/${wave}.html`, page('<a href="https://other.example/x" rel="sponsored noopener">Visit</a>'));
    expect(auditComparisonTemplateBuilds(altered).errors.join("|")).toContain("LINK_REMOVED_OR_ALTERED");
    const added = base();
    added.after.set(`compare/${wave}.html`, page(`${SPONSORED}<a href="https://new.example" rel="sponsored">More</a>`));
    expect(auditComparisonTemplateBuilds(added).errors.join("|")).toContain("AFFILIATE_LINK_ADDED");
    // Repeating a sponsored destination the page already had is allowed (the vendor-link row); a different one is not.
    const repeated = base();
    repeated.after.set(`compare/${wave}.html`, page(`${SPONSORED}${SPONSORED}`));
    expect(auditComparisonTemplateBuilds(repeated).errors).toEqual([]);
    const lookalike = base();
    lookalike.after.set(`compare/${wave}.html`, page(`${SPONSORED}<a href="https://partner.example/x2" rel="sponsored noopener">Visit</a>`));
    expect(auditComparisonTemplateBuilds(lookalike).errors.join("|")).toContain("AFFILIATE_LINK_ADDED");
    const official = base();
    official.after.set(`compare/${wave}.html`, page(`${SPONSORED}<a href="https://vendor.example/pricing" rel="nofollow noopener">Official pricing</a>`));
    expect(auditComparisonTemplateBuilds(official).ok).toBe(true);
  });

  it("allows one added plain button on a wave page but never a changed, submit or extra button, or a button elsewhere", () => {
    const wave = COMPARISON_V2_WAVE[0]!;
    const gate = '<button type="button" class="x">I would use this</button>';
    const ok = base();
    ok.before.set(`compare/${wave}.html`, page(`old ${SPONSORED}<button type="button" class="old">Share</button>`));
    ok.after.set(`compare/${wave}.html`, page(`new ${SPONSORED}<button type="button" class="old">Share</button>${gate}`));
    expect(auditComparisonTemplateBuilds(ok).errors).toEqual([]);
    const changed = base();
    changed.before.set(`compare/${wave}.html`, page(`old ${SPONSORED}<button type="button" class="old">Share</button>`));
    changed.after.set(`compare/${wave}.html`, page(`new ${SPONSORED}<button type="button" class="other">Share</button>`));
    expect(auditComparisonTemplateBuilds(changed).errors.join("|")).toContain("BUTTON_ATTRIBUTES_CHANGED");
    const submit = base();
    submit.after.set(`compare/${wave}.html`, page(`new ${SPONSORED}<button type="submit">Go</button>`));
    expect(auditComparisonTemplateBuilds(submit).errors.join("|")).toContain("BUTTON_ADDED_OUTSIDE_SCOPE");
    const two = base();
    two.after.set(`compare/${wave}.html`, page(`new ${SPONSORED}${gate}${gate}`));
    expect(auditComparisonTemplateBuilds(two).errors.join("|")).toContain("BUTTON_ADDED_OUTSIDE_SCOPE");
    const elsewhere = base();
    elsewhere.after.set("software/callrail.html", page(`callrail $50 ${gate}`));
    expect(auditComparisonTemplateBuilds(elsewhere).errors.join("|")).toContain("BUTTON_ADDED_OUTSIDE_SCOPE");
  });

  it("fails when a derived page adds any link or changes its SEO header", () => {
    const linked = base();
    linked.after.set("software/callrail.html", page('callrail <a href="https://x.example">x</a>'));
    expect(auditComparisonTemplateBuilds(linked).errors.join("|")).toContain("LINK_ADDED_OUTSIDE_WAVE");
    const header = base();
    header.after.set("software/callrail.html", page("callrail $50", "<title>Different</title>"));
    expect(auditComparisonTemplateBuilds(header).errors.join("|")).toContain("SEO_HEADER_CHANGED: software/callrail.html");
  });

  it("fails on a wrong commit, a dirty checkout, a mismatched snapshot or a too-small inventory", () => {
    expect(auditComparisonTemplateBuilds(base({ candidateCheckoutSha: "c".repeat(40) })).ok).toBe(false);
    expect(auditComparisonTemplateBuilds(base({ baseClean: false })).ok).toBe(false);
    expect(auditComparisonTemplateBuilds(base({ headSha: "d".repeat(40) })).ok).toBe(false);
    const small = base();
    for (let i = 0; i < 1000; i += 1) {
      small.before.delete(`filler-${i}.html`);
      small.after.delete(`filler-${i}.html`);
    }
    expect(auditComparisonTemplateBuilds(small).errors.join("|")).toContain("too small");
  });

  it("fails when the two builds hold different pages", () => {
    const input = base();
    input.after.delete("filler-3.html");
    expect(auditComparisonTemplateBuilds(input).ok).toBe(false);
  });
});

describe("isComparisonTemplateFile", () => {
  it("accepts only the reviewed template, data, tooling and receipt files", () => {
    for (const file of ["app/compare/[comparison]/page.tsx", "components/ComparisonVerdictCard.tsx", "components/ComparisonChoiceCta.tsx", "data/software/callrail.json", "docs/growth/receipts/20261019-first-revenue-engine/README.md", "docs/mission/MILOOSH_55_MIN_EXECUTION_REPORT.md"]) expect(isComparisonTemplateFile(file)).toBe(true);
    for (const file of ["components/PricingSection.tsx", "components/GlobalNavigation.tsx", "app/software/[software]/page.tsx", "data/software/slack.json", "app/layout.tsx", "lib/affiliate.ts", "docs/growth/receipts/other/README.md"]) expect(isComparisonTemplateFile(file)).toBe(false);
  });

  it("maps routes to canonical URLs", () => {
    expect(routeToUrl("index.html")).toBe("https://miloosh.com/");
    expect(routeToUrl("compare/a-vs-b.html")).toBe("https://miloosh.com/compare/a-vs-b");
  });
});
