import { describe, it, expect } from "vitest";
import { runQaGates, qaPassed } from "@/lib/social/qa-gates";
import { getAllSoftware } from "@/data/software";
import { SITE_URL } from "@/lib/site";
import type { ChannelVariant, SocialQueueEntry } from "@/lib/social/types";

function variant(overrides: Partial<ChannelVariant> = {}): ChannelVariant {
  return { text: "Some safe, short post text.", link: null, imageUrl: null, altText: null, hashtags: [], publishResult: null, ...overrides };
}

function entry(overrides: Partial<SocialQueueEntry> = {}): SocialQueueEntry {
  const now = new Date().toISOString();
  return {
    id: "e1",
    pillar: "buyer_education",
    topic: "t1",
    sourceSlugs: [],
    campaign: null,
    state: "DRAFTED",
    createdAt: now,
    scheduledFor: null,
    channels: { bluesky: variant() },
    qaNotes: [],
    history: [],
    ...overrides,
  };
}

describe("QA gates", () => {
  it("passes a clean, short, real post with no findings", () => {
    const findings = runQaGates(entry(), []);
    expect(qaPassed(findings)).toBe(true);
  });

  it("flags text over the channel's character limit", () => {
    const findings = runQaGates(entry({ channels: { bluesky: variant({ text: "x".repeat(400) }) } }), []);
    expect(qaPassed(findings)).toBe(false);
    expect(findings.some((f) => f.message.includes("over the"))).toBe(true);
  });

  it("flags a localhost link as an error", () => {
    const findings = runQaGates(entry({ channels: { bluesky: variant({ link: "http://localhost:3000/software/notion" }) } }), []);
    expect(qaPassed(findings)).toBe(false);
    expect(findings.some((f) => f.message.includes("localhost"))).toBe(true);
  });

  it("flags a link to an internal-only path", () => {
    const findings = runQaGates(entry({ channels: { bluesky: variant({ link: `${SITE_URL}/internal/social` }) } }), []);
    expect(qaPassed(findings)).toBe(false);
    expect(findings.some((f) => f.message.includes("internal-only"))).toBe(true);
  });

  it("flags a link to a Miloosh path that doesn't exist", () => {
    const findings = runQaGates(entry({ channels: { bluesky: variant({ link: `${SITE_URL}/software/not-a-real-product-slug` }) } }), []);
    expect(qaPassed(findings)).toBe(false);
    expect(findings.some((f) => f.message.includes("doesn't exist"))).toBe(true);
  });

  it("accepts a link to a real, existing software page", () => {
    const realSlug = getAllSoftware()[0]!.slug;
    const findings = runQaGates(entry({ channels: { bluesky: variant({ link: `${SITE_URL}/software/${realSlug}` }) } }), []);
    expect(findings.some((f) => f.message.includes("doesn't exist"))).toBe(false);
  });

  it("accepts links to the calculator, newsletter, and Pricing Pressure Index pages (real gap found and fixed 2026-08-24 — these shipped pages were missing from the known-path allowlist)", () => {
    for (const path of ["/tools/saas-cost-calculator", "/newsletter", "/research/saas-pricing-pressure-index-2026"]) {
      const findings = runQaGates(entry({ channels: { bluesky: variant({ link: `${SITE_URL}${path}` }) } }), []);
      expect(findings.some((f) => f.message.includes("doesn't exist"))).toBe(false);
    }
  });

  it("flags a malformed hashtag", () => {
    const findings = runQaGates(entry({ channels: { bluesky: variant({ hashtags: ["#ok", "no-hash-prefix"] }) } }), []);
    expect(qaPassed(findings)).toBe(false);
    expect(findings.some((f) => f.message.includes("Malformed hashtag"))).toBe(true);
  });

  it("flags a misspelled brand name", () => {
    const findings = runQaGates(entry({ channels: { bluesky: variant({ text: "Milosh is a great tool." }) } }), []);
    expect(qaPassed(findings)).toBe(false);
    expect(findings.some((f) => f.message.includes("misspelled"))).toBe(true);
  });

  it("flags text that looks like it contains a secret", () => {
    const findings = runQaGates(entry({ channels: { bluesky: variant({ text: "Debug: BLOB_READ_WRITE_TOKEN=abc123" }) } }), []);
    expect(qaPassed(findings)).toBe(false);
    expect(findings.some((f) => f.message.includes("BLOB_READ_WRITE_TOKEN"))).toBe(true);
  });

  it("requires the affiliate disclosure text on a commercial-pillar post", () => {
    const commercial = entry({ pillar: "commercial", channels: { bluesky: variant({ text: "Check out this tool." }) } });
    const findings = runQaGates(commercial, []);
    expect(qaPassed(findings)).toBe(false);
    expect(findings.some((f) => f.message.includes("affiliate disclosure"))).toBe(true);
  });

  it("passes a commercial-pillar post that includes the disclosure text", () => {
    const commercial = entry({ pillar: "commercial", channels: { bluesky: variant({ text: "Check out this tool. (affiliate link)" }) } });
    const findings = runQaGates(commercial, []);
    expect(findings.some((f) => f.message.includes("affiliate disclosure"))).toBe(false);
  });

  it("rejects a stale price claim when the catalog price no longer matches the drafted text", () => {
    const realSoftware = getAllSoftware().find((s) => s.pricing?.startingPrice);
    if (!realSoftware) return; // no priced product in the current catalog snapshot — nothing to assert
    const stale = entry({
      pillar: "pricing_intelligence",
      sourceSlugs: [realSoftware.slug],
      channels: { bluesky: variant({ text: `${realSoftware.name} starts at $999999/mo (definitely not the real price).` }) },
    });
    const findings = runQaGates(stale, []);
    expect(findings.some((f) => f.message.includes("re-draft"))).toBe(true);
  });

  it("flags a source software slug that no longer exists in the catalog", () => {
    const findings = runQaGates(entry({ pillar: "pricing_intelligence", sourceSlugs: ["not-a-real-slug-xyz"] }), []);
    expect(findings.some((f) => f.message.includes("no longer exists"))).toBe(true);
  });

  it("catches a duplicate against an already-published entry with identical content", () => {
    const publishedText = "Identical content that was already published.";
    const alreadyPublished = entry({
      id: "old",
      state: "PUBLISHED",
      channels: { bluesky: variant({ text: publishedText }) },
    });
    const candidate = entry({ id: "new", channels: { bluesky: variant({ text: publishedText }) } });
    const findings = runQaGates(candidate, [alreadyPublished]);
    expect(qaPassed(findings)).toBe(false);
    expect(findings.some((f) => f.message.includes("already scheduled or published"))).toBe(true);
  });

  it("does not flag two different DRAFTED entries as duplicates of each other", () => {
    const a = entry({ id: "a", channels: { bluesky: variant({ text: "Post A" }) } });
    const b = entry({ id: "b", channels: { bluesky: variant({ text: "Post B" }) } });
    const findings = runQaGates(b, [a, b]);
    expect(findings.some((f) => f.message.includes("already scheduled or published"))).toBe(false);
  });

  it("warns when two channels on the same entry have byte-identical text (cross-post spam)", () => {
    const same = "Identical text sent to every channel.";
    const findings = runQaGates(entry({ channels: { linkedin: variant({ text: same }), facebook: variant({ text: same }) } }), []);
    expect(findings.some((f) => f.message.includes("byte-identical text"))).toBe(true);
  });

  it("does not warn when channels on the same entry have genuinely different text", () => {
    const findings = runQaGates(
      entry({ channels: { linkedin: variant({ text: "LinkedIn-native copy." }), facebook: variant({ text: "Facebook-native copy." }) } }),
      []
    );
    expect(findings.some((f) => f.message.includes("byte-identical text"))).toBe(false);
  });
});
