# Revenue and conversion findings (2026-10-23)

All figures come from a COMPLETE read of the private first-party store (4,100 records, 0 failed) and the outbound ledger (25 objects, 0 failed) on 2026-10-23, 30-day window, **strict plus probable sessions only, test-marked events excluded**. `captureIntegrity` is NOT_VERIFIED, so these are stored events, not a census of visitors. Search Console is unavailable beyond the 2026-10-09 capture (no authenticated GSC or GA4 access in this session). Partner-network clicks, leads, sales and commissions are NOT_MEASURED.

## The journey as measured
| Stage | Sessions (30 days) |
|---|---|
| Sessions with a page view | 122 |
| of which landing on the homepage `/` | 56 |
| Reached a comparison page | 64 |
| Saw a vendor CTA (impression) | 69 |
| Clicked a vendor CTA | 2 |
| Affiliate hand-off recorded | 2 (one Omnisend, one Wix) |

CTA click-through from sessions that saw a CTA: 2 of 69 (2.9%), on a sample far too small for a rate to mean anything.

## Where the CTAs are, and what they did (impression events, not people)
| Placement (`ctaLocation`) | Impression events | Clicks |
|---|---|---|
| compare-page-choose-card | 88 | **0** |
| software-page-cta | 25 | 0 |
| role-guide-summary-table | 16 | 1 (Omnisend) |
| alternative-decision-guide | 15 | 0 |
| money-page-sticky-cta | 5 | 0 |
| money-page-decision-card | 4 | 0 |
| compare-summary-direct-vendor | 4 | 0 |
| buyer-checklist-cta | 1 | 1 (Wix) |
| other (vendor-link-pricing, vendor-link-free-trial, role-guide-card-cta) | 5 | 0 |

Reading: the page type that gets the most CTA exposure, the comparison "Choose X if" cards, produced no clicks, and the two hand-offs came from a summary table and a checklist placed higher on their pages. On the eight v2 comparison pages that card sits about 61% down the page while the verdict is at about 17% and the pricing table at about 21%. This is a reading-path pattern with very small numbers, not proof of cause.

## Defects and limits found in the measurement itself
1. **No device or viewport field exists on any event.** Mobile conversion friction cannot be measured from first-party data (NOT_MEASURED). Adding one is an analytics change and needs approval.
2. **Duplicate events are negligible:** 1 duplicate group (1 extra event) among 1,771 events in 30 days.
3. **BuyerDesk (`/recommend`) abandonment, countable sessions:** 8 started, 7 saw a step, 3 selected a need, 1 completed and viewed a result, 1 opened a product. Seven of eight started sessions did not finish; n is tiny and 3 of the 8 may be the same few people, so this is a signal to watch, not a conclusion.
4. **Two stores describe the same clicks** (first-party events and the legacy outbound ledger). Both are reported, never added.
5. **Partner attribution is not reconciled**: Trainual reported 10 clicks while Miloosh recorded none; only a PartnerStack export can explain it.

## Fix implemented in this branch
A neutral vendor-link row directly under the pricing table on the eight v2 comparison pages: the existing "Visit <product>" CTA for **both** products, same disclosure rules, same tracked component, with its own `ctaLocation = compare-page-pricing-table` so the effect can be read separately from the old placement. Regression tests assert both products get a link, disclosure appears only where the link is an affiliate link, and the new location is used only on the v2 pages. No destination, link, copy of any recommendation or visual design was changed.

## Opportunities, ranked by evidence and safety (details in the partner matrix of PR #84)
1. Apollo.io pages (payout verified, editable): measure the new row and the Experiment A post (live since 2026-10-22).
2. KrispCall vs Dialpad/Nextiva (payout verified, editable): measure Experiment B (live since 2026-10-23).
3. Wix: the only partner with real hand-offs (8 non-test) but payout not verified; owner action.
4. GetResponse: a payout-verified partner and the top pick in the creator-email BuyerDesk scenario, but its stored pricing is wrong (see the editorial and recommendation reports); editable only after the 2026-11-04 hold.
5. BuyerDesk next step: after the confidence fix, watch step completion weekly.

No revenue is forecast. A click is not a conversion; no conversion or commission has been verified.
