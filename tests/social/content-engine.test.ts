import { describe, it, expect } from "vitest";
import { interleaveByPillarWeight, generateAllRawIdeas, draftQueueEntry, IMAGE_KIND_BY_PILLAR, buildCardImageUrlFor } from "@/lib/social/content-engine";
import { SITE_URL } from "@/lib/site";
import type { ContentPillar } from "@/lib/social/types";

/**
 * Regression coverage for a real bug found while seeding the first
 * content batch: ideasFromComparisons() alone produces 1000+ entries
 * (one per published comparison), all listed before any other pillar in
 * generateAllRawIdeas()'s array. A naive "take the first N" selection
 * (exactly what scripts/social/schedule.ts does when picking the next
 * days' posts) would then be almost entirely one pillar, directly
 * contradicting the brief's "Mix... avoid repeating topics too
 * frequently." interleaveByPillarWeight() exists specifically to fix
 * this before any consumer sees the list.
 */
describe("interleaveByPillarWeight", () => {
  it("keeps runs short within the realistic scheduling horizon (the first ~30 items — what schedule.ts actually consumes at a time)", () => {
    // Mirrors the real content engine's actual proportions: two large
    // pillars (comparisons/migration are both 1000+ in production) plus
    // several smaller ones. Deep in the tail, once a higher-weight
    // pillar's pool drains faster than a same-sized lower-weight one, a
    // long same-pillar run becomes mathematically unavoidable (see the
    // next test) — but that only happens far beyond the ~14-30 items
    // schedule.ts actually pulls at a time before the next generate.ts
    // run reshuffles everything, so it's the NEAR-TERM mix that matters.
    const ideas = [
      ...Array.from({ length: 50 }, (_, i) => ({ pillar: "software_decisions" as ContentPillar, topic: `sd-${i}`, sourceSlugs: [], headline: "h", body: "b", link: null })),
      ...Array.from({ length: 50 }, (_, i) => ({ pillar: "migration" as ContentPillar, topic: `mg-${i}`, sourceSlugs: [], headline: "h", body: "b", link: null })),
      ...Array.from({ length: 10 }, (_, i) => ({ pillar: "buyer_education" as ContentPillar, topic: `be-${i}`, sourceSlugs: [], headline: "h", body: "b", link: null })),
      ...Array.from({ length: 10 }, (_, i) => ({ pillar: "trust_methodology" as ContentPillar, topic: `tm-${i}`, sourceSlugs: [], headline: "h", body: "b", link: null })),
    ];
    const weights = { software_decisions: 3, migration: 1, buyer_education: 2, trust_methodology: 1 } as Record<ContentPillar, number>;
    const result = interleaveByPillarWeight(ideas, weights).slice(0, 30);

    let consecutiveRun = 0;
    let maxConsecutiveRun = 0;
    for (let i = 1; i < result.length; i++) {
      if (result[i]!.pillar === result[i - 1]!.pillar) {
        consecutiveRun += 1;
        maxConsecutiveRun = Math.max(maxConsecutiveRun, consecutiveRun);
      } else {
        consecutiveRun = 0;
      }
    }
    expect(maxConsecutiveRun).toBeLessThan(4);
  });

  it("known, unavoidable limitation: once every pillar but one is fully exhausted, the remainder is necessarily one long run — there's nothing left to interleave with", () => {
    const ideas = [
      ...Array.from({ length: 50 }, (_, i) => ({ pillar: "software_decisions" as ContentPillar, topic: `sd-${i}`, sourceSlugs: [], headline: "h", body: "b", link: null })),
      ...Array.from({ length: 10 }, (_, i) => ({ pillar: "buyer_education" as ContentPillar, topic: `be-${i}`, sourceSlugs: [], headline: "h", body: "b", link: null })),
    ];
    const result = interleaveByPillarWeight(ideas, { software_decisions: 3, buyer_education: 1 } as Record<ContentPillar, number>);
    // The first 20 (well before buyer_education's 10 items run out) should still be well-mixed.
    const first20Pillars = new Set(result.slice(0, 20).map((i) => i.pillar));
    expect(first20Pillars.size).toBeGreaterThan(1);
  });

  it("preserves every input idea — interleaving reorders, never drops", () => {
    const ideas = Array.from({ length: 37 }, (_, i) => ({ pillar: "category_discovery" as ContentPillar, topic: `t-${i}`, sourceSlugs: [], headline: "h", body: "b", link: null }));
    const result = interleaveByPillarWeight(ideas, { category_discovery: 1 } as Record<ContentPillar, number>);
    expect(result).toHaveLength(37);
  });

  it("a higher-weighted pillar appears earlier and more densely in the first N results than a lower-weighted one", () => {
    const heavy = Array.from({ length: 100 }, (_, i) => ({ pillar: "software_decisions" as ContentPillar, topic: `h-${i}`, sourceSlugs: [], headline: "h", body: "b", link: null }));
    const light = Array.from({ length: 100 }, (_, i) => ({ pillar: "trust_methodology" as ContentPillar, topic: `l-${i}`, sourceSlugs: [], headline: "h", body: "b", link: null }));
    const result = interleaveByPillarWeight([...heavy, ...light], { software_decisions: 5, trust_methodology: 1 } as Record<ContentPillar, number>);
    const first20 = result.slice(0, 20);
    const heavyCount = first20.filter((i) => i.pillar === "software_decisions").length;
    const lightCount = first20.filter((i) => i.pillar === "trust_methodology").length;
    expect(heavyCount).toBeGreaterThan(lightCount);
  });
});

