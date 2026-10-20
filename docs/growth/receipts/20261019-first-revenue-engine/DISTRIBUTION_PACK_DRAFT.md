# Miloosh organic distribution pack, 2026-10-19

**Status: DRAFT ONLY. NOT PUBLISHED.** Nothing was posted, sent, submitted or queued. Every item below needs fresh, action-specific owner approval and, for social accounts, an authenticated session that only the owner can open.

Destinations are the 8 comparison pages upgraded on branch `claude/first-revenue-engine-20261019` (v2 template). **They are not live until this branch is reviewed, merged and deployed by the owner.** Do not publish any link below before the owner confirms the deployment (the pages exist today in the old template, so a link would still resolve, but the facts quoted below would not yet appear on the page).

Claim sources: official vendor pricing pages read 2026-10-19 and re-read with their monthly/annual toggles on 2026-10-20 (CallRail, Ruler Analytics, Nextiva, KrispCall, Dialpad, Apollo.io, Sales Navigator, Cognism, Outreach, Salesloft, WhatConverts). The same wording is in `data/seo/comparison-verdicts.ts`, which tests tie to the stored product data. Figures are list prices at the time read and can change.

Voice: plain US English, one fact first, a limit stated, no promise, no hashtags, no em dashes. Disclosure line on every post because the pages contain affiliate links.

## Post 1: LinkedIn, Miloosh company Page. Pair: CallRail vs Ruler Analytics
Destination: https://miloosh.com/compare/callrail-vs-ruler-analytics?utm_source=linkedin&utm_medium=organic_social&utm_campaign=call_tracking_oct2026
```
Call tracking and marketing attribution look similar on a feature list, but they price differently.

CallRail's plans run from $50 to $195 a month on yearly billing (monthly billing costs more) plus usage, with a 14-day free trial. Ruler Analytics starts at £299 a month for up to 10k monthly visits and rises with traffic. It lists no free trial, and its Get Started button leads to a demo booking page.

We put both on one page with the official sources: https://miloosh.com/compare/callrail-vs-ruler-analytics?utm_source=linkedin&utm_medium=organic_social&utm_campaign=call_tracking_oct2026

Some Miloosh pages contain disclosed affiliate links. Partnerships do not determine our rankings.
```

## Post 2: X, @MilooshHQ. Pair: KrispCall vs Dialpad
Destination: https://miloosh.com/compare/krispcall-vs-dialpad?utm_source=x&utm_medium=organic_social&utm_campaign=business_phone_oct2026
```
KrispCall lists plans from $12 per user per month billed annually. Dialpad Connect lists $15 (Standard) and $25 (Pro) on annual billing, with a 14-day free trial.

Sources on the page: https://miloosh.com/compare/krispcall-vs-dialpad?utm_source=x&utm_medium=organic_social&utm_campaign=business_phone_oct2026

Some Miloosh pages contain disclosed affiliate links.
```

## Post 3: LinkedIn. Pair: Apollo.io vs LinkedIn Sales Navigator
Destination: https://miloosh.com/compare/apollo-io-vs-linkedin-sales-navigator?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sales_prospecting_oct2026
```
If you are choosing a prospecting tool, the pricing models are different.

Apollo.io lists a free plan and paid plans from $49 per seat per month billed annually, with a credit allowance on every plan. LinkedIn Sales Navigator lists $119.99 per license per month for Core and $159.99 for Advanced, and caps InMail at 50 a month.

Both vendor pages are linked in the comparison: https://miloosh.com/compare/apollo-io-vs-linkedin-sales-navigator?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sales_prospecting_oct2026

Some Miloosh pages contain disclosed affiliate links. Partnerships do not determine our rankings.
```

## Post 4: X. Pair: WhatConverts vs CallRail
Destination: https://miloosh.com/compare/whatconverts-vs-callrail?utm_source=x&utm_medium=organic_social&utm_campaign=call_tracking_oct2026
```
WhatConverts lists $30 to $160 a month plus usage and a 14-day trial. CallRail lists $50 to $195 plus usage on yearly billing, also with a 14-day trial.

https://miloosh.com/compare/whatconverts-vs-callrail?utm_source=x&utm_medium=organic_social&utm_campaign=call_tracking_oct2026

Some Miloosh pages contain disclosed affiliate links.
```

## Cadence and rules
- At most one post per channel per day, and no post for a pair already promoted in the last 14 days (2026-10-15 Playcode/Lovable, 2026-10-16 Close, MailerLite/Moosend draft of 2026-10-17 unpublished).
- Suggested order after deployment is confirmed: Post 1, then 3 (LinkedIn), Post 2, then 4 (X), spaced by days, not hours.
- First-party results are read by the `utm_campaign` tag with `npm run growth:first-party-funnel` after seven complete days. A post is not evidence of traffic, a click or a commission. Never describe unmeasured data as zero.
- Do not open any affiliate link to test it.

## Pre-publication checklist (owner or an approved session)
1. The branch is merged and deployed, and the live page shows the verdict card and pricing table.
2. The figure in each post still matches the vendor's pricing page (re-read the same day).
3. Native queue and feed checked for a duplicate; business identity verified on the platform.
4. Publish once, confirm permalink, text and destination.

## Not drafted on purpose
- Pairs with a stale or unverified pricing record (GetResponse, Constant Contact: pricing page differs from stored data). Re-verify first.
- Instagram, groups, personal profiles, ads, DMs, mass replies, reciprocal links, engagement pods.
- Any claim of hands-on use, ranking, "best", savings or results.

## Editorial outreach and community plan (no action taken; all need approval)
Follows the Authority & Distribution rules: one specific, useful, source-backed contribution per target; no templated mass mail; no payment; no link exchange.
1. **Original buyer resource.** A dated "Call tracking pricing, read from official pages" table (CallRail, WhatConverts, Ruler Analytics) is the strongest asset to point at, because it contains facts others do not collect in one place. It needs owner approval to build as a new URL and is not created in this branch (no new URLs without evidence of demand).
2. **Industry discussions.** Where a public question asks how call-tracking or prospecting tools are priced, answer with the vendor's own pricing page and offer the comparison only if it directly helps. Requires an authenticated session and owner approval per thread; no account created here.
3. **Editorial outreach.** Only to publications or newsletters that already cover marketing attribution or sales tooling, with a short note naming the specific table above. No outreach has been sent and none is drafted for a specific named person.
4. **Partner contact.** Not done. Partner programs are never contacted without the owner. Restrictions in `lib/growth-agents/partner-restrictions.ts` apply (check them for each partner before any promotion).
