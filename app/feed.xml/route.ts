import { NextResponse } from "next/server";
import { getAllSoftware } from "@/data/software";
import { generateTitle, generateMetaDescription } from "@/lib/generators";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23), Phase 15 — programmatic
 * distribution. Real, dated content only: the 30 most-recently-verified
 * software pages, sorted by the same real `accessedAt` field
 * app/sitemap.ts already uses for <lastmod> — never a fabricated
 * publish date. No separate "blog," so this surfaces the freshest real
 * research the catalog actually has, which is an honest fit for what
 * an RSS reader/aggregator expects ("what changed recently"), not a
 * repurposed static list.
 */
function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function GET() {
  const items = getAllSoftware()
    .slice()
    .sort((a, b) => b.accessedAt.localeCompare(a.accessedAt))
    .slice(0, 30)
    .map((software) => {
      const url = `${SITE_URL}/software/${software.slug}`;
      const pubDate = new Date(`${software.accessedAt}T00:00:00.000Z`).toUTCString();
      return `    <item>
      <title>${escapeXml(generateTitle(software))}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(generateMetaDescription(software))}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — Recently verified software research</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>The most recently verified software pages on ${escapeXml(SITE_NAME)} — sourced pricing, features, and alternatives.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
