# Methodology — Customer Support Pricing Benchmark 2026

## Sample

Every catalog product with `category: "customer-support"` as of 2026-09-26 (16 products):
Crisp, Five9, Freshdesk, Front, Genesys Cloud CX, Gorgias, HappyFox, Help Scout, Intercom,
Kayako, LiveAgent, Re:amaze, Talkdesk, Tidio, Zendesk, Zoho Desk. The sample is defined by
Miloosh's own existing category taxonomy, not hand-selected for this asset — no vendor was
added or removed to fit a preferred conclusion.

## Verification

Base price fields (starting price, per-seat flag, billing period, free tier/trial,
enterprise-contact-sales flag) are read directly from each product's `pricing` object in
`data/software/*.json`. 13 of 16 already carried a `status: "verified"` or `"contact_sales"`
record from prior sessions, each with its own `official_source` and `last_verified` date.

Two previously empty records were newly researched and verified this session by fetching each
vendor's own pricing page directly (WebFetch against `liveagent.com/pricing/` and
`reamaze.com/pricing`), then written into the canonical catalog with the same schema and
snake_case field convention as every other entry — not just used ad hoc for this page, so the
whole site benefits, not only this one dataset.

The AI-usage-pricing classification (whether a vendor bills AI-handled conversations as a
separate, disclosed line item) is a **hand-verified overlay**
(`lib/support-pricing-benchmark/data.ts`), not a keyword scanner over free-text tier notes.
A generic scanner would misclassify vendors that merely mention "AI" in marketing copy
without a real separate charge (e.g. Zendesk, Talkdesk, Genesys) as if they had one. Every
`disclosed: true` row was independently re-confirmed live against the vendor's own pricing
page on 2026-09-26; every `disclosed: false` row's note states specifically what was checked
and found absent.

## Missing data

1 of 16 (HappyFox) publishes no pricing figures of any kind on its public pricing page as of
2026-09-26 — confirmed by direct fetch, not assumed from an old or absent catalog record.
This row is marked Unknown throughout, on every field, never filled in with an estimate and
never counted as evidence about the product's actual pricing or feature set.

## Why "benchmark," not "index"

An index implies a defensible composite formula weighting multiple inputs into one score. This
dataset computes no such score — it reports verified per-vendor facts (a table) and a small
number of clearly labeled, formula-shown scenario calculations (arithmetic on published list
prices for a hypothetical team size). "Benchmark" is the accurate term for what the
methodology actually supports; "study," "dataset," and "comparison" would also have been
defensible, "index" would not.

## Calculation method

The only scenario calculation is: `Total = (seats × seat rate) + (AI-resolved conversations ×
AI unit price)`, computed only for Intercom, because it is the sole vendor in the
disclosed-AI-usage subset with all three inputs (seat rate, AI unit rate, and no undisclosed
included-usage allowance that would change the arithmetic) publicly available. See
`calculations.md` for the full worked table and the explicit reasoning for excluding the other
four disclosed-AI-usage vendors from this specific calculation.

## Limitations

- Excludes annual-contract discounts, enterprise negotiated pricing, taxes, and non-USD
  currency conversion.
- Billable-unit definitions (a Fin "outcome," a Freddy "session," a Kayako "resolved ticket,"
  a Re:amaze "resolution") are each vendor's own definition and are not directly
  interchangeable or quality-adjusted.
- Does not measure deflection rate, resolution quality, or actual customer spend — only
  published list prices and billing structures.
- Verification dates range from 2026-08-22 to 2026-09-26 across the sample; a single
  compilation date does not mean every row was rechecked on that date (each row states its
  own date).
