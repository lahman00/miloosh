# Indexing requests — 2026-09-26

All requests below were submitted directly via live, authenticated Google
Search Console URL Inspection, one URL at a time, only after the material
content improvement for that URL was committed. **No indexing request
guarantees inclusion in the index** — every entry below reports only what
was actually observed (the request being accepted), never a promise of a
future outcome.

## Earlier the same day (separate mission, recorded for a complete account)
| URL | Time | Result |
|---|---|---|
| `https://miloosh.com/software/pipedrive` | 2026-09-26 (earlier) | "Indexing request received" |
| `https://miloosh.com/software/wrike` | 2026-09-26 (earlier) | "Indexing request received" |

## This mission
| # | URL | Result |
|---|---|---|
| 1 | `https://miloosh.com/software/whimsical` | "Indexing request received" (confirmed) |
| 2 | `https://miloosh.com/software/scribe` | "Indexing request received" (confirmed) |
| 3 | `https://miloosh.com/software/fullstory` | "Indexing request received" (confirmed) |
| 4 | `https://miloosh.com/software/marketo-engage` | "Indexing request received" (confirmed) |
| 5 | `https://miloosh.com/software/lucidchart` | **Blocked**: Search Console returned "חרגת מהמכסה" (quota exceeded) — "We couldn't process the request because you've exceeded today's quota. Try submitting this again tomorrow." |

**Requests stopped at that point.** Google's own daily indexing-request
quota for this property was reached after 6 total requests today (2 from
the earlier Pipedrive/Wrike work + 4 from this session). Per the mission's
own "do not spam another request" instruction, no retry was attempted and
no further URLs (firebase, vercel, netlify, contentful, hotjar, jasper,
copy-ai, perplexity, synthesia) were submitted this session.

## Not requested this session, and why
- **firebase, vercel, netlify, contentful, hotjar** (6th–10th of the
  originally planned 10): fully improved (real pricing, cons, decision
  guide, factual depth A-tier) and technically eligible, but blocked by
  the quota above. Recommended as the first action for a future session,
  once the daily quota resets.
- **jasper, copy-ai, perplexity, synthesia**: also fully improved, but
  deliberately not queued for indexing requests this round to keep total
  daily volume proportionate against a real, observed rate limit rather
  than exhausting it entirely on one cohort.

## Confirmed NOT re-requested (respecting "do not spam")
Pipedrive and Wrike were not touched again this session — their requests
already happened earlier the same day, and re-requesting them would have
been exactly the "spam another request" behavior the mission explicitly
prohibited.
