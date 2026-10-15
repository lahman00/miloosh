/**
 * Pages that a person has reviewed, by profile slug, with the date of that review (YYYY-MM-DD).
 *
 * Empty on purpose. Owner decision, 2026-10-12: no page may say it was reviewed by a person unless the owner has
 * marked it here, because the AI Usage Disclosure states that content is AI-assisted and not fact-checked line by
 * line. Add an entry only for a review that actually happened, on the date it happened.
 */
export const HUMAN_REVIEWED_PROFILES: Readonly<Record<string, string>> = {};
