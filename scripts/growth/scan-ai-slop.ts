import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getAllSoftware } from "@/data/software";
import { ROLE_GUIDES } from "@/data/guides/registry";

const SLOP_PATTERNS = [
  /\bpowerful solution\b/i,
  /\bseamlessly integrates\b/i,
  /\bseamless integration\b/i,
  /\bindustry-leading\b/i,
  /\bbest-in-class\b/i,
  /\bgame-changer\b/i,
  /\bunparalleled\b/i,
  /\bstate-of-the-art\b/i,
  /\brobust tool\b/i,
  /\brobust platform\b/i,
  /\bone-stop shop\b/i
];

export interface SlopMatch {
  location: string;
  pattern: string;
  snippet: string;
}

export function scanForSlop(): SlopMatch[] {
  const matches: SlopMatch[] = [];

  // 1. Scan software products
  const software = getAllSoftware();
  for (const sw of software) {
    const swPath = path.join(process.cwd(), "data", "software", `${sw.slug}.json`);
    if (!fs.existsSync(swPath)) continue;
    const content = fs.readFileSync(swPath, "utf-8");

    for (const pattern of SLOP_PATTERNS) {
      if (pattern.test(content)) {
        matches.push({
          location: `software/${sw.slug}.json`,
          pattern: pattern.source,
          snippet: content.match(pattern)?.[0] || ""
        });
      }
    }
  }

  // 2. Scan guides
  for (const g of ROLE_GUIDES) {
    const guideStr = JSON.stringify(g);
    for (const pattern of SLOP_PATTERNS) {
      if (pattern.test(guideStr)) {
        matches.push({
          location: `guide/${g.slug}`,
          pattern: pattern.source,
          snippet: guideStr.match(pattern)?.[0] || ""
        });
      }
    }
  }

  return matches;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = scanForSlop();
  console.log("================================================================");
  console.log("            AI SLOP & GENERIC PHRASE CORPUS SCAN                ");
  console.log("================================================================");
  console.log(`Total occurrences found: ${results.length}\n`);
  results.forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.location}] matched: "${m.snippet}" (${m.pattern})`);
  });
}
