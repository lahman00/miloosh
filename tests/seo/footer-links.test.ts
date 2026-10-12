import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { FOOTER_COMPANY_LINKS, FOOTER_PRODUCT_LINKS } from "@/lib/footer-links";
import { LEGAL_PAGES } from "@/lib/legal";

/** A static App Router page exists for this path (the footer only links to static pages). */
function pageExists(href: string): boolean {
  const pathname = href.split("#")[0]!.split("?")[0]!.replace(/\/$/, "");
  const segments = pathname.split("/").filter(Boolean);
  return fs.existsSync(path.join(process.cwd(), "app", ...segments, "page.tsx"));
}

describe("footer navigation", () => {
  const links = [...FOOTER_PRODUCT_LINKS, ...FOOTER_COMPANY_LINKS, ...LEGAL_PAGES];

  it.each(links.map((link) => [link.name, link.href] as const))("%s -> %s resolves to a page of the site", (_name, href) => {
    expect(pageExists(href), `${href} has no app/**/page.tsx, so every page of the site would link to a 404`).toBe(true);
  });

  it("does not offer the same destination twice", () => {
    const hrefs = [...FOOTER_PRODUCT_LINKS, ...FOOTER_COMPANY_LINKS].map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("sends stale links to /research to the one research report with a permanent redirect", async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({ source: "/research", destination: "/research/saas-pricing-pressure-index-2026", permanent: true });
    expect(pageExists("/research/saas-pricing-pressure-index-2026")).toBe(true);
    expect(pageExists("/research")).toBe(false);
  });
});
