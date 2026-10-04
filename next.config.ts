import type { NextConfig } from "next";
import { REMOVED_COMPARISON_REDIRECTS } from "./data/redirects";

const nextConfig: NextConfig = {
  // Isolate local release QA from an already-running .next server. Production
  // and ordinary builds remain unchanged; never enabled on Vercel.
  ...(process.env.VERCEL !== "1" && process.env.MILOOSH_QA_BUILD === "1" ? {
    distDir: ".next-miloosh-qa",
    typescript: { tsconfigPath: "tsconfig.qa.json" },
  } : {}),
  // Deliberately narrow CSP: preserve scripts, analytics and vendor navigation.
  // No public framing or plugin/object embedding is required by this site.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
      ],
    }];
  },
  async redirects() {
    return REMOVED_COMPARISON_REDIRECTS.map(([comparisonSlug, softwareSlug]) => ({
      source: `/compare/${comparisonSlug}`,
      destination: `/software/${softwareSlug}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
