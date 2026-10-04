# Miloosh Social Brand Standard

Canonical source of truth for every public Miloosh visual surface after the 2026-10-05 brand migration.

## Identity

The current public identity is **miloosh.** — lowercase Manrope with the final period in Citrine. The site no longer uses the legacy standalone image mark in Navbar/Footer. A compact square avatar remains for favicons, social profile images and structured data: Forest Ink background, warm-canvas "M", Citrine dot.

Never reintroduce the previous dark/blue social system, the older chevron/crown artwork, or a capitalized social wordmark as the primary visual treatment.

## Typography

**Typeface: Manrope**, matching the redesigned website. Generated artwork must call `loadBrandFonts()`; `ImageResponse` does not inherit `next/font`.

Bundled weights:
- 400 Regular — supporting copy
- 600 SemiBold — large editorial headlines
- 700 Bold — labels, product names and emphasis
- 800 ExtraBold — Miloosh wordmark / compact identity

## Color system

Public website and social artwork now share one visual language:

- Warm Canvas: `#f8f9f4`
- White Paper: `#ffffff`
- Sage Desk: `#dfe8d4`
- Soft Paper: `#eef1e7`
- Forest Ink: `#173b2c`
- Research Gray: `#56645b`
- Subtle Gray: `#647267`
- Citrine: `#e4f267`
- Quiet Rule: `#d7ded2`

The retired `#09090b` dark social background and `#3458a8` blue social accent are not part of the current brand.

## Visual treatment

- Warm, editorial, inspectable.
- Flat fields, fine rules and restrained paper-like panels.
- Citrine is emphasis, not a full-page background.
- No gradients, fake screenshots, stock imagery, invented product logos or decorative noise.
- Real vendor marks may appear only where the underlying product UI already uses a sourced/official logo; generated social cards do not imply endorsement.

## Wordmark

Use **miloosh.** in public artwork. The final period is Citrine.

The compact avatar is the only place where the wordmark collapses to an "M" mark. It must use the same Forest/Warm/Citrine palette.

## Public visual inventory

| Surface | Source |
|---|---|
| Site Navbar/Footer wordmark | `components/Navbar.tsx`, `components/Footer.tsx` |
| Favicon | `app/icon.tsx` |
| Apple icon | `app/apple-icon.tsx` |
| Structured-data/profile avatar asset | `public/logo-icon.png` |
| Root OG + X card | `app/opengraph-image.tsx`, `app/twitter-image.tsx` |
| Software OG | `app/software/[slug]/opengraph-image.tsx` |
| Comparison OG | `app/compare/[comparison]/opengraph-image.tsx` |
| Category OG | `app/category/[slug]/opengraph-image.tsx` |
| Automated post artwork | `app/api/social/card/route.tsx` |
| Cross-network cover art | `app/api/social/banner/route.tsx` |
| Legacy LinkedIn banner URL | `app/api/social/linkedin-banner/route.tsx` |
| Cross-network avatar | `app/api/social/avatar/route.tsx` |

Banner presets:
- LinkedIn Company Page: 4200×700
- Facebook Page cover: 1640×624
- X header: 1500×500
- YouTube channel banner: 2560×1440
- Avatar/profile image: 800×800

## Naming and copy

- Name in running text: **Miloosh**
- Visual wordmark: **miloosh.**
- Tagline: **Software research you can verify.**
- Contact: `hello@miloosh.com`

## Shipping gate

Before any new public visual ships:
1. It uses Manrope through `loadBrandFonts()`.
2. It uses the shared `BRAND_COLORS` tokens.
3. It contains no retired dark/blue Miloosh treatment.
4. It renders correctly in at least desktop and mobile/link-preview dimensions relevant to that surface.
5. All copy/data in the image comes from real Miloosh content or canonical brand copy.
