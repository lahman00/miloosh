import { getAllCategories } from "@/data/categories";
import { getPublishedComparisonSlugs } from "@/data/comparisons";
import { getAllSoftware } from "@/data/software";
import { SITE_URL } from "@/lib/site";
import { SOCIAL_BRAND_VERSION } from "@/lib/brand";
import { withCurrentSocialBrand } from "@/lib/social/brand-version";
import type { ChannelVariant, SocialQueueEntry } from "@/lib/social/types";

const CARD_KIND_BY_PILLAR: Partial<Record<SocialQueueEntry["pillar"], string>> = {
  pricing_intelligence: "pricing",
  migration: "switching",
  software_decisions: "comparison",
  commercial: "comparison",
  alternatives: "alternatives",
  miloosh_research: "research",
  category_discovery: "category",
};

const STATIC_PATHS = new Set(["/", "/about", "/affiliate-disclosure", "/sources-policy", "/compare", "/recommend"]);
const AI_TEMPLATE_PHRASES = ["in today's fast-paced", "unlock the power of", "game-changer", "let's dive in", "look no further", "revolutioniz"];

export function isKnownPublicMilooshPath(pathname: string): boolean {
  if (STATIC_PATHS.has(pathname)) return true;
  const software = pathname.match(/^\/software\/([^/]+)$/)?.[1];
  if (software) return getAllSoftware().some((item) => item.slug === software);
  const category = pathname.match(/^\/category\/([^/]+)$/)?.[1];
  if (category) return getAllCategories().some((item) => item.slug === category);
  const comparison = pathname.match(/^\/compare\/([^/]+)$/)?.[1];
  return Boolean(comparison && getPublishedComparisonSlugs().includes(comparison));
}

export function prepareLinkedInVariant(entry: SocialQueueEntry): ChannelVariant | null {
  const variant = entry.channels.linkedin;
  if (!variant) return null;
  if (variant.imageUrl) return { ...variant, imageUrl: withCurrentSocialBrand(variant.imageUrl) };
  if (!CARD_KIND_BY_PILLAR[entry.pillar]) return variant;
  const [headline = variant.text, ...rest] = variant.text.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  const params = new URLSearchParams({ brand: SOCIAL_BRAND_VERSION, size: "linkedin", kind: CARD_KIND_BY_PILLAR[entry.pillar]!, headline: headline.slice(0, 140), sub: rest.join(" ").slice(0, 220) });
  return { ...variant, imageUrl: `${SITE_URL}/api/social/card?${params.toString()}`, altText: variant.altText ?? `Miloosh editorial card: ${headline}` };
}

export function linkedinPublishIssues(entry: SocialQueueEntry, variant: ChannelVariant): string[] {
  const issues: string[] = [];
  const text = variant.text.trim();
  const lower = text.toLowerCase();
  if (text.length < 80) issues.push("LinkedIn copy is too thin (under 80 characters).");
  if (text.length > 3000) issues.push("LinkedIn copy exceeds 3,000 characters.");
  if (/\b(?:todo|tbd|placeholder|lorem ipsum|debug|fixme)\b/i.test(text)) issues.push("Copy contains placeholder or debug language.");
  if (AI_TEMPLATE_PHRASES.some((phrase) => lower.includes(phrase))) issues.push("Copy contains obvious AI-template language.");
  if ((text.match(/\p{Extended_Pictographic}/gu) ?? []).length > 2) issues.push("Copy contains more than two emojis.");
  if (variant.hashtags.length > 3) issues.push("Copy has more than three hashtags.");
  if (/\b(?:brevo|miro)\b/i.test(text) && /\b(?:affiliate|commission|partner payout|exclusive discount)\b/i.test(text)) issues.push("Copy makes an unsupported Brevo/Miro affiliate claim.");
  if (/\b(?:guaranteed savings?|lowest price|best price|\d+% commission)\b/i.test(text)) issues.push("Copy contains an unsupported promotional or commission claim.");
  if (/Need Go Home|NeeGoHome/i.test(text)) issues.push("Copy contains stale Need Go Home branding.");

  if (variant.link) {
    try {
      const link = new URL(variant.link);
      if (link.origin !== SITE_URL || !isKnownPublicMilooshPath(link.pathname)) issues.push("Destination is not a known public Miloosh route.");
    } catch {
      issues.push("Destination URL is malformed.");
    }
  }
  if (variant.imageUrl && !variant.imageUrl.startsWith(`${SITE_URL}/api/social/card?`)) issues.push("Image URL is not the trusted Miloosh social-card route.");
  if (variant.imageUrl && !variant.altText) issues.push("Image is missing alt text.");
  return issues;
}
