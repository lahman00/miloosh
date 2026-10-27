/**
 * Reviewed, intentional removals of a baseline-admitted URL from the sitemap (for example a product genuinely
 * discontinued, or a page deliberately consolidated with a redirect). The release sentinel
 * (scripts/seo/release-sentinel.ts) fails on any baseline URL that disappears unless it is listed here with a
 * specific reason, evidence and reviewer. Entries are exact paths: no wildcards, no "all". Keep this empty by default.
 */
export interface IntentionalRemoval {
  /** Exact path, e.g. "/software/some-slug" or "/compare/a-vs-b". */
  path: string;
  reason: string;
  evidence: string;
  reviewedBy: string;
  reviewedAt: string;
}

export const DISCOVERY_INTENTIONAL_REMOVALS: readonly IntentionalRemoval[] = [];
