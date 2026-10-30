import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Contract for the About-derived page system (presentation only). */
const read = (p: string) => readFileSync(p, "utf8");

function routeFiles(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (p.includes("app/internal") || p.includes("app/api")) continue;
    if (statSync(p).isDirectory()) routeFiles(p, out);
    else if (name === "page.tsx" || name === "not-found.tsx") out.push(p);
  }
  return out;
}

describe("site-wide page system", () => {
  const css = read("app/design-system.css");

  it("defines the About title, intro, and 1120 content width", () => {
    expect(css).toContain("font-size: clamp(2.25rem, 4vw, 3.5rem)");
    expect(css).toContain("line-height: 1.12");
    expect(css).toContain("font-weight: 650");
    expect(css).toContain("max-width: 62ch");
    expect(css).toContain("max-width: 1120px");
    expect(read("app/layout.tsx")).toContain('import "./design-system.css"');
  });

  it("uses no gradients or glass effects in the page system", () => {
    expect(css).not.toMatch(/gradient|backdrop-filter/);
  });

  it("renders every inner route through page-shell with a page-title H1", () => {
    for (const file of routeFiles("app")) {
      const src = read(file);
      if (file === "app/page.tsx") continue;
      if (src.includes("<main")) expect(src, file).toContain("page-shell");
      expect(src, file).not.toMatch(/<h1 className="[^"]*font-bold/);
    }
    expect(read("components/LegalPageLayout.tsx")).toContain('className="page-title"');
  });

  it("keeps home on its own layout", () => {
    expect(read("app/page.tsx")).toContain('className="home-design"');
    expect(read("app/page.tsx")).not.toContain("page-shell");
  });

  it("long-form pages share the sticky reading layout with 44px nav targets", () => {
    const m = read("components/ReadingLayout.module.css");
    expect(m).toContain("position: sticky");
    expect(m).toContain("min-height: 44px");
    expect(read("app/about/page.tsx")).toContain("ReadingLayout");
    expect(read("components/LegalContent.tsx")).toContain("ReadingLayout");
  });

  it("scopes surfaces and touch targets to opted-in pages", () => {
    expect(css).toContain("border-color: var(--line)");
    expect(css).toContain("background-color: var(--surface)");
    expect(css).toContain(".page-shell summary { min-height: 44px; }");
    expect(css).toContain('.page-shell nav[aria-label="Breadcrumb"] > span { min-height: 44px; }');
    expect(css).not.toContain(":root");
  });
});
