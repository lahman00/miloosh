# Editorial decisions: Miro review branch and Novastart (2026-10-23)

Internal only. Nothing here is published, sent or merged. Thomas Fraher was not contacted again.

## 1. Miro review branch `review/miro-alternatives-2026-10-22`
- The branch holds one commit (`c406808`, 8 files: Miro, FigJam, Mural and Lucidspark data, one editorial note, one test, and a two-line "Top pick" toggle in `components/AlternativeCard.tsx` and `app/software/[slug]/page.tsx`).
- It is **245 commits behind** the production branch (`ab75185`). Applying only its own commit onto current production (throwaway worktree, nothing pushed) **conflicts in `data/software/miro.json` and `app/software/[slug]/page.tsx`**, and the Miro test then fails to load because `miro.json` is no longer valid JSON. So it is **not compatible as-is**; it needs a rebase by whoever owns it, followed by a fresh `validate:data`, tests and a protection check for the Miro page and for FigJam, Mural, Lucidspark and Whimsical.
- Its own QA figures (256 records, 1,221 comparisons, 145 test files) describe an old base and must be re-run. The content approach (use-case fit, sourced paraphrase, no ranking, no Novastart, no unsupported "Top pick") is consistent with the site's rules.
- I did not merge, rebase, overwrite or push it. Note (2026-10-24): a separate PR #85, `release/miro-alternatives-20261023` ("HOLD: Miro observation window"), now exists; it was not reviewed here.

## 2. Novastart: decision on inclusion as a Miro alternative
**Decision: do not include Novastart as a recommended Miro alternative now.** Product functionality is not verified to the standard needed to call it a substitute.

### Verified (official site novastart.com, read 2026-10-23)
- Describes itself as "A computer with AI Agents, Team Collaboration and Infinite Whiteboard Space": apps on a zoomable canvas, up to 10 AI agents working on a task, teammates sharing one canvas with their own cursors, chat. "Best on a laptop."
- Legal footer: © 2026 Marketplace Distributors LLC, Manhattan Beach, CA; a support email is listed.

### Not stated on the official page (so unverified)
- Supported platforms, installer or download, and system requirements (the page links an "Install" section and a demo but names no platform).
- Pricing, free plan, or tiers (a Pricing page is linked; no figures were on the page read).
- Any Miro import, export or integration; templates; sticky notes, diagrams, voting or facilitation features that a Miro buyer expects.
- Founder or team identity: **no founder is named on the page I read, and I found no independent source naming Thomas Fraher**. His connection to the product is unverified.
- Security, privacy and data-handling details (pages are linked; their contents were not part of what I read).
- Launch or availability date. A third-party listing says there was no installable build as of 2026-10-07 and another badge says "Launching soon"; both are unverified and conflict with each other.

### Do not confuse
- **NovaStart.net** (Product Hunt, 2025, "ready-to-launch business ideas", a 19-year-old solo founder) is a different product. Product Hunt data about it must not be used for Novastart.com.

### Important differences from Miro (as far as verified)
- Miro is a collaborative whiteboard for planning, workshops and diagramming. Novastart presents itself as a shared "computer" canvas where apps and AI agents run. These may overlap on infinite-canvas collaboration but the evidence does not show Novastart doing Miro's core jobs.

### Installation and compatibility concerns to resolve
- What exactly the user installs (web, native app, virtual desktop), on which operating systems, and what permissions it needs, particularly because AI agents "with their own mouse and keyboard" act inside the user's environment.
- Where data lives, whether canvases can be exported, and how a team leaves the product.

### Evidence required before inclusion
1. Hands-on test by Miloosh or a reproducible official demo on each stated platform (what installs, what runs, what breaks), documented with dates.
2. Official pricing page read with its billing toggle, plus any free plan or trial terms.
3. Official security, privacy, terms and data-export documentation.
4. Independent corroboration of the company and product (at least one reputable third-party source), and written confirmation of who the maker is.
5. A concrete use case where it substitutes a Miro job, backed by features rather than slogans.

### Possible commercial opportunities
- None established. No affiliate or sponsorship relationship exists in the repository. If one is offered later it must be recorded in the affiliate ledger before any link is added, rankings stay independent of it, and the page must carry the standard affiliate disclosure. A promised relationship is not an approval, and no promotional copy should be written for it.

### Affiliate disclosure requirements (if ever added)
Disclose any link that can pay Miloosh, keep `rel="sponsored"`, keep the same treatment as every other product in the comparison, and never imply hands-on use that was not done.
