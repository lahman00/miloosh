import { getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { getPublishedComparisonSlugs } from "@/data/comparisons";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getSocialStrategy } from "@/lib/social/strategy";
import { contentHash } from "@/lib/social/dedup";
import type { Channel, SocialQueueEntry } from "@/lib/social/types";
import { ADAPTERS } from "@/lib/social/channels/registry";

/**
 * Phase 11 QA gates — every check runs against real site data or the
 * text itself, never a live network fetch, so QA stays fast and doesn't
 * depend on network reachability from wherever the cron job runs. A
 * queue entry only reaches APPROVED_FOR_AUTO after every enabled
 * channel's variant passes every applicable gate.
 */

export type QaFinding = { severity: "error" | "warning"; channel: Channel | null; message: string };

const KNOWN_STATIC_PATHS = new Set([
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/accessibility",
  "/affiliate-disclosure",
  "/ai-usage",
  "/cookies",
  "/corrections-policy",
  "/disclaimer",
  "/editorial-policy",
  "/sources-policy",
  "/trademark-notice",
  "/compare",
  "/recommend",
  // MILOOSH OVERNIGHT MONSTER mission (2026-08-24) — real gap found:
  // these pages shipped in earlier missions but were never added here,
  // so any social post linking to them would have failed checkLink's
  // "path doesn't exist" gate even though the page is genuinely live.
  "/tools/saas-cost-calculator",
  "/newsletter",
  "/research/saas-pricing-pressure-index-2026",
]);

function isKnownPath(pathname: string): boolean {
  if (KNOWN_STATIC_PATHS.has(pathname)) return true;
  const softwareMatch = pathname.match(/^\/software\/([^/]+)$/);
  if (softwareMatch) return getAllSoftware().some((s) => s.slug === softwareMatch[1]);
  const categoryMatch = pathname.match(/^\/category\/([^/]+)$/);
  if (categoryMatch) return getAllCategories().some((c) => c.slug === categoryMatch[1]);
  const compareMatch = pathname.match(/^\/compare\/([^/]+)$/);
  if (compareMatch) return getPublishedComparisonSlugs().includes(compareMatch[1]);
  return false;
}

/**
 * "URL resolves / page exists" — checked locally against real site data,
 * not a live fetch (see file header). External vendor URLs (e.g. a
 * commercial-pillar affiliate link) are allowed through since this
 * system doesn't control those pages. Deliberately does NOT short-
 * circuit after the first match: a link can legitimately be wrong in
 * more than one way at once (e.g. a localhost URL that also happens to
 * point at an internal-only path), and surfacing every real problem is
 * more useful than only the first one found.
 */
function checkLink(link: string | null, channel: Channel, findings: QaFinding[]): void {
  if (!link) return;
  if (link.includes("localhost") || link.includes("127.0.0.1")) {
    findings.push({ severity: "error", channel, message: `Link contains localhost/127.0.0.1: ${link}` });
  }
  if (link.includes("/internal/")) {
    findings.push({ severity: "error", channel, message: `Link points at an internal-only path: ${link}` });
  }
  if (link.startsWith(SITE_URL)) {
    const pathname = link.slice(SITE_URL.length).split("?")[0] || "/";
    if (!isKnownPath(pathname)) {
      findings.push({ severity: "error", channel, message: `Link points at a Miloosh path that doesn't exist: ${pathname}` });
    }
  } else if (!link.includes("localhost") && !link.includes("127.0.0.1")) {
    try {
      new URL(link);
    } catch {
      findings.push({ severity: "error", channel, message: `Link is not a valid absolute URL: ${link}` });
    }
  }
}

function checkStaleClaim(entry: SocialQueueEntry, channel: Channel, text: string, findings: QaFinding[]): void {
  if (entry.pillar !== "pricing_intelligence" && entry.pillar !== "commercial") return;
  const slug = entry.sourceSlugs[0];
  if (!slug) return;
  const software = getAllSoftware().find((s) => s.slug === slug);
  if (!software) {
    findings.push({ severity: "error", channel, message: `Source software "${slug}" no longer exists in the catalog — drop this post.` });
    return;
  }
  const price = software.pricing?.startingPrice;
  if (price && !text.includes(price)) {
    findings.push({ severity: "warning", channel, message: `Post cites pricing for ${software.name} but the current catalog price ("${price}") doesn't appear in the drafted text — re-draft before publishing, the source data may have changed.` });
  }
}

function checkSecretsAndPrivateData(text: string, channel: Channel, findings: QaFinding[]): void {
  const patterns: Array<[RegExp, string]> = [
    [/[A-Za-z0-9_-]*ACCESS_TOKEN[A-Za-z0-9_-]*/i, "text appears to contain an ACCESS_TOKEN-shaped string"],
    [/BLOB_READ_WRITE_TOKEN/i, "text contains BLOB_READ_WRITE_TOKEN"],
    [/sk-[A-Za-z0-9]{16,}/, "text contains a string shaped like a secret API key (sk-...)"],
    [/-----BEGIN [A-Z ]+-----/, "text contains what looks like a private key block"],
  ];
  for (const [pattern, message] of patterns) {
    if (pattern.test(text)) findings.push({ severity: "error", channel, message });
  }
}

