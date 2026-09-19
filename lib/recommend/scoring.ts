import type { Software } from "@/data/software";
import type { RecommendationAnswers, ScoreFactor, ScoringResult } from "@/lib/recommend/types";
import { getDomainMeta } from "@/lib/recommend/domains";
import {
  AI_KEYWORDS,
  ANY_SIZE_KEYWORDS,
  DIFFICULTY_KEYWORDS,
  EMBED_KEYWORDS,
  MIGRATE_KEYWORDS,
  getCompanyStageKeywords,
  getTeamSizeKeywords,
  matchesAny,
} from "@/lib/recommend/keywords";

/**
 * Sprint 10 Phase 1-2, rebuilt 2026-08-21 — the deterministic scoring
 * engine. No LLM, no external API, no invented facts: every factor below
 * is computed from a real field already in data/software/*.json
 * (category, pricing.model, platforms) or a real text search over stored
 * strings (features/description/bestFor, see lib/recommend/keywords.ts).
 * Every point value is a named constant with a comment explaining it —
 * "no black box" per Phase 2. Full formula writeup in
 * docs/recommendation-engine.md.
 *
 * `industry` is intentionally never scored — see lib/recommend/types.ts.
 *
 * Rebuild note: the original 5-domain "category needs" keyword-matching
 * scorer is gone. It's replaced by two things working together:
 * lib/recommend/eligibility.ts (a hard gate — a product outside the
 * selected domain is never even passed to this file, see
 * lib/recommend/engine.ts), and scorePrimaryNeed below (a flat, honest
 * "you asked for X, this is categorized as X" credit for every product
 * that already passed that gate). No keyword-guessing "might also
 * mention X" partial credit anymore — a product either has real
 * evidence for the domain (data/recommend/product-profiles.ts) or it's
 * never scored for it at all.
 *
 * Phase 6: this file's only export, `scoreSoftwareForAnswers`, has the
 * exact shape of `ScoringStrategy` (lib/recommend/types.ts) — a future
 * AI-based scorer is a drop-in replacement behind that same signature.
 */

const POINTS = {
  PRIMARY_NEED_MATCH: 30,
  AI_MATCH: 15,
  AI_MISMATCH: -15,
  BUDGET_FREE_MATCH: 12,
  BUDGET_FREE_PARTIAL: 6,
  BUDGET_FREE_MISMATCH: -10,
  BUDGET_LOW_MATCH: 10,
  BUDGET_LOW_MISMATCH: -6,
  TEAM_SIZE_MATCH: 10,
  COMPANY_STAGE_MATCH: 8,
  WORK_STYLE_REMOTE_MATCH: 8,
  WORK_STYLE_REMOTE_MISMATCH: -5,
  INTEGRATION_MATCH: 6,
  INTEGRATION_MISMATCH: -5,
  DIFFICULTY_MATCH: 8,
  DIFFICULTY_MISMATCH: -6,
  // Small text-evidence signal, below domain (30) and team-size (10) fit.
  // Award once, regardless of keyword count; absence never subtracts points.
  ECOMMERCE_SITUATION_MATCH: 6,
} as const;

function searchableText(software: Software): string {
  return [software.name, software.description, software.bestFor, ...software.features].join(" ");
}

function scoreEmbedFit(answers: RecommendationAnswers, text: string): ScoreFactor[] {
  if (answers.primaryNeed !== "ecommerce_platform" || answers.ecommerceSituation !== "embed" || !matchesAny(text, EMBED_KEYWORDS)) return [];
  return [{
    label: "Stored text describes embedded commerce",
    points: POINTS.ECOMMERCE_SITUATION_MATCH,
    direction: "positive",
    explanation: "Its own stored description/features mention embedding commerce in an existing website. Check compatibility with your actual site; this is a text signal, not a verified integration.",
  }];
}

