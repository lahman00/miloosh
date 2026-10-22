# Miro alternatives — editorial review package (2026-10-22)

**Status: LOCAL DRAFT ONLY. Do not merge, deploy, publish, or change the live Miloosh site without owner approval.**

## Decision

Replace the weaker Figma Design listing on Miro's alternatives page with the
dedicated FigJam whiteboard and add Mural, Lucidspark, and Whimsical. Keep
Lucidchart for readers needing structured technical diagrams. The result is
five differentiated options, not an unsupported popularity ranking:

| Product | Editorial use-case fit | Evidence |
| --- | --- | --- |
| FigJam | Design-team brainstorming and facilitated workshops | https://www.figma.com/figjam/ ; https://www.figma.com/figjam/online-whiteboard/ |
| Mural | Structured team workshops, facilitation, and visual alignment | https://www.mural.co/features ; https://www.mural.co/pricing |
| Lucidspark | Agile rituals, brainstorming, facilitated planning | https://lucid.co/lucidspark ; https://lucid.app/pricing/lucidspark |
| Whimsical | Diagrams, mind maps, wireframes, visual planning | https://whimsical.com/diagrams ; https://whimsical.com/learn/boards/using-boards |
| Lucidchart | Technical diagrams and structured processes | https://lucid.co/lucidchart |

The vendor's own positioning and feature documentation support these use-case
distinctions; they are **not** proof of superior user satisfaction or outcomes.

## Scope

- Update Miro's alternatives, source links, verification date, and focused
  FAQs. Suppress the unsupported first-card "Top pick" badge for Miro only,
  leaving the shared card styling and all other product pages unchanged.
  No SEO framework, affiliate pipeline, scoring, or CTA changes.
- Add three evidence-backed software profiles required for internal links:
  FigJam, Mural, Lucidspark. Whimsical and Lucidchart already exist.
- Existing Figma-vs-Miro comparison route is unchanged; Figma Design remains
  a legitimate adjacent comparison but is not labeled a direct whiteboard
  alternative in this page.
- Do **not** generate new comparison routes automatically; those require
  independent editorial review.
- Do not add Novastart pending independent hands-on verification and
  clarification from Thomas Fraher.
- No affiliate or sponsored claims, referral URLs, ratings, reviews, or
  unsupported prices.

## Source checks (official, 2026-10-22)

Miro product claims and limitations: https://miro.com/ ;
https://miro.com/pricing/ ; https://miro.com/integrations/ .
Whimsical migration behavior: https://whimsical.com/learn/imports-exports/miro-to-whimsical .
Whimsical states that many Miro objects can be pasted as editable items,
but images, comments, votes, reactions, and timers do not transfer.
Product descriptions and use-case labels are editorial paraphrases of
the official feature pages above, not independent hands-on test results.

## QA gates before owner approval

- [x] `npm ci` (isolated local clone)
- [x] `npm run validate:data` — 256 software records, 21 categories, 1,221 comparison routes; zero problems
- [x] `npm run lint` — passed
- [x] `npm test` — 145 test files, 1,149 tests passed
- [x] `npm run build` — Next.js production build passed
- [x] Inspected generated Miro HTML: five internal links, three new prerendered product pages, migration FAQ, SEO meta, and four JSON-LD scripts; no Novastart and no unsupported "Top pick" badge.
- [x] Visually inspected desktop (1440 px) and narrow/mobile (500 px) Chrome screenshots in a local-only server. No clipping observed in inspected sections.
- [x] Canonical is `http://localhost:3000/software/miro` in the unconfigured local build; this is the existing `NEXT_PUBLIC_SITE_URL` fallback. Verify production environment uses `https://miloosh.com` before publishing.
- [x] No GitHub push, pull request, production deploy, site edit, email, marketing process, or spend performed. The local test server was stopped.
- [ ] Recheck live page immediately before publication.
- [ ] Owner explicitly approves publication after reviewing the diff.

**Commercial firewall:** The alternative order and descriptions are based
on use-case fit and sourced facts, never affiliate status or payout terms.
