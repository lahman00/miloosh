/**
 * Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) — Phase 8:
 * safe, normalized traffic-source attribution for accepted human/unknown
 * events. Deliberately a separate dimension from the human/synthetic/
 * legacy classification in lib/analytics/legacy-contaminated-sessions.ts
 * and scripts/analytics/report.ts — "is this visitor real" and "how did
 * they arrive" are two different questions, and conflating them (e.g.
 * calling every accepted event "organic") would misrepresent both.
 *
 * Privacy: only a referrer HOSTNAME is ever stored, never the full
 * referrer URL (which can carry a sensitive query string from the
 * referring page) — see the module header on PageViewEvent in
 * lib/analytics/events.ts. The acquisition boundary keeps bounded campaign
 * labels (source/medium/campaign/content), not utm_term or full query strings.
 * Campaign labels must never be populated with personal information.
 */

export type TrafficSource = "organic_search" | "social" | "email" | "paid" | "referral" | "direct" | "unknown";

const SEARCH_ENGINE_HOST_PATTERNS = [
  /(^|\.)google\.[a-z.]+$/,
  /(^|\.)bing\.com$/,
  /(^|\.)duckduckgo\.com$/,
  /(^|\.)yahoo\.com$/,
  /(^|\.)baidu\.com$/,
  /(^|\.)yandex\.[a-z.]+$/,
  /(^|\.)ecosia\.org$/,
  /(^|\.)startpage\.com$/,
];

const SOCIAL_HOST_PATTERNS = [
  /(^|\.)facebook\.com$/,
  /(^|\.)fb\.com$/,
  /(^|\.)t\.co$/,
  /(^|\.)twitter\.com$/,
  /(^|\.)x\.com$/,
  /(^|\.)linkedin\.com$/,
  /(^|\.)reddit\.com$/,
  /(^|\.)instagram\.com$/,
  /(^|\.)pinterest\.[a-z.]+$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)threads\.net$/,
  /(^|\.)lnkd\.in$/,
];

const OWN_HOST_PATTERNS = [/(^|\.)miloosh\.com$/, /(^|\.)flowtemplate.*\.vercel\.app$/];

function matchesAny(host: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(host));
}

/**
 * `referrerHost` must already be just a hostname (e.g. "www.google.com"),
 * never a full URL — the caller (client-side capture) is responsible for
 * that extraction so no full referrer query string ever reaches this
 * function or gets stored.
 */
export function normalizeTrafficSource(params: {
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  /** Only true when the browser actually read an empty referrer, not when data is missing. */
  referrerObserved?: boolean;
}): TrafficSource {
  const utmMedium = params.utmMedium?.toLowerCase();
  const utmSource = params.utmSource?.toLowerCase();

  if (utmMedium) {
    if (/^(social|organic_social|social_organic|paid_social|social_paid|social-network)$/.test(utmMedium)) return "social";
    if (/^(organic|organic_search|seo)$/.test(utmMedium)) return "organic_search";
    if (/^(email|e-mail|newsletter)$/.test(utmMedium)) return "email";
    if (/^(cpc|ppc|paid|paid_search|display|cpm)$/.test(utmMedium)) return "paid";
    if (/^(referral|affiliate)$/.test(utmMedium)) return "referral";
    return "unknown";
  }

  if (utmSource) {
    if (matchesAny(utmSource, SEARCH_ENGINE_HOST_PATTERNS) || /^(google|bing|duckduckgo|yahoo)$/.test(utmSource)) return "organic_search";
    if (matchesAny(utmSource, SOCIAL_HOST_PATTERNS) || /^(facebook|twitter|x|linkedin|reddit|instagram|pinterest|tiktok|threads)$/.test(utmSource)) return "social";
    return "referral";
  }

  const referrerHost = params.referrerHost?.toLowerCase();
  if (!referrerHost) return params.referrerObserved ? "direct" : "unknown";
  if (matchesAny(referrerHost, OWN_HOST_PATTERNS)) return "unknown";
  if (matchesAny(referrerHost, SEARCH_ENGINE_HOST_PATTERNS)) return "organic_search";
  if (matchesAny(referrerHost, SOCIAL_HOST_PATTERNS)) return "social";
  return "referral";
}

/** Extracts just the hostname from a referrer URL — never the full URL/query string. Returns undefined on empty or unparseable input (caller treats that as "unknown" evidence, not "direct"). */
export function extractReferrerHost(referrerUrl: string | undefined | null): string | undefined {
  if (!referrerUrl) return undefined;
  try {
    return new URL(referrerUrl).hostname || undefined;
  } catch {
    return undefined;
  }
}