function scoreMigrationFit(answers: RecommendationAnswers, text: string): ScoreFactor[] {
  if (answers.primaryNeed !== "ecommerce_platform" || answers.ecommerceSituation !== "migrate" || !matchesAny(text, MIGRATE_KEYWORDS)) return [];
  return [{
    label: "Stored text mentions migration",
    points: POINTS.ECOMMERCE_SITUATION_MATCH,
    direction: "positive",
    explanation: "Its own stored positioning/features mention migration. This does not confirm that your products, orders, customers or URLs can move safely.",
  }];
}

/**
 * By the time this runs, lib/recommend/engine.ts has already filtered out
 * every product that isn't in data/recommend/product-profiles.ts for
 * answers.primaryNeed (see lib/recommend/eligibility.ts) — so every
 * product reaching this function has real, checked evidence for the
 * domain. This is a flat credit for that fact, not a re-check of it.
 */
function scorePrimaryNeed(answers: RecommendationAnswers): ScoreFactor[] {
  if (!answers.primaryNeed) return [];
  const label = getDomainMeta(answers.primaryNeed).label.toLowerCase();
  return [
    {
      label: `Matches what you're trying to do`,
      points: POINTS.PRIMARY_NEED_MATCH,
      direction: "positive",
      explanation: `You said you want to ${label} — this product has real, checked evidence for that.`,
    },
  ];
}

function scoreAi(software: Software, answers: RecommendationAnswers, text: string): ScoreFactor[] {
  if (!answers.needsAi) return [];

  if (matchesAny(text, AI_KEYWORDS)) {
    return [
      {
        label: "Has AI features",
        points: POINTS.AI_MATCH,
        direction: "positive",
        explanation: "You asked for AI capabilities — its stored features/description mention AI.",
      },
    ];
  }

  return [
    {
      label: "No AI features found",
      points: POINTS.AI_MISMATCH,
      direction: "negative",
      explanation: "You asked for AI capabilities — no stored feature or description text mentions AI for this product.",
    },
  ];
}

function scoreBudget(software: Software, answers: RecommendationAnswers): ScoreFactor[] {
  const model = software.pricing?.model;

  if (answers.budget === "flexible" || answers.budget === "unspecified") return [];

  if (!model || model === "unknown") {
    return [
      {
        label: "Pricing model not documented",
        points: 0,
        direction: "informational",
        explanation: "This product's pricing model isn't in our verified dataset yet, so budget fit couldn't be scored either way.",
      },
    ];
  }

  if (answers.budget === "free") {
    if (model === "free" || model === "open_source") {
      return [
        {
          label: "Fits a free budget",
          points: POINTS.BUDGET_FREE_MATCH,
          direction: "positive",
          explanation: `You need a free option — stored pricing model is "${model}".`,
        },
      ];
    }
    if (model === "freemium") {
      return [
        {
          label: "Has a free tier",
          points: POINTS.BUDGET_FREE_PARTIAL,
          direction: "positive",
          explanation: 'You need a free option — stored pricing model is "freemium" (free tier plus paid plans).',
        },
      ];
    }
    return [
      {
        label: "Paid only",
        points: POINTS.BUDGET_FREE_MISMATCH,
        direction: "negative",
        explanation: 'You need a free option — stored pricing model is "paid," with no documented free tier.',
      },
    ];
  }

  // budget === "low"
  if (model === "free" || model === "open_source" || model === "freemium" || software.pricing?.hasFreeTier) {
    return [
      {
        label: "Low-cost entry available",
        points: POINTS.BUDGET_LOW_MATCH,
        direction: "positive",
        explanation: `You need a low-cost option — stored pricing model is "${model}".`,
      },
    ];
  }

  return [
    {
      label: "No documented free tier",
      points: POINTS.BUDGET_LOW_MISMATCH,
      direction: "negative",
      explanation: 'You need a low-cost option — stored pricing model is "paid," with no documented free tier.',
    },
  ];
}

