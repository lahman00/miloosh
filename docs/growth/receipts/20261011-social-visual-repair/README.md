# Miloosh social-card visual repair — 2026-10-11

**Trigger:** The owner supplied a screenshot of a live Miloosh LinkedIn post, "Asana vs Basecamp: what actually differs?", with white text on a near-white card, a tiny/duplicated brand logo and a clipped body paragraph.

## Verified root cause
The original `app/api/social/card/route.tsx` was written for a dark 2026-08 brand: hardcoded `color: "white"`, zinc secondary text, Inter font, blue `#3458a8` accent, a 36px square icon and a second white "Miloosh" text logo. The 2026-10 premium design changed `SITE_THEME_COLOR` to `#f8f9f4`, but this generator continued using its dark-era foreground tokens. The 220-character `sub` input was rendered verbatim, cutting source descriptions mid-sentence. The separate LinkedIn banner route also used white on the new light background.

## Scope of the repair
- Replaced the social image generator's old palette with the approved `BRAND_COLORS`: light `#f8f9f4` background, `#173b2c` dark ink, `#56645b` muted text, `#e4f267` citrine.
- Uses `Manrope` and the exact `public/miloosh-wordmark.png`, without synthetic or duplicated logo text.
- Comparison: prominent separate vendor panels, accessible VS badge and a short question. The posted Asana/Basecamp example becomes `Asana` / `Basecamp` and `What actually differs?`, with no long `best fits` paragraph on the image.
- Updated alternatives, switching, category, pricing, research and default card layouts with concise, bounded copy and real visual hierarchy.
- Updated the LinkedIn company cover image route to use the warm brand colors and Manrope.
- Added `SOCIAL_CARD_VERSION=20261011-warm-v2` for new media URLs and publish-time cache busting of **already queued** first-party social images. Only the exact Miloosh card endpoint is rewritten; external URLs, UTM destinations and affiliate links remain unchanged.
- Added model/contrast, queued-media and actual PNG render regression tests.

## Local QA
- Focused suite: 82/82 tests passed before the actual-image regression test; PNG tests added for LinkedIn, Facebook and square formats.
- The 1200x627 Asana/Basecamp image rendered successfully (HTTP 200), with top-left pixel RGB `248,249,244`, correct green wordmark, readable dark names, green badge, citrine VS, and no truncated body paragraph.
- 1080x1080 square, 1200x630 Facebook, switching, alternatives, category, pricing, research, and long-title stress samples rendered HTTP 200 and were visually inspected.
- The 4200x700 LinkedIn cover image rendered HTTP 200 with the warm background.
- Complete release gates, exact-commit clean-tree verification, static-site invariance, Vercel preview and live post-publish verification are **required before marking this change RELEASED**.

## External publication caveat
LinkedIn/Buffer and Facebook store media already published. A new Miloosh image route does **not** retroactively replace an existing post's cached uploaded image. Do not claim the October 10 Asana/Basecamp post was corrected until the actual LinkedIn media is edited or the post is deliberately replaced and the live result verified. Do not repost duplicates automatically. Keep a source permalink and exact owner-authorized disposition in the final receipt.

No content records, vendor pricing, partner links, public article text, sitemap or protected experiment were intentionally changed by this repair.
