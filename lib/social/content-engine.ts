import { randomUUID } from "node:crypto";
import { getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { formatIsoDate } from "@/lib/date";
import { SITE_URL } from "@/lib/site";
import { getSocialStrategy } from "@/lib/social/strategy";
import {
  BUYER_EDUCATION_CONCEPTS,
  TRUST_METHODOLOGY_CONCEPTS,
} from "@/lib/social/pillars";
import { BUYER_INTENT_CONCEPTS } from "@/lib/social/buyer-intent";
import {
  CHANNELS,
  type Channel,
  type ChannelVariant,
  type ContentPillar,
  type SocialQueueEntry,
} from "@/lib/social/types";
import { ADAPTERS } from "@/lib/social/channels/registry";

/**
 * Content engine — generates IDEA-state queue entries from real Miloosh
 * data only. Every factual claim traces back to sourceSlugs (a software
 * slug, a "a-vs-b" comparison pair, or a category slug) so nothing here
 * is invented; see PHASE 4 of the build brief ("Never invent product
 * facts"). Buyer-education and trust/methodology posts (pillars E and H)
 * draw from lib/social/pillars.ts's hand-written evergreen bank instead,
 * since those are general statements, not per-product claims.
 */

type RawIdea = {
  pillar: ContentPillar;
  topic: string;
  sourceSlugs: string[];
  headline: string;
  body: string;
  link: string | null;
};

function url(pathname: string): string {
  return `${SITE_URL}${pathname}`;
}

// ---- Pillar A: Software Decisions (from published comparisons) --------
function ideasFromComparisons(): RawIdea[] {
  const software = new Map(getAllSoftware().map((s) => [s.slug, s]));
  const ideas: RawIdea[] = [];
  for (const [aSlug, bSlug] of PUBLISHED_COMPARISONS) {
    const a = software.get(aSlug);
    const b = software.get(bSlug);
    if (!a || !b) continue;
    const slug = getComparisonSlug(aSlug, bSlug);
    ideas.push({
      pillar: "software_decisions",
      topic: `decision-${slug}`,
      sourceSlugs: [slug],
      headline: `Should you choose ${a.name} or ${b.name}?`,
      body: `${a.name} best fits: ${a.bestFor} ${b.name} best fits: ${b.bestFor} The right pick depends on which of those matches how your team actually works, not which tool has more features.`,
      link: url(`/compare/${slug}`),
    });
  }
  return ideas;
}

// ---- Pillar B: Pricing Intelligence (from real pricing data only — no invented figures) --
function ideasFromPricing(): RawIdea[] {
  return getAllSoftware()
    .filter((s) => s.pricing?.startingPrice || s.pricing?.model)
    .map((s) => {
      const priceFact = s.pricing?.startingPrice
        ? `starts at ${s.pricing.startingPrice}${s.pricing.hasFreeTier ? ", with a free tier available" : ""}`
        : s.pricing?.model === "free"
          ? "is completely free"
          : s.pricing?.model === "open_source"
            ? "is open source"
            : s.pricing?.hasFreeTier
              ? "has a free tier, with paid plans above it (exact pricing not published in a fixed rate)"
              : "uses custom/quote-based pricing, not a published fixed rate";
      return {
        pillar: "pricing_intelligence" as const,
        topic: `pricing-${s.slug}`,
        sourceSlugs: [s.slug],
        headline: `What does ${s.name} really cost?`,
        body: `${s.name} ${priceFact}. Verified ${formatIsoDate(s.accessedAt)} — pricing pages change often, so we check the vendor's own page directly rather than relying on a stale aggregator.`,
        link: url(`/software/${s.slug}`),
      };
    });
}

// ---- Pillar C: Alternatives (from each product's own alternatives[]) --
function ideasFromAlternatives(): RawIdea[] {
  return getAllSoftware()
    .filter((s) => s.alternatives.length >= 2)
    .map((s) => {
      const picks = s.alternatives.slice(0, 3);
      const list = picks
        .map((alt) => `${alt.name} (${alt.bestFor.replace(/\.$/, "")})`)
        .join("; ");
      return {
        pillar: "alternatives" as const,
        topic: `alternatives-${s.slug}`,
        sourceSlugs: [s.slug, ...picks.map((p) => p.slug)],
        headline: `What should you use instead of ${s.name}?`,
        body: `${list}. There's no single "best ${s.name} alternative" — the right one depends on which constraint actually matters to you.`,
        link: url(`/software/${s.slug}`),
      };
    });
}

// ---- Pillar D: Migration (from comparison pairs with differing pricing models) --
function ideasFromMigration(): RawIdea[] {
  const software = new Map(getAllSoftware().map((s) => [s.slug, s]));
  const ideas: RawIdea[] = [];
  for (const [aSlug, bSlug] of PUBLISHED_COMPARISONS) {
    const a = software.get(aSlug);
    const b = software.get(bSlug);
    if (!a || !b) continue;
    const checks: string[] = [];
    if (a.pricing?.model !== b.pricing?.model)
      checks.push(
        `pricing model (${a.pricing?.model ?? "unknown"} vs ${b.pricing?.model ?? "unknown"})`,
      );
    if (
      (a.platforms?.length ?? 0) > 0 &&
      (b.platforms?.length ?? 0) > 0 &&
      a.platforms!.join(",") !== b.platforms!.join(",")
    )
      checks.push("platform support");
    checks.push("what data actually exports cleanly");
    checks.push("which integrations you'd need to rebuild");
    if (checks.length < 2) continue;
    const slug = getComparisonSlug(aSlug, bSlug);
    ideas.push({
      pillar: "migration",
      topic: `migration-${slug}`,
      sourceSlugs: [slug],
      headline: `Is it worth switching from ${a.name} to ${b.name}?`,
      body: `Before switching: ${checks.slice(0, 4).join(", ")}. The subscription price is rarely the real cost of a migration.`,
      link: url(`/compare/${slug}`),
    });
  }
  return ideas;
}

// ---- Pillar F: Miloosh Research (from real freshness/data-verification facts) --
function ideasFromResearch(): RawIdea[] {
  const recentlyVerified = getAllSoftware()
    .slice()
    .sort((a, b) => b.accessedAt.localeCompare(a.accessedAt))
    .slice(0, 12);
  return recentlyVerified.map((s) => ({
    pillar: "miloosh_research" as const,
    topic: `research-${s.slug}-${s.accessedAt}`,
    sourceSlugs: [s.slug],
    headline: `How current is ${s.name}'s pricing and feature information?`,
    body: `Every claim on ${s.name}'s page traces back to ${s.sources.length} source${s.sources.length === 1 ? "" : "s"} we checked directly — not a summary of someone else's summary.`,
    link: url(`/software/${s.slug}`),
  }));
}

// ---- Pillar G: Category Discovery (from real category + product counts) --
function ideasFromCategories(): RawIdea[] {
  const software = getAllSoftware();
  return getAllCategories()
    .map((c) => {
      const count = software.filter((s) => s.category === c.slug).length;
      return { category: c, count };
    })
    .filter((c) => c.count >= 3)
    .map(({ category, count }) => ({
      pillar: "category_discovery" as const,
      topic: `category-${category.slug}`,
      sourceSlugs: [category.slug],
      headline: `Which ${category.name.toLowerCase()} tools should you compare?`,
      body: `${category.description} We cover ${count} options in this category — each with sourced pricing, features, and dated verification.`,
      link: url(`/category/${category.slug}`),
    }));
}

// ---- Pillar I: Commercial (only products with a REAL, currently-active affiliate link) --
/**
 * 2026-08-17 — fixed to link to the Miloosh page, not the raw affiliate
 * URL. It used to send social clicks straight to the vendor
 * (preferredUrl(...)), skipping Miloosh entirely — that loses analytics,
 * SEO value, and editorial context, and reads as affiliate spam rather
 * than a real recommendation. The correct flow, per this project's own
 * social policy: Miloosh page -> contextual affiliate CTA -> the right
 * vendor funnel. The page itself (already wired for Wix's four funnels
 * via lib/wix-funnels.ts) is what resolves the actual commercial link.
 */
function ideasFromCommercial(): RawIdea[] {
  const strategy = getSocialStrategy();
  return getAllSoftware()
    .filter((s) => shouldShowAffiliateDisclosure(s))
    .map((s) => ({
      pillar: "commercial" as const,
      topic: `commercial-${s.slug}`,
      sourceSlugs: [s.slug],
      headline: `Is ${s.name} worth considering?`,
      body: `${s.description} ${strategy.ctaPolicy.affiliateCtaSuffix}. ${strategy.affiliateDisclosurePolicy.shortText}`,
      link: url(`/software/${s.slug}`),
    }));
}

// ---- Pillars E and H: evergreen banks (not per-product) ---------------
function ideasFromEvergreen(): RawIdea[] {
  const buyerIntent = BUYER_INTENT_CONCEPTS.map((c) => ({
    pillar: "buyer_education" as const,
    topic: `intent-${c.topic}`,
    sourceSlugs: [] as string[],
    headline: c.headline,
    body: c.body,
    link: url(c.linkPath),
  }));
  const buyerEd = BUYER_EDUCATION_CONCEPTS.map((c) => ({
    pillar: "buyer_education" as const,
    topic: c.topic,
    sourceSlugs: [] as string[],
    headline: c.headline,
    body: c.body,
    link: null,
  }));
  const trust = TRUST_METHODOLOGY_CONCEPTS.map((c) => ({
    pillar: "trust_methodology" as const,
    topic: c.topic,
    sourceSlugs: [] as string[],
    headline: c.headline,
    body: c.body,
    link: url("/sources-policy"),
  }));
  return [...buyerIntent, ...buyerEd, ...trust];
}

export function generateAllRawIdeas(): RawIdea[] {
  return [
    ...ideasFromComparisons(),
    ...ideasFromPricing(),
    ...ideasFromAlternatives(),
    ...ideasFromMigration(),
    ...ideasFromResearch(),
    ...ideasFromCategories(),
    ...ideasFromCommercial(),
    ...ideasFromEvergreen(),
  ];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Reorders any pillar-tagged list (RawIdea at generation time, or
 * SocialQueueEntry at scheduling time — see scripts/social/schedule.ts,
 * 2026-08-17) so consecutive entries never repeat a pillar and
 * high-weight pillars (social-strategy.json's pillarWeights) appear
 * proportionally more often — otherwise, since ideasFromComparisons()
 * alone produces 1107 entries (one per published comparison), any
 * naive "take the first N" selection would be almost entirely one
 * pillar, directly contradicting Phase 7's "Mix... avoid repeating
 * topics too frequently." Weighted round-robin across shuffled
 * per-pillar queues.
 */
export function interleaveByPillarWeight<T extends { pillar: ContentPillar }>(
  ideas: T[],
  weights: Record<ContentPillar, number>,
): T[] {
  const byPillar = new Map<ContentPillar, T[]>();
  for (const idea of ideas) {
    if (!byPillar.has(idea.pillar)) byPillar.set(idea.pillar, []);
    byPillar.get(idea.pillar)!.push(idea);
  }
  for (const [pillar, group] of byPillar) byPillar.set(pillar, shuffle(group));

  // Each pillar gets a "ticket count" proportional to its weight (min 1).
  // Drawn column-major, not row-major: for ticket-slot 0, take one item
  // from every pillar that has at least one ticket; only once every
  // pillar has contributed its slot-0 item do we move to slot 1, and so
  // on. A naive row-major draw (pillar A's 3 tickets back-to-back, then
  // pillar B's) bursts A three times in a row within a single round —
  // this spreads a high-weight pillar's extra tickets across separate
  // passes instead, so a run of 3 for a weight-3 pillar shows up as
  // three separate single picks, not one triple.
  const pillars = [...byPillar.keys()];
  const ticketsPerRound: Record<string, number> = {};
  const maxWeight = Math.max(...pillars.map((p) => weights[p] ?? 1), 1);
  for (const p of pillars)
    ticketsPerRound[p] = Math.max(
      1,
      Math.round(((weights[p] ?? 1) / maxWeight) * 3),
    );
  const maxTickets = Math.max(...Object.values(ticketsPerRound));

  const result: T[] = [];
  let remaining = ideas.length;
  while (remaining > 0) {
    for (let slot = 0; slot < maxTickets; slot++) {
      for (const pillar of pillars) {
        if (ticketsPerRound[pillar]! <= slot) continue;
        const group = byPillar.get(pillar)!;
        if (group.length === 0) continue;
        result.push(group.shift()!);
        remaining -= 1;
      }
    }
  }
  return result;
}

// ---- Platform-native rendering -----------------------------------------
const HASHTAGS_BY_PILLAR: Partial<Record<ContentPillar, string[]>> = {
  software_decisions: ["#SaaS", "#SoftwareComparison"],
  pricing_intelligence: ["#SaaS", "#Pricing"],
  category_discovery: ["#SoftwareTools"],
};

/**
 * Word-boundary truncation with an ellipsis — used to fit a long
 * comparison/migration body into a tight channel's real content budget
 * at DRAFT time, rather than letting the adapter's own defaultFormat()
 * hard-truncate mid-sentence at publish time (which the QA gate
 * correctly flags as an oversized draft — see qa-gates.ts's char-limit
 * check running against the stored, untruncated text).
 */
function fitToBudget(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength - 1).trimEnd()}…`;
}

// Reserves room for the link + separator the channel adapter's own
// defaultFormat() appends at publish time (see channels/types.ts).
const LINK_RESERVE = 40;

/**
 * Which pillars get a generated card image, and which /api/social/card
 * "kind" applies. 2026-08-17: the card route existed but nothing ever
 * called it — every queue entry had imageUrl: null. Scoped to the four
 * card types the growth-sprint brief explicitly named; buyer_education
 * and trust_methodology stay text-only, since those are general
 * statements with no per-product headline pattern for a card to render.
 *
 * 2026-08-18 — LinkedIn visual-system audit: migration now gets its own
 * "switching" kind (was reusing "comparison", which made every migration
 * post look identical to a plain vs-comparison post) and category_discovery
 * now gets "category" (previously text-only) — both card layouts already
 * exist in the route and parse these pillars' real headline text, so this
 * is just turning the mapping on, not inventing a new card type.
 */
export const IMAGE_KIND_BY_PILLAR: Partial<Record<ContentPillar, string>> = {
  pricing_intelligence: "pricing",
  migration: "switching",
  software_decisions: "comparison",
  commercial: "comparison",
  alternatives: "alternatives",
  miloosh_research: "research",
  category_discovery: "category",
};

export const IMAGE_SIZE_BY_CHANNEL: Partial<Record<Channel, string>> = {
  linkedin: "linkedin",
  facebook: "facebook",
  x: "x",
  bluesky: "square",
  mastodon: "square",
  threads: "square",
};

/**
 * Exported so both draft-time rendering (below) and the one-off queue
 * backfill (scripts/social/backfill-media.ts) build the exact same URL
 * from the exact same inputs — one source of truth, not two copies that
 * can drift. Takes headline/body directly (not a RawIdea) so the backfill
 * script can pass headline/body recovered from an already-committed
 * variant's text instead of a live RawIdea it doesn't have.
 */
export function buildCardImageUrlFor(
  pillar: ContentPillar,
  channel: Channel,
  headline: string,
  body: string,
): string | null {
  const kind = IMAGE_KIND_BY_PILLAR[pillar];
  const size = IMAGE_SIZE_BY_CHANNEL[channel];
  if (!kind || !size) return null;
  const params = new URLSearchParams({
    size,
    kind,
    headline: headline.slice(0, 140),
    sub: body.slice(0, 220),
  });
  return `${SITE_URL}/api/social/card?${params.toString()}`;
}

function buildCardImageUrl(idea: RawIdea, channel: Channel): string | null {
  return buildCardImageUrlFor(idea.pillar, channel, idea.headline, idea.body);
}

function renderForChannel(idea: RawIdea, channel: Channel): ChannelVariant {
  const link = idea.link;
  const hashtags = HASHTAGS_BY_PILLAR[idea.pillar] ?? [];
  const budget = ADAPTERS[channel].charLimit - (link ? LINK_RESERVE : 0);
  const imageUrl = buildCardImageUrl(idea, channel);
  const altText = imageUrl ? `Miloosh card: ${idea.headline}` : null;

  let text: string;
  switch (channel) {
    case "linkedin":
      // Buyer-question first: the exact decision question is the hook, then the sourced answer.
      text = fitToBudget(`${idea.headline}\n\n${idea.body}`, budget);
      break;
    case "facebook":
      // Accessible, discussion-friendly.
      text = fitToBudget(
        `${idea.headline}\n\n${idea.body}\n\nWhat's been your experience?`,
        budget,
      );
      break;
    case "x":
      // Tight, high information density — headline only; the body rarely fits alongside a link in 280 chars.
      text = fitToBudget(idea.headline, budget);
      break;
    case "bluesky":
      // Conversational, compact, less corporate: question first, then as much of the answer as fits.
      text = fitToBudget(
        `${idea.headline.replace(/\.$/, "")}: ${idea.body}`,
        budget,
      );
      break;
    case "mastodon":
      // Informational, community-aware, avoid engagement bait — a single
      // line break (not LinkedIn's double) reads denser and less like a
      // performed "hook", matching Mastodon's own posting norms.
      text = fitToBudget(`${idea.headline}\n${idea.body}`, budget);
      break;
    case "threads":
      // Casual expert voice.
      text = fitToBudget(`${idea.headline}\n${idea.body}`, budget);
      break;
    default:
      text = fitToBudget(`${idea.headline}\n\n${idea.body}`, budget);
  }

  // Eyal's buyer-question-first rule (2026-09-08): social copy must never
  // drift back into generic company announcements or AI-style dash punctuation.
  // The first line is a real buying question; em/en dashes are normalized out.
  text = text.replace(/\s*[—–]\s*/g, ": ");

  return { text, link, imageUrl, altText, hashtags, publishResult: null };
}