function scoreTeamSize(answers: RecommendationAnswers, text: string): ScoreFactor[] {
  if (answers.teamSize === "unspecified") return [];

  if (matchesAny(text, ANY_SIZE_KEYWORDS)) {
    return [
      {
        label: "Positioned for teams of any size",
        points: POINTS.TEAM_SIZE_MATCH,
        direction: "positive",
        explanation: "Its stored positioning text explicitly says it fits teams of any size.",
      },
    ];
  }

  if (matchesAny(text, getTeamSizeKeywords(answers.teamSize))) {
    return [
      {
        label: `Matches a ${answers.teamSize} team`,
        points: POINTS.TEAM_SIZE_MATCH,
        direction: "positive",
        explanation: `Its stored positioning text mentions language matching a ${answers.teamSize} team.`,
      },
    ];
  }

  return [];
}

function scoreCompanyStage(answers: RecommendationAnswers, text: string): ScoreFactor[] {
  if (answers.companyStage === "unspecified") return [];

  if (matchesAny(text, getCompanyStageKeywords(answers.companyStage))) {
    const article = /^[aeiou]/i.test(answers.companyStage) ? "an" : "a";
    return [
      {
        label: `Matches ${article} ${answers.companyStage} company`,
        points: POINTS.COMPANY_STAGE_MATCH,
        direction: "positive",
        explanation: `Its stored positioning text mentions language matching ${article} ${answers.companyStage}-stage company.`,
      },
    ];
  }

  return [];
}

function scoreWorkStyle(software: Software, answers: RecommendationAnswers): ScoreFactor[] {
  if (answers.workStyle !== "remote") return [];

  const platforms = software.platforms;
  if (!platforms || platforms.length === 0) {
    return [
      {
        label: "Platform support not documented",
        points: 0,
        direction: "informational",
        explanation: "This product's supported platforms aren't in our verified dataset yet, so remote-friendliness couldn't be scored.",
      },
    ];
  }

  const hasWeb = platforms.includes("Web");
  const hasMobile = platforms.includes("iOS") || platforms.includes("Android");

  if (hasWeb && hasMobile) {
    return [
      {
        label: "Web and mobile access",
        points: POINTS.WORK_STYLE_REMOTE_MATCH,
        direction: "positive",
        explanation: `You work remotely — stored platforms (${platforms.join(", ")}) include both web and mobile access.`,
      },
    ];
  }

  return [
    {
      label: "Limited platform coverage for remote work",
      points: POINTS.WORK_STYLE_REMOTE_MISMATCH,
      direction: "negative",
      explanation: `You work remotely — stored platforms (${platforms.join(", ")}) don't include both web and mobile access.`,
    },
  ];
}

function scoreIntegrations(answers: RecommendationAnswers, text: string): ScoreFactor[] {
  return answers.requiredIntegrations
    .map((integration) => integration.trim())
    .filter((integration) => integration.length > 0)
    .map((integration) => {
      const found = text.toLowerCase().includes(integration.toLowerCase());
      return found
        ? {
            label: `Mentions "${integration}"`,
            points: POINTS.INTEGRATION_MATCH,
            direction: "positive" as const,
            explanation: `You need "${integration}" — it's mentioned in this product's stored features/description.`,
          }
        : {
            label: `No mention of "${integration}"`,
            points: POINTS.INTEGRATION_MISMATCH,
            direction: "negative" as const,
            explanation: `You need "${integration}" — our stored feature data doesn't mention it. This isn't confirmed as unsupported, just undocumented here.`,
          };
    });
}

