import { describe, expect, it } from "vitest";
import fs from "node:fs";

// Live axe evidence: zinc-500 #71717b on #09090b/#0e0e10 gave
// 4.12/3.99:1 for normal-size decision text (minimum 4.5). Zinc-400
// #9f9fa9 is the existing palette token, not a new brand color.
function luminance(hex: string) {
  const rgb = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
describe("buyer-path text contrast regression", () => {
  it.each(["09090b", "0e0e10", "18181b"])("existing brighter token exceeds 4.5:1 on #%s", background => {
    expect((luminance("9f9fa9") + 0.05) / (luminance(background) + 0.05)).toBeGreaterThan(4.5);
  });
  it.each(["components/Breadcrumbs.tsx", "components/Footer.tsx", "components/ComparisonTable.tsx"])("%s retains the corrected shared text token", file => {
    const source = fs.readFileSync(file, "utf8");
    expect(source).toContain("text-zinc-400");
    expect(source).not.toMatch(/text-zinc-[56]00/);
  });
  it("affiliate disclosure in the comparison remains readable", () => {
    const source = fs.readFileSync("app/compare/[comparison]/page.tsx", "utf8");
    expect(source).toContain('mt-2 text-center text-xs text-zinc-400');
  });
});
