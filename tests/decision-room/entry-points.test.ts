import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(f:string)=>readFileSync(f,"utf8");
describe("safe Decision Room discovery links",()=>{
  it("offers the room after the Recommend wizard with existing tracking",()=>{
    const page=read("app/recommend/page.tsx");
    expect(page).toContain("<RecommendWizard");
    expect(page).toContain('href="/decision-room" sourcePath="/recommend" targetPath="/decision-room"');
    expect(page).toContain('aria-labelledby="decision-workspace-title"');
    expect(page).toContain("No account or email needed.");
  });
  it("keeps the stack calculator and adds a distinct decision link",()=>{
    const page=read("app/tools/saas-cost-calculator/page.tsx");
    expect(page).toContain("<SaasCostCalculator products={products}");
    expect(page).toContain('href="/decision-room" sourcePath="/tools/saas-cost-calculator" targetPath="/decision-room"');
    expect(page).toContain('className="mt-5 inline-flex min-h-11');
  });
  it("keeps the room noindex and off protected software and comparison templates",()=>{
    expect(read("app/decision-room/page.tsx")).toContain("index: false");
    expect(read("app/software/[slug]/page.tsx")).not.toContain('"/decision-room"');
    expect(read("app/compare/[comparison]/page.tsx")).not.toContain('"/decision-room"');
    // Home is intentionally unprotected and now hosts an explicit, measured entry.
    // The shared software/comparison templates still must not gain this CTA.
    const held=JSON.parse(read("data/design/about-rollout-holds.json")) as {paths:string[]};
    expect(held.paths).not.toContain("/");
    expect(read("app/page.tsx")).toContain('ctaName="homepage-decision-room"');
    expect(read("app/sitemap.ts")).not.toContain('"/decision-room"');
  });
});