describe("generateAllRawIdeas", () => {
  it("every idea traces to at least one real source, or is an explicitly evergreen (non-product) pillar", () => {
    const ideas = generateAllRawIdeas();
    const evergreenPillars: ContentPillar[] = ["buyer_education", "trust_methodology"];
    for (const idea of ideas) {
      if (evergreenPillars.includes(idea.pillar)) continue;
      expect(idea.sourceSlugs.length).toBeGreaterThan(0);
    }
  });

  it("produces at least the minimum batch size required by the build brief (30 evergreen + 40 pillar-specific)", () => {
    const ideas = generateAllRawIdeas();
    expect(ideas.length).toBeGreaterThanOrEqual(80);
  });

  it("every generated social idea starts from a buyer question", () => {
    for (const idea of generateAllRawIdeas()) {
      expect(idea.headline.endsWith("?"), `${idea.pillar}: ${idea.headline}`).toBe(true);
    }
  });

  it("active-channel variants keep the buyer question first and contain no em/en dashes", () => {
    for (const idea of generateAllRawIdeas().slice(0, 250)) {
      const entry = draftQueueEntry(idea, ["linkedin", "facebook"]);
      for (const channel of ["linkedin", "facebook"] as const) {
        const text = entry.channels[channel]!.text;
        const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
        expect(firstLine.endsWith("?"), `${channel}: ${firstLine}`).toBe(true);
        expect(text).not.toMatch(/[—–]/);
      }
    }
  });
});

/**
 * Regression coverage for a real bug found during the Wix multi-funnel
 * integration (2026-08-17): the "commercial" pillar used to link social
 * posts straight to the raw affiliate URL (preferredUrl(...)), skipping
 * Miloosh entirely — losing analytics/SEO value and reading as affiliate
 * spam. Fixed to link to the Miloosh software page instead, matching
 * every other pillar and the project's own "Miloosh page -> contextual
 * affiliate CTA -> correct funnel" policy.
 */
describe("commercial pillar — links to Miloosh, never straight to a vendor", () => {
  it("every commercial-pillar idea links to a Miloosh /software/ page, not an external URL", () => {
    const commercialIdeas = generateAllRawIdeas().filter((i) => i.pillar === "commercial");
    expect(commercialIdeas.length).toBeGreaterThan(0); // Wix and ElevenLabs are both real, active affiliate programs right now
    for (const idea of commercialIdeas) {
      expect(idea.link).toMatch(/\/software\/[a-z0-9-]+$/);
      expect(idea.link).not.toContain("pxf.io");
      expect(idea.link).not.toContain("try.elevenlabs.io");
    }
  });

  it("includes a commercial idea for Wix, linking to /software/wix (funnel routing happens on that page, not in the social link)", () => {
    const commercialIdeas = generateAllRawIdeas().filter((i) => i.pillar === "commercial");
    const wixIdea = commercialIdeas.find((i) => i.sourceSlugs.includes("wix"));
    expect(wixIdea?.link).toMatch(/\/software\/wix$/);
  });
});

/**
 * Phase 1C (2026-08-17 growth sprint) — platform-native variant
 * differentiation. Before this, LinkedIn and Mastodon rendered
 * byte-identical text for the same idea (both `headline\n\nbody`), which
 * fails the "genuinely native variants" requirement even though every
 * other channel already differed. Regression coverage so a future edit
 * can't silently collapse channels back into one generic template.
 */
