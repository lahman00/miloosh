/**
 * Buyer intent read from the searches a page actually earned impressions for.
 *
 * A search is "decision-stage" when it asks to compare, replace or price a product: alternatives, competitors,
 * versus, "like X", better-than, pricing, reviews, "best". Everything else (a bare brand, a domain, a login, a
 * how-to) is not counted as a purchase decision. The word lists below are an operating choice of this project, in
 * the languages the site's own query tables show, and are tested; they are not a statement about Google or about
 * every query that could exist. Search Console lists only the queries it does not anonymise, so every figure here
 * describes the listed rows and says so.
 */

export type QueryRow = { query: string; impressions: number };

const DECISION_STAGE: ReadonlyArray<RegExp> = [
  /\balternativ\w*/, // alternative, alternatives, alternativen, alternativas
  /\balternatif\w*/, // alternatif, alternatifi
  /\bcompetitor\w*|\bcompetition\b|\brivals?\b/,
  /\bvs\b|\bversus\b/,
  /\bcompar\w*|\bcomparatif\b|\bvergleich\b/,
  /\b(tools?|software|apps?|platforms?|companies|sites?|programs?|products?)\s+(like|similar)\b/,
  /\bsimilar\s+(to|tools?|software|apps?|platforms?|products?|programs?|sites?)\b/, // "similar to sprout social", "clickup similar apps"
  /\b(like|similar)$/, // "confluence like"
  /\bbetter\s+than\b|\binstead\s+of\b|\breplacements?\b|\bsubstitutes?\b|\banalogs?\b|\banalogues?\b|\balternatives?\s+to\b/,
  /\bpric(e|es|ing)\b|\bcosts?\b|\bcheap(er|est)?\b|\bplans?\b/,
  /\breviews?\b/,
  /\bbest\b/,
];

/** True when the search asks to compare, replace or price a product. Matching ignores case and punctuation other than the word boundaries. */
export function isDecisionStageQuery(query: string): boolean {
  const text = query.toLowerCase().replace(/[.,:;!?()"']/g, " ").replace(/\s+/g, " ").trim();
  return DECISION_STAGE.some((pattern) => pattern.test(text));
}

export type IntentSummary = {
  /** True when most listed impressions are decision-stage; false when most are not; null when too little was listed to say. */
  commercial: boolean | null;
  listedQueries: number;
  listedImpressions: number;
  decisionQueries: number;
  decisionImpressions: number;
  /** decisionImpressions / listedImpressions, or null when nothing was listed. */
  decisionShare: number | null;
};

export type IntentOptions = {
  /** Fewer listed impressions than this is too little to classify. Operating choice. */
  minListedImpressions: number;
  /** Share of listed impressions that must be decision-stage for the page to count as commercial. Operating choice. */
  commercialShare: number;
};

export const DEFAULT_INTENT_OPTIONS: IntentOptions = { minListedImpressions: 10, commercialShare: 0.5 };

export function summarizeIntent(rows: readonly QueryRow[], options: Partial<IntentOptions> = {}): IntentSummary {
  const { minListedImpressions, commercialShare } = { ...DEFAULT_INTENT_OPTIONS, ...options };
  let listedImpressions = 0;
  let decisionImpressions = 0;
  let decisionQueries = 0;
  for (const row of rows) {
    listedImpressions += row.impressions;
    if (isDecisionStageQuery(row.query)) {
      decisionImpressions += row.impressions;
      decisionQueries += 1;
    }
  }
  const share = listedImpressions > 0 ? decisionImpressions / listedImpressions : null;
  return {
    commercial: share === null || listedImpressions < minListedImpressions ? null : share >= commercialShare,
    listedQueries: rows.length,
    listedImpressions,
    decisionQueries,
    decisionImpressions,
    decisionShare: share === null ? null : Math.round(share * 1000) / 1000,
  };
}
