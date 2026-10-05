---
name: "Miloosh"
description: "Warm, source-conscious software discovery built around a thoughtful shortlist."
colors:
  "canvas": "#f8f9f4"
  "surface": "#fff"
  "surface-soft": "#eef1e7"
  "stage": "#dfe8d4"
  "ink": "#173b2c"
  "muted": "#56645b"
  "subtle": "#647267"
  "citrine": "#e4f267"
  "citrine-hover": "#d5e750"
  "line": "#d7ded2"
  "accent": "#24543d"
  "accent-hover": "#35694e"
  "button-hover": "#28543e"
  "card-hover": "#f2f5ea"
  "card-hover-line": "#aab9a2"
  "footer": "#f0f2e9"
  "artwork-canvas": "#f8f9f4"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(52px, 5.25vw, 76px)"
    fontWeight: 550
    lineHeight: 1.03
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "44px"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "-0.01em"
  intro:
    fontFamily: "Manrope, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "-0.01em"
  action:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  navigation:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "-0.01em"
rounded:
  "control": "8px"
  "card": "16px"
  "stage": "24px"
  "sheet": "12px"
  "search": "10px"
  "tab": "6px"
  "pill": "calc(infinity * 1px)"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
  "section": "104px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "16px 24px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  button-citrine:
    backgroundColor: "{colors.citrine}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "16px 24px"
  button-citrine-hover:
    backgroundColor: "{colors.citrine-hover}"
  button-secondary:
    backgroundColor: "color-mix(in oklab, #173b2c 5%, transparent)"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "0 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sheet}"
    padding: "0 24px"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.search}"
    padding: "5px 5px 5px 16px"
  navigation:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    typography: "{typography.navigation}"
    height: "80px"
  badge:
    backgroundColor: "color-mix(in oklab, #173b2c 5%, transparent)"
    textColor: "#45574a"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  catalogue-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "28px"
  shortlist-stage:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.ink}"
    rounded: "{rounded.stage}"
    padding: "20px 32px 24px"
  shortlist-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "20px"
  shortlist-companion:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "16px"
    width: "min(292px,92%)"
  motion-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "50%"
    width: "44px"
    height: "44px"
  buyer-panel:
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  featured-software:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "32px"
  buyer-tool-row:
    textColor: "{colors.ink}"
    padding: "20px 0"
  matcher-strip:
    backgroundColor: "{colors.citrine}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "28px"
---

# Design System: Miloosh

## Overview

**Creative North Star: "The Thoughtful Shortlist"**

Miloosh uses a warm, light canvas, forest ink, citrine emphasis and a sage comparison desk. Large Manrope headings establish confidence; restrained rules and source-linked content make the research feel approachable and inspectable. The existing Miloosh name and M mark remain the identity anchors.

The system is code-led. Software logos, an interactive shortlist and a constructed paper illustration provide the visual material. Website chrome, generated social artwork, profile avatars and cover images now share the same warm canvas / forest / sage / citrine visual system.

This is a scan of the implemented source, including its final refinement overrides. Visual verification is limited to sampled homepage desktop/mobile views and the Airtable software page; it is not a whole-site visual audit. No separate quality-bar card was supplied. The measured Ramp reference in the approved design spec bounds the comparison, and its measurements are observations rather than Miloosh tokens. The prior independent review reported ship at 9.0/10 for the buyer-composition refinement and previously scored fixes; that verdict does not certify every generated route or the subsequent motion and logo refinement. The fresh independent motion/logo review reported 9.0/10 for the visual and code delta, with documentation freshness as its sole remaining blocker; this source-derived update resolves that documentation gap without extending the visual review scope. The detailed verdict remains owned by the review artifact.

**Key Characteristics:**

- Warm canvas with forest text and restrained citrine emphasis.
- Large, balanced headings; product metadata follows its heading.
- Flat editorial lists and cards; elevation reserved for paper-like layers and suggestions.
- Real product routes, source dates and explicit affiliate disclosure.
- Responsive controls, visible focus and reduced-motion support.

## Colors

The palette combines a warm neutral base with forest text, a pale sage stage and a bright yellow-green accent. The frontmatter holds normative color values; names below explain their roles.

### Primary

