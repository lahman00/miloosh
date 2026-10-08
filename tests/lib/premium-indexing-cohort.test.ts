import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getSoftwareSerpOverride, getSoftwareSearchIntentNote } from "@/data/seo/serp-overrides";
import { generateWhoShouldntUseIt } from "@/lib/generators";
import { getRelatedSoftware } from "@/lib/related";
import { isSoftwareIndexingReady } from "@/lib/indexing-quality";

const SLUGS = ["vercel", "mattermost", "jenkins", "docker", "tailscale", "hotjar"] as const;
const AUDIT_DATE = new Date("2026-10-08T07:30:00Z");

describe("premium indexing cohort — 2026-10-08", () => {
  it("keeps all six pages indexing-ready with fresh official buyer evidence", () => {
    for (const slug of SLUGS) {
      const software = getSoftware(slug)!;
      expect(isSoftwareIndexingReady(software, AUDIT_DATE), slug).toBe(true);
      expect(software.accessedAt, slug).toBe("2026-10-08");
      expect(software.pricing?.lastVerified, slug).toBe("2026-10-08");
      expect(software.pricing?.officialSource, slug).toMatch(/^https:\/\//);
      expect(software.sources.length, slug).toBeGreaterThanOrEqual(3);
      expect(software.cons?.length ?? 0, slug).toBeGreaterThanOrEqual(2);
      expect(software.faq?.length ?? 0, slug).toBeGreaterThanOrEqual(4);
    }
  });

  it("gives every cohort page unique buyer-intent SERP metadata and H1 copy", () => {
    for (const slug of SLUGS) {
      const override = getSoftwareSerpOverride(slug);
      expect(override, slug).toBeDefined();
      expect(override?.h1, slug).toBeTruthy();
      expect(`${override?.title} | Miloosh`.length, slug).toBeLessThanOrEqual(70);
      expect(override?.description.length, slug).toBeLessThanOrEqual(165);
      expect(override?.description.toLowerCase(), slug).not.toContain("best alternatives compared");
    }
  });

  it("removes the generic export/import migration FAQ from the cohort", () => {
    for (const slug of SLUGS) {
      const software = getSoftware(slug)!;
      const serialized = JSON.stringify(software.faq).toLowerCase();
      expect(serialized, slug).not.toContain("exporting their existing");
      expect(serialized, slug).not.toContain("importing it into the new tool");
    }
  });

  it("uses real documented constraints in the How to choose section", () => {
    for (const slug of SLUGS) {
      const software = getSoftware(slug)!;
      const text = generateWhoShouldntUseIt(software);
      expect(text, slug).toContain("Reasons to compare alternatives before committing:");
      expect(text, slug).toContain(software.cons![0]);
    }
  });

  it("keeps the known high-risk facts corrected", () => {
    const vercel = getSoftware("vercel")!;
    expect(vercel.cons?.join(" ")).toContain("personal, non-commercial");

    const mattermost = getSoftware("mattermost")!;
    expect(mattermost.pricing?.status).toBe("verified");
    expect(mattermost.pricing?.freeTrial?.days).toBe(30);
    expect(mattermost.alternatives.map((x) => x.slug)).toContain("rocket-chat");

    const jenkins = getSoftware("jenkins")!;
    expect(jenkins.description.toLowerCase()).not.toContain("leading open source");
    expect(jenkins.platforms).not.toContain("Web");

    const docker = getSoftware("docker")!;
    expect(docker.bestFor).not.toMatch(/fortune 100|20m\+/i);
    expect(docker.alternatives.map((x) => x.slug)).toEqual(["render", "vercel"]);
    expect(getSoftwareSearchIntentNote("docker")?.text).toContain("not drop-in replacements");

    const tailscale = getSoftware("tailscale")!;
    expect(tailscale.features.join(" ").toLowerCase()).not.toContain("without centralized servers");
    expect(tailscale.features.join(" ")).toContain("DERP relay");
    expect(tailscale.alternatives.map((x) => x.slug)).toEqual(["cloudflare"]);

    const hotjar = getSoftware("hotjar")!;
    expect(hotjar.description).toContain("New Hotjar accounts are no longer available");
    expect(hotjar.pricing?.status).toBe("verified");
    expect(hotjar.pricing?.entryPaid?.amount).toBe("49");
    expect(hotjar.pricing?.entryPaid?.annualBillingRequired).toBe(true);
  });

  it("keeps Compare other tools relevant instead of falling back to catalog-first products", () => {
    const vercel = getRelatedSoftware(getSoftware("vercel")!, 3).map((x) => x.slug);
    const hotjar = getRelatedSoftware(getSoftware("hotjar")!, 3).map((x) => x.slug);

    expect(vercel).not.toContain("notion");
    expect(vercel).not.toContain("slack");
    expect(hotjar).toEqual(["amplitude", "google-analytics", "mixpanel"]);
  });
});