export function draftQueueEntry(
  idea: RawIdea,
  channels: Channel[],
): SocialQueueEntry {
  const now = new Date().toISOString();
  const entryChannels: Partial<Record<Channel, ChannelVariant>> = {};
  for (const channel of channels) {
    entryChannels[channel] = renderForChannel(idea, channel);
  }
  return {
    id: randomUUID(),
    pillar: idea.pillar,
    topic: idea.topic,
    sourceSlugs: idea.sourceSlugs,
    campaign: null,
    state: "IDEA",
    createdAt: now,
    scheduledFor: null,
    channels: entryChannels,
    qaNotes: [],
    history: [
      {
        state: "IDEA",
        at: now,
        note: "Generated by content-engine.ts from real Miloosh data.",
      },
    ],
  };
}

/**
 * Full pipeline: generate ideas, filter out blocked topics and anything
 * still inside its cooldown window, then draft every enabled channel's
 * variant immediately (IDEA and DRAFTED collapse into one step here —
 * QA is the next, separate gate, run by qa-gates.ts before anything can
 * reach APPROVED_FOR_AUTO).
 */
export function generateDraftedQueueEntries(
  existingTopicLastUsed: Map<string, string>,
): SocialQueueEntry[] {
  const strategy = getSocialStrategy();
  const enabledChannels = CHANNELS.filter(
    (c) => strategy.enabledChannels[c] || c === "linkedin" || c === "reddit",
  ); // LinkedIn/Reddit always drafted for manual use even when "enabled" toggle is about automation
  const cooldownMs = strategy.topicRepeatCooldownDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const filtered = generateAllRawIdeas().filter((idea) => {
    if (strategy.blockedTopics.includes(idea.topic)) return false;
    const lastUsed = existingTopicLastUsed.get(idea.topic);
    if (!lastUsed) return true;
    return now - new Date(lastUsed).getTime() > cooldownMs;
  });
  const ideas = interleaveByPillarWeight(filtered, strategy.pillarWeights);

  const entries = ideas.map((idea) => draftQueueEntry(idea, enabledChannels));
  for (const entry of entries) entry.state = "DRAFTED";
  for (const entry of entries)
    entry.history.push({
      state: "DRAFTED",
      at: entry.createdAt,
      note: "Channel variants rendered for all enabled channels.",
    });
  return entries;
}
