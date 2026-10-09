# Growth and revenue agent system: canonical receipt, 2026-10-09

**Run mode: IMPLEMENTATION of local, read-only tooling, and DIAGNOSTIC_READ_ONLY analysis of the site.** Nothing was published, deployed, pushed, merged, indexed, sent or paid for. No page, data record, template, route, sitemap, robots rule or partner link changed, and no partner, publisher, Google or hosting account was touched. The only existing files changed are `package.json` (five new `growth:*` scripts) and an addendum to `docs/growth/MILOOSH_GROWTH_OS_2026.md`. The decision this receipt needs from Eyal is in section 10.

| | |
| --- | --- |
| Branch | `claude/growth-agent-system-20261009`, cut from `80eb1e5`, the commit production runs. Local commits only; nothing pushed. |
| Reports generated | 2026-10-09T00:52:51.000Z at `e13b479`, in a clean checkout, by the command in section 11 |
| Search Console read | 2026-10-08, roughly 22:15Z (first table) to 23:55Z (exact-page checks); the manifest records 22:25Z as the capture time of the tables. The owner's signed-in session, read-only. |
| Production | `dpl_4AHS358cZHgukiyYtVkwsTZ3W4kn`, created 2026-10-08 11:05:03Z, GitHub deployment SHA `80eb1e5` |
| Property | `sc-domain:miloosh.com`, search type Web, no filters, Pacific-time days |

Code commits, oldest first. The reports and gate records below belong to `e13b479`, the last commit that changed behaviour; the commit after it changes text in two test files only, and the receipt commit that follows touches only `docs/growth/`:

- `fcc018c` Add read-only growth and revenue agent system
- `d0d26a8` growth agents: honest cannibalization wording, non-partner demand section, triage dedupe
- `902eeb1` growth agents: tie gate results and baselines to the commit they describe
- `1b7c8bb` growth agents: strip the platform's deployment id from asset URLs when comparing rendered pages
- `39df947` growth agents: keep folder paths and home-folder names out of committed reports
- `e13b479` growth agents: give no review date to a page that has no planned change
- `171ee03` growth agents tests: use neutral placeholders instead of real account and folder names

Labels: **IMPLEMENTED** (code exists in the repository), **TESTED** (a named test or command ran and its result is stated), **RELEASED** (live in production), **OBSERVED** (read from a source with a locator), **NOT_VERIFIED** (stated but not checked, or checked and inconclusive). `NOT_MEASURED` and `UNAVAILABLE` mean no source exists or it was not readable; they are never zero. Search Console figures are Google's observations of Miloosh, not site analytics, and nothing here is a forecast.

## תקציר בעברית

- **מה נבנה:** מערכת סוכנים לקריאה בלבד בתוך הריפו. מנהל צמיחה אחד (Director) מאחד שלושה סוכנים שפועלים בפועל (התאוששות מגוגל, הכנסות משותפים, שומר שחרור) ושלושה תפקידים שהוגדרו כ־skills וחוזים בלבד (דף פרימיום, הפצה וסמכות). פקודה אחת: `npm run growth:director`. ברירת המחדל לא כותבת שום קובץ ולא משנה שום דבר.
- **הפעולה הכי משתלמת והכי מוגנת:** פעולה שלך בלבד. לסדר את חשבון PartnerStack הישן שנושא ארבעה שותפים פעילים (elevenlabs, monday, whatconverts, wrike). לפי חבילת הפעולה שברפו, התמיכה של PartnerStack אישרה ב־2026-09-14 שאין בחשבון ספק תשלום ושצריך להוסיף מיקום רשום למס לפני שאפשר לחבר שיטת תשלום. אין לסגור את החשבון. בדפים שמציגים את ארבעת השותפים נרשמו 1,311 חשיפות היסטוריות ב־13 דפים. כל עוד זה לא מוגדר, אי אפשר להראות שקליק עליהם מסתיים בעמלה שמשולמת.
- **מה זה לא עושה:** זה לא מביא מבקרים. הביקוש הנוכחי הוא 39 חשיפות וקליק אחד ב־28 ימים לכל האתר, מול 25,646 חשיפות ו־9 קליקים ב־13 ימי הנתונים של החלון ההיסטורי. 97% מהחשיפות ההיסטוריות היו בדפים שהמיקום הממוצע שלהם 50 ומטה, ולכן גם שחזור מלא שלהן לא היה מביא כמעט מבקרים. אין ראיה לדרך מהירה להחזיר אותן.
- **חמש ההזדמנויות המובילות** (לפי נתיב הכנסה מאומת ואחר כך ביקוש היסטורי): activecampaign, mulesoft, clickup, sprout-social, confluence. כולן ביקוש היסטורי בלבד (אפס חשיפות נבדק עכשיו). activecampaign הוא הדף היחיד עם נתיב הכנסה מאומת, והוא בחלון מדידה עד 2026-11-04. אין דף מבין החמישה שאפשר לשנות היום בלי לפגוע במדידה או בדפים מוגנים.
- **מה חסום או חסר:** שערי השחרור אדומים כבר בקומיט הבסיס (npm audit: קריטי אחד, 9 גבוהים, אחד נמוך; 12 בדיקות נכשלות), והשינוי שלי לא הוסיף כשל. אין נתוני המרות, עמלות ותשלומים בשום מקום. אין נתון על קושי מילות מפתח. שחרור 2026-10-08 לא כולל שני קומיטים של "SEO recovery" מ־2026-10-06 (noindex לקבוצת השוואות וגיזום דפי תוכנה) שהיו בפרודקשן קודם. לא ברור אם זה מכוון, ואני לא יכול לדעת.
- **מה לא נעשה:** לא פורסם דבר, לא נשלח דבר, לא נבדק קישור שותף חי, לא הוגשה בקשת אינדוקס, לא נגעתי בעצי עבודה אחרים (Salesforce, Sprout Social ואחרים). קריאה המונית של עמודים חיים נחסמה על ידי מערכת ההרשאות, ולכן ההתאמה בין האתר החי לקומיט נבדקה ב־6 דפים בלבד.

| Status | What |
| --- | --- |
| IMPLEMENTED, TESTED | Director, Google Recovery Agent, Affiliate Revenue Agent, Release Guardian, Search Console importer, protection model, redaction, six skills, five commands. 643 tests in 24 files, all passing; 85 deliberate code mutations, all caught except two equivalent ones (section 8). |
| TESTED against the real repository | Gates at the base and at the final commit, run by `growth:record-gates` in clean checkouts (section 7). Rendered HTML of 1,785 pages identical between the base build and the final build. |
| OBSERVED | Search Console tables, sitemap, page indexing, crawl stats, URL Inspection (8 URLs), live reads of 6 pages, production deployment identity and history, protection state, partner registry. |
| RELEASED | Nothing. |
| NOT_VERIFIED | Cause of the August collapse; content gaps against vendor sources; conversions, commissions, payouts; keyword difficulty and authority; whether dropping the 2026-10-06 recovery commits was intended; live pages beyond six (section 9). |

## 1. The answer

**Question.** What is the single most valuable, defensible action Miloosh should take next to acquire commercially relevant visitors and improve the chance of affiliate revenue?

