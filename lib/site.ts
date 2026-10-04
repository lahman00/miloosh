import packageJson from "../package.json";

export function resolveSiteUrl(
  rawSiteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
  nodeEnv: string | undefined = process.env.NODE_ENV
): string {
  // A production build always describes the public apex, including local
  // release builds and previews. Environment input must not fork canonicals.
  const canonical = "https://miloosh.com";
  if (nodeEnv === "production") return canonical;

  const configured = rawSiteUrl?.trim();
  const fallback = "http://localhost:3000";

  if (!configured) return fallback;

  try {
    const parsed = new URL(configured);
    const hostname = parsed.hostname.toLowerCase();
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return fallback;
    if (hostname === "miloosh.com" || hostname === "www.miloosh.com") return canonical;
    if (hostname === "localhost" || hostname === "127.0.0.1") return parsed.origin;
    return fallback;
  } catch {
    return fallback;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "Miloosh";

export const SITE_TAGLINE = "Software research you can verify.";

export const SITE_DESCRIPTION =
  "Compare software alternatives, pricing, features, and migration options — every claim sourced and dated, so you can switch with confidence.";

/**
 * 2026-08-18 — corrected from hello@miloosh.app, which has no MX records
 * and cannot receive mail. miloosh.com has real registrar email
 * forwarding (MX + SPF) configured, so this address actually works.
 */
export const SITE_EMAIL = "hello@miloosh.com";

/** Warm UI canvas, used by browser chrome, manifest and the new public brand artwork. */
export const SITE_CANVAS_COLOR = "#f8f9f4";

/** Compatibility export. Public artwork now follows the warm redesigned canvas. */
export const SITE_THEME_COLOR = SITE_CANVAS_COLOR;

/** Sourced from package.json so it never drifts from the actual shipped version. */
export const SITE_VERSION = packageJson.version;