- **Forest Ink** (`ink`): headings, main text, standard filled actions and the closing section background.
- **Citrine** (`citrine`, `citrine-hover`): the hero phrase highlight, matcher strip and the contrasting closing action. It is not the background of every primary button.
- **Deep Leaf** (`accent`, `accent-hover`): inherited link accents and button focus rings exposed through Tailwind's theme.

### Neutral

- **Warm Canvas** (`canvas`): document background, sticky header, browser theme and manifest.
- **White Paper** (`surface`): search, shortlist sheet and catalogue cards.
- **Soft Paper** (`surface-soft`): comparison band and inherited secondary surfaces.
- **Sage Desk** (`stage`): the interactive shortlist's enclosing field.
- **Research Gray** (`muted`, `subtle`): supporting copy and metadata.
- **Quiet Rule** (`line`): separators and card edges.
- **Footer Paper** (`footer`): the closing legal/navigation surface.
- **Card Hover** (`card-hover`, `card-hover-line`) and **Button Hover** (`button-hover`): explicit interactive states.
- **Artwork Canvas** (`artwork-canvas`): generated social images and identity artwork now use the same warm canvas as the redesigned site.

The compatibility layer on the site body remaps legacy white/zinc utility roles to the light palette. In this scope, `text-white` resolves to forest ink, and `bg-white/5` becomes a faint forest tint. Preserve this scope when maintaining old templates. Status text also receives light-canvas green, amber, red, blue and violet overrides; these are functional status colors, not new brand accents.

**The One Public Canvas Rule.** Website, browser chrome, generated social artwork and profile/banner assets share the warm canvas / forest / sage / citrine system. Dark inverse artwork is retired from public branding.

## Typography

**Display Font:** Manrope, with sans-serif fallback.
**Body Font:** Manrope, with sans-serif fallback.
The variable font is loaded through Next's font pipeline; no separate mono face is installed for the public redesign.

The hierarchy uses moderate display weights, compact tracking and balanced headings. There is no single mathematical scale: catalogue prose, editorial lists and large persuasion headings have distinct roles. Final refinement rules later in the stylesheet take precedence over earlier size declarations.

### Hierarchy

- **Display:** frontmatter `display` is the wide homepage hero. At widths from 960px through 1199px it becomes 60px; from 700px through 959px it is 68px; below 700px it is 46px with 1.08 line height.
- **Headline:** homepage section titles use `headline`, becoming 34px below 700px. Trust and closing headings use their own observed 40px and 54px desktop roles, becoming 32px and 42px on mobile.
- **Title:** catalogue card names use `title`. The featured software name is 38px/1.15 at weight 600, reducing to 32px below 700px; its short description is 25px/1.35, reducing to 22px. Ruled buyer-list names stay 21px/1.25 with weight 600. Guide list headings are 18px/1.45 desktop and 16px mobile.
- **Body:** `body` represents catalogue descriptions. Buyer-list descriptions use 14px/1.5; section introductions use 15px desktop and 14px mobile; hero copy uses `intro`, becoming 15px/1.75 mobile with a 43ch maximum measure. These are role variations, not contradictory base tokens.
- **Label:** `label` represents categories and related supporting metadata. Compact shortlist notes can be 11px desktop and 10px mobile; do not generalize those stage-specific sizes to prose.
- **Action / navigation:** use the frontmatter roles. Header action labels are 13px desktop and 12px mobile; search text grows to 16px on mobile.
- **Brand:** the header wordmark is 28px, weight 750, with −0.04em tracking; its final mobile size is 22px. Footer labels are sentence case at 12px, with 14px footer links and body copy.
- **Inherited software pages:** the main heading uses 36px at the smallest widths and 60px from the Tailwind small breakpoint; the source retains heavier 700 weight and −0.025em tracking. This is an observed legacy role, not the homepage display token.

**The Heading First Rule.** Begin the redesigned hierarchy with the meaningful heading; place category or source metadata after it. Existing eyebrow support is inherited drift, not the pattern for new surfaces.

## Layout

The redesigned container has a 1280px maximum and 48px side gutters. At 959px and below its gutters become 32px; below 700px they become 24px. Sections use the recorded 104px space above and below, reducing to 64px on mobile. The underlying spacing vocabulary is based on the existing 4–64px tokens; component-specific 20px and 28px padding also remains in use.

