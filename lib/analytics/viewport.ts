/**
 * Coarse viewport bucket for first-party events (2026-10-24). It exists so mobile conversion friction can be measured at all:
 * before this, no event carried any device dimension. Three buckets only, derived from the window width at send time. It is not
 * a fingerprint: no exact width, height, pixel ratio, user agent or platform string is stored.
 */
export const VIEWPORT_BUCKETS = ["mobile", "tablet", "desktop"] as const;
export type ViewportBucket = (typeof VIEWPORT_BUCKETS)[number];

/** Matches the site's Tailwind breakpoints: below 768px is mobile, below 1024px is tablet. */
export function viewportBucket(width: unknown): ViewportBucket | undefined {
  if (typeof width !== "number" || !Number.isFinite(width) || width <= 0) return undefined;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function isViewportBucket(value: unknown): value is ViewportBucket {
  return typeof value === "string" && (VIEWPORT_BUCKETS as readonly string[]).includes(value);
}
