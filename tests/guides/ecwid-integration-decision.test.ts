import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Ecwid integration buyer guidance", () => {
  it("stays on the existing Ecwid software page", () => {
    const component = fs.readFileSync("components/EcwidIntegrationDecision.tsx", "utf8");
    const page = fs.readFileSync("app/software/[slug]/page.tsx", "utf8");
    expect(component).toContain('slug !== "ecwid"');
    expect(page).toContain("<EcwidIntegrationDecision slug={software.slug} />");
  });

  it("uses a selection checklist rather than an invented app ranking", () => {
    const component = fs.readFileSync("components/EcwidIntegrationDecision.tsx", "utf8");
    expect(component).toContain("Choose the system you need to connect before choosing the app");
    expect(component).toContain("plan eligibility");
    expect(component).toContain("Price the app separately from the Ecwid plan");
    expect(component).toContain("not a ranking of Ecwid apps");
    expect(component).toContain("Guide-to-using-Ecwid-App-Market");
  });
});