The desktop hero uses a 1.08:1 two-column grid with a 56px gap. It becomes a single column with a 680px maximum between 700px and 959px, and a single column with a 40px gap below 700px. The sticky header is 80px high, reducing to 72px on mobile; desktop links give way to the menu toggle below 960px. Scroll padding and section anchors account for the header.

The homepage buyer section uses a 5:7 two-column grid with a 32px gap: a sage featured software panel beside four ruled entries. It becomes one column below 960px. A full-width matcher strip follows after 24px; its right-hand action becomes full width below 700px. Comparison and guide sections move from two columns to one below 700px. Categories similarly move from three to two to one. The directory uses four columns, three below 960px, and two below 700px. Overflow categories and the remaining directory entries use native disclosure controls; retain their real links in server-rendered HTML.

Inherited content pages and the footer use the existing Container component: 1152px default maximum or 768px narrow maximum, with 16/24/32px responsive gutters at Tailwind's base/small/large sizes. Do not imply those pages already share the redesigned 1280px shell.

## Elevation & Depth

The overall system is flat. Tonal fields and fine rules establish sections; catalogue hover changes fill and border rather than position. The raised shadow is reserved for floating search results and the paper-like shortlist. The guide illustration uses an intentionally rotated paper layer with its own soft shadow. The hero's matching-color horizontal box shadow extends the citrine text highlight; it is a highlight construction, not a hard offset elevation convention.

### Shadow Vocabulary

- **Raised paper:** `0 20px 60px rgba(23,59,44,.12)` for shortlist sheets and search suggestions.
- **Alternatives companion:** `0 12px 28px rgba(23,59,44,.14)` for the small linked alternatives window.
- **Illustrated guide paper:** `0 14px 40px rgba(60,79,39,.14)` inside the guide artwork only.

UI color and border transitions run for 180ms. The discovery desk contains two CSS transform loops, each running for 8 seconds with `ease-in-out`; the alternatives window starts at a −4-second phase offset. On desktop the main sheet moves vertically by 8px and rotates between −0.3 and 0.3 degrees. The companion moves 6px horizontally and 12px vertically, rotating between 0.7 and −0.6 degrees. Below 700px the loops use only vertical travel: 4px for the main sheet and 6px for the companion, with no rotation.

The enclosing scene has one 640ms entrance with `cubic-bezier(.22,1,.36,1)`, from `translateY(10px)` and opacity 0.8 to level and full opacity. Content is never fully transparent. This scene/window motion replaces the earlier 650ms sheet animation, which has been removed from the stylesheet. Controls and text outside the panes remain still; categories never advance automatically. There is no video, canvas, animation library or continuous JavaScript loop.

Loop motion begins only when the production component reports motion allowed, an intersecting stage and no manual pause. The intersection observer is configured with threshold 0.15 and uses its reported `isIntersecting` state. A hidden document or reduced-motion preference disables the running state. Hover pauses the stage on hover-capable devices; keyboard focus on any stage link pauses both windows. The circular control toggles Pause/Resume and exposes its paused state with `aria-pressed`. These guards control the loops; the brief entrance is separately removed under reduced motion. Reduced-motion also disables transitions, resets scene/window transforms and hides the unnecessary motion toggle, leaving the complete composition readable.

**The Paper Depth Rule.** Keep editorial cards and ruled lists flat. Reserve the raised shadow for the shortlist sheet and search suggestions; the alternatives companion uses its shallower window shadow, and the guide paper has its own illustrative shadow.

## Shapes

Controls are gently squared; cards are softer; the desktop stage has the broadest corners. Use the frontmatter's control, card and stage roles. The stage reduces to the card radius on mobile. The search shell and shortlist sheet use their own search and sheet radii. Compact shortlist tabs use the tab radius; inherited metadata badges retain a full pill.

A one-pixel border or rule is the standard structural edge. The software logo well is 44px square with an 11px radius, reducing to 38px with a 9px radius on mobile. Supplied SVG or PNG product marks appear inside it at 25px; the component uses the product's initial only for an unmapped slug. The alternatives companion uses a 34px logo well with an 8px radius. These initials are identity fallbacks, not a general icon system. Functional icons use SVG.

## Components

### Buttons

