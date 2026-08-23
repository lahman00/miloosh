/**
 * CLI scripts run via `tsx`, not Next.js, so they don't get Next's
 * automatic .env.local loading — without this, `npm run agents:daily` (and
 * `:quick`/`:weekly`/`:full`) run from the owner's own machine silently
 * falls back to NEXT_PUBLIC_SITE_URL's http://localhost:3000 default (see
 * lib/site.ts), so every live-site check (homepage/software/category/
 * comparison smoke, sitemap.xml, robots.txt, production-deployment smoke,
 * critical-route availability) reports a false "unreachable" critical
 * finding unless a local dev server happens to be running on 3000.
 * Imported first (side-effect only) by scripts/agents/run.ts.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI) — live-site checks fall back to localhost, which is correct there.
}
