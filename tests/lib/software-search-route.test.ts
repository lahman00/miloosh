import { describe, expect, it } from "vitest";
import { getAllSoftware } from "@/data/software";
import { resolveSoftwareSearchSlug, slugifySoftwareSearch } from "@/lib/software-search-route";

describe("software search routing", () => {
  it("routes every canonical catalog name to its real software slug", () => {
    for (const software of getAllSoftware()) {
      expect(resolveSoftwareSearchSlug(software.name), software.name).toBe(software.slug);
    }
  });

  it("keeps simple names on the normal slugify path", () => {
    expect(slugifySoftwareSearch("Microsoft Teams")).toBe("microsoft-teams");
    expect(resolveSoftwareSearchSlug("Microsoft Teams")).toBe("microsoft-teams");
  });

  it("supports useful current-brand aliases without changing the canonical URL", () => {
    expect(resolveSoftwareSearchSlug("Monday.com")).toBe("monday");
    expect(resolveSoftwareSearchSlug("HighLevel")).toBe("gohighlevel");
    expect(resolveSoftwareSearchSlug("Devin Desktop")).toBe("windsurf");
  });
});
