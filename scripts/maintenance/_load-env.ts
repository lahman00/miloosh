/**
 * CLI scripts run via `tsx`, not Next.js, so they don't get Next's
 * automatic .env.local loading — without this, `npm run maintenance` run
 * from the owner's own machine silently falls back to
 * NEXT_PUBLIC_SITE_URL's http://localhost:3000 default (see lib/site.ts),
 * so the SEO agent's live sitemap/robots checks and the link-health
 * agent's own-domain sampling report false failures unless a local dev
 * server happens to be running on 3000. Imported first (side-effect only)
 * by scripts/maintenance/run-all.ts.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI) — live-site checks fall back to localhost, which is correct there.
}
