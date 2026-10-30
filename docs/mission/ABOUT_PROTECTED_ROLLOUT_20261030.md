# About design rollout with protected routes preserved

Owner scope, October 30: keep the production appearance on protected pages and release the About design elsewhere only after Guardian approval.

The baseline is the current production branch at `954cfb2f943496ec31b7ccaf325d368fb2d3e765`, including the Decision Room and Switching Lab already live at `0402c5be7ef7dbd23b61627b963a15ebc48cc852`. The later baseline commit changes routing documentation/tests only; its site source is identical to that live deployment. The frozen 193-path manifest includes all seven protection sources and price-label holds. It has no calendar expiry. Software and comparison templates retain their exact baseline main/H1 classes on held paths. Shared cards, container, headings, breadcrumbs, FAQ, badges and button classes are restored byte for byte; new presentation rules are restricted to `.page-shell` and `.home-design`.

The Guardian's new evidence path is restricted to this baseline and an explicit source-file list. It requires both clean, exact-commit builds, a complete equal inventory of at least 1,788 pages, unchanged content/SEO/link attributes/form controls everywhere, unchanged protected markup, identical sitemap and robots, and readable protection sources. A newly discovered hold absent from the manifest blocks the release.

Every held route requires browser evidence at 390, 768 and 1440 pixels: HTTP 200, no JavaScript or local-asset failures, equal full-page screenshot hashes, equal computed layout/style hashes and equal controls/FAQ interaction hashes. Missing or duplicate rows, changed assets, wrong commits or a stale build fingerprint fail. The browser process blocks external requests and non-GET requests; it cannot send production analytics or merchant clicks. Evidence is generated outside the repository and bound to the exact HTML/CSS/JS/font assets of both builds.

The browser loads off-screen images before capture and uses software rasterization on both sides. A repeated baseline/baseline/candidate control found identical pixels at all three widths with this setting; GPU rendering had produced small antialiasing differences. The acceptance threshold remains exact pixel equality, with no tolerance or ignored regions.

The existing six engineering gates, production-lineage check, protections and three earlier narrow proof paths remain in force. A green preview does not authorize release by itself. No experiment or measurement window is closed by this change.

Verification commands (replace paths with the actual clean checkouts and evidence location):

```sh
npm run growth:record-gates -- --out /path/to/candidate-gates.json
npx tsx scripts/growth/verify-about-design-browser.ts --base /path/to/base --candidate /path/to/candidate --out /path/to/visual.json
npm run growth:director -- --base-sha 954cfb2f943496ec31b7ccaf325d368fb2d3e765 --gates-file /path/to/candidate-gates.json --baseline-file /path/to/base-gates.json --check-production --about-render-base /path/to/base --about-render-candidate /path/to/candidate --about-visual-file /path/to/visual.json --out /path/to/director
```

The final result and live deployment identity belong in the release receipt after these checks run. This document does not assert that an unrun check passed.