Primary redesign actions use forest fill, white-paper text, control corners, 16px by 24px padding and a 56px minimum height. Hover uses the dedicated button-hover color. The citrine variant shares the form and uses forest text; its hover uses the citrine-hover color. Header actions are 44px high with tighter padding. Global focus is a 2px forest outline at a 4px offset; within the inverse closing field the focus outline becomes citrine.

Existing Button and ButtonLink remain compatible variants: 12px corners, 48px medium or 56px large minimum height, 24px or 32px horizontal padding, and 600 weight. Their primary uses forest fill with warm-canvas text through the utility bridge; secondary is a faint forest tint with a translucent border; ghost begins with muted text. These variants have a 2px deep-leaf focus ring, 2px canvas offset, active scale 0.98 and disabled opacity 0.5. Keep their forward-ref behavior for tracked links.

### Chips

Inherited Badge is a metadata pill with 12px medium text, 14px horizontal and 6px vertical padding, a faint forest fill and rule. It is not the primary navigation treatment. Product category metadata follows the product heading.

### Cards / Containers

Catalogue cards use white paper, 16px corners, a quiet one-pixel border and 28px padding, reducing to 24px mobile. Hover changes the fill and border; no raised-card motion is present. Catalogue category metadata follows the name. The homepage buyer composition has its own featured panel and ruled list, documented below.

The inherited Card uses a faint forest tint through the compatibility bridge, the same 16px corners, and 24px padding with 28px from the small breakpoint. The buyer decision panel organizes fit, caveats, price checks and alternatives with flat rules inside its outer card; it does not nest each fact in a new elevated box.

### Inputs / Fields

The discovery search shell is 64px minimum height, with a one-pixel muted-green border, a 10px radius, 5px surrounding inset and 16px left padding. Its input and submit control are 52px high; the input is 14px desktop and 16px mobile. The focused shell gains a forest border and a one-pixel outline. Search suggestions use a white-paper 12px container with the raised shadow; selected results use soft paper. Empty results and failed submit text offer recovery.

The search is a labeled combobox: arrow keys select results, Enter navigates to a real software route, and Escape dismisses suggestions. The directory filter uses control corners and a 2px forest focus-within outline. Maintain existing matching and routing logic when reskinning either input.

### Navigation

The sticky, warm header has a fine bottom rule, the approved `miloosh.` wordmark, muted navigation links and a filled matcher action. Current and hovered links become forest and underline. Below 960px, a 44px menu button opens the full link list; mobile rows are at least 52px high. Preserve expanded state, accessible labels, Escape closing and focus return to the toggle. The visible skip link appears on keyboard focus.

### Shortlist desk

The sage enclosure contains use-case toggles, a main white sheet with three real software options, and a smaller linked alternatives window for the selected group’s first product. Changing use case updates the real product, fit text, category destination and alternative count; it does not reset selection on a timer. The main sheet announces content politely. Both panes preserve native product links, while the main sheet also links to the category.

The scene reserves 116px below the main sheet for its companion. The companion has a 12px radius, 16px padding and a width of `min(292px,92%)`, positioned 8px above the scene’s lower edge and 8px beyond the right edge (`bottom:8px; right:-8px`). On mobile it aligns to the right edge and uses 94% width. The main sheet now has 20px padding, no top margin inside the scene and 14px row padding. The stage has 20px/24px top/bottom padding, reducing to 16px/20px on mobile; its horizontal padding follows the existing responsive stage rules. Toggle controls have at least 44px height, forest selected fill and white text. Their top margin is now 12px; stage notes follow after 16px.

The motion toggle is a 44px circular outlined button with Pause/Resume SVG icons and an accessible label. Its hover fill is translucent white. Preserve the production state and pause safeguards described in Elevation & Depth. The stage’s orbit is a decorative CSS rule; it is not a generated image. Its denser label sizes are local to this component. The sidecar shows a paused HTML/CSS snapshot with the companion and Resume control; its static preview does not replace React’s event handling, preference subscription or visibility observer.

