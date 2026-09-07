import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getComparisonSearchIntentNote,
  getComparisonSerpOverride,
  getSoftwareSerpOverride,
} from "@/data/seo/serp-overrides";

const readSoftware = (slug: string) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/software", `${slug}.json`), "utf8"));

describe("GSC-backed SERP opportunity fixes", () => {
  it("targets Postmark alternatives without repeating the false EU-hosting claim", () => {
    const meta = getSoftwareSerpOverride("postmark");
    expect(meta?.title).toContain("Postmark Alternatives");
    expect(meta?.description).toContain("stores customer and processed data in the US");

    const corpus = JSON.stringify(readSoftware("postmark"));
    expect(corpus).not.toMatch(/dedicated EU server routing|data remains within the EU/i);
    expect(corpus).toContain("https://postmarkapp.com/eu-privacy");
  });

  it("disambiguates Adobe Analytics from the Adobe segmentation feature", () => {
    const meta = getComparisonSerpOverride("adobe-analytics-vs-segment");
    expect(meta?.title).toBe("Adobe Analytics vs Twilio Segment (2026)");
    expect(meta?.description).toContain("analytics and CDP workflows");
    expect(getComparisonSearchIntentNote("adobe-analytics-vs-segment")).toContain(
      "not a guide to creating or comparing segments inside Adobe Analytics"
    );
  });

  it("does not override protected or unrelated pages", () => {
    expect(getSoftwareSerpOverride("ringcentral")).toBeUndefined();
    expect(getComparisonSerpOverride("notion-vs-clickup")).toBeUndefined();
  });
});
