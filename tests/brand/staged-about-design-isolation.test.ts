import fs from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import holds from "@/data/design/about-rollout-holds.json";
import { usesAboutDesign } from "@/lib/about-design-rollout";
const baselineHashes = {
  "components/Badge.tsx": "525bdeb1b596a6b59977e5d9ada10e360954abd49ef5fe7abfd2f21ce9439689",
  "components/Breadcrumbs.tsx": "20bdabb2b711d0f26e9c5311f93f721585223c4aad35e7137d925670e732b4fd",
  "components/Card.tsx": "537e94b41896ca5ce304a5e570157a862e861328b878fe2c440915e3895ed600",
  "components/ComparisonTable.tsx": "e3703ca9f3d5a1effac4b1bc834920595b6301eacf6724956dae874e27577ff1",
  "components/ComparisonVerdictCard.tsx": "7c08b828c023275f7b7c856a3af503b7511102621e73fa6d8bd35fa1e17f366d",
  "components/Container.tsx": "357553f44435ee6dfd6d2f5bd218a24d1ea72a80a2e93843a3ac4fab10940f2f",
  "components/FaqSection.tsx": "03dec1e42e81799788594036335904add11808b79fe985c466f67276ce9e826f",
  "components/SectionHeading.tsx": "2da3eacfe680a3320f7c8d584827105f9eb098ce464b553cf55c2565c95d4963",
  "lib/button-styles.ts": "b37a9df0cc3324b7e3d4de892b87472c10d345c276941fca6bdc03b25d11f2db"
};
describe("protected About rollout isolation", () => {
  it("keeps every held software and comparison on the production design", () => {
    expect(holds.paths.length).toBeGreaterThanOrEqual(193);
    for (const p of holds.paths) expect(usesAboutDesign(p), p).toBe(false);
    expect(usesAboutDesign("/software/salesforce")).toBe(false);
    expect(usesAboutDesign("/compare/notion-vs-clickup")).toBe(false);
    expect(usesAboutDesign("/software/zoom")).toBe(true);
    expect(usesAboutDesign("/compare/apollo-io-vs-cognism")).toBe(true);
    expect(usesAboutDesign("//software/zoom")).toBe(false);
    expect(usesAboutDesign("/software/zoom?held=false")).toBe(false);
  });
  it("retains production shared components and CTA classes byte for byte", () => {
    for (const [file, hash] of Object.entries(baselineHashes)) expect(createHash("sha256").update(fs.readFileSync(file)).digest("hex"), file).toBe(hash);
  });
  it("preserves the exact held main and H1 classes", () => {
    for (const file of ["app/software/[slug]/page.tsx", "app/compare/[comparison]/page.tsx"]) {
      const s=fs.readFileSync(file,"utf8");
      expect(s).toContain('aboutDesign ? "page-shell flex-1" : "flex-1 py-16 sm:py-20"');
      const expectedH1 = file.includes("/software/") ? "mt-5 text-4xl font-bold tracking-tight text-white sm:text-6xl" : 'text-4xl font-bold tracking-tight text-white sm:text-6xl';
      expect(s).toContain(`aboutDesign ? "page-title" : "${expectedH1}"`);
    }
  });
});
