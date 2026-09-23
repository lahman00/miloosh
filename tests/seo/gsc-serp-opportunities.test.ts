import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getComparisonSearchIntentNote,
  getComparisonSerpOverride,
  getSoftwareSearchIntentNote,
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

  it("aligns the highest-impression software pages with alternatives and competitor intent", () => {
    for (const slug of ["semrush", "freshdesk", "intercom", "front", "buffer", "help-scout"]) {
      const meta = getSoftwareSerpOverride(slug);
      expect(meta?.title).toMatch(/Alternatives & Competitors \(2026\)/);
      expect(meta?.description).toMatch(/alternatives and competitors/i);
    }
  });

  it("disambiguates Freshdesk from Freshservice using the observed GSC query mix", () => {
    const note = getSoftwareSearchIntentNote("freshdesk");
    expect(note?.text).toContain("Freshdesk and Freshservice are different products");
    expect(note?.href).toBe("/software/freshservice");
    expect(getSoftwareSearchIntentNote("semrush")).toBeUndefined();
  });

  it("disambiguates Adobe Analytics from the Adobe segmentation feature", () => {
    const meta = getComparisonSerpOverride("adobe-analytics-vs-segment");
    expect(meta?.title).toBe("Adobe Analytics vs Twilio Segment (2026)");
    expect(meta?.description).toContain("analytics and CDP workflows");
    expect(getComparisonSearchIntentNote("adobe-analytics-vs-segment")).toContain(
      "not a guide to creating or comparing segments inside Adobe Analytics"
    );
  });

  it("adds GSC-backed metadata for comparisons already near page one", () => {
    expect(getComparisonSerpOverride("docker-vs-vercel")?.title).toContain("Docker vs Vercel (2026)");
    expect(getComparisonSerpOverride("github-vs-render")?.title).toContain("Code Hosting vs App Deployment");
    expect(getComparisonSerpOverride("microsoft-teams-vs-signal")?.title).toContain("Work Chat vs Private Messaging");
    expect(getComparisonSerpOverride("canva-vs-lucidchart")?.title).toContain("Design vs Diagramming");
    expect(getComparisonSerpOverride("google-chat-vs-signal")?.title).toContain("Work Chat vs Private Messaging");
    expect(getComparisonSerpOverride("jenkins-vs-sentry")?.title).toContain("CI/CD vs Error Monitoring");
  });

  it("does not override protected or unrelated pages", () => {
    expect(getSoftwareSerpOverride("ringcentral")).toBeUndefined();
    expect(getComparisonSerpOverride("notion-vs-clickup")).toBeUndefined();
  });
});
