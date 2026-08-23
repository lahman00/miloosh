import type { PainCandidate } from "./pain-radar";

export type RedditRuleProfile = {
  subreddit: string;
  rulesUrl?: string;
  verifiedAt: string;
  selfPromotion: "allowed" | "restricted" | "prohibited" | "unknown";
  links: "allowed" | "restricted" | "prohibited" | "unknown";
  disclosureRequired?: boolean;
  notes?: string[];
};

export type RedditOpportunityDecision = {
  eligible: boolean;
  mode: "VALUE_ONLY" | "VALUE_PLUS_DISCLOSED_LINK" | "HUMAN_REVIEW" | "DO_NOT_POST";
  reasons: string[];
};

export function decideRedditOpportunity(
  candidate: PainCandidate,
  rules?: RedditRuleProfile,
): RedditOpportunityDecision {
  const reasons: string[] = [];

  if (candidate.source !== "reddit") {
    return {
      eligible: false,
      mode: "DO_NOT_POST",
      reasons: ["candidate is not from Reddit"],
    };
  }

  if (!rules) {
    return {
      eligible: false,
      mode: "HUMAN_REVIEW",
      reasons: ["subreddit rules have not been verified"],
    };
  }

  if (rules.selfPromotion === "prohibited") {
    return {
      eligible: true,
      mode: "VALUE_ONLY",
      reasons: ["self-promotion prohibited; only a genuinely useful no-link response is eligible"],
    };
  }

  if (rules.links === "prohibited") {
    return {
      eligible: true,
      mode: "VALUE_ONLY",
      reasons: ["links prohibited; answer must stand alone without Miloosh URL"],
    };
  }

  if (rules.selfPromotion === "unknown" || rules.links === "unknown") {
    return {
      eligible: false,
      mode: "HUMAN_REVIEW",
      reasons: ["promotion/link rules remain ambiguous"],
    };
  }

  if (rules.selfPromotion === "restricted" || rules.links === "restricted") {
    return {
      eligible: false,
      mode: "HUMAN_REVIEW",
      reasons: ["community imposes restrictions that require context-specific human judgment"],
    };
  }

  if (rules.disclosureRequired) {
    reasons.push("Miloosh affiliation must be disclosed clearly");
  }
  reasons.push("community rules verified and promotional linking permitted");

  return {
    eligible: true,
    mode: "VALUE_PLUS_DISCLOSED_LINK",
    reasons,
  };
}

export function redditReplyGuardrails(): string[] {
  return [
    "Answer the user's question before mentioning Miloosh.",
    "Do not claim personal use or customer experience unless it is true.",
    "Do not mass-post the same answer across communities.",
    "Do not use unsolicited DMs or chats.",
    "Do not conceal commercial affiliation where it is relevant.",
    "Do not ask for or coordinate votes.",
    "Do not evade removals, bans, rate limits, or moderator decisions.",
    "Do not use a Miloosh link when the community forbids or restricts self-promotion.",
    "Treat Reddit posts as demand signals, not authoritative vendor evidence.",
    "Vendor/product facts must be verified independently before Miloosh publishes them.",
  ];
}
