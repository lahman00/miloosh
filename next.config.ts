import type { NextConfig } from "next";
import { REMOVED_COMPARISON_REDIRECTS } from "./data/redirects";

const nextConfig: NextConfig = {
  // Isolate local release QA from an already-running .next server. Production
  // and ordinary builds remain unchanged; never enabled on Vercel.
  ...(process.env.VERCEL !== "1" && process.env.MILOOSH_QA_BUILD === "1" ? {
    distDir: ".next-miloosh-qa",
    typescript: { tsconfigPath: "tsconfig.qa.json" },
  } : {}),
  async headers() {
    return [
      {
        // *.vercel.app deployment hosts are copies of the site. Search Console lists vercel.app as the top "linking
        // site" (92 of 100 external links), so Google has crawled such copies. Only miloosh.com should be indexed.
        source: "/:path*",
        has: [{ type: "host", value: "(?<deployment>.+)\\.vercel\\.app" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
  async redirects() {
    return [
      // Preserve old shared/footer links without creating a second research page.
      { source: "/research", destination: "/research/saas-pricing-pressure-index-2026", permanent: true },
      ...REMOVED_COMPARISON_REDIRECTS.map(([comparisonSlug, softwareSlug]) => ({
        source: `/compare/${comparisonSlug}`,
        destination: `/software/${softwareSlug}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
