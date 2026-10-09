# Outside skill libraries: what was reviewed, adopted and refused

Reviewed on 2026-10-09 for the growth-agent build. Nothing from any of these
libraries is vendored, installed or executed in this repository. Only the
methodology below was adopted, restated in Miloosh's own terms and wired into
code and tests that Miloosh owns.

## Provenance warning

The three SEO skills the owner's request names (`exceed-quality-threshold`,
`cannibalization` and `authority-mark`) are **not** in
`github.com/coreyhaines31/marketingskills`. They are published under a different
organisation, `github.com/marketingskills/seo`, which belongs to the vendor of a
commercial SaaS product (RefreshAgent), ships `curl | bash` installers and
promotes that product. A similar name is not the same publisher. Do not run
those installers, do not connect the vendor's service, and treat their output as
an opinion to verify.

`attribution` and `public-relations` **are** in `coreyhaines31/marketingskills`
(MIT licence).

## Adopted (methodology only)

| Source skill | What Miloosh uses | Where it lives |
| --- | --- | --- |
| `exceed-quality-threshold` | Gate-based assessment with no composite score; the result is "Indeterminate" when access to the needed evidence is missing. (The source uses five gates; Miloosh uses ten because protection, derived pages and the partner path must also hold.) | Google Recovery gates (`evaluatePage`), `UNKNOWN` status |
| `cannibalization` | One owner page per intent. Never delete, redirect or `noindex` a page that has demand without the owner's approval. Overlap needs page-by-query rows, so without them it is `NOT_MEASURED`. | `cannibalization` block of the Google report; Director overlap suppression |
| `attribution` | Count each outcome once, from one source of truth, and never sum platform claims. Only Pillar A (count once) is adopted. | Funnel and Affiliate agents keep clicks, conversions, commissions and payouts as separate facts |
| `public-relations` | Quality bar and templates for drafting outreach. Drafting only: no scraping, no email guessing, no sending. | `draftOutreach`, `evaluatePublisher` in `distribution.ts` |

## Refused

- **`authority-mark`.** It needs a Domain Rating from a paid backlink tool. None
  was supplied, so any authority or "low competition" claim is `NOT_VERIFIED`. Its
  helper treats an unknown own-site rating as "none", which turns missing data
  into a number; Miloosh does not.
- Installer scripts, vendor accounts, hosted dashboards and any step that would
  send site data to an external processor.
- Any default that sends, scrapes, buys a link or contacts a publisher.

## If you review these libraries again

Re-check the publisher and licence first, read every script before running
anything, and keep the same boundary: adopt a method only when a test in
`tests/growth-agents/` can fail if the method is violated.
