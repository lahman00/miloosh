import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const read = (p:string) => fs.readFileSync(p, "utf8");
const routeFamilies = ["app/software/[slug]/page.tsx", "app/compare/[comparison]/page.tsx", "app/compare/page.tsx", "app/category/[slug]/page.tsx", "app/guides/page.tsx", "app/[guide]/page.tsx", "app/recommend/page.tsx", "app/recommend/results/page.tsx", "app/about/page.tsx", "app/contact/page.tsx", "app/newsletter/page.tsx", "app/research/saas-pricing-pressure-index-2026/page.tsx", "app/tools/saas-cost-calculator/page.tsx"];
describe("About presentation across eligible public routes",()=>{
  it("has one shared palette and stylesheet imported at root",()=>{
    expect(read("app/layout.tsx")).toContain('import "./design-system.css"');
    const css=read("app/design-system.css");
    for(const token of ["--stage-soft", "--line-strong", "--shadow-soft", ".page-title", ".home-design"]){expect(css).toContain(token);}
    expect(css).not.toMatch(/gradient|backdrop-filter/);
  });
  it("ports every public template while keeping the home hero intact",()=>{
    for(const f of routeFamilies)expect(read(f), f).toContain("page-shell");
    expect(read("app/page.tsx")).toContain('className="home-design"');
    expect(read("app/page.tsx")).toContain("<BuyerDesk");
    expect(read("components/LegalPageLayout.tsx")).toContain('className="page-shell flex-1"');
    expect(read("components/LegalContent.tsx")).toContain("<ReadingLayout");
  });
  it("deduplicates the safe-wave components into shared primitives",()=>{
    expect(fs.existsSync("app/_design")).toBe(false);
    expect(read("app/about/page.tsx")).toContain('"@/components/ReadingLayout"');
    const legal=["privacy","terms","editorial-policy","sources-policy","affiliate-disclosure","disclaimer","cookies","accessibility","ai-usage","corrections-policy","trademark-notice"];
    for(const route of legal){const file=`app/${route}/page.tsx`;expect(read(file),file).toContain('"@/components/LegalPageLayout"');}
    for(const dir of ["app", "components"]){
      const walk=(folder:string):void=>{for(const ent of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,ent.name);if(ent.isDirectory())walk(file);else if(ent.name.endsWith(".tsx"))expect(read(file),file).not.toContain("@/app/_design/");}};walk(dir);
    }
  });
});
