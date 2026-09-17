import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Ecwid vs WooCommerce structure choice", () => {
  it("renders only on the existing Ecwid vs WooCommerce comparison", () => {
    const component = fs.readFileSync("components/EcwidWooStructureChoice.tsx", "utf8");
    const page = fs.readFileSync("app/compare/[comparison]/page.tsx", "utf8");
    expect(component).toContain('comparison !== "ecwid-vs-woocommerce"');
    expect(page).toContain("<EcwidWooStructureChoice comparison={comparison} />");
  });

  it("keeps the decision about operating model instead of feature-count winners", () => {
    const component = fs.readFileSync("components/EcwidWooStructureChoice.tsx", "utf8");
    expect(component).toContain("Embedded managed commerce or a WordPress-owned store?");
    expect(component).toContain("existing website should stay in place");
    expect(component).toContain("WordPress ownership and customization");
    expect(component).toContain("hosting, processing, extensions and maintenance");
  });
});
