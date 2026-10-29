import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const walked = (directory: string): string[] => fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
  const relative = path.join(directory, entry.name);
  if (entry.isDirectory()) return walked(relative);
  return entry.name.endsWith(".tsx") ? [relative] : [];
});

/** Protect observed routes by keeping the About presentation in imported route-local modules. */
describe("staged About design isolation", () => {
  it("does not import the staged design into shared templates, software, comparison or category routes", () => {
    for (const dir of ["components", "app/software", "app/compare", "app/category", "lib"]) {
      for (const file of walked(dir)) {
        expect(read(file), `${file} imports unapproved presentation`).not.toContain("@/app/_design/");
      }
    }
    expect(read("app/[guide]/page.tsx")).not.toContain("@/app/_design/");
    expect(read("app/layout.tsx")).not.toContain("@/app/_design/");
    expect(read("app/layout.tsx")).not.toContain("design-system.css");
    expect(read("app/page.tsx")).not.toContain("@/app/_design/");
  });

  it("keeps all new design rules in CSS modules without sitewide selectors", () => {
    const css = read("app/_design/premium.module.css");
    expect(css).toContain(".shell {");
    expect(css).not.toMatch(/(?:^|\n)\s*(?:html|body|:root|\.miloosh-theme|\.home-design)\b/m);
    expect(css).not.toMatch(/@import|:global\((?:html|body|:root)/);
    expect(read("app/_design/ReadingLayout.module.css")).toContain(".readingLayout {");
  });

  it("preserves route-local imports only in the approved initial wave", () => {
    const allowed = new Set([
      "about", "contact", "newsletter", "newsletter/unsubscribe", "recommend", "recommend/results",
      "research/saas-pricing-pressure-index-2026", "tools/saas-cost-calculator",
      "accessibility", "affiliate-disclosure", "ai-usage", "cookies", "corrections-policy",
      "disclaimer", "editorial-policy", "privacy", "sources-policy", "terms", "trademark-notice",
    ]);
    for (const file of walked("app").filter((candidate) => candidate.endsWith("/page.tsx") && !candidate.startsWith("app/_design/"))) {
      const code = read(file);
      if (!code.includes("@/app/_design/")) continue;
      const slug = file.replace(/^app\//, "").replace(/\/page.tsx$/, "");
      expect(allowed.has(slug), `${slug} has an unapproved rollout`).toBe(true);
    }
  });
});