**Answer.** Settle the PartnerStack account that carries four active partners (elevenlabs, monday, whatconverts, wrike), so a click on them can end in a payable commission. Only the owner can do it, and no agent logged in, changed a payment detail or sent anything. The repository's own owner action pack (`partnerstack-personal-payout-rail`, `data/affiliate/owner-action-packs.ts`) records that PartnerStack support confirmed on 2026-09-14 that the account has no payment provider connected and needs a tax-registered location before one can be connected, and that the declined network application does not affect the four existing referral relationships. Its required steps: keep the four live referral URLs active; add the tax-registered location in the team settings with owner-verified information; connect an actually offered payout provider locally and complete any verification; do not close the account before any deliberate migration has preserved the four relationships. This is what the repository records; I did not re-verify it with PartnerStack.

**Why this and not a page edit.** The Director orders work by fixed precedence, not a score: work an agent can execute now, then owner decisions, then evidence gaps, then waiting. Nothing in the first tier is safe to do. Of the 17 pages with more than 254 historical impressions, 9 are protected (experiment or measuring cycle), 5 are inside a release observation window (a content change would confound the measurement), 1 has unfinished work in another worktree, and 2 are editable as pages but built from records that also feed protected or observed pages. The pages that are free to edit all have 254 impressions or fewer, and the largest of them have no partner path (end of section 2). The payout action is the only one that changes the outcome path today without touching a measured page or waiting for Google. Thirteen pages with historical demand show these four partners; they drew 1,311 historical impressions (315 on the partners' own pages, 996 on other products' pages that show them as an extra option). That is demand evidence, not a revenue forecast.

**What it does not do.** It does not bring visitors. Current search demand is 39 impressions and 1 click in 28 days for the whole site, and 97% of the historical impressions sat at an average position of 50 or worse (section 5.2). No defensible action exists today that the evidence says will acquire visitors: the five best-evidenced pages are held until 2026-11-04 or feed protected pages, and none of the 15 sampled URLs shows a Google crawl after the 2026-10-08 release. The honest plan is to fix the revenue path now, protect the measurements, and decide on content work when the windows close.

## 2. Shortlist: five opportunities