function checkHashtags(hashtags: string[], channel: Channel, findings: QaFinding[]): void {
  for (const tag of hashtags) {
    if (!/^#[A-Za-z0-9]+$/.test(tag)) {
      findings.push({ severity: "error", channel, message: `Malformed hashtag: "${tag}"` });
    }
  }
}

function checkBrandName(text: string, channel: Channel, findings: QaFinding[]): void {
  const misspellings = ["Milosh", "MiLoosh", "Milloosh", "Mylosh"];
  for (const bad of misspellings) {
    if (text.includes(bad)) findings.push({ severity: "error", channel, message: `Brand name misspelled as "${bad}" — should be "${SITE_NAME}".` });
  }
}

function checkAffiliateDisclosure(entry: SocialQueueEntry, text: string, channel: Channel, findings: QaFinding[]): void {
  const strategy = getSocialStrategy();
  if (!strategy.affiliateDisclosurePolicy.required) return;
  if (entry.pillar !== "commercial") return;
  const hasDisclosure = text.includes(strategy.affiliateDisclosurePolicy.shortText) || text.includes(strategy.affiliateDisclosurePolicy.text);
  if (!hasDisclosure) {
    findings.push({ severity: "error", channel, message: "Commercial-pillar post is missing the required affiliate disclosure text." });
  }
}

function checkImageRequirements(entry: SocialQueueEntry, channel: Channel, findings: QaFinding[]): void {
  const strategy = getSocialStrategy();
  const variant = entry.channels[channel];
  if (!variant?.imageUrl) return;
  if (strategy.imageRequirements.requireAltText && !variant.altText) {
    findings.push({ severity: "error", channel, message: "Image is attached but alt text is missing." });
  }
}

/**
 * CHANNEL GATE — catches identical cross-posting between channels on the
 * SAME entry (e.g. the LinkedIn and Facebook variant of one post being
 * byte-for-byte the same text). Distinct from checkDuplicate below, which
 * compares against OTHER entries in the queue. A single entry legitimately
 * having distinct per-channel copy is enforced upstream by
 * content-engine.ts's per-channel renderForChannel switch — this is the
 * QA-time check that upstream design actually held.
 */
function checkCrossChannelDuplication(entry: SocialQueueEntry, findings: QaFinding[]): void {
  const texts = (Object.keys(entry.channels) as Channel[])
    .map((channel) => ({ channel, text: entry.channels[channel]?.text?.trim() }))
    .filter((v): v is { channel: Channel; text: string } => Boolean(v.text));

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      if (texts[i]!.text === texts[j]!.text) {
        findings.push({
          severity: "warning",
          channel: texts[j]!.channel,
          message: `${texts[i]!.channel} and ${texts[j]!.channel} have byte-identical text — each channel should get platform-native copy, not a cross-post.`,
        });
      }
    }
  }
}

/** Duplicate-content check against everything already SCHEDULED or PUBLISHED — same contentHash algorithm the publish adapters themselves use, so a QA pass and a live publish attempt agree on what counts as a duplicate. */
function checkDuplicate(text: string, channel: Channel, existingQueue: SocialQueueEntry[], findings: QaFinding[]): void {
  const hash = contentHash(channel, text);
  const alreadyUsed = existingQueue.some((e) => {
    if (e.state !== "PUBLISHED" && e.state !== "SCHEDULED") return false;
    return e.channels[channel]?.publishResult?.contentHash === hash || contentHash(channel, e.channels[channel]?.text ?? "") === hash;
  });
  if (alreadyUsed) {
    findings.push({ severity: "error", channel, message: "Identical content already scheduled or published to this channel." });
  }
}

/** Runs every gate for every channel variant on an entry. Returns all findings; the caller decides the resulting queue state (errors block APPROVED_FOR_AUTO, warnings don't). */
export function runQaGates(entry: SocialQueueEntry, existingQueue: SocialQueueEntry[]): QaFinding[] {
  const findings: QaFinding[] = [];

  checkCrossChannelDuplication(entry, findings);

  for (const channelKey of Object.keys(entry.channels) as Channel[]) {
    const variant = entry.channels[channelKey];
    if (!variant) continue;
    const adapter = ADAPTERS[channelKey];

    if (variant.text.length > adapter.charLimit) {
      findings.push({ severity: "error", channel: channelKey, message: `Text is ${variant.text.length} chars, over the ${adapter.charLimit}-char limit for ${channelKey}.` });
    }
    checkLink(variant.link, channelKey, findings);
    checkStaleClaim(entry, channelKey, variant.text, findings);
    checkSecretsAndPrivateData(variant.text, channelKey, findings);
    checkHashtags(variant.hashtags, channelKey, findings);
    checkBrandName(variant.text, channelKey, findings);
    checkAffiliateDisclosure(entry, variant.text, channelKey, findings);
    checkImageRequirements(entry, channelKey, findings);
    checkDuplicate(variant.text, channelKey, existingQueue, findings);
  }

  return findings;
}

export function qaPassed(findings: QaFinding[]): boolean {
  return !findings.some((f) => f.severity === "error");
}
