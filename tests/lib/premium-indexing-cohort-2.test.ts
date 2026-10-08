import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getSoftwareSerpOverride, getSoftwareSearchIntentNote } from "@/data/seo/serp-overrides";
import { generateWhoShouldntUseIt } from "@/lib/generators";
import { isSoftwareIndexingReady } from "@/lib/indexing-quality";

const SLUGS = ["slite", "google-analytics", "bitbucket", "sketch", "clockify", "wiz"] as const;
const AUDIT_DATE = new Date("2026-10-08T09:30:00Z");

describe("premium indexing cohort 2 — 2026-10-08", () => {
  it("keeps all six pages indexing-ready with current official evidence", () => {
    for (const slug of SLUGS) {
      const software = getSoftware(slug)!;
      expect(isSoftwareIndexingReady(software, AUDIT_DATE), slug).toBe(true);
      expect(software.accessedAt, slug).toBe("2026-10-08");
      expect(software.pricing?.lastVerified, slug).toBe("2026-10-08");
      expect(software.pricing?.officialSource, slug).toMatch(/^https:\/\//);
      expect(software.sources.length, slug).toBeGreaterThanOrEqual(3);
      expect(software.cons?.length ?? 0, slug).toBeGreaterThanOrEqual(3);
      expect(software.faq?.length ?? 0, slug).toBeGreaterThanOrEqual(4);
    }
  });

  it("gives every page buyer-intent title, meta description, H1 and context note", () => {
    for (const slug of SLUGS) {
      const override = getSoftwareSerpOverride(slug);
      const note = getSoftwareSearchIntentNote(slug);
      expect(override, slug).toBeDefined();
      expect(override?.h1, slug).toBeTruthy();
      expect(`${override?.title} | Miloosh`.length, slug).toBeLessThanOrEqual(70);
      expect(override?.description.length, slug).toBeLessThanOrEqual(165);
      expect(note?.text, slug).toBeTruthy();
      expect(note?.alternativeSectionTitle, slug).toBeTruthy();
    }
  });

  it("uses documented constraints instead of the generic alternatives fallback", () => {
    for (const slug of SLUGS) {
      const software = getSoftware(slug)!;
      const text = generateWhoShouldntUseIt(software);
      expect(text, slug).toContain("Reasons to compare alternatives before committing:");
      expect(text, slug).toContain(software.cons![0]);
    }
  });

  it("pins the high-risk pricing facts that triggered this audit", () => {
    const slite = getSoftware("slite")!;
    expect(slite.pricing?.freePlan).toBe(false);
    expect(slite.pricing?.entryPaid?.amount).toBe("10");
    expect(slite.pricing?.freeTrial?.days).toBe(14);

    const ga = getSoftware("google-analytics")!;
    expect(ga.pricing?.freePlan).toBe(true);
    expect(ga.pricing?.tiers?.[0]?.amount).toBe("0");
    expect(ga.cons?.join(" ")).toContain("14 months");

    const bitbucket = getSoftware("bitbucket")!;
    expect(bitbucket.pricing?.entryPaid?.amount).toBe("3.65");
    expect(bitbucket.pricing?.tiers?.[0]?.notes).toContain("5 users");
    expect(bitbucket.pricing?.tiers?.[0]?.notes).toContain("50 Pipelines build minutes");

    const sketch = getSoftware("sketch")!;
    expect(sketch.pricing?.freePlan).toBe(false);
    expect(sketch.pricing?.freeTrial?.days).toBe(30);
    expect(sketch.pricing?.entryPaid?.amount).toBe("12");
    expect(sketch.pricing?.tiers?.some((tier) => tier.name === "Mac-only license" && tier.amount === "120")).toBe(true);

    const clockify = getSoftware("clockify")!;
    expect(clockify.pricing?.tiers?.[0]?.notes).toContain("up to 5 users");
    expect(clockify.pricing?.entryPaid?.amount).toBe("3.99");
    expect(clockify.pricing?.freeTrial?.days).toBe(7);

    const wiz = getSoftware("wiz")!;
    expect(wiz.pricing?.status).toBe("contact_sales");
    expect(wiz.pricing?.freePlan).toBe(false);
    expect(wiz.pricing?.freeTrial?.available).toBe(true);
    expect(wiz.pricing?.startingPrice).toContain("Custom quote");
  });

  it("keeps direct alternatives relevant to the buyer job", () => {
    expect(getSoftware("google-analytics")!.alternatives.map((x) => x.slug)).toEqual([
      "mixpanel",
      "matomo",
      "posthog",
    ]);
    expect(getSoftware("clockify")!.alternatives.map((x) => x.slug)).toEqual([
      "toggl-track",
      "hubstaff",
      "harvest",
    ]);
  });

  it("does not reintroduce the obsolete Clockify unlimited-users claim anywhere in software data", () => {
    const softwareDir = path.join(process.cwd(), "data", "software");
    const offenders = fs.readdirSync(softwareDir)
      .filter((name) => name.endsWith(".json"))
      .filter((name) => {
        const text = fs.readFileSync(path.join(softwareDir, name), "utf8").toLowerCase();
        return text.includes("clockify") && text.includes("free plan for unlimited users");
      });

    expect(offenders).toEqual([]);
  });
});
