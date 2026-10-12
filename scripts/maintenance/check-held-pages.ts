import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import cohorts from "@/data/seo/template-cohorts.json";
import { heldPageChanges } from "@/lib/site-audit/held-pages";

/**
 * `npm run check:held-pages -- --base <the app folder of the production build> [--dir <.next/server/app>]`
 *
 * Pages under a running measurement must read exactly as they do in production. This compares every held software
 * page and comparison (from data/seo/template-cohorts.json) between the production build and this one, ignoring
 * only the shared footer and the Twitter metadata, and exits 1 when any of them differs. Read-only.
 */

const USAGE = "Usage: npm run check:held-pages -- --base <production .next/server/app> [--dir <.next/server/app>]";

export function main(argv: string[]): number {
  const flag = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? undefined : argv[index + 1];
  };
  const base = flag("base");
  if (!base) {
    console.error(USAGE);
    return 2;
  }
  const baseDir = path.resolve(base);
  const newDir = path.resolve(flag("dir") ?? ".next/server/app");
  const held = [
    ...Object.keys(cohorts.software.held).map((slug) => ({ route: `/software/${slug}`, file: `software/${slug}.html` })),
    ...Object.keys(cohorts.comparisons.held).map((slug) => ({ route: `/compare/${slug}`, file: `compare/${slug}.html` })),
  ];

  const changed: string[] = [];
  const missing: string[] = [];
  for (const { route, file } of held) {
    const before = path.join(baseDir, file);
    const after = path.join(newDir, file);
    if (!fs.existsSync(before) || !fs.existsSync(after)) {
      missing.push(route);
      continue;
    }
    const reasons = heldPageChanges(route, fs.readFileSync(before, "utf8"), fs.readFileSync(after, "utf8"));
    if (reasons.length > 0) changed.push(`${route}: ${reasons.join("; ")}`);
  }

  console.log(`${held.length - changed.length - missing.length} of ${held.length} held pages are unchanged; ${changed.length} changed; ${missing.length} could not be compared.`);
  for (const line of changed.slice(0, 20)) console.log(`  CHANGED ${line}`);
  for (const route of missing.slice(0, 10)) console.log(`  MISSING ${route}`);
  return changed.length > 0 || missing.length > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
