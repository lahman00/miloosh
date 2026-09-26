# Next Wave -- Google War Phase II backlog

Honest, evidence-backed backlog from this phase, in priority order:

1. **Identify the exact protection source for the 5 RANKING_RECOVERY pages**
   (freshdesk, buffer, ecwid, perplexity, synthesia) -- all are already
   indexed with real, large impression counts and poor position (73-86), the
   textbook ranking-war candidate, but this session could not identify which
   specific experiment/reservation file protects them beyond the general
   `readProtectedExperimentSlugs()` mechanism. Someone with more context on
   `docs/*experiment*.json` history should confirm whether that protection has
   concluded; if so, a snippet/title pass on these 5 is the single
   highest-confidence next ranking-war action.
2. **Guide-page factory** (Part 12/13) -- real evidence gathered this session
   (14 discovered-not-indexed + 15 truly-crawled-not-indexed guides, both
   exact lists in `var/growth/google-war-phase2/`), zero pages treated. Needs
   its own pass reading each guide's actual prose quality plus an intent-
   conflict check against software-alternatives and comparison pages.
3. **Re-check the comparison-quality-cohort experiment again in 30-60 days.**
   If it still shows no positive delta at that point, retire
   `generateWhoShouldChoosePairAware` and revert `TREATMENT_COHORT`'s pages to
   plain `generateWhoShouldChoose` rather than leave a permanently
   inconclusive experiment live in the codebase.
4. **Fill the `reservedProtection()` /compare/* gap properly** -- this session
   worked around it by manually cross-referencing each comparison candidate's
   two constituent slugs against the full protected-slug set, exactly as Wave
   3 did for its own comparison spot-checks. A permanent fix (emitting
   `/compare/{a}-vs-{b}` protection entries directly from
   `lib/google-war/protection.ts`) would remove the need for every future
   session to redo this by hand.
5. **Complete the true CRAWLED_NOT_INDEXED comparison list.** This session's
   samples are large but partial (627/651 and 395/601 in the two buckets) due
   to a GSC UI output-size limitation. A session with a working CSV-export
   path (or more patience for incremental scrolling) could get the exhaustive
   list, which would sharpen the indexed-vs-nonindexed comparator's
   contaminated control group into a clean one.
6. **Wave 4 (software)**: NOT selected this session. The 15 products enriched
   this phase were selected by "drags down a real-demand comparison," not
   "individually confirmed CRAWLED_NOT_INDEXED as its own software page" --
   a genuine Wave 4 should use the real 175-URL truly-crawled-not-indexed
   software list (count confirmed live; full URL list not cleanly captured
   this session, see `fresh-gsc-baseline.json`'s toolLimitation note) as its
   candidate pool, cross-referenced the same way Waves 1-3 did.
7. **Off-site**: the 5 drafted outreach emails and 6 directory-submission
   payloads from a different concurrent agent's ledger need the user's own
   review and action (see `offsite-handoff.json`); the 2 items that ledger
   calls "EXECUTED_LIVE" need independent verification by someone who can
   reach Reddit and the Qevra directory directly.
8. **Category hub expansion**: `developer-tools`, `design`, and `api` are the
   next-ranked evidence-backed candidates after `analytics`/`security` (see
   `category-indexation.json`) -- not treated this session given time already
   spent.
