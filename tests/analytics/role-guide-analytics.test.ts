import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Root-level buyer guide analytics", () => {
  it("mounts guide tracking only inside the server-validated guide route", () => {
    const page = readFileSync("app/[guide]/page.tsx", "utf8");
    expect(page).toContain('import { RoleGuideAnalytics } from "@/components/RoleGuideAnalytics"');
    expect(page).toContain("<RoleGuideAnalytics guideSlug={guide.slug} />");
    // A missing guard returns -1 from indexOf and would otherwise pass the order check.
    expect(page).toContain("if (!guide) notFound()");
    expect(page.indexOf("if (!guide) notFound()")).toBeLessThan(
      page.indexOf("<RoleGuideAnalytics"),
    );
  });
});
