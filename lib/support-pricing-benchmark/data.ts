/**
 * Hand-verified AI-billing classification for every catalog product tagged
 * category "customer-support" (16 as of 2026-09-26; see build.ts for the
 * sample definition). This is a manual overlay, not a keyword scanner --
 * base price fields already exist on data/software/*.json and are read
 * from there directly. What is recorded here is judgment that only a
 * human check of the vendor's own pricing page can supply: whether a
 * distinct, separately billed AI-usage unit is publicly disclosed, and if
 * so, its exact rate and unit. Every entry with `disclosed: true` was
 * re-confirmed live against the vendor's own pricing page on 2026-09-26
 * (see docs/growth/receipts/20260926-citable-research/source-audit.json).
 */
export interface AiUsagePricing {
  disclosed: boolean;
  unitPrice: number | null;
  unit: string | null;
  /** Quoted or closely paraphrased from the vendor's own pricing page. */
  note: string;
}

export const AI_USAGE_PRICING_BY_SLUG: Record<string, AiUsagePricing> = {
  crisp: {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "AI credit allowance (~$5-$75 of usage depending on tier) is bundled into the flat workspace fee. Crisp's pricing page does not publish a per-unit overage rate for exceeding that allowance.",
  },
  five9: {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "Pricing page notes \"usage-based pricing may apply\" on top of the per-seat bundle rate but does not publish a specific AI per-unit rate.",
  },
  freshdesk: {
    disclosed: true,
    unitPrice: 0.49,
    unit: "per Freddy AI Agent session (billed in blocks of 100 sessions at $49/block, after the first 500 sessions/month included)",
    note: "\"First 500 sessions included. $49 per 100 sessions\" -- a session-block unit, not a per-resolution price.",
  },
  front: {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "No separate AI usage line item found on the public pricing page as of 2026-09-26; AI features, where present, are bundled into the seat tiers shown.",
  },
  "genesys-cloud-cx": {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "CX4 includes 30 AI Experience tokens per named agent, but the pricing page does not disclose a per-token or per-overage dollar rate.",
  },
  gorgias: {
    disclosed: true,
    unitPrice: 0.9,
    unit: "per AI Agent-resolved conversation beyond the plan's included allowance (rate varies $0.90-$1.00 by tier)",
    note: "Overage is \"$0.40/ticket beyond 50, plus $1.00 per additional AI-resolved conversation\" on Starter and \"$0.90 per AI resolution\" on Basic -- a flat-tier-plus-overage model, not pure per-seat.",
  },
  happyfox: {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "HappyFox publishes no dollar figures of any kind on its public pricing page as of 2026-09-26 (per-agent billing and a 20% annual discount are described in words only). Base seat price and any AI usage price are both UNKNOWN, not zero.",
  },
  "help-scout": {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "AI Inbox assistant is included starting on the Standard plan with no separately disclosed usage price.",
  },
  intercom: {
    disclosed: true,
    unitPrice: 0.99,
    unit: "per Fin AI outcome (a confirmed resolution or a completed workflow with human handoff)",
    note: "\"From $0.99 per Fin outcome\", billed separately from the per-seat plan price on every tier -- confirmed live on intercom.com/pricing, 2026-09-26.",
  },
  kayako: {
    disclosed: true,
    unitPrice: 1.0,
    unit: "per ticket Kay AI Agent fully resolves without human involvement (escalations and partial resolutions are free)",
    note: "The AI usage rate is the ONLY dollar figure Kayako's pricing page discloses publicly; the base per-agent seat price is contact-sales-only. This is the inverse of Intercom's transparency pattern.",
  },
  liveagent: {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "AI Answer Assistant is described in marketing copy but the pricing page discloses no separate per-unit AI usage rate.",
  },
  reamaze: {
    disclosed: true,
    unitPrice: 0.85,
    unit: "per additional AI Agent resolution beyond the plan's monthly included allowance",
    note: "\"AI agent features include included monthly resolutions with per-resolution overage fees of $0.85 per additional resolution\" -- confirmed live on reamaze.com/pricing, 2026-09-26. The size of the included monthly allowance itself is not disclosed on the pricing page, so a full crossing-point cannot be computed for Re:amaze the way it can for Intercom.",
  },
  talkdesk: {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "Talkdesk Express includes \"$100 in free usage credit\" but no per-unit AI rate is published beyond that bundled allowance.",
  },
  tidio: {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "Lyro AI conversation counts are baked into named conversation-volume tiers rather than billed as a separate per-unit AI charge.",
  },
  zendesk: {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "AI Agents are bundled into Suite Team and above with no separately disclosed per-resolution or per-session price.",
  },
  "zoho-desk": {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "Zia AI is bundled starting on the Professional plan with no separately disclosed usage price.",
  },
};