Rule (the Director prints it in every report): A page enters the shortlist only if the checked-out code publishes it, it has a defined path to action (editable now, or in an observation window with an end date) and at least the operating-floor of measured historical impressions. Order: (1) pages with a verified revenue path (a call to action, for the page's own product or another product it shows, that leads to an active partner with a resolved link and a verified payout rail) before the rest; (2) more measured historical impressions first; (3) URL. Whether a page can be changed now or only after its observation window is shown on each entry; it does not change the order. A page that shares a product record with a higher-ranked shortlisted page is suppressed, because editing both would be one interdependent change. No numeric score is used.

Demand vocabulary used throughout. **Verified current demand**: impressions in the latest finalised window, measured. None of the five has any (0 of 5). **Historical demand**: measured in 2026-07-23 to 2026-08-19, which says nothing about today. **Hypothetical demand**: none is claimed; no keyword-volume tool was used and nothing was inferred from autocomplete or a competitor. **Verified payable path**: a call to action on the page leads to an active partner with a resolved link and a verified payout rail. **Unverified monetization**: a partner is shown but its payout rail is not verified.

| # | Page | Historical demand | Current demand | Partner path | Payout | Protection and path to action | Still open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `/software/activecampaign` | 233 impressions, position 78 | 0 impressions (exact-page check) | own: activecampaign; shown as another option: getresponse | verified | observation window until 2026-11-04 | content gap not checked against vendor sources |
| 2 | `/software/mulesoft` | 479 impressions, position 77.7 | 0 impressions (exact-page check) | none (visibility only) | not applicable | observation window until 2026-11-04 | content gap not checked against vendor sources |
| 3 | `/software/clickup` | 428 impressions, position 85.2 | 0 impressions (exact-page check) | shown as another option: monday | not verified | editable as a page, but 14 of 17 pages built from its record are protected or observed | a record change would alter protected or observed pages; content gap not checked against vendor sources |
| 4 | `/software/sprout-social` | 383 impressions, position 80.9 | 0 impressions (exact-page check) | none (visibility only) | not applicable | observation window until 2026-11-04; unfinished work in another worktree | content gap not checked against vendor sources |
| 5 | `/software/confluence` | 338 impressions, position 67.9 | 0 impressions (exact-page check) | none (visibility only) | not applicable | editable as a page, but 3 of 13 pages built from its record are protected or observed | a record change would alter protected or observed pages; content gap not checked against vendor sources |

Suppressed because they share a product record with a higher-ranked entry (editing both would be one interdependent change): `/compare/confluence-vs-obsidian` (shares `confluence` with `/software/confluence`); `/compare/clickup-vs-teamwork` (shares `clickup` with `/software/clickup`).

Evidence already collected for each of the five (read-only; 2026-10-08/09):

| Page | Live response | Google coverage (indexed version) | Buyer intent (page-level queries) | Vendor-source content gap | Rendered sponsored links |
| --- | --- | --- | --- | --- | --- |
| `/software/activecampaign` | PASS: HTTP 200, self-consistent canonical, no noindex. | PASS: Crawled - currently not indexed; last crawl 2026-09-01T16:34:01+03:00; read 2026-10-08. | PASS: 100% of the 155 impressions Search Console lists for ActiveCampaign (28 of 28 listed queries)… | UNKNOWN | 3 link(s): activecampaign, getresponse |
| `/software/mulesoft` | PASS: HTTP 200, self-consistent canonical, no noindex. | PASS: Crawled - currently not indexed; last crawl 2026-08-10T16:05:03+03:00; read 2026-10-08. | PASS: 100% of the 420 impressions Search Console lists for MuleSoft Anypoint Platform (51 of 51 listed queries)… | UNKNOWN | 0 link(s): no active partner |
| `/software/clickup` | PASS: HTTP 200, self-consistent canonical, no noindex. | PASS: Crawled - currently not indexed; last crawl 2026-08-30T21:19:43+03:00; read 2026-10-08. | PASS: 98% of the 304 impressions Search Console lists for ClickUp (34 of 37 listed queries)… | UNKNOWN | 1 link(s): monday |
| `/software/sprout-social` | PASS: HTTP 200, self-consistent canonical, no noindex. | PASS: Crawled - currently not indexed; last crawl 2026-08-31T23:30:27+03:00; read 2026-10-08. | PASS: 100% of the 343 impressions Search Console lists for Sprout Social (32 of 33 listed queries)… | UNKNOWN | 0 link(s): no active partner |
| `/software/confluence` | PASS: HTTP 200, self-consistent canonical, no noindex. | PASS: Crawled - currently not indexed; last crawl 2026-08-08T02:16:41+03:00; read 2026-10-08. | PASS: 100% of the 289 impressions Search Console lists for Confluence (32 of 32 listed queries)… | UNKNOWN | 0 link(s): no active partner |

Pages that are held (protected, in an experiment cycle, or with unfinished work elsewhere) and therefore not offered, largest first ("active partner" means the product itself has one):

| Page | Historical impressions | Why it is held | Active partner on the product |
| --- | --- | --- | --- |
| `/software/semrush` | 1,655 | PROTECTED: member of the legacy protected experiment cohort | no |
| `/software/intercom` | 1,603 | PROTECTED: member of the legacy protected experiment cohort | no |
| `/software/freshdesk` | 1,545 | PROTECTED: member of the legacy protected experiment cohort | no |
| `/software/front` | 576 | PROTECTED: member of the legacy protected experiment cohort | no |
| `/software/buffer` | 539 | PROTECTED: member of the legacy protected experiment cohort | yes |
| `/software/help-scout` | 462 | PROTECTED: member of the legacy protected experiment cohort | no |
| `/software/salesforce` | 429 | IN_FLIGHT: unfinished change in another worktree | yes |
| `/software/ecwid` | 374 | PROTECTED: experiment record still MEASURING | yes |
| `/software/pipedrive` | 324 | PROTECTED: member of the legacy protected experiment cohort | yes |
| `/software/airtable` | 303 | PROTECTED: first-revenue cohort (the owner's active conversion campaign) | yes |

**The first page that is free to work on today** is not in the top five. The 5 above are ordered by revenue path and demand; 36 pages with impressions are editable with no protected or observed page built from the same record (33 software pages at or above the 20-impression floor). The largest:

| Page | Historical impressions | Average position | Passes the site's indexing-quality gate | Partner path |
| --- | --- | --- | --- | --- |
| `/software/tidio` | 254 | 86.8 | true | none (visibility only) |
| `/software/auth0` | 107 | 72.1 | false | none (visibility only) |
| `/software/ghost` | 64 | 73.3 | false | none (visibility only) |
| `/software/weebly` | 63 | 71.7 | false | none (visibility only) |
| `/software/docusaurus` | 58 | 64.6 | false | none (visibility only) |

None of these five has a partner path, so they are visibility-only (`/software/squarespace`, 25 impressions, is the only free page that shows a partner, as another option). Their live response, buyer-intent queries and vendor-source gap are still unchecked. They are listed for completeness, not recommended over the owner action.

## 3. What already existed, and what was missing

Audited at `80eb1e5` on 2026-10-09 (files, git and registries read; nothing run against an account):

| Capability | State at `80eb1e5` | Where / evidence |
| --- | --- | --- |
| Operating policy | PRESENT | `docs/growth/MILOOSH_GROWTH_OS_2026.md` (kept as the single master document; this work adds section 9 and no competing rulebook) |
| Skills for Google recovery, money pages, comparisons | PRESENT outside the repo | `miloosh-google-recovery-director`, `miloosh-revenue-recovery-finder`, `miloosh-money-page-upgrader`, `miloosh-comparison-opportunity-finder` live in the owner's user-level skills folder, not in git |
| Search Console data in | PARTIAL | A hand-captured snapshot `data/seo/priority-snapshot.json` (537 rows, 2026-09-24). The ten Search Console swarm agents are disabled (`enabled: false`): their service-account credential is a sensitive Vercel variable that is not readable on this machine. No export importer. |
| Protection of experiments and observation windows | PARTIAL | `scripts/growth/gsc-opportunity-miner.ts` (a hard-coded legacy cohort plus MEASURING receipts), `data/revenue/first-revenue-cohort`, `data/experiments/comparison-quality-cohort`, decision money pages. No single verdict model; `lib/google-war` (the premium lineage's registry) is not in this lineage. |
| Missing-data convention | MISSING | At least five different conventions; silent zeros in ten or more places; `lib/agents/scoring.ts` adds a constant 0.5 search signal to every finding. |
| Cannibalization, keyword difficulty, authority | PARTIAL / MISSING | A text-similarity heuristic only. No keyword-difficulty or Domain Rating source anywhere. |
| Affiliate registry, ledger, payout rails, owner action packs | PRESENT | `data/affiliate/*`: 27 active partners, ledger and registry agree 27 of 27. |
| Conversions, approved commissions, received payouts | MISSING | No store anywhere in the repository. |
| Click data | PARTIAL | A first-party event store and a revenue outbound log describe the same clicks differently; four different definitions of a "qualified human click" exist. |
| Program restrictions (paid media, brand bidding, coupon sites) | PARTIAL | Prose in the ledger only. |
| Release gates | PRESENT, red at base | CI: `npm ci`, `npm audit --audit-level=moderate`, `npm test`, `npm run validate:data`, `npm run lint`, `npm run build`. No `release:check`, no typecheck script. |
| Awareness of unfinished work in other worktrees | MISSING as a tool | Four sibling worktrees hold unmerged fixes (section 7). |

I reused the registries, the ledger, the payout-rail and owner-pack data, the experiment receipts, the site's own indexing-quality gate, the sitemap code and the existing date helper. The three SEO skills named in the brief (`exceed-quality-threshold`, `cannibalization`, `authority-mark`) do not live in `coreyhaines31/marketingskills`; they are in a separate vendor repository with `curl | bash` installers. Nothing was installed. Only the methodology was adopted: five gates with no score and "indeterminate" when access is missing, one owner page per intent with no deletion or noindex without owner approval, and attribution that counts each outcome once. Provenance: `.agents/skills/miloosh-growth-director/references/marketingskills-provenance.md`.

## 4. What was built

| Role | Status | Code (`lib/growth-agents/`) | Skill (`.agents/skills/`) | Command |
| --- | --- | --- | --- | --- |
| Miloosh Director | IMPLEMENTED, TESTED, run on real evidence | `director.ts`, `director-cli.ts`, `report-he.ts`, `redact.ts`, `contracts.ts` | `miloosh-growth-director` | `npm run growth:director` |
| Google Recovery Agent | IMPLEMENTED, TESTED, run on real evidence | `gsc-import.ts`, `indexation.ts`, `protection.ts`, `protection-sources.ts`, `inventory.ts`, `inventory-loader.ts`, `intent.ts`, `google-recovery-agent.ts`, `live-check.ts`, `live-check-source.ts` | `miloosh-google-recovery-agent` | `growth:director`, `growth:page-check` |
| Affiliate Revenue Agent | IMPLEMENTED, TESTED, run on real registries | `partners.ts`, `partner-restrictions.ts`, `funnel.ts`, `affiliate-revenue-agent.ts` | `miloosh-affiliate-revenue-agent` | `growth:director` |
| Premium Page Agent | CONTRACT and typed hand-off only; reuses `miloosh-money-page-upgrader` | `premium-handoff.ts` | `miloosh-premium-page-agent` | none |
| Authority & Distribution Agent | CONTRACT and an outreach-ledger validator; sends nothing, drafts nothing automatically | `distribution.ts` | `miloosh-authority-distribution-agent` | `growth:outreach-check` |
| Release & Quality Guardian | IMPLEMENTED, TESTED | `guardian.ts`, `guardian-sources.ts`, `rendered-diff.ts` | `miloosh-release-guardian` | `growth:record-gates`, `growth:rendered-diff`, `growth:director` |

Shared foundations: `evidence.ts` (`Measured<T>`: MEASURED, PARTIAL, STALE, UNAVAILABLE, NOT_MEASURED, NOT_OBSERVED; absence becomes zero only through an exact-page check or a complete table with a written justification), `urls.ts` (one canonical page URL; www and apex merged). Tests: `tests/growth-agents/` (24 files). Size of the code commits against the base, before this receipt: 87 files, 14,485 added lines, 0 removed.

How it is read-only by construction: the analysis modules are pure (no filesystem, process, network, clock or environment access), and a test fails if one starts using any. The adapters issue only read-only git subcommands, a `vercel inspect`, a GET-style `gh api` and plain GET requests to `miloosh.com` pages; the command-line entry points write nothing unless `--out` is given. Side effects arrive through injected ports, so the tests prove that the default run writes no file and creates no directory. `growth:record-gates` is the one command that is not read-only on disk: the repository's own gate commands write gitignored build output. It never edits a gate, passes a bypass flag, retries, installs or deploys, and it refuses to overwrite a file.

Two design points that matter for trust:

- **Protection precedence** is PROTECTED, then OBSERVATION_WINDOW, then IN_FLIGHT, then UNKNOWN (a source that could not be read), then EDITABLE. A page is offered for editing only when it and every page built from the same record are EDITABLE.
- **Gate results count only for the commit they were produced for.** `growth:record-gates` reads the commit and the cleanliness of the checkout from git. The Guardian trusts recorded results only when they name the commit under review and were produced in a clean checkout; otherwise every gate is `NOT_RUN`, the verdict is `NOT_VERIFIED` and the reason is printed. A baseline is used only when it was recorded at the base commit. I found this gap while preparing this receipt: an earlier version of the Guardian accepted a bare list of results with no commit.

## 5. Google recovery receipt

The ten sections `miloosh-google-recovery-director` requires. Dates are exact; denominators are stated; every statement carries a label.

### 5.1 Current Google state (OBSERVED)

Property `sc-domain:miloosh.com`, search type Web, no filters, Pacific-time days, read in the owner's signed-in session. The importer treats `dataThrough` as the capture date minus three days (2026-10-05); Search Console prints no final-data date, so that rule is an assumption shared with the repository's date helper. The property has data only from 2026-08-07, so the historical window holds 13 observed days, and rates use observed days.

| Window | Dates | Observed days | Clicks | Impressions | Page rows | Impressions per observed day |
| --- | --- | --- | --- | --- | --- | --- |
| Historical | 2026-07-23 to 2026-08-19 | 13 of 28 | 9 | 25,646 (page rows sum to 25,780) | 487 | 1,972.77 |
| Recent (finalised) | 2026-09-08 to 2026-10-05 | 28 of 28 | 1 | 39 (page rows sum to 44) | 6 | 1.39 |

Daily series: peak 3,044 impressions on 2026-08-19; largest one-day fall 2,087 on 2026-08-20 to 46 on 2026-08-21 (97.8% lower). Timing is reported; no cause is asserted. The sums are 25,646 impressions from the 13 daily rows and 25,780 from the 487 page rows; a result can list several of the site's URLs, so the two differ.

| Source | Reading | Locator in `evidence/gsc-ui-capture-20261009/` |
| --- | --- | --- |
| Sitemap report | `https://miloosh.com/sitemap.xml` submitted and read 2026-10-08, status Success, 692 discovered pages. The live file (HTTP 200, last modified 2026-10-08 11:07:52 GMT) holds 692 unique URLs (348 comparisons, 264 software pages, 27 categories, 53 others). No resubmission is needed. | `sitemaps.json` |
| Page indexing (report last updated by Google 2026-10-04, before the 10-07 and 10-08 releases) | 211 indexed, 1,325 not indexed: crawled, currently not indexed 844 (validation started 2026-09-24, failed 2026-10-05); alternate page with proper canonical 58; page with redirect 2; a second group of 421 first detected 2026-08-08 whose English label is NOT_VERIFIED (the interface was Hebrew) | `page-indexing.json` |
| Crawl stats (updated 2026-10-06) | 83.6K requests in 90 days, 98 ms average response, no host issues (apex 64,890, www 18,747). A daily series was not captured. | `crawl-stats.json` |
| URL Inspection, indexed version, 8 URLs | All eight: "URL is not on Google", crawled but not indexed, crawl and indexing allowed, page fetch successful, Google canonical equals the URL. Last crawls between 2026-08-08 and 2026-10-07, every one before the 2026-10-08 release. | `url-inspections.json` |
| Post-release crawl | 0 of 15 sampled URLs show a crawl on or after 2026-10-08 (newest sampled crawl 2026-10-07). The sample is not the whole site. The 14/28-day clocks cannot start until a re-crawl is observed. | Director report, `NO_POST_RELEASE_CRAWL_OBSERVED` |
| Live reads, 6 pages | HTTP 200, canonical equals the URL, no robots meta, no `X-Robots-Tag`, for each of the six (five software pages and the MkDocs comparison). | `evidence/page-checks-20261009/extras.json` |
| Manual actions, security issues | Not read in this run. NOT_VERIFIED. | none |

Full method, cross-checks (row counts against report headers, exact-page checks) and interface notes: `evidence/gsc-ui-capture-20261009/capture-notes.md`. Query-level tables are private and kept outside git.

### 5.2 Collapse map by page family (OBSERVED)

| Page family | Pages with impressions, historical | Historical impressions | Share | Pages with impressions, recent | Recent impressions |
| --- | --- | --- | --- | --- | --- |
| software | 185 | 24,120 | 93.6% | 2 | 2 |
| compare | 270 | 1,555 | 6.0% | 0 | 0 |
| home | 1 | 40 | 0.2% | 1 | 38 |
| legal | 10 | 29 | 0.1% | 2 | 3 |
| category | 11 | 19 | 0.1% | 0 | 0 |
| other | 3 | 17 | 0.1% | 0 | 0 |
| guide | 0 | 0 | 0.0% | 1 | 1 |

Total page-row impressions in the historical window: 25,780. Page rows are grouped here by family after merging www and apex (480 canonical pages).

The impressions were almost all deep in the results, which changes what "recovery" is worth. Grouping the same pages by their average position (computed from `pages-historical.csv`):

| Page's average position | Pages | Impressions | Share | Clicks |
| --- | --- | --- | --- | --- |
| 20 or better | 90 | 301 | 1.2% | 3 |
| 20 to 50 | 42 | 463 | 1.8% | 0 |
| 50 or worse | 348 | 25,016 | 97.0% | 6 |

So 97.0% of the historical impressions were on pages averaging position 50 or worse, and the whole window produced 9 clicks. Restoring those impressions would not by itself restore visitors; the value of recovery depends on rankings improving, which this run has no evidence for.

### 5.3 Survivors (OBSERVED, cause UNKNOWN)

Pages that still earned impressions in the recent window (the complete pages table, 6 rows):

| Page | Clicks | Impressions | Average position |
| --- | --- | --- | --- |
| `/` | 1 | 38 | 21.4 |
| `/editorial-policy` | 0 | 2 | 7.5 |
| `/software/stack-overflow-for-teams` | 0 | 1 | 2.0 |
| `/best-help-desk-for-ecommerce` | 0 | 1 | 3.0 |
| `/software/later` | 0 | 1 | 3.0 |
| `/sources-policy` | 0 | 1 | 9.0 |

The nine clicks of the historical window sat on eight pages: `/` (2), `/software/intercom` (1), `/software/airtable` (1), `/software/vercel` (1), `/software/mattermost` (1), `/software/docker` (1), `/software/tailscale` (1), `/compare/github-copilot-vs-perplexity` (1). The survivors are the homepage, the two trust pages (editorial and sources policy) and three stray product or guide pages with one impression each. Six stray impressions cannot support a statement about what the surviving pages have in common; that is UNKNOWN, and no feature comparison was attempted.

### 5.4 Losers (OBSERVED)

The 12 largest pages by historical impressions. Every one has zero current impressions, read from a complete table or, for the four marked, from an exact-page check on 2026-10-08 (table complete, filter "page contains the path").

| Page | Historical impressions | Average position | Recent | Protection |
| --- | --- | --- | --- | --- |
| `/software/semrush` | 1,655 | 77.2 | 0 (complete table) | protected |
| `/software/intercom` | 1,603 | 86.1 | 0 (complete table) | protected |
| `/software/freshdesk` | 1,545 | 80.1 | 0 (complete table) | protected |
| `/software/front` | 576 | 75.9 | 0 (complete table) | protected |
| `/software/buffer` | 539 | 83.6 | 0 (complete table) | protected |
| `/software/mulesoft` | 479 | 77.7 | 0 (exact-page check) | observation window until 2026-11-04 |
| `/software/help-scout` | 462 | 73.5 | 0 (complete table) | protected |
| `/software/salesforce` | 429 | 75.7 | 0 (complete table) | unfinished work elsewhere |
| `/software/clickup` | 428 | 85.2 | 0 (exact-page check) | editable |
| `/software/sprout-social` | 383 | 80.9 | 0 (exact-page check) | observation window until 2026-11-04 |
| `/software/ecwid` | 374 | 73.4 | 0 (complete table) | protected |
| `/software/confluence` | 338 | 67.9 | 0 (exact-page check) | editable |

169 pages were evaluated in full (`candidates.csv`, one row each). 480 pages had impressions in the historical window: 343 editable, 40 protected (experiment or measuring cycle), 96 inside a release observation window, 1 with unfinished work in another worktree, 0 unknown.

### 5.5 Root-cause hypotheses, ranked

"Crawled, currently not indexed" is a symptom to explain, not a cause. Nothing here asserts that Google penalised the site.

| Rank | Hypothesis | Label | Evidence | Falsifier or next check |
| --- | --- | --- | --- | --- |
| 1 | A site-wide event around 2026-08-20/21 removed nearly all of the site's visibility; it is not a page-by-page quality verdict. | SUPPORTED HYPOTHESIS | OBSERVED: a 97.8% one-day fall (2,087 to 46); loss across every family at once (185 software pages and 270 comparisons to 2 and 0 in the recent window) while the homepage and trust pages stayed; 844 plus 421 pages not indexed. A receipt from 2026-10-03 (another worktree, not in this lineage, not re-verified here) dates a confirmed Google spam update 2026-08-18 to 2026-08-21 and an indexed-pages drop from 950 to 222 on 08-29. | Any group of comparable pages that kept impressions after 08-21 (none among the 480). A manual action or security issue in Search Console (those pages were not read this run). Google's published update dates not matching. |
| 2 | The not-indexed backlog is a symptom of the same event. | OBSERVED (symptom) | `page-indexing.json`; validation failed 2026-10-05. | Not a cause; no test. |
| 3 | Templated or thin content across 1,348 comparisons and 354 software pages contributes. | UNKNOWN, NOT_VERIFIED | Not measured in this run. The 2026-10-03 receipt reported 98% identical heading structure on sampled comparisons and no on-page feature that predicted index survival; not re-verified here. | A measured difference between surviving and lost pages; vendor-source comparison of a sample. |
| 4 | Googlebot stopped re-crawling. | NOT_VERIFIED, partly contradicted | Sampled pages were last crawled up to 2026-10-07, so crawling did not stop everywhere; the daily crawl series was not captured. | Crawl-stats export by day. |
| 5 | A technical block (robots, canonical, noindex, server error) causes the loss. | OBSERVED not found on sampled pages | 8 inspections and 6 live reads show crawl allowed, fetch successful, canonical equals the URL, HTTP 200, no noindex. Not proof for all pages. | Any sampled page showing a block. |
| 6 | The 2026-10-07 deployment dropped two recovery measures shipped on 2026-10-06. | OBSERVED (deployment fact), effect UNKNOWN | `1d6746b` ("SEO recovery: noindex historical zero-signal comparison cohort") and `11ba877` ("SEO recovery: prune generic zero-signal software pages from Google") were recorded by GitHub as Production deployments (the commits are dated 2026-10-06) and are not ancestors of the commit production runs now; today's sitemap lists 348 comparisons and 264 software pages. Intent NOT_VERIFIED. | The owner confirming it was or was not deliberate; Google's index counts after the next report. |

### 5.6 First recovery cohort

**No URL is cleared for editing today.** The skill asks for 5 to 10 URLs and returns fewer when fewer qualify. A URL needs demonstrated demand, distinct buyer intent, no observation conflict, protection clearance, an evidence-backed value gap and a measurable hypothesis. The five pages in section 2 have demand and buyer intent but fail protection or observation, and none has a vendor-confirmed gap. The pages that pass protection (end of section 2) have little demand and unchecked facts. The candidate cohort for the next decision point is the section 2 list: `/software/activecampaign`, `/software/mulesoft` and `/software/sprout-social` become reviewable on 2026-11-04, after a first observed re-crawl; `/software/clickup` and `/software/confluence` need an owner decision about the records they share with protected pages. `/software/tidio` is the option if the owner wants a page to work on before then.

### 5.7 Pages explicitly excluded, and why

- **Protected** (40 of the 480 pages): members of the legacy protected experiment cohort in `scripts/growth/gsc-opportunity-miner.ts`, the first-revenue cohort, or experiment records still MEASURING.
- **Inside a release observation window** (96): a product record changed in a commit that is part of the production source; the window runs 28 days from the change at the earliest and the formal clock starts at the first observed re-crawl.
- **Unfinished work elsewhere** (1): `/software/salesforce` (a dirty `data/software/salesforce.json` in another worktree). `/software/sprout-social` also has unfinished work in another worktree and is additionally in an observation window.
- **Built from shared records**: `/software/clickup` (14 of 17 derived pages protected or observed) and `/software/confluence` (3 of 13).
- **Not published by the checked-out code** (4): `/compare/elastic-vs-supabase`, `/compare/algolia-vs-supabase`, `/compare/sentry-vs-snyk`, `/compare/superhuman-vs-front` had a few historical impressions; they are a technical question (what does the URL return today?), not an opportunity.

### 5.8 Smallest useful change per URL

None is proposed, and the reason is stated per page. A change is only proposed after a vendor-source check confirms a gap; that check has not been done for any of the five, so the content gap is UNKNOWN for all of them.

| Page | Position | Next step |
| --- | --- | --- |
| `/software/activecampaign` | Observation window until 2026-11-04; the only page with a verified payable path | Wait. After the window and a first observed re-crawl, hand to `miloosh-money-page-upgrader` for a vendor-source check of pricing and limits. |
| `/software/mulesoft` | Observation window until 2026-11-04; no partner | Wait; same hand-off. Visibility only. |
| `/software/clickup` | Editable page, shared record | Read-only evidence only (vendor sources). A record change would alter protected pages and needs the owner. |
| `/software/sprout-social` | Observation window until 2026-11-04 and unfinished work in `sprout-buyer-quality-20261008` | Wait; do not touch before that worktree's owner decides. |
| `/software/confluence` | Editable page, shared record | Read-only evidence only; a record change needs the owner. |

### 5.9 Measurement contract

Eleven facts are kept apart and never summed: deployment, Google crawl, indexation, impressions, clicks, human sessions, engaged decision sessions, outbound partner clicks, network-attributed conversions, approved commissions, paid revenue. This run measured the first five and the click total; the rest are `UNAVAILABLE` or `NOT_MEASURED`.

- **Baselines** (exact page, Search Console, historical window against the latest finalised window):

| Page | Baseline |
| --- | --- |
| `/software/activecampaign` | 233 impressions in 2026-07-23 to 2026-08-19 (17.923 per observed day) versus 0 in 2026-09-08 to 2026-10-05. |
| `/software/mulesoft` | 479 impressions in 2026-07-23 to 2026-08-19 (36.846 per observed day) versus 0 in 2026-09-08 to 2026-10-05. |
| `/software/clickup` | 428 impressions in 2026-07-23 to 2026-08-19 (32.923 per observed day) versus 0 in 2026-09-08 to 2026-10-05. |
| `/software/sprout-social` | 383 impressions in 2026-07-23 to 2026-08-19 (29.462 per observed day) versus 0 in 2026-09-08 to 2026-10-05. |
| `/software/confluence` | 338 impressions in 2026-07-23 to 2026-08-19 (26 per observed day) versus 0 in 2026-09-08 to 2026-10-05. |

- **Windows.** Equivalent finalised 28-day windows only; reviews at about 14 and 28 finalised days after the clock starts. **The clock starts at the first observed Google re-crawl of the URL after a change is released**, not at deployment. No page has a review date yet: the date printed for pages in an observation window is the end of that window, and a page with no proposed change carries `null`.
- **No causal claim** on a sample this thin. With 39 impressions a month for the whole site, a page-level change will not show a measurable effect for a long time unless Google's behaviour changes first.

### 5.10 Unknowns

Cause of the collapse (hypotheses above); whether Google took a manual action (not read); the daily crawl series; page-by-query rows for all pages, so cannibalization is `NOT_MEASURED` site-wide (queries were captured for 5 pages only; six exact-query probes found one Miloosh page each, which is no overlap for those six queries); keyword difficulty and Domain Rating (no source; no low-competition claim is made); vendor-source content gaps; human sessions and qualified partner clicks (the first-party event export was not read, so `UNAVAILABLE`, not zero); conversions, commissions and received payouts (no source exists); whether the 2026-10-06 recovery commits were dropped on purpose.

## 6. Affiliate revenue state

Read from the registries (`data/affiliate/*`); no affiliate URL was requested or recorded, no partner dashboard was opened and nothing was sent.

| Fact | Value |
| --- | --- |
| Active partners | 27 (ledger and registry agree: 0 disagreements) |
| Issued links present | 27 |
| Technical path ready (link, disclosure, sponsored rel, tracked CTA) | 27 |
| Payout rail verified | 16 |
| Payout rail needs an owner action | 10 |
| Payout rail unverified | 1 |
| Ready for revenue end to end (link and verified payout) | 16 |
| Comparisons on the site | 1,348; 189 with an active partner on one side, 20 on both; 92 of those are in the sitemap per the code |

Payout rails that are not verified, ordered by the historical demand on the pages that show their partners (demand evidence, not revenue):

| Payout rail | State | Partners | Pages with demand | Historical impressions (own pages / pages that show them as another option) |
| --- | --- | --- | --- | --- |
| PartnerStack — legacy/personal-email account | OWNER_ACTION_REQUIRED | elevenlabs, monday, whatconverts, wrike | 13 | 1,311 (315 / 996) |
| Impact.com | OWNER_ACTION_REQUIRED | omnisend, shopify, wix | 9 | 668 (25 / 643) |
| Setmore / Tapfiliate | OWNER_ACTION_REQUIRED | setmore | 5 | 413 (82 / 331) |
| MailerLite / Tipalti | OWNER_ACTION_REQUIRED | mailerlite | 1 | 148 (0 / 148) |
| Fireflies / FirstPromoter | UNVERIFIED | fireflies-ai | 0 | 0 (0 / 0) |
| Jotform / Tremendous | OWNER_ACTION_REQUIRED | jotform | 0 | 0 (0 / 0) |

- **Outcomes** (`NOT_MEASURED`): conversions, approved commissions and received payouts have no source in the repository and were not supplied. They are never counted as zero, and a click is never reported as a conversion.
- **Funnel** (`UNAVAILABLE`): the first-party event export was not read, so human sessions and qualified partner clicks are unknown. Test clicks, synthetic identifiers and single-page burst sessions are classified apart and never counted as qualified (tests: `funnel.test.ts`).
- **Restrictions** are encoded for four partners from recorded program terms and Miloosh's own policy: Setmore (paid search, paid social or display and brand bidding forbidden), SurveyMonkey (brand bidding, unsolicited messages and third-party promotion forbidden; altered links need prior written approval), Trainual (paid ad traffic to the link, coupon sites and third-party promotion forbidden) and FreshBooks (paid campaigns not enabled, Miloosh policy). For the other 23 partners no restriction is recorded, which is `NOT_RECORDED`, not unrestricted. The Authority & Distribution role drafts nothing and sends nothing; its ledger validator rejects any record marked sent without an owner approval reference.
- **Products without an active partner** are never presented as partners. Their demand is listed only so the owner can check a program (the largest five; the ledger status is passed through as recorded, and a program note may mention an account the agent cannot use):

| Page | Historical impressions | Program status in the ledger |
| --- | --- | --- |
| `/software/semrush` | 1,655 | OWNER_ACTION_REQUIRED |
| `/software/intercom` | 1,603 | OWNER_ACTION_REQUIRED |
| `/software/freshdesk` | 1,545 | PENDING_REVIEW |
| `/software/front` | 576 | OWNER_ACTION_REQUIRED |
| `/software/buffer` | 539 | OWNER_ACTION_REQUIRED |

## 7. Release & Quality Guardian

Verdict: **RELEASE_BLOCKED**, and `deploymentAllowedByGuardian` is always `false`: the Guardian reports; the owner decides. Gate results below were recorded by `growth:record-gates` in clean detached checkouts under a plain path (`80eb1e5` and `e13b479`), each after `npm ci`, and judged by the Guardian only because each names the commit it ran on and says the checkout was clean.

| Gate | Command | Base `80eb1e5` | Final commit | Relation |
| --- | --- | --- | --- | --- |
| audit | `npm audit --audit-level=moderate --json` | FAIL: Advisories: 1 critical, 9 high, 0 moderate, 1 low. | FAIL: Advisories: 1 critical, 9 high, 0 moderate, 1 low. | PRE_EXISTING |
| tests | `npx vitest run --reporter=json` | FAIL: 1887 passed, 12 failed of 1899 tests. | FAIL: 2530 passed, 12 failed of 2542 tests. | PRE_EXISTING |
| validate-data | `npm run validate:data` | PASS: ✓ Data valid — 354 software pages, 27 categories, 1348 comparisons, 0 problems. | PASS: ✓ Data valid — 354 software pages, 27 categories, 1348 comparisons, 0 problems. | NO_CHANGE |
| lint | `npm run lint` | PASS: npm run lint exited 0. | PASS: npm run lint exited 0. | NO_CHANGE |
| typecheck | `npx tsc --noEmit` | PASS: 0 TypeScript error(s). | PASS: 0 TypeScript error(s). | NO_CHANGE |
| build | `npm run build` | PASS: npm run build exited 0. | PASS: npm run build exited 0. | NO_CHANGE |

- **The change added no failure.** Every gate has the same status and the same failure identifiers as the base: the 18 advisory ids are identical, and the 12 failing tests are identical. Tests: base 1887 passed, 12 failed of 1899 tests. Final commit: 2530 passed, 12 failed of 2542 tests. The difference is the new tests, all passing.
- **Rendered output.** The prerendered HTML of 1,785 pages is identical between a build of `80eb1e5` and a build of the final commit (`evidence/gates-20261009/rendered-diff-80eb1e5-vs-e13b479.json`: 1,785 compared, 0 differ, 0 only in either build). That is the proof that no page changed.
- **The 12 tests that fail at the base**, so that nobody mistakes them for new:
  - `tests/growth/community-traffic-manifest.test.ts > community traffic manifest requires verified pricing or an explicit nonnumeric regional quote contract`
  - `tests/guides/ecwid-integration-decision.test.ts > Ecwid integration buyer guidance stays on the existing Ecwid software page`
  - `tests/guides/shopify-pricing-model.test.ts > Shopify pricing model integrity keeps the current official pricing page on the pricing contract`
  - `tests/guides/store-plan-fit.test.ts > small-store plan clarity excludes unverified Wix prices and preserves Shopify annual conditions in the index`
  - `tests/guides/store-plan-fit.test.ts > small-store plan clarity preserves Shopify snapshot date but correctly labels monthly equivalents`
  - `tests/guides/store-plan-fit.test.ts > small-store plan clarity removes unconfirmed regional Wix amounts without inventing contact-sales pricing`
  - `tests/guides/store-plan-fit.test.ts > small-store plan clarity retains original Shopify tier amounts without claiming a new price check`
  - `tests/guides/store-plan-fit.test.ts > small-store plan clarity shows the unknown price status next to the reviewed date`
  - `tests/guides/woocommerce-repair-check.test.ts > WooCommerce repair-before-migration check is integrated before pricing without changing Wix routing code`
  - `tests/lib/freshbooks-affiliate-activation.test.ts > FreshBooks email-backed activation on 2026-09-17 does not mistake referral approval for verified payouts or recurring revenue`
  - `tests/lib/partner-materials-audit.test.ts > partner materials audit resolves every currently active partner to READY NOW with a real affiliate URL, never stale pending/rejected history`
  - `tests/lib/revenue-trust-regressions.test.ts > revenue trust and source-basis regression locks keeps affiliate-link confirmation separate from payout readiness`
- **`npm audit`** fails at the base on 18 advisory ids (1 critical, 9 high, 1 low; moderate threshold in CI): the pinned Next.js version, packages reached through the lint toolchain (including `braces`, which stays unpatched even in the security-gates worktree), `sharp`, `source-map-js`, `undici` and a low-severity `dompurify`. Not touched: this work does not change dependencies, add exceptions or run `npm audit fix`.
- **Production lineage.** `vercel inspect` and the GitHub Production deployment history give production as `dpl_4AHS358cZHgukiyYtVkwsTZ3W4kn`, created 2026-10-08 11:05:03Z, SHA `80eb1e5`. Two commits that GitHub recorded as earlier Production deployments, `1d6746b` and `11ba877` (both dated 2026-10-06, branch `seo/software-indexation-recovery-20261006`), are **not ancestors** of `80eb1e5`: releasing any descendant of the current lineage keeps them dropped, and releasing from that branch would drop everything since. The Guardian reports `PRODUCTION_LINEAGE_DROPPED` for the final commit because it descends from `80eb1e5`, not from them. Why they are absent is NOT_VERIFIED (section 9).
- **Live site against the commit.** Six saved live pages are identical, after normalisation, to the prerendered pages of a local build of `80eb1e5` (`evidence/production-match-20261009.json`, hashes included), one of them a page whose Decision snapshot exists only in this lineage. So the premium-redesign lineage (`8c476c1`) is not what runs on these pages. The skill asks for 100 or more pages; a bulk read of live pages was refused by the permission system and I did not work around it, so this is a six-page check. Finding it also exposed a defect in the comparison, now fixed: it did not strip the platform's `&amp;dpl=` deployment id from image URLs, so a live page never matched its own build.
- **Other work in flight, untouched.** Four sibling worktrees hold unmerged fixes: `salesforce-price-fix-20261008` (a dirty `data/software/salesforce.json`), `security-gates-20261008` (`37382ea`, Next upgrade and safe dependency updates; the `braces` advisory stays unpatched), `sprout-buyer-quality-20261008` (`5883128`) and `test-gates-20261008` (`7b07b04`, reconciles the failing tests). The Salesforce and Sprout Social worktrees were not read into, merged or deployed.
- **A defect in the repository, not mine.** About 49 scripts decide whether they are the entry point by comparing `import.meta.url` with the text "file://" followed by `process.argv[1]`, which is false for paths with spaces or non-ASCII characters. In the owner's own checkout path (`.../AI/1. פרוייקטים/...`) 23 tests fail instead of 12; the extra 11 failures disappear at a plain path. Gates here were therefore recorded in plain-path checkouts; `growth:record-gates` warns when given such a path. A follow-up task was flagged for the repository fix; it is not started.

## 8. Verification

- **Unit and integration tests**: `npx vitest run tests/growth-agents` passes 643 tests in 24 files. Whole repository at the final commit: 2530 passed, 12 failed of 2542 tests. The failing 12 are the base failures above.
- **`npx tsc --noEmit`** and **`npx eslint lib/growth-agents scripts/growth tests/growth-agents`**: no findings.
- **Required test areas** and where each is covered:

| Required area | Tests |
| --- | --- |
| Protected-page exclusion | `director.test.ts` (shortlist never holds protected or in-flight pages, even with no overlap), `protection.test.ts`, `google-recovery-agent.test.ts` |
| No mutation in read-only mode | `director-cli.test.ts` (default run writes no file and creates no directory; no gate or platform call without a flag), `read-only-guard.test.ts` (pure modules, read-only git verbs, no bypass flags, entry points) |
| Missing Search Console input | `director-cli.test.ts` (NEEDS_DATA without throwing; invalid capture reported with the exact problem), `gsc-import.test.ts` |
| Stale or incomplete measurements | `evidence.test.ts` (STALE, zero versus missing), `gsc-import.test.ts` (a partial table never reads absence as zero), `google-recovery-agent.test.ts` |
| Non-partner recommendations | `affiliate-revenue-agent.test.ts`, `director.test.ts` (visibility-only wording, never presented as a partner) |
| Partner-program restrictions | `partner-restrictions.test.ts`, `affiliate-revenue-agent.test.ts` |
| Synthetic clicks are not qualified conversions | `funnel.test.ts` |
| Clicks, conversions, commissions and payouts kept apart | `affiliate-revenue-agent.test.ts`, `funnel.test.ts`, `skills.test.ts` |
| Deterministic prioritization | `director.test.ts` (same report whatever the input order; fixed order of value class, demand, URL), `affiliate-revenue-agent.test.ts` |
| Overlapping opportunities | `director.test.ts` (a page sharing a product record with a higher-ranked one is suppressed, and the report says so) |
| Gate results tied to their commit | `guardian.test.ts`, `director-cli.test.ts`, `record-gates.test.ts`, `read-only-guard.test.ts` |

- **Mutation checks.** I broke the code on purpose 85 times (one rule at a time, tests re-run, file restored and verified byte-identical each time) and required a test to fail. Every mutant was caught except two that change nothing observable: "a protected page can be eligible" and "derived pages ignored" are each covered by a second, redundant defence in the same function. Survivors found along the way led to new tests (tie-breaking by URL, non-final daily peaks, protected pages with unknown product slugs, canonical-host look-alikes, own-product exposure, a recorder whose commands undo uncommitted changes, an over-greedy marker rule).
- **Real runs.** The Director ran against the real Search Console capture, the real registries, the real protection state, the real sitemap and the real production metadata; the reports in this folder are its output. `growth:page-check` read six public pages; `growth:rendered-diff` compared two real builds; `growth:record-gates` recorded the gate runs for the base and for the final commit.
- **Not tested**: no browser-level or end-to-end test (nothing here renders a page); no live Search Console API (the connector was never used and is not claimed to work); no deployment.

## 9. NOT_VERIFIED, not done, blocked

- **Cause of the collapse.** Hypotheses only (5.5). Not read: Search Console manual actions and security issues. Not performed: dating the cliff against Google's published update history in this run (an earlier receipt did; not re-verified).
- **Live site against the commit beyond six pages.** The 100-page rendered comparison the skill asks for was refused by the permission system as a bulk read of production, and I did not route around it. The identity of production rests on `vercel inspect`, the GitHub deployment record and six matching pages.
- **Vendor-source content gaps.** No vendor page was fetched, so no "gap" or "smallest change" is claimed for any page.
- **Revenue outcomes.** Conversions, commissions, payouts: no source. The first-party funnel: not read.
- **Keyword difficulty and authority:** no source; nothing is claimed about competition.
- **Why `1d6746b` and `11ba877` are not in the production lineage:** unknown.
- **Search Console beyond the capture.** Query tables exist for five pages and the first ten historical queries only (the rows-per-page control did not respond); everything else at query level is `NOT_MEASURED`.
- **Blocked:** release. Gates are red at the base; no deployment was attempted, enabled or prepared.
- **Not done on purpose:** no push, no merge, no deployment, no Request Indexing, no sitemap resubmission (Google read it on 2026-10-08), no partner or publisher contact, no change to a protected page, no purchase, no account change.

## 10. Decisions for Eyal, and the exact next action

1. **Do now (yours alone):** settle the PartnerStack legacy account as described in section 1: add the tax-registered location, connect an offered payout provider, keep the account open. After that, mark the rail verified in `data/affiliate/payout-rails.ts` only when the dashboard confirms payout readiness; that is a data change for a later, separate task.
2. **Decide whether the 2026-10-06 recovery commits were meant to be dropped** (`1d6746b` noindex of zero-signal comparisons; `11ba877` pruning of zero-signal software pages). If not, a deliberate merge onto the current lineage is a release decision with its own gates; nothing here does it.
3. **Decide which of the four unmerged worktrees may be integrated** so the release gates can turn green (tests: `test-gates-20261008`; dependencies: `security-gates-20261008`; plus the Salesforce and Sprout Social changes). No agent merges, waives or bypasses a gate.
4. **Close the experiment records** behind two pages that are still MEASURING after their declared window ended (the Director lists them): each as a win, a loss or inconclusive.
5. **Other payout rails** that need an owner action, by historical demand: Impact.com (omnisend, shopify, wix; 668 impressions on 9 pages), Setmore / Tapfiliate (413 on 5), MailerLite / Tipalti (148 on 1), Jotform / Tremendous (none), Fireflies / FirstPromoter (unverified; none).
6. **On 2026-11-04**, when the observation windows end and if Google has re-crawled: re-run the Director with a fresh Search Console capture, then hand `/software/activecampaign` (the only page with a verified payable path) to `miloosh-money-page-upgrader` for a vendor-source check.
7. If you want a page to work on before then, the clean option is `/software/tidio`; collect read-only evidence first (live response, page-level queries, vendor-source gap).
8. If you want the 100-page live comparison, say so: it needs a bulk read of live pages (which the permission system held back) and a small fetch step added to the comparison code that exists.

The Director's own next action is the first item; the Google agent's read-only next step is evidence collection on a clean page and does not conflict with it.

## 11. Reproduce

Gate records belong to one commit, so the reports in this folder were generated at `e13b479` in a clean tree with the inputs held outside the tree (untracked files would make it dirty). To regenerate them:

```bash
git worktree add --detach /tmp/growth-final e13b479f7b671aadf6e6b776bbe455f631d9c265 && cd /tmp/growth-final && npm ci
R=docs/growth/receipts/20261009-growth-agent-system   # the gsc-ui-capture folder exists at this commit; gates, extras and the rendered diff are in the receipt folder at the tip of this branch
npm run growth:director -- \
  --gsc-dir $R/evidence/gsc-ui-capture-20261009 \
  --gsc-private-dir "$HOME/MilooshReceipts/20261009-growth-agent-system/gsc-ui-capture-20261009" \
  --extras-file <copy of $R/evidence/page-checks-20261009/extras.json outside the tree> \
  --gates-file <copy of $R/evidence/gates-20261009/gates-candidate-e13b479.json> \
  --baseline-file <copy of $R/evidence/gates-20261009/gates-base-80eb1e5.json> \
  --rendered-diff-file <copy of $R/evidence/gates-20261009/rendered-diff-80eb1e5-vs-e13b479.json> \
  --base-sha 80eb1e5 --release-date 2026-10-08 --now 2026-10-09T00:52:51.000Z --check-production
```

Add `--out <dir>` to write `director-report.json`, `director-report.he.md` and `candidates.csv`; without it nothing is written. Run at any other commit (this branch's tip is two commits ahead of `e13b479`: test fixture text, then this documentation), the Guardian sets the recorded gate results aside as belonging to another commit: that is the intended behaviour. The private query tables are optional; without them query-level evidence is `NOT_MEASURED`. The report's list of other worktrees and the production read depend on the machine and the day.

To record gates for a commit: `git worktree add --detach <plain path> <sha> && (cd <plain path> && npm ci)`, then `npm run growth:record-gates -- --checkout <plain path> --out <file>`. To compare builds: `npm run growth:rendered-diff -- --base <base>/.next/server/app --candidate <candidate>/.next/server/app`. To read pages: `npm run growth:page-check -- --urls <list>`. Skill documentation and the full option list: `.agents/skills/miloosh-growth-director/references/run-book.md`.

## Appendix: files

| Path | Content |
| --- | --- |
| `README.md` | This receipt (the canonical report) |
| `director-report.he.md` | The Director's Hebrew report |
| `director-report.json` | Schema-versioned machine report: Director, Google, affiliate and Guardian (at most 30 candidates; the rest are in the CSV) |
| `candidates.csv` | Every evaluated page, one row each |
| `evidence/gsc-ui-capture-20261009/` | Search Console capture: manifest, pages and dates tables, sitemap, page indexing, crawl stats, URL inspections, capture notes. Query tables are private and kept outside git. |
| `evidence/page-checks-20261009/extras.json` | Live reads of six pages (status, canonical, robots, rendered sponsored-link text; no link targets) |
| `evidence/gates-20261009/` | Gate records for `80eb1e5` and `e13b479`, and the rendered comparison |
| `evidence/production-match-20261009.json` | Six-page live-versus-build comparison |
| `../../MILOOSH_GROWTH_OS_2026.md` | Master operating document, section 9 refers here |
