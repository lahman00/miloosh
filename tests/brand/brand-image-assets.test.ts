import { describe, expect, it } from "vitest";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The landing-page SoftwareMark map is a contract with public/brands.
 * A missing asset otherwise produces a broken image for every matching card
 * without failing a Next.js production build.
 */
describe("homepage company brand images", () => {
  const source = readFileSync("components/SoftwareMark.tsx", "utf8");
  const entries = [...source.matchAll(/^\s*([a-z][a-z0-9-]*):\s*"([\w.-]+)",?$/gm)];

  it("defines image files for the branded company marks", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries.map(([, slug, filename]) => ({ slug, filename })))(
    "$slug resolves to a real, nonempty public image: $filename",
    ({ filename }) => {
      const file = path.join("public", "brands", filename);
      expect(statSync(file).size).toBeGreaterThan(100);
      const content = readFileSync(file);
      if (filename.endsWith(".png")) {
        expect(content.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))).toBe(true);
      } else {
        expect(filename.endsWith(".svg")).toBe(true);
        expect(content.toString("utf8")).toMatch(/<svg\b/);
      }
    },
  );
});
