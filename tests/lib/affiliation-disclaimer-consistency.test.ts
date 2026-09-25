import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Miloosh has active, disclosed affiliate relationships. Blanket "not
// affiliated" claims must stay qualified by a link to the Affiliate Disclosure.
const SURFACES = ["components/Footer.tsx", "app/about/page.tsx", "app/terms/page.tsx"];

describe("affiliation disclaimers stay consistent with disclosed affiliate relationships", () => {
  for (const file of SURFACES) {
    it(`${file} qualifies any non-affiliation claim with the Affiliate Disclosure`, () => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      if (/not affiliated/i.test(source)) {
        expect(source).toMatch(/except\s+where\s+a\s+commercial\s+affiliate\s+relationship\s+is\s+explicitly/);
      }
      expect(source).toContain('href="/affiliate-disclosure"');
    });
  }
});
