import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

/**
 * A later SEO or content release must not silently revert the approved
 * Miloosh premium UI. These file guards complement real browser QA.
 */
describe("approved Miloosh premium public identity", () => {
  it("keeps the light canvas, green ink, accents and readable wordmark", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain("--canvas: #f8f9f4");
    expect(css).toContain("--ink: #173b2c");
    expect(css).toContain("--citrine: #e4f267");
    expect(css).toContain("--font-sans: var(--font-manrope)");
    expect(css).toContain(".miloosh-theme");
    // The citrine plate is offset; the headline itself is not translated.
    expect(css).toContain(".hero-copy h1>span::before");
    expect(css).toContain("transform:translateY(.10em)");
    expect(css).not.toContain("background:var(--citrine); box-shadow:8px 0 0 var(--citrine)");

    expect(css).toContain(".brand img { width:120px; height:auto; }");
    expect(existsSync("public/miloosh-wordmark.png")).toBe(true);
  });

  it("keeps the premium theme on all routes without removing SEO metadata", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toContain('import { Manrope } from "next/font/google"');
    expect(layout).toContain('className="miloosh-theme');
    expect(layout).toContain("getOrganizationJsonLd()");
    expect(layout).toContain("<FirstPartyAnalytics />");
    expect(layout).toContain('className="skip-link"');
    expect(layout).toContain('id="main-content"');
    expect(readFileSync("lib/site.ts", "utf8")).toContain('export const SITE_THEME_COLOR = "#f8f9f4"');
  });

  it("retains the guided home and internal buyer-desk navigation", () => {
    const homepage = readFileSync("app/page.tsx", "utf8");
    const navigation = readFileSync("components/Navbar.tsx", "utf8");
    const desk = readFileSync("components/BuyerDesk.tsx", "utf8");
    expect(homepage).toContain('className="home-design"');
    expect(desk).toContain("Good software.");
    expect(desk).toContain("better fit.");
    expect(desk).toContain('Where are you{" "}<br />in the decision?');
    expect(readFileSync("components/BuyerDesk.module.css", "utf8")).not.toContain(
      ".journey h2 br { display: none; }",
    );
    expect(homepage).toContain("<BuyerDesk");
    expect(homepage).toContain("<SoftwareDirectory");
    expect(navigation).toContain('src="/miloosh-wordmark.png"');
    expect(navigation).toContain('href: "/editorial-policy"');
    expect(navigation).toContain('href={pathname === "/" ? "/#my-shortlist" : "/recommend"}');
  });
});
