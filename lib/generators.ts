import type { FaqItem, Software } from "@/data/software";
import { getSoftwareFaqItems } from "@/lib/faq";

export function generateTitle(software: Software): string {
  return `Best ${software.name} Alternatives`;
}

export function generateH1(software: Software): string {
  return `Best ${software.name} alternatives`;
}

/**
 * SERP snippets get cut off past ~155-160 chars — truncate at a word
 * boundary rather than mid-word. Exported so lib/comparison.ts's
 * generateComparisonMetaDescription can reuse the same cap and algorithm
 * instead of duplicating it.
 */
export const META_DESCRIPTION_MAX_LENGTH = 155;

export function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const atWord = (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trimEnd();
  // A description that's one long comma-joined sentence (the norm for this
  // catalog — real vendor facts rarely land on an early period) can cut
  // right after a comma/semicolon/colon, reading as "...manage sales," — a
  // dangling list separator right before the ellipsis is more jarring than
  // ending on a plain word, so strip it.
  return `${atWord.replace(/[,;:]+$/, "")}…`;
}

/**
 * ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Track C real
 * finding: the previous version (2026-08-21 fix) put the CTA LAST,
 * appended only when the combined text fit — but the CTA text itself
 * ("Compare N real alternatives to find the best fit for your team.",
 * ~55-70 chars) rarely leaves enough of the 155-char budget for a real
 * product description (this catalog's descriptions run 100-140 chars),
 * so the CTA was silently dropped almost universally: 244 of 247
 * software pages' meta descriptions never mentioned "alternative" at
 * all — despite every one of those pages' own <title> being "Best {X}
 * Alternatives". Real cached Search Console evidence (var/agents/
 * gsc-opportunity-mining.json) shows exactly the symptom this produces:
 * decent impressions on alternatives-intent queries ("clickup
 * alternatives", "confluence alternative", "postmark alternative") with
 * 0 clicks even at a page-1-adjacent position — a snippet that never
 * reinforces the very intent the searcher typed is a plausible real
 * cause, not proven causally (never claimed as such), but directly
 * actionable and safe: Google does not use meta description as a
 * ranking signal, only as a snippet-selection hint, so this cannot hurt
 * position and can only help CTR.
 *
 * Fixed by putting a short, fixed-length "alternatives" mention FIRST
 * (always fits — every catalog entry has >=1 alternative, confirmed) and
 * the real product description after, still word-boundary-truncated via
 * truncateAtWord (preserving the 2026-08-21 fix's actual goal: never cut
 * off mid-word/mid-sentence for zero benefit).
 */
export function generateMetaDescription(software: Software): string {
  const prefix = `${software.alternatives.length} ${software.name} alternatives compared: `;
  const budget = META_DESCRIPTION_MAX_LENGTH - prefix.length;
  if (software.description.length <= budget) return `${prefix}${software.description}`;
  return `${prefix}${truncateAtWord(software.description, budget)}`;
}

export function generateIntro(software: Software): string {
  return software.description;
}

/** A slightly richer overview combining what it is with who it's positioned for. */
export function generateOverview(software: Software): string {
  return `${software.description} ${software.bestFor}`;
}

/**
 * Use documented product constraints when they exist. This gives buyers a
 * concrete reason to keep comparing instead of repeating the same generic
 * "feature set may not fit" sentence across the catalog. Fall back to the
 * alternatives-only sentence when no sourced constraints are stored.
 */
export function generateWhoShouldntUseIt(software: Software): string {
  if (software.cons && software.cons.length > 0) {
    const constraints = software.cons.slice(0, 2).join(" ");
    return `Reasons to compare alternatives before committing: ${constraints}`;
  }

  const alternativeNames = software.alternatives.map((alt) => alt.name).join(", ");
  return `If ${software.name}'s feature set above doesn't cover what you need, one of the alternatives compared here — ${alternativeNames} — may be a closer fit.`;
}

export function generateComparisonIntro(software: Software): string {
  if (software.alternatives.length === 1) {
    return `See when ${software.alternatives[0].name} is a relevant alternative to ${software.name}, based on use case fit and core strengths.`;
  }
  return `See how the top ${software.name} alternatives compare on use case fit and core strengths.`;
}

function stripTrailingPeriod(text: string): string {
  return text.endsWith(".") ? text.slice(0, -1) : text;
}

/**
 * Data-driven "how to choose" guidance. Used to be fixed boilerplate,
 * identical on all 217 software pages regardless of which alternatives
 * they actually list — real Search Console data (Operation First Click,
 * 2026-08-14) showed the overwhelming majority of this site's real search
 * impressions are "[product] alternatives"/"[product] vs [competitor]"
 * queries, which this generic text did nothing to address. Now names each
 * real listed alternative and its own sourced `bestFor` field verbatim
 * (not spliced into a lowercased sentence — comparison.ts's
 * generateWhoShouldChoose hit exactly this bug before: some bestFor text
 * starts with the product's own name, e.g. "HubSpot positions...", and a
 * naive first-letter lowercase mangles it into "hubSpot positions...").
 */
export function generateChoosingGuide(software: Software): string {
  const platformsNote = software.platforms?.length
    ? ` Confirm it runs on the platforms you need (${software.platforms.join(", ")}) before switching.`
    : "";

  if (software.alternatives.length === 0) {
    return `Start with the workflow you need to improve. Compare ease of use, collaboration features, integrations, customization, and the effort required to migrate your existing data.${platformsNote}`;
  }

  const altSummary = software.alternatives.map((alt) => `${alt.name} (${stripTrailingPeriod(alt.bestFor)})`).join("; ");

  return `Before switching to ${software.name}, weigh it against its listed alternatives: ${altSummary}. Compare each against the workflow you actually run today — integrations, customization, and the effort required to migrate your existing data usually matter more than headline features.${platformsNote}`;
}

export function generateFaq(software: Software): FaqItem[] {
  if (software.faq && software.faq.length > 0) {
    return software.faq;
  }
  return getSoftwareFaqItems(software);
}
