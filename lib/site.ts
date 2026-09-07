import packageJson from "../package.json";

export function resolveSiteUrl(
  rawSiteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
  nodeEnv: string | undefined = process.env.NODE_ENV
): string {
  const configured = rawSiteUrl?.trim();
  const fallback = nodeEnv === "production" ? "https://miloosh.com" : "http://localhost:3000";

  if (!configured) return fallback;

  try {
    const parsed = new URL(configured);
    const hostname = parsed.hostname.toLowerCase();
    const allowed = hostname === "miloosh.com" || hostname === "www.miloosh.com" || hostname === "localhost" || hostname === "127.0.0.1";
    if (!allowed) return fallback;
    return configured.replace(/\/$/, "");
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

/** Matches the viewport theme-color in app/layout.tsx and the generated icons/OG images — one place to change the brand color. */
export const SITE_THEME_COLOR = "#09090b";

/** Sourced from package.json so it never drifts from the actual shipped version. */
export const SITE_VERSION = packageJson.version;
