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
  it("does not alter SEO or render the room on shared templates",()=>{
    expect(read("app/decision-room/page.tsx")).toContain("index: false");
    expect(read("app/software/[slug]/page.tsx")).not.toContain('"/decision-room"');
    expect(read("app/compare/[comparison]/page.tsx")).not.toContain('"/decision-room"');
    expect(read("app/page.tsx")).not.toContain('"/decision-room"');
  });
});
