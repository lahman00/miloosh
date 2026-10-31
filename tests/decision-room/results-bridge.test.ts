import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");

describe("recommend results hand off to the Decision Room without leaking answers", () => {
  const page = read("app/recommend/results/page.tsx");
  it("links the shown recommendations by product id only, with existing tracking", () => {
    expect(page).toContain('ctaName="recommend-results-decision-room"');
    expect(page).toContain('sourcePath="/recommend/results"');
    expect(page).toContain('targetPath="/decision-room"');
    expect(page).toContain("/decision-room?p=${recommendations.slice(0, 4).map((rec) => rec.software.slug).join(\".\")}");
    // The href is built from slugs only, never from the buyer's answers or summary.
    const href = page.match(/href=\{`\/decision-room\?p=[^`]*`\}/)?.[0] ?? "";
    expect(href).not.toMatch(/answers|summary|searchParams/i);
  });
  it("states the keep-current-tool outcome and the no-signup promise, and only renders with results", () => {
    expect(page).toContain("Keeping your current tool is a valid outcome.");
    expect(page).toContain("recommendations.length > 0 ?");
    expect(page).toContain("No account or email.");
  });
  it("adds no affiliate link, rel or destination change to the results page", () => {
    expect(page).not.toMatch(/sponsored|getSoftwareCtaUrl|affiliate/i);
  });
  it("the room accepts the link as an opt-in shared shortlist, never as an automatic save", () => {
    const room = read("app/decision-room/_components/DecisionRoom.tsx");
    expect(room).toContain("Add to my shortlist");
  });
  it("empty compare states point to the step that fixes them", () => {
    const compare = read("app/decision-room/_components/CompareSection.tsx");
    expect(compare).toContain('href="#shortlist"');
    expect(compare).toContain('href="#requirements"');
  });
});
