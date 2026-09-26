# Trust Surface Audit (2026-09-27)

## Pages audited

`/about`, `/editorial-policy`, `/sources-policy`, `/corrections-policy`, `/affiliate-disclosure`,
`/ai-usage`, `/contact`, plus the sitewide Organization JSON-LD (`lib/structured-data.ts`).

## Finding: the trust surface is already mature — no changes made to any of these pages

Every page was read in full this session. All of the following are already true, with no
gaps found against this mission's own bar ("add only real clarity, no fake experts, no fake
editorial board, no invented credentials"):

- **Publisher identity**: `/about` names the site, its purpose, and states it is "run by a
  small team" (`/corrections-policy`) rather than implying a large newsroom or an editorial
  board that doesn't exist. The Organization JSON-LD (fixed in Phase V, re-confirmed intact
  this session) carries a real logo, description, and a real, working contact email.
- **No fake credentials**: no author bylines, no invented "expert reviewer" personas, no
  claimed certifications anywhere in the trust pages or on software/comparison pages.
- **No fabricated ratings**: `/editorial-policy`'s "No fabricated ratings or reviews" section
  explicitly commits to this and matches what's actually on the site (confirmed: no star
  ratings, review counts, or "best of" scoring exist anywhere in the templates).
- **Corrections process is real and specific**: `/corrections-policy` gives an actual email,
  says what to include, and is honest about not promising a specific turnaround time — no
  invented SLA.
- **Affiliate independence is explicit and specific**: `/affiliate-disclosure` states the
  exact link attribute used (`rel="sponsored noopener noreferrer"`), commits to never
  disguising affiliate links, and explicitly separates commercial relationships from editorial
  decisions.
- **AI-usage disclosure already exists and is unusually honest**: `/ai-usage` explicitly
  states "we do not claim that every individual fact... has been manually re-verified by a
  human after being drafted" — this is more transparent than most sites in this space, and
  directly pre-empts the "fake E-E-A-T theater" failure mode this mission and prior phases
  have repeatedly guarded against.
- **Sources policy already covers dated snapshots vs. live prices**: `/sources-policy`
  explicitly warns that published pricing is a dated snapshot, not a guarantee, and commits to
  leaving unknowns explicit rather than turning missing evidence into a claim — the exact
  standard this session's own benchmark work follows.

## The one real connective-tissue gap found, and fixed

The customer-support pricing benchmark's own Methodology card did not link out to these
sitewide policies — a reader arriving at the research page from a search engine or a shared
link had no path from "how was this specific dataset verified" to "how does Miloosh handle
sourcing and corrections in general." Fixed by adding a "Site-wide standards" methodology row
linking to `/sources-policy`, `/editorial-policy`, and `/corrections-policy` directly from the
research page (see `changes.md` for the diff).

## Research Methodology Hub (mission Part 9) — not built this session

A dedicated, reusable `/research/methodology` page was considered. Decision: **not built**,
because with only one fully-built research asset today (a second is evaluated in
`second-asset-decision.md`), a separate hub page would either duplicate the research page's
own Methodology card almost verbatim, or duplicate `/editorial-policy` and `/sources-policy`
almost verbatim — neither adds real clarity yet. This becomes genuinely worth building once a
second research asset exists and both pages would otherwise repeat the same explanation of
what "verified" means for a downloadable dataset specifically (as opposed to a single sourced
fact on a product page). Flagged in `next-actions.md`.

## Brand consistency (mission Part 10)

Grepped the new/changed research pages and lib code for banned superlatives ("leading,"
"largest," "#1," "expert-tested," "industry standard"). Zero matches beyond a false-positive
Tailwind class name (`leading-8`, a CSS line-height utility, not the word "leading"). No
changes needed.
