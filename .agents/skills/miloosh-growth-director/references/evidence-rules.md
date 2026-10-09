# Evidence rules

The one rule: **a number that was not measured is never a number.** Every
metric travels as a `Measured<T>` (`lib/growth-agents/evidence.ts`). Only a
measurement carries a value, so downstream code cannot add up or divide a missing
figure by accident.

## States

| State | Meaning | Carries a value |
| --- | --- | --- |
| `MEASURED` | Read, complete and fresh. | yes |
| `PARTIAL` | Read but incomplete. Never decision-grade. | yes |
| `STALE` | Read, but older than the source's freshness limit. Never decision-grade. | yes |
| `UNAVAILABLE` | Could not be read (no access, invalid file, command failed). | no |
| `NOT_MEASURED` | Never captured, or no data source exists. | no |
| `NOT_OBSERVED` | Absent from a capture that cannot justify reading absence as zero. | no |

Claim labels used in receipts describe the strength of a statement:
`VERIFIED`, `OBSERVED`, `ESTIMATED`, `INFERRED`, `NOT_VERIFIED`, `NOT_APPLICABLE`.
A public keyword estimate is `ESTIMATED` and carries locale, period, method and source.

## When absence may be read as zero

A page that is not listed in a Search Console table is a zero only when
something justifies it:

1. an exact-page check for the same or a wider window returned no data
   (`ZERO_BY_EXACT_PAGE_CHECK`), or
2. the table is complete, unfiltered and its manifest carries a written
   justification (`ZERO_BY_COMPLETE_TABLE`).

Otherwise the page is `NOT_OBSERVED`. A partial table never justifies a zero,
even if a justification is written.

## Search Console windows

- Days are Pacific-time days. Counting is inclusive: `(end - start) + 1`.
- Property-wide totals come from the daily series, never from summing page rows
  (a result can list several of the site's URLs). Page-row sums and
  query-row sums are kept as separate, labelled denominators.
- A window's rate denominator is the days the property actually had data, not
  the calendar length of the window. The skill-calculator convention (whole
  window) is reported next to it, never instead of it.
- `dataThrough` is the last day Google had finalised when the capture was
  taken. Search Console shows no such date; the three-day rule (capture date minus
  three days) is an assumption shared with the repository's own date helper
  (`processingDelayDays = 3`). Days after it are not final and are excluded from
  property totals and from the daily peak and fall.
- The `www` and apex rows of one page are merged into the canonical apex URL;
  position is weighted by impressions; the original rows are kept as variants.
- CTR is undefined, not zero, for zero impressions.
- Rounded display values (for example "25.6K") are rejected in tables.

## Operating choices (labelled as such, not statements about Google)

| Choice | Value | Source |
| --- | --- | --- |
| Historical impressions to be a recovery candidate | 20 | the repository's HIGH_IMPRESSION floor |
| Ranked-page exception | at least 5 impressions at average position 20 or better | a page that ranked proved Google could place it |
| Current verified demand | at least 10 impressions in the finalised recent window | the repository's evidence floor |
| Shortlist size | 5 | owner directive |
| Observation window after a change | 28 days | the 14/28-day contract; the clock starts at the first observed recrawl, not at deployment |

Change a threshold only in `DEFAULT_RECOVERY_CONFIG` or `OBSERVATION_WINDOW_DAYS`,
with a test, and say why in the receipt.

## Gates a page must pass before it can be handed to the page upgrader

`PROTECTION_CLEAR`, `DERIVED_PAGES_CLEAR`, `PUBLISHED`, `DEMAND_MEASURED`,
`POSITIVE_LOSS`, `LIVE_TECHNICAL`, `GOOGLE_COVERAGE`, `BUYER_INTENT`,
`CONTENT_GAP`, `MONETIZATION_PATH`. Each is `PASS`, `FAIL` or `UNKNOWN`. Only an
all-`PASS` page is `eligible`. A page whose only missing gate is
`MONETIZATION_PATH` is `eligibleEditorial` (visibility-only), and choosing that
objective is the owner's decision.

## Facts that are never merged

Deployment, Google crawl, indexation, impressions, clicks, human sessions,
engaged decision sessions, outbound partner clicks, network-attributed
conversions, approved commissions, paid revenue. First-party click stores and the
revenue outbound log describe the same clicks differently and are never added
together. A partner click is not a conversion.

## Nothing is scored

Ordering is lexicographic over named evidence classes. There is no composite
"revenue score" and no forecast. Impressions at stake are demand on pages that
list a partner; they are not clicks, conversions or revenue.
