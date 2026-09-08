/**
 * Evergreen concept banks for the two content pillars that aren't
 * generated from a specific software/comparison/category record —
 * Buyer Education (E) and Trust/Methodology (H). These are genuine
 * general-purpose advice and honest statements about how Miloosh itself
 * works, not claims about any specific product, so writing them directly
 * (rather than generating them from data) doesn't risk fabricating a
 * product fact. Each is real editorial content — not a template with
 * blanks — written once and reused with the topic-repeat cooldown like
 * any other queue entry.
 */

export type EvergreenConcept = {
  topic: string;
  headline: string;
  body: string;
};

export const BUYER_EDUCATION_CONCEPTS: EvergreenConcept[] = [
  { topic: "feature-count-fallacy", headline: "What should you compare besides feature count?", body: "A longer feature list usually means more surface area to learn, not more value for your actual workflow. Compare the core loop against how your team already works." },
  { topic: "free-tier-reality-check", headline: "Is a free tier actually enough for a growing team?", body: "Before you commit a team's workflow, check seat limits, feature gates, storage caps, and what changes the moment you need to scale." },
  { topic: "migration-cost-is-real", headline: "How much does switching software really cost?", body: "Data export quality, integration rebuild time, and team retraining often matter more than the subscription difference." },
  { topic: "trial-period-discipline", headline: "Is a 14-day trial long enough to judge a SaaS tool?", body: "Most workflow friction appears after the first few days. If possible, test through a full sprint, billing cycle, or other real work cycle before deciding." },
  { topic: "integrations-before-features", headline: "What should you check before a SaaS feature list?", body: "Check integrations first. A smaller feature set that works with your existing stack can beat a richer product that forces manual re-entry." },
  { topic: "pricing-page-red-flags", headline: "Why do SaaS companies say 'Contact us for pricing'?", body: "It usually signals a sales-led buying process, negotiated seats or usage, contract terms, or bundled services. It is useful information before you invest evaluation time." },
  { topic: "team-size-mismatch", headline: "Does the best software change when your team grows from 5 to 50?", body: "Usually. Permission models, admin controls, audit trails, and per-seat economics become much more important as a team grows." },
  { topic: "lock-in-signals", headline: "Can you get your data back out of the software you choose?", body: "Check CSV exports, APIs, standard file formats, and whether important data is trapped in proprietary formats before you commit." },
  { topic: "reviews-vs-fit", headline: "Can you trust a 4.8-star software rating?", body: "A high average rating can still hide a poor fit for your use case. Team size, workflow, industry, and admin needs matter more than the aggregate score." },
  { topic: "decision-paralysis", headline: "How many software tools should you actually evaluate?", body: "Usually two or three serious candidates. Define your non-negotiables first, then compare only the tools that clear that bar." },
];

export const TRUST_METHODOLOGY_CONCEPTS: EvergreenConcept[] = [
  { topic: "why-dates-matter", headline: "How do you know a software comparison is current?", body: "Look for a verification date and primary sources. Pricing and features change too quickly for an undated comparison to be trustworthy." },
  { topic: "sourced-not-scraped", headline: "Where should software comparison facts come from?", body: "Pricing, features, and positioning should trace to the vendor's current official pages, not another review site's summary." },
  { topic: "no-fake-rankings", headline: "Can you trust a 'best software' ranking without a methodology?", body: "A numbered list implies precision. If the criteria and tradeoffs are not stated, the ranking tells you less than it appears to." },
  { topic: "affiliate-transparency", headline: "Do affiliate links bias software recommendations?", body: "They can if editorial and commercial incentives are mixed. Miloosh discloses affiliate links and keeps commissions separate from ranking and fit decisions." },
  { topic: "correction-policy", headline: "What should happen when a software comparison gets a fact wrong?", body: "It should be corrected, the verification date should change, and stale information should not be left online indefinitely." },
  { topic: "no-pay-for-placement", headline: "Can a software vendor pay to rank higher?", body: "Not on Miloosh. Commercial relationships are kept separate from editorial judgment and cannot change which product is presented as the better fit." },
  { topic: "what-verified-means", headline: "What does 'verified' actually mean on a software comparison site?", body: "For Miloosh it means the claim was checked against the vendor's own current source and the source is linked so you can verify it yourself." },
  { topic: "why-we-started", headline: "Why are so many software comparisons outdated?", body: "Many are written once and treated as evergreen even though pricing, features, product names, and plans keep changing. Software research needs ongoing verification." },
  { topic: "independent-research", headline: "Who owns the software comparison site you're reading?", body: "Ownership and incentives matter. Miloosh is independent from the software vendors it compares, and commercial relationships do not control editorial outcomes." },
  { topic: "what-we-dont-do", headline: "What should a review site do when it can't verify a product claim?", body: "Say that it cannot verify it. An unknown should stay unknown instead of being replaced with something plausible-sounding." },
];