Across the opening use-case groups and featured buyer section, ten unique software identities now have mapped marks: Airtable, Todoist, Notion, ElevenLabs, HubSpot, Close, Setmore, Pipedrive, Synthesia and Jasper. The first five SVGs come from Simple Icons. Five newly sourced official assets complete the set: Setmore SVG plus Close, Pipedrive, Synthesia and Jasper PNGs, each linked from its vendor’s official homepage. These are identification assets, not generated raster art or endorsement claims. `public/brands/SOURCES.md` records exact source URLs and the 2026-10-04 retrieval date. Unknown catalogue slugs retain the letter fallback; this refinement does not claim logo coverage for the entire catalogue.

### Buyer picks and matcher strip

The featured software panel uses sage, 16px corners and 32px padding, reducing to 24px mobile; its hover is a slightly stronger sage (`#d4e0c6`). Its product mark is 48px square, its category follows the name, and the action/count line sits at the foot of the panel. The four adjacent entries use a 44px mark / flexible text / 20px arrow grid, with 20px gaps, 20px vertical padding, 108px minimum height and fine top rules; the final row closes with a bottom rule. Hover introduces soft paper. On mobile the mark/arrow columns become 38px and 18px with a 12px gap and 24px vertical padding.

The citrine matcher strip is full width beneath that composition, with 16px corners and 28px padding. Its heading is 29px/1.2 at weight 550; its 14px/1.6 supporting copy is limited to 64ch. The forest action is 48px minimum height with 13px text. Below 700px the strip stacks, uses 24px padding/gaps, and expands the action to the full width. This is the final homepage expression of the system; the earlier six-tile buyer grid is no longer an implementation rule. The featured Airtable entry and remaining Todoist, Close, Setmore and ElevenLabs rows retain their existing descriptions, categories, alternative counts and routes.

### Source and affiliate surfaces

Retain the existing `/software/[slug]`, `/category/[slug]`, comparison and guide destinations, product facts, source dates, canonical URL generation and structured data. The presentation layer must keep `TrackedCtaLink`, its native anchor navigation, impression observation, best-effort `/api/outbound-click` reporting and synthetic-QA marking. Pricing actions continue to resolve through the affiliate helpers; direct vendor source links retain their separate vendor-link attribution. Preserve location identifiers, affiliate parameters, `rel`/`target` behavior and visible disclosure. This is a continuity requirement evidenced by sampled source, not a claim of an independent all-route affiliate audit.

## Do's and Don'ts

### Do:

- **Do** preserve the Miloosh name, the approved `miloosh.` wordmark and supplied vendor identities.
- **Do** use semantic canvas, ink, surface and citrine tokens for new UI; resolve legacy classes through the body-scoped bridge only when maintaining incumbent components.
- **Do** put real product titles first and category/source metadata below them.
- **Do** keep existing canonical URLs, sourced product facts, pricing conditions, disclosure text and affiliate/tracking semantics intact when changing presentation.
- **Do** preserve keyboard search, visible focus, mobile navigation, native disclosures and reduced-motion behavior.
- **Do** evaluate future route changes at their actual desktop and mobile widths; the sampled verification here does not certify other pages.

### Don't:

- **Don't** reintroduce the retired dark/blue social artwork system; public brand surfaces use the shared warm redesign tokens.
- **Don't** invent ratings, customer claims, firsthand testing, popularity, conversion gains or vendor facts.
- **Don't** add eyebrow headings or promote inherited uppercase eyebrow styles into new page patterns.
- **Don't** turn editorial rows or every card into elevated panels; use the documented paper depth roles.
- **Don't** use the measured reference sheet to overwrite a shipped token without checking the final source cascade.
- **Don't** replace tracked affiliate links with untracked visual replicas or remove their source and disclosure context.

Inherited drift not canonized or repaired: the shared SectionHeading still permits uppercase eyebrows and some unsampled route usages remain. Those styles are excluded from the token roles above; this documentation does not expand the completed visual review or modify source to resolve them.

Source basis: `app/globals.css` including final overrides; `app/layout.tsx`; homepage, navigation, footer, search, shortlist, directory and software-card components; `lib/button-styles.ts`; shared Card/Badge/Container; sampled software and buyer-panel source; tracked CTA/vendor wrappers; and `lib/site.ts` / manifest / social-image consumers. The bounded motion/logo refresh additionally checks `ShortlistDemo`, `SoftwareMark`, the final stylesheet cascade, `.impeccable/home-brief.md` and `public/brands/SOURCES.md`. The frontmatter is normative; generated sidecar ramps are preview aids, not additional production colors.
