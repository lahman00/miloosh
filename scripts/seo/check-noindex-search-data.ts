import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { UNREACHABLE_SUPPRESSED_COMPARISONS } from "@/data/seo/unreachable-comparisons";
import { slugsWithSearchVisibility } from "@/lib/site-audit/search-data";

/**
 * `npm run seo:check-noindex-search -- --gsc <Pages export .csv>`
 *
 * Lists the pages in data/seo/unreachable-comparisons.ts that the Search Console export (use the last 28 days) shows with
 * impressions or clicks. Such a page must leave the list. Exits 1 when any does. Reads one local file; no network.
 */
export function main(argv: string[]): number {
  const file = argv[argv.indexOf("--gsc") + 1];
  if (!argv.includes("--gsc") || !file) {
    console.error("Usage: npm run seo:check-noindex-search -- --gsc <Pages export .csv>");
    return 2;
  }
  const visible = slugsWithSearchVisibility(fs.readFileSync(path.resolve(file), "utf8"), UNREACHABLE_SUPPRESSED_COMPARISONS);
  console.log(`${UNREACHABLE_SUPPRESSED_COMPARISONS.length} listed pages checked; ${visible.length} have impressions or clicks.`);
  for (const row of visible) console.log(`  ${row.slug}: ${row.impressions} impressions, ${row.clicks} clicks`);
  return visible.length > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2)));