function scoreDifficulty(answers: RecommendationAnswers, text: string): ScoreFactor[] {
  if (answers.difficultyPreference === "no-preference") return [];

  const wantsSimple = answers.difficultyPreference === "simple";
  const simpleMatch = matchesAny(text, DIFFICULTY_KEYWORDS.simple);
  const powerfulMatch = matchesAny(text, DIFFICULTY_KEYWORDS.powerful);

  if (wantsSimple) {
    if (simpleMatch) {
      return [
        {
          label: "Described as simple/intuitive",
          points: POINTS.DIFFICULTY_MATCH,
          direction: "positive",
          explanation: "You prefer something simple — its stored description/positioning uses language like that.",
        },
      ];
    }
    if (powerfulMatch) {
      return [
        {
          label: "Described as powerful/advanced",
          points: POINTS.DIFFICULTY_MISMATCH,
          direction: "negative",
          explanation: "You prefer something simple — its stored description/positioning leans toward \"powerful\"/\"advanced\" language instead.",
        },
      ];
    }
    return [];
  }

  if (powerfulMatch) {
    return [
      {
        label: "Described as powerful/advanced",
        points: POINTS.DIFFICULTY_MATCH,
        direction: "positive",
        explanation: "You prefer a powerful, full-featured tool — its stored description/positioning uses language like that.",
      },
    ];
  }
  if (simpleMatch) {
    return [
      {
        label: "Described as simple/intuitive",
        points: POINTS.DIFFICULTY_MISMATCH,
        direction: "negative",
        explanation: "You prefer a powerful, full-featured tool — its stored description/positioning leans toward \"simple\"/\"intuitive\" language instead.",
      },
    ];
  }
  return [];
}

function scoreIndustry(answers: RecommendationAnswers): ScoreFactor[] {
  if (!answers.industry.trim()) return [];

  return [
    {
      label: "Industry not used in scoring",
      points: 0,
      direction: "informational",
      explanation:
        "No software in this dataset is tagged by industry/vertical, so your industry answer had no effect on this score — see docs/recommendation-engine.md.",
    },
  ];
}

/** Best-case positive contribution for each answered dimension — the denominator behind matchPercent. Same for every product scored against a given answer set. */
function computeMaxPossibleScore(answers: RecommendationAnswers): number {
  let max = 0;

  if (answers.primaryNeed) max += POINTS.PRIMARY_NEED_MATCH;
  if (answers.needsAi) max += POINTS.AI_MATCH;
  if (answers.budget === "free") max += POINTS.BUDGET_FREE_MATCH;
  else if (answers.budget === "low") max += POINTS.BUDGET_LOW_MATCH;
  if (answers.teamSize !== "unspecified") max += POINTS.TEAM_SIZE_MATCH;
  if (answers.companyStage !== "unspecified") max += POINTS.COMPANY_STAGE_MATCH;
  if (answers.workStyle === "remote") max += POINTS.WORK_STYLE_REMOTE_MATCH;
  max += answers.requiredIntegrations.filter((i) => i.trim().length > 0).length * POINTS.INTEGRATION_MATCH;
  if (answers.difficultyPreference !== "no-preference") max += POINTS.DIFFICULTY_MATCH;
  if (answers.primaryNeed === "ecommerce_platform" && (answers.ecommerceSituation === "embed" || answers.ecommerceSituation === "migrate")) max += POINTS.ECOMMERCE_SITUATION_MATCH;

  return max;
}

export function scoreSoftwareForAnswers(software: Software, answers: RecommendationAnswers): ScoringResult {
  const text = searchableText(software);

  const factors: ScoreFactor[] = [
    ...scorePrimaryNeed(answers),
    ...scoreAi(software, answers, text),
    ...scoreBudget(software, answers),
    ...scoreTeamSize(answers, text),
    ...scoreCompanyStage(answers, text),
    ...scoreWorkStyle(software, answers),
    ...scoreIntegrations(answers, text),
    ...scoreDifficulty(answers, text),
    ...scoreIndustry(answers),
    ...scoreEmbedFit(answers, text),
    ...scoreMigrationFit(answers, text),
  ];

  const totalScore = factors.reduce((sum, factor) => sum + factor.points, 0);
  const maxPossibleScore = computeMaxPossibleScore(answers);
  const matchPercent = maxPossibleScore > 0 ? Math.round((Math.max(0, totalScore) / maxPossibleScore) * 100) : 0;

  factors.sort((a, b) => b.points - a.points);

  return { totalScore, maxPossibleScore, matchPercent, factors };
}
