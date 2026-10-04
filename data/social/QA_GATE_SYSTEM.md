# Social QA Gate System

The deterministic gate file (`lib/social/qa-gates.ts`) is intentionally free of AI/LLM calls — content-engine.ts already enforces "no unsupported claims" upstream by generating post copy only from real, traceable Miloosh data (`sourceSlugs`), so QA doesn't need a second, non-deterministic layer re-checking the same thing. This matches the project's standing rule against introducing AI/embeddings without an explicit ask.

## The 5 named gates, mapped to what's real

**EDITORIAL GATE**
- `checkStaleClaim` — for pricing/commercial posts, flags when the drafted price no longer matches the current catalog price (data may have changed since the post was drafted).
- Structural: every post's facts trace to `sourceSlugs`, enforced by construction in `content-engine.ts`, not by a runtime check here.

**BRAND GATE**
- `checkBrandName` — catches misspellings ("Milosh", "MiLoosh", etc.).
- Correct logo/font/color/crop-safety is enforced at the template level (`MILOOSH_SOCIAL_BRAND_STANDARD.md` + shared `loadBrandFonts()` / `BRAND_COLORS` tokens) rather than re-checked per post. Warm Canvas / Forest / Sage / Citrine is the only current public visual system.

**TECHNICAL GATE**
- `checkLink` — destination resolves against real site data (software/category/comparison slugs), rejects localhost/internal paths.
- `checkDuplicate` — content-hash match against anything already SCHEDULED/PUBLISHED.
- `checkImageRequirements` — alt text present when an image is attached.
- Char-limit check against each channel's real adapter limit.
- UTM: enforced at publish time via `buildUtmUrl` (channel/medium/campaign/content), not re-verified here since it's applied after QA, not before.

**COMMERCIAL GATE**
- `checkAffiliateDisclosure` — commercial-pillar posts must include the disclosure text when the strategy config requires it.
- `getAffiliateActivation`'s `hasConfirmedProgram` check (in `lib/revenue/affiliate-activation.ts`) already prevents any product without a confirmed real program from ever getting a "live" affiliate link — the editorial-independence rule is enforced at the data layer, not just the QA layer.

**CHANNEL GATE**
- **New this pass:** `checkCrossChannelDuplication` — warns when two channels on the same queue entry have byte-identical text, catching accidental cross-post spam. Added because nothing previously checked this programmatically even though `content-engine.ts`'s per-channel `renderForChannel` already writes distinct copy by design — this closes the gap between "the code is supposed to do this" and "something verifies it did."
- Tested: 2 new test cases in `tests/social/qa-gates.test.ts` (byte-identical text warns; genuinely different text doesn't).

## What's deliberately not automated

Visual QA (does this specific rendered image look intentional, not just "technically correct") stayed manual in this session — done by fetching and screenshotting each new template (compare/software/category OG images, all 6 card `kind`s, the LinkedIn banner) rather than a pixel-diffing gate, since no such gate exists in the codebase and building one wasn't asked for. The brand-standard doc's checklist section is the human-facing equivalent.
