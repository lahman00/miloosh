# Decision Room: capability inventory (2026-10-30)

Base: production `dbd866a` (deployment `dpl_CA6inGgPAHK8LdeGUcihktwfzBtj`, 2026-10-29). Read before building; nothing existing was rebuilt under a new name.

| Capability | State today | What the Decision Room does with it |
|---|---|---|
| BuyerDesk (`components/BuyerDesk.tsx`, `lib/buyer-desk.ts`) | Works. Three curated categories, nine products, one plain-text brief, key `miloosh-buyer-desk-v1`. PR #97 (hold, shared-component Guardian) changes these files. | **Reused, untouched.** The room reads that key once to import (saved products, current tool, note) and never writes to it, so BuyerDesk and PR #97 are unaffected. A new key (`miloosh-decision-room-v1`) is used because BuyerDesk's `cleanSaved` would silently drop any product outside its nine. |
| Saved shortlist | Only inside BuyerDesk. No "save" button on software or comparison pages. | Extended: any of the 355 products, up to 12 saved and 4 compared, restored from the browser. |
| Recommend wizard and engine (`lib/recommend/*`) | Works; browse-only confidence fixed in #88. | **Not touched.** The room never ranks; it states evidence per requirement. |
| SaaS cost calculator (`/tools/saas-cost-calculator`) | Works, but it labels every price "$" and "monthly", ignoring currency and billing basis, and sums verified prices only. | **Not touched** (separate page). The room's cost model uses the same `pricing.entryPaid` data but only when currency and billing basis are known, takes the buyer's own figures, shows formulas, and links to the calculator for multi-tool stacks. |
| Decision brief generation | `BuyerDecisionBrief` (guide-level) and BuyerDesk's text brief. | Extended into a sourced working document: requirements, evidence with status and dates, open questions, cost assumptions, a keep-current outcome, sources, next steps; print/PDF and text export. |
| Verified product data (`data/software/*.json`) | 355 products with dated sources and, for many, a verified pricing record. | The only source of product facts. Nothing is added or edited. |
| First-party analytics (`lib/analytics/*`) | Works; classification thresholds protected. | Reused: three interaction events through the same tracker and server allowlist. No second analytics stack. |
| Affiliate links and disclosure (`lib/affiliate.ts`, `TrackedCtaLink`) | Works. | Reused unchanged for "Visit official site"; disclosure text appears only where the link is an affiliate link, and the text export uses the plain official URL. |
| Design system (About tokens in `app/globals.css`) | Released on unprotected routes (#107); sitewide candidate is PR #108 (not approved). | Reused: canvas `#f8f9f4`, ink `#173b2c`, citrine `#e4f267`, Manrope, 8px grid. Route-scoped CSS module only. |

## Protected or held, deliberately not touched
Every existing page, shared component and shared template; sitemap, robots, canonical, structured data; prices and affiliate destinations; ranking and recommendation logic; active experiments and observation windows; PR #97, #99, #105, #106, #108. The room is a new route with `noindex`, not in the sitemap and linked from no existing page.

## Missing (not built here, listed for decisions)
Entry points on software, comparison and guide pages (shared templates, need a separate approved release); an accounts or sync layer (not justified: the room works with none); a whiteboard or other new recommend domains.
