# Remaining opportunities — ranked execution queue — 2026-09-26

Ranked by evidence strength × expected funnel impact, not an arbitrary score.
Full data behind every item: `gsc-opportunities.json`,
`internal-link-graph.json`, `intent-ownership.json`, `tier-a-actions.md`.

## 1. The structural issue: 1,645 pages Google crawled and chose not to index
By far the largest lever available, and the one this session could only
partially act on (2 evidence-backed indexing requests). A real diagnostic
project — likely content depth/uniqueness/E-E-A-T signals at scale, not a
per-page fix — would materially outweigh any individual page's SEO work.
Recommended next action: sample 15-20 of the 1,645 "crawled, not indexed"
pages across different ages/categories and look for a common, fixable
pattern (thin content, near-duplicate template feel, low engagement
signals) before attempting a sitewide intervention.

## 2. ElevenLabs 4-for-1 cluster (Tier A, ready to execute)
Jasper (165 imp), Copy.ai (187 imp), Perplexity (97 imp), Synthesia
(170 imp) — 619 impressions combined, each with a real, already-published
comparison to ElevenLabs (an active partner), each missing only an
`AlternativeDecisionGuide` entry using the existing, well-precedented
mechanism (30 entries already exist). No new comparison pages needed. The
single highest-leverage, lowest-risk item in the whole queue.

## 3. KrispCall + Shopify + Wix single-comparison Tier A items
Webex, Google Meet (→ KrispCall); Weebly, Ghost, Adobe Commerce (→ Shopify
or Wix); Contentful (→ Wix). Same mechanism as #2, one product each.
Combined ~750 real impressions.

## 4. Coda / Evernote → Todoist + Airtable (2 decisions each)
296 combined impressions, both existing comparisons already published.

## 5. Weakly-linked active partners: Jotform, MailerLite, Omnisend, SurveyMonkey
Real, evidenced architecture/commercial-priority mismatch (bottom quartile
of internal linking, zero `ALTERNATIVE_GUIDES` presence). **Important
mechanical note before executing:** the fix is finding which OTHER
product's guide should list one of these as a decision option (guide links
flow to the alternatives named, not to the guide's own subject) — not
writing a guide entry for the weak product itself. Jotform's own
`surveymonkey-vs-jotform` comparison is a natural starting point (add a
Jotform decision branch to SurveyMonkey's own guide, or vice versa, once
one of them gets its first `ALTERNATIVE_GUIDES` entry). Volza is excluded
from this recommendation — its only comparison (vs Google Analytics) is a
weak categorical fit, and forcing a guide entry around it would be a
low-quality fix, not a real one; it likely needs a genuinely new,
well-matched comparison (e.g. against another trade-intelligence platform)
before any linking fix makes sense.

## 6. Notion / Trello demand fragmentation
Notion: 3 impressions on its own page vs. 207 combined across 8 comparison
pages (1.4% concentration) despite being the #1 most-linked product
site-wide with zero guide entry of its own. Trello: same pattern, smaller
scale. Investigate whether giving Notion its own `AlternativeDecisionGuide`
entry consolidates ranking signal onto the intended page — INFERRED, not
directly measured (GSC's page and query reports don't cross), so verify
with a follow-up capture after acting.

## 7. Un-overridden striking-distance comparison pages
`/compare/elastic-vs-supabase` (position 8.3, closest to page 1 in the
entire export), `1password-vs-duo-security` (22.9), `bitwarden-vs-duo-
security` (20.3), `render-vs-sentry` (21.2), `mkdocs-vs-read-the-docs`
(29.7, highest impressions of the group at 13). Add SERP overrides + a
small internal-link push.

## 8. 13-product SERP-override gap
mulesoft, salesforce, clickup, sprout-social, confluence, n8n, tidio,
zapier, ringcentral, activecampaign, lastpass, squarespace, hubspot — all
already have a decision guide but still show the generic sitewide-style
title/description in search results instead of one matching their real
measured "alternatives" query language. Mechanical, low-risk, high-volume
(3,700+ combined impressions).

## 9. Freshservice anomaly (diagnose before acting)
685 combined query impressions across 12 real variants (mostly French),
but the page itself shows 0 measured page-level impressions — INFERRED
that demand may still be bleeding to `/software/freshdesk` despite an
existing disambiguation note. Needs a diagnostic pass, not a quick fix.

## 10. Pipedrive-vs-Trello and two unpublished knowledge-base comparisons
`pipedrive-vs-trello` (25 combined impressions, both products catalogued,
real content-creation task, deliberately not authored this session — see
`tier-a-actions.md` for why Pipedrive stays otherwise untouched this
round); `guru-vs-document360` (16 imp) and `bloomfire-vs-document360`
(11 imp), both unpublished, neither product an active partner — content-
authority plays only, verify real feature overlap before publishing.

## Explicitly held (do not act on without new evidence)
- Anything touching `/software/wrike`, `/software/klaviyo`,
  `/software/smartsheet`, `/software/ecwid`, `/software/zoho-crm`,
  `/software/calendly`, `/software/woocommerce`, `/software/teamwork`,
  `/software/doodle` — all under active `MEASURING` experiments as of
  2026-09-26.
- `/software/signal` (position 129.5 — too deep for any on-page fix to
  matter, and no plausible affiliate program for an encrypted-messaging
  app).
- The 6 already-actioned high-impression pages stuck at position 75-86
  (semrush, intercom, freshdesk, front, buffer, help-scout) — both the
  content guide and the SERP override already exist; the remaining gap
  looks like a backlink/domain-authority problem, not a content-mismatch
  one, and is outside what another content pass could fix.
- Stale `pricingNote` entries for Close, Freshsales, and HubSpot's own
  stance inside `data/guides/registry.ts` — real, found while fixing
  Pipedrive's entries in the same file, but out of this session's scope.