describe("renderForChannel (via draftQueueEntry) — platform-native differentiation", () => {
  const idea = generateAllRawIdeas().find((i) => i.pillar === "migration") ?? generateAllRawIdeas()[0]!;

  it("LinkedIn and Mastodon render distinct text for the same idea", () => {
    const entry = draftQueueEntry(idea, ["linkedin", "mastodon"]);
    expect(entry.channels.linkedin!.text).not.toBe(entry.channels.mastodon!.text);
  });

  it("X is headline-only (tight, information-dense, no forced threads)", () => {
    const entry = draftQueueEntry(idea, ["x"]);
    expect(entry.channels.x!.text.startsWith(idea.headline.slice(0, 20))).toBe(true);
    expect(entry.channels.x!.text).not.toContain(idea.body.slice(0, 40));
  });

  it("Facebook adds a conversational CTA the other channels don't have", () => {
    const entry = draftQueueEntry(idea, ["facebook", "linkedin"]);
    expect(entry.channels.facebook!.text).toContain("What's been your experience?");
    expect(entry.channels.linkedin!.text).not.toContain("What's been your experience?");
  });

  it("Bluesky joins headline and body compactly without AI-style dash punctuation", () => {
    const entry = draftQueueEntry(idea, ["bluesky", "linkedin"]);
    expect(entry.channels.bluesky!.text).not.toContain("\n\n");
    expect(entry.channels.bluesky!.text).not.toMatch(/[—–]/);
    expect(entry.channels.linkedin!.text).toContain("\n\n");
  });
});

/**
 * Facebook media backfill (2026-08-20) — the real bug fixed was that every
 * queue entry generated before 2026-08-17 had channels.facebook.imageUrl:
 * null even for pillars IMAGE_KIND_BY_PILLAR already covers, because the
 * card route existed but nothing called it yet at generation time. This
 * is regression coverage for the two things that must both keep holding:
 * every NEW Facebook variant for a card-eligible pillar gets a real,
 * trusted imageUrl at draft time (so the historical gap can't reopen),
 * and the deliberately text-only pillars stay that way.
 */
describe("Facebook media eligibility — every card-eligible pillar gets a real imageUrl at draft time", () => {
  const eligiblePillars = Object.keys(IMAGE_KIND_BY_PILLAR) as ContentPillar[];
  const textOnlyPillars: ContentPillar[] = ["buyer_education", "trust_methodology"];

  it.each(eligiblePillars)("pillar '%s' produces a Facebook variant with a trusted card imageUrl", (pillar) => {
    const idea = generateAllRawIdeas().find((i) => i.pillar === pillar);
    expect(idea, `no generated idea found for pillar ${pillar} — cannot assert its Facebook image behavior`).toBeDefined();
    const entry = draftQueueEntry(idea!, ["facebook"]);
    const fb = entry.channels.facebook!;
    expect(fb.imageUrl).not.toBeNull();
    expect(fb.imageUrl!.startsWith(`${SITE_URL}/api/social/card?`)).toBe(true);
    expect(fb.imageUrl).toContain(`kind=${IMAGE_KIND_BY_PILLAR[pillar]}`);
    expect(fb.imageUrl).toContain("size=facebook");
    expect(fb.altText).toContain(idea!.headline);
  });

  it.each(textOnlyPillars)("deliberately text-only pillar '%s' still gets no imageUrl (not a bug, a design choice)", (pillar) => {
    const idea = generateAllRawIdeas().find((i) => i.pillar === pillar);
    expect(idea, `no generated idea found for pillar ${pillar}`).toBeDefined();
    const entry = draftQueueEntry(idea!, ["facebook"]);
    expect(entry.channels.facebook!.imageUrl).toBeNull();
    expect(entry.channels.facebook!.altText).toBeNull();
  });

  it("covers every ContentPillar between the eligible and text-only lists — a new pillar can't silently fall through uncovered", () => {
    const allPillars = new Set(generateAllRawIdeas().map((i) => i.pillar));
    for (const pillar of allPillars) {
      const isEligible = eligiblePillars.includes(pillar);
      const isTextOnly = textOnlyPillars.includes(pillar);
      expect(isEligible || isTextOnly, `pillar '${pillar}' is neither in IMAGE_KIND_BY_PILLAR nor the known text-only list — decide its image eligibility explicitly`).toBe(true);
    }
  });

  it("buildCardImageUrlFor returns null for a pillar with no card kind (fails closed, never a broken card URL)", () => {
    expect(buildCardImageUrlFor("buyer_education", "facebook", "headline", "body")).toBeNull();
  });

  it("buildCardImageUrlFor truncates headline/sub the same way regardless of caller (draft-time and backfill-time stay identical)", () => {
    const longHeadline = "x".repeat(200);
    const longBody = "y".repeat(400);
    const url = buildCardImageUrlFor("software_decisions", "facebook", longHeadline, longBody);
    const params = new URL(url!).searchParams;
    expect(params.get("headline")!.length).toBe(140);
    expect(params.get("sub")!.length).toBe(220);
  });
});
