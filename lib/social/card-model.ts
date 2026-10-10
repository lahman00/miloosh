import { SITE_URL } from "@/lib/site";

/** Cache-bust pre-redesign social images that third-party networks retain. */
export const SOCIAL_CARD_VERSION = "20261011-warm-v2";

export function versionSocialCardUrl(raw: string | null): string | null {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    const allowedOrigins = new Set([new URL(SITE_URL).origin, "https://miloosh.com", "https://www.miloosh.com"]);
    if (!allowedOrigins.has(url.origin) || url.pathname !== "/api/social/card") return raw;
    url.searchParams.set("v", SOCIAL_CARD_VERSION);
    return url.toString();
  } catch {
    return raw;
  }
}

export type CardKind =
  | "comparison" | "switching" | "pricing"
  | "alternatives" | "research" | "category" | "default";

export type CardCopy = {
  kind: CardKind;
  badge: string;
  headline: string;
  subtitle: string;
  left?: string;
  right?: string;
  price?: string;
  alternatives?: string[];
  count?: string;
  category?: string;
};

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function compactText(text: string, max: number): string {
  const value = normalized(text);
  if (value.length <= max) return value;
  const cutoff = value.slice(0, max - 1);
  const lastSpace = cutoff.lastIndexOf(" ");
  return cutoff.slice(0, lastSpace >= max * 0.55 ? lastSpace : max - 1).replace(/[\s,;:–-]+$/, "") + "…";
}

function completeSentence(text: string, max = 100): string {
  const clean = normalized(text);
  const first = clean.match(/^(.+?[.!?])(?:\s|$)/)?.[1];
  return first && first.length <= max ? first : "";
}

export function buildCardCopy(args: {
  kind?: string | null;
  headline?: string | null;
  sub?: string | null;
  badge?: string | null;
}): CardCopy {
  const kind: CardKind = (
    ["comparison", "switching", "pricing", "alternatives", "research", "category"].includes(args.kind ?? "")
      ? args.kind : "default"
  ) as CardKind;
  const headline = normalized(args.headline || "Make a better software decision");
  const sub = normalized(args.sub ?? "");
  const badge = compactText(args.badge || {
    comparison: "COMPARISON",
    switching: "SWITCHING",
    pricing: "PRICING",
    alternatives: "ALTERNATIVES",
    research: "RESEARCH",
    category: "CATEGORY",
    default: "SOFTWARE RESEARCH",
  }[kind], 24).toUpperCase();

  if (kind === "comparison") {
    const direct = headline.match(/^(.+?)\s+vs\.?\s+(.+?)(?::\s*(.+))?$/i);
    const question = headline.match(/^Should you choose\s+(.+?)\s+or\s+(.+?)\?$/i);
    const names = direct ?? question;
    if (names) {
      return {
        kind, badge,
        headline: compactText(headline, 100),
        left: compactText(names[1]!, 32),
        right: compactText(names[2]!, 32),
        subtitle: direct?.[3]
          ? compactText(direct[3].replace(/^./, (c) => c.toUpperCase()), 64)
          : "Which one fits your team?",
      };
    }
  }
  if (kind === "switching") {
    const match = headline.match(/from\s+(.+?)\s+to\s+([^?.,]+)/i);
    if (match) return {
      kind, badge, headline: compactText(headline, 92),
      left: compactText(match[1]!, 32), right: compactText(match[2]!, 32),
      subtitle: "Compare migration trade-offs before you switch.",
    };
  }
  if (kind === "category") {
    const match = headline.match(/^(\d+)\s+(.+?)\s+tools\b/i);
    if (match) return {
      kind, badge, headline: compactText(headline, 90),
      count: match[1], category: compactText(match[2]!, 46),
      subtitle: "Compare your options with source-linked research.",
    };
  }
  if (kind === "alternatives") {
    const alternatives = sub.split(";").map((item) => item.trim().replace(/\s*\([^)]*\).*$/, "")).filter(Boolean);
    if (alternatives.length >= 2) return {
      kind, badge, headline: compactText(headline, 85),
      subtitle: "Shortlist the options that fit.",
      alternatives: alternatives.slice(0, 3).map((item) => compactText(item, 40)),
    };
  }
  if (kind === "pricing") {
    const match = (headline + " " + sub).match(/\$\d[\d,.]*(?:\/\w+)?/);
    return {
      kind, badge, headline: compactText(headline, 90),
      subtitle: "Verify current plans and pricing at the source.",
      price: match?.[0],
    };
  }
  return {
    kind: kind === "comparison" || kind === "switching" ? "default" : kind,
    badge, headline: compactText(headline, 88),
    subtitle: completeSentence(sub, 104) || (
      kind === "research" ? "Evidence, sources and dates — not just opinions." : "Independent, source-linked software research."
    ),
  };
}
