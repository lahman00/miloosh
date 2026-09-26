/**
 * Hand-verified AI-billing classification for every catalog product tagged
 * category "customer-support" (16 as of 2026-09-27; see build.ts for the
 * sample definition). This is a manual overlay, not a keyword scanner --
 * base price fields already exist on data/software/*.json and are read
 * from there directly. What is recorded here is judgment that only a
 * human check of the vendor's own pricing page can supply: whether a
 * distinct, separately billed AI-usage unit is publicly disclosed, and if
 * so, its exact rate and unit. Every entry was re-confirmed live against
 * the vendor's own pricing page on 2026-09-27 during the Overnight
 * Research + Trust Factory re-verification pass (see docs/growth/receipts/
 * 20260927-research-night/dataset-audit.json). Five entries changed from
 * the 2026-09-26 version, all in the same direction: Front, HappyFox,
 * Help Scout, and Tidio were found to disclose a separate AI-usage price
 * that the original research missed; Gorgias's disclosed range widened.
 * The headline "N of 16" count moved from 5 to 9 as a direct result --
 * this is a correction of incomplete original research, not vendors
 * changing pricing overnight.
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
    disclosed: true,
    unitPrice: 0.05,
    unit: "per conversation handled by the Autopilot AI agent add-on (a \"starting at\" rate, not confirmed flat)",
    note: "\"Autopilot -- Run complex customer work with our omnichannel AI agent -- Starting at $0.05 /conversation\", billed separately from Front's per-seat plan pricing -- found live on 2026-09-27; missed in the original 2026-09-26 research. Front's other AI add-ons (Copilot, Smart QA, Smart CSAT) are seat-based, not usage-metered. Because the rate is stated as a \"starting at\" figure rather than a single confirmed number, this vendor is not used for the crossing-scenario calculation (see build.ts).",
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
    unit: "per AI Agent-resolved conversation, baked into each plan's headline price (rate varies $0.85-$1.00 by tier: Starter $1.00, Basic/Pro $0.90, Advanced $0.85)",
    note: "Re-checked 2026-09-27: the per-interaction AI rate is not purely an overage charge -- it is the baseline rate pricing the AI Agent component of every plan's total, including its included allowance, with a separately noted (and possibly generic/non-tier-specific) $1.50/interaction overage rate beyond that allowance. The disclosed range widened from the original $0.90-$1.00 finding to $0.85-$1.00 once the Advanced tier's rate was confirmed. 30-day free trial, no credit card, also newly confirmed.",
  },
  happyfox: {
    disclosed: true,
    unitPrice: 0.33,
    unit: "per resolution for the Chatbot product (a second, cheaper usage-based AI product, Autopilot, is billed \"as low as 2 cents per successful action\")",
    note: "Correction, not a vendor price change: on 2026-09-26 HappyFox's pricing page could not be reached and this row was marked entirely UNKNOWN. Re-checked live on 2026-09-27: the page is reachable and discloses real prices throughout, including two separately metered, usage-based AI products (Chatbot at $0.33/resolution, Autopilot as low as $0.02/action) distinct from two flat per-seat AI add-ons (HappyFox AI $14/agent/month, Assist AI $1/user/month). Base Help Desk pricing starts at $24/agent/month.",
  },
  "help-scout": {
    disclosed: true,
    unitPrice: 0.75,
    unit: "per resolution via the AI Answers add-on (a resolution counts when the customer accepts the AI's answer without escalating, searching further, or asking more questions)",
    note: "\"AI Answers Add-on $0.75/resolution\" -- billed monthly on top of the per-seat Standard/Plus plan price, with its own separate 3-month free trial. Found live on 2026-09-27; missed in the original 2026-09-26 research.",
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
    disclosed: true,
    unitPrice: 32.5,
    unit: "for the Lyro AI Agent, sold as a separate product from the base live-chat plans (starting price for a block of 50 AI conversations/month, a bundle rate like Freshdesk's, not a marginal per-conversation price)",
    note: "\"Lyro AI Agent -- Starts at $32.50/mo. From 50 Lyro AI conversations\", billed and sold separately from Tidio's base conversation-volume plans. The Premium plan additionally lists \"Pay-per-resolution billing\" as a feature, but no exact per-resolution dollar rate is published anywhere on the page -- that narrower claim is left unquantified rather than estimated. Billing basis was also reclassified: Tidio's plans are billed by conversation volume, not per seat (entryPerSeat corrected from unknown to false).",
  },
  zendesk: {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "Re-checked 2026-09-27: Zendesk's own pricing page now explicitly names and defines a separate AI-usage billing unit -- \"Automated Resolutions: ... the unit of measurement used for calculating and billing your account for AI agent usage. Paying per automated resolution means you pay only for customer requests that were successfully resolved by the AI agent\" -- but the dollar rate itself is not shown on the page (it links to a \"Learn more\" page instead of a figure). This is kept as disclosed=false because no price is public, but it is a materially different finding from \"AI is just bundled with no separate billing concept at all\": Zendesk discloses the billing MECHANISM without the RATE, the mirror image of Kayako disclosing the rate without the base seat price.",
  },
  "zoho-desk": {
    disclosed: false,
    unitPrice: null,
    unit: null,
    note: "Zia AI is bundled starting on the Professional plan with no separately disclosed usage price.",
  },
};
