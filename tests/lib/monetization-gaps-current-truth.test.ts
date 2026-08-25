import { describe, expect, it } from "vitest";
import { computeMonetizationGaps } from "@/lib/growth-audit/monetization-gaps";

describe("monetization gaps current truth", () => {
  const rows = computeMonetizationGaps();
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  it("keeps verified active partners in group A", () => {
    expect(bySlug.get("pipedrive")?.statusGroup).toBe("A");
    expect(bySlug.get("wix")?.statusGroup).toBe("A");
  });

  it("derives current pending and owner-blocked states from the ledger", () => {
    expect(bySlug.get("freshdesk")?.statusGroup).toBe("B");
    expect(bySlug.get("gorgias")?.statusGroup).toBe("D");
  });

  it("keeps rejected and ended/no-program relationships out of application groups", () => {
    expect(bySlug.get("clickup")?.statusGroup).toBe("F");
    expect(bySlug.get("webflow")?.statusGroup).toBe("F");
    expect(bySlug.get("calendly")?.statusGroup).toBe("F");
    expect(bySlug.get("coda")?.statusGroup).toBe("F");
  });

  it("still permits explicit forensic overrides without making them defaults", () => {
    const overridden = computeMonetizationGaps(undefined, new Set(["clickup"]));
    expect(overridden.find((row) => row.slug === "clickup")?.statusGroup).toBe("B");
  });
});
