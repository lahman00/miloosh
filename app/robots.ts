import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Internal revenue dashboard (Sprint 8) — also marked noindex/nofollow
      // on the page itself; disallowed here too as defense in depth.
      // /api/ serves JSON for the app, never pages. `?_rsc=` URLs are Next.js client-navigation payloads: Search
      // Console crawl stats (90 days to 2026-11-04) show 89% of Googlebot requests were "other file type", and the
      // sampled desktop requests were ~94% `?_rsc=` fetches. Pages render fully from HTML, so these are not needed.
      disallow: ["/internal/", "/api/", "/*?_rsc", "/*&_rsc"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
