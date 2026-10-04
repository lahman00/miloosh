# Buyer Desk production integration

Mode: Persuade opening, Operate research flow. Owner approved the V3 private demo and requested production on October 5, 2026. This supersedes that demo's production prohibition for this integration only. Baseline: live f203a95; db766a4 adds only its release receipt. Preserve real research, discovery links, affiliate gating, analytics, SEO and social operations.

## Direction contract

THESIS: Search freely or start with a buying situation; both lead into a saved, inspectable decision, not a decorative shortlist.

OWN-WORLD: Preserve production Manrope, forest ink, paper canvas, sage stage and citrine accent. Carry the approved demo's forest intent window, separate white saved-list window, quiet rules and pauseable drift into scoped components.

STORY: Search the entire catalogue, explore nine explicitly identified starting points, save separate category lists, compare sourced research and export a browser-local brief. Existing full catalogue and recommendation routes remain available.

FIRST VIEWPORT: Original two-line headline and full-catalogue search on the left; three real intent actions in the moving forest window on the right, with an independently floating saved-list preview and stationary pause control. Mobile stacks without overflow.

FORM: User-approved, code-first V3 demo integration, not a new concept round. Keep incumbent typography and navigation; replace demo facts with canonical repository research and source dates. No new vendor offers or prices. Preserve every previous homepage research link below the new desk.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Release boundary

Changes are homepage UI, bounded local shortlist logic, server-side research projection and focused tests. No new backend, account, affiliate resolver, social, public dataset, cohort or scheduling changes. Existing tracking wrappers handle research navigation; free-form priorities never enter analytics. No synthetic merchant navigation.

## Finished implementation / documentation check

Checked October 5, 2026 against `components/BuyerDesk.tsx`, `components/BuyerDesk.module.css`, `lib/buyer-desk.ts`, `lib/buyer-desk-catalog.ts`, `app/page.tsx`, `components/Navbar.tsx`, `app/layout.tsx`, `app/globals.css`, `PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json`. This is an ordinary extension of The Thoughtful Shortlist; `DESIGN.md` and its sidecar remain byte-for-byte unchanged. This record describes the new surface, not a replacement system or a whole-site audit.

Inherited visual rules remain Two Canvases, Heading First and Paper Depth: warm canvas (`#f8f9f4`), forest ink (`#173b2c`), white paper, sage stage (`#dfe8d4`), quiet rules (`#d7ded2`) and citrine (`#e4f267`). Manrope comes from the existing layout; the hero retains its global display clamp (`52px`–`76px`, weight 550). Scoped section headings use `clamp(29px,2.8vw,38px)` at 550, product titles 24px at 600, body copy 14px and labels 12px. The forest intent window (`#203f30`), pale action tint (`#e2ef89`), 14px paper corners and 3px amber focus outline (`#a56b18`, 4px offset) are observed Buyer Desk variants, not new global tokens. Cards remain flat; soft shadows belong to the two floating windows and the fixed saved-list shelf.

The inherited 1280px container holds a 1.2:1 hero with a 68px gap, reduced to 38px below 1200px and one column below 960px. Starting-point cards move from three columns to one below 700px; native form controls become 16px on mobile. Actions have 50px minimum height, icon/save controls at least 44px, and the comparison stays in a labeled, keyboard-focusable horizontal scroller with a 720px minimum table width. Full-catalogue search, three intent actions, nine research-backed starting points across three categories, separate saved lists, native research disclosures, source-check dates and a local text brief compose the flow. The homepage header targets the shortlist; other routes retain the recommendation action. The clear-research action also appears when only priorities remain, using `hasDeskResearch`.

Motion is local to the two panes: the intent window runs a 7s `ease-in-out` loop (vertical 3px to −6px, rotation −0.55° to 0.45°); the white preview runs 8.5s with a −3s phase (from 0/−3px to −3px/5px, rotation 0.7° to −0.5°). These endpoints also apply on mobile. The stationary 44px Pause/Resume control, reduced-motion preference, document visibility and observed stage intersection gate running state; hover and keyboard focus on either pane pause both loops. Reduced motion removes animation, transitions and transforms and disables the labeled motion control. Action arrows travel 4px over 220ms with `cubic-bezier(.16,1,.3,1)`. These replace the previous homepage desk's motion locally; the old sidecar preview is retained as incumbent documentation, not a simulation of this component.

Existing software marks, the Miloosh M and Lucide SVG icons supply the imagery; no raster asset was added. Finish-review captures are recorded under `.impeccable/review/buyer-desk/`: desktop, user-1280, mobile, desktop-comparison, mobile-comparison, mobile-catalogue, mobile-guide, context-only-reset and context-cleared-reloaded (PNG). The independent finish review owns visual acceptance; this pass verifies source/document correspondence.

Not canonized or repaired: existing eyebrow support remains excluded from new patterns; the recorded subtle-text token (`#647267`) differs from the existing stylesheet (`#5e6c62`), and the incumbent homepage/desk descriptions and sidecar preview predate this integration. These documentation differences are reported here because system refresh is outside this ordinary extension's approved scope; none becomes a new rule or a reason to alter unrelated implementation.
