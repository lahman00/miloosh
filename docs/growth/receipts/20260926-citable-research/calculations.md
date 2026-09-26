# Calculations — Customer Support Pricing Benchmark 2026

All figures below are computed by `lib/support-pricing-benchmark/build.ts` from the real
catalog data in `dataset.json`; nothing here is manually typed or independent of the code that
renders the live page.

## Headline counts (defensible, calculated — not decided in advance)

| Question | Answer | How it was computed |
|---|---|---|
| How many of 16 vendors price AI usage separately? | **5** (Freshdesk, Gorgias, Intercom, Kayako, Re:amaze) | Count of rows with `aiUsagePricing.disclosed === true`, each individually hand-verified against the vendor's own pricing page |
| How many bundle AI into seat tiers with no separate price? | **8** | Count of rows with `entryPerSeat === true && !aiUsagePricing.disclosed` |
| How many publish no dollar figures at all? | **1** (HappyFox) | Count of rows with `status === "unknown" && entryAmount === null` |
| How many offer a free tier (not just a trial)? | **4** | Count of `hasFreeTier === true` |
| How many publish a specific entry-tier dollar amount? | **14** | Count of `entryAmount !== null` |
| How many require contacting sales even for the base seat price? | **1** (Kayako) | Count of `entryAmount === null && status === "contact_sales"` |
| Of the 5 with disclosed AI pricing, how many also disclose a full, computable total-cost formula (no undisclosed offsetting allowance)? | **1** (Intercom) | Manual determination per vendor, stated in each row's note — see next section |

## Why only Intercom gets a full crossing-point calculation

| Vendor | Seat price public? | AI unit price public? | Why it's excluded from the total-cost formula (if excluded) |
|---|---|---|---|
| Intercom | Yes ($29/seat/mo) | Yes ($0.99/outcome) | **Not excluded** — no undisclosed allowance offsets the arithmetic |
| Freshdesk | Yes ($19/agent/mo) | Yes ($49/100-session block) | First 500 sessions/month are included free; a real total depends on where in that block a given month's usage falls, which this benchmark does not model per-block |
| Gorgias | Yes ($40+/mo, flat tiers) | Yes ($0.90-$1.00, tier-dependent) | Overage rate itself varies by tier, and each tier has its own included-ticket allowance; not a single clean rate |
| Kayako | **No** (contact sales) | Yes ($1.00/resolved ticket) | Seat price is the missing input — cannot compute a seat+usage total without it |
| Re:amaze | Yes ($29-$69/team member/mo) | Yes ($0.85/resolution overage) | The size of the included monthly resolution allowance is not published, so the point at which overage begins is unknown |

## Worked scenario: Intercom, 3-seat team

Formula: `Total = (3 × $29) + (resolutions × $0.99)`

| AI-resolved conversations/month | Seat cost | AI usage cost | Total |
|---|---|---|---|
| 0 | $87.00 | $0.00 | $87.00 |
| 100 | $87.00 | $99.00 | $186.00 |
| 300 | $87.00 | $297.00 | $384.00 |
| 500 | $87.00 | $495.00 | $582.00 |
| 1,000 | $87.00 | $990.00 | $1,077.00 |

**Crossing point:** the AI-usage line alone exceeds the full 3-seat base fee ($87.00) at
⌈$87.00 / $0.99⌉ = **88 resolutions/month**. This is arithmetic on published list prices for a
hypothetical team, not a customer invoice, a recommendation, or a claim about typical usage
volume — stated as such on the live page.

## Illustrative-only framing (mission Part 7 requirement)

Every number in this section is labeled on the live page as illustrative arithmetic on
published list prices, never as a claim about any actual customer's bill — matching the same
discipline the independently-drafted SaaS Mag article (`docs/growth/receipts/
20260926-authority-war-2/saas-mag-article.txt`) already applies to its own, separately
hypothetical scenario math.
