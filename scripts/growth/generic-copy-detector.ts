import { getAllSoftware } from "@/data/software";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROTECTED_COHORT = new Set([
  "pipedrive", "airtable", "semrush", "freshdesk", "buffer",
  "ringcentral", "help-scout", "intercom", "front"
]);

export interface CopyQualityScore {
  slug: string;
  name: string;
  category: string;
  isProtected: boolean;
  score: number;
  descriptionLength: number;
  prosCount: number;
  consCount: number;
  featuresCount: number;
  bestForLength: number;
  genericFlags: string[];
}

export function detectGenericCopy(): {
  totalAudited: number;
  averageScore: number;
  weakestPages: CopyQualityScore[];
  flaggedPages: CopyQualityScore[];
} {
  const software = getAllSoftware();
  const scored: CopyQualityScore[] = [];

  const genericOpeners = [
    /^([A-Za-z0-9\s.-]+) is a powerful/i,
    /^([A-Za-z0-9\s.-]+) is an all-in-one/i,
    /^([A-Za-z0-9\s.-]+) is a leading/i,
    /^([A-Za-z0-9\s.-]+) is a comprehensive/i,
    /^([A-Za-z0-9\s.-]+) is a software/i
  ];

  for (const s of software) {
    let score = 100;
    const flags: string[] = [];

    // Check description length & structure
    const descLen = s.description?.length ?? 0;
    if (descLen < 100) {
      score -= 20;
      flags.push(`Short description (${descLen} chars)`);
    }

    for (const pattern of genericOpeners) {
      if (pattern.test(s.description)) {
        score -= 10;
        flags.push(`Generic opener phrase in description`);
        break;
      }
    }

    // Check best_for
    const bfLen = s.bestFor?.length ?? 0;
    if (bfLen < 50) {
      score -= 15;
      flags.push(`Weak best_for field (${bfLen} chars)`);
    }

    // Check pros/cons counts
    const prosLen = s.pros?.length ?? 0;
    const consLen = s.cons?.length ?? 0;
    if (prosLen < 3) {
      score -= 15;
      flags.push(`Fewer than 3 pros (${prosLen})`);
    }
    if (consLen < 2) {
      score -= 15;
      flags.push(`Fewer than 2 cons (${consLen})`);
    }

    // Check features count
    const featLen = s.features?.length ?? 0;
    if (featLen < 4) {
      score -= 10;
      flags.push(`Fewer than 4 key features (${featLen})`);
    }

    scored.push({
      slug: s.slug,
      name: s.name,
      category: s.category,
      isProtected: PROTECTED_COHORT.has(s.slug),
      score,
      descriptionLength: descLen,
      prosCount: prosLen,
      consCount: consLen,
      featuresCount: featLen,
      bestForLength: bfLen,
      genericFlags: flags
    });
  }

  scored.sort((a, b) => a.score - b.score);

  const avg = scored.reduce((sum, s) => sum + s.score, 0) / scored.length;
  const flagged = scored.filter(s => s.genericFlags.length > 0);

  return {
    totalAudited: software.length,
    averageScore: Number(avg.toFixed(1)),
    weakestPages: scored.filter(s => !s.isProtected).slice(0, 15),
    flaggedPages: flagged
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = detectGenericCopy();
  const outPath = path.join(process.cwd(), "var/agents/generic-copy-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`✓ Generic Copy Audit: Audited ${result.totalAudited} products.`);
  console.log(`  - Average content completeness score: ${result.averageScore}/100`);
  console.log(`  - Flagged pages with copy improvements needed: ${result.flaggedPages.length}`);
  console.log(`\nWeakest Non-Protected Pages:`);
  result.weakestPages.forEach(p => {
    console.log(`   - [${p.slug}] (Score: ${p.score}/100) Flags: ${p.genericFlags.join(", ")}`);
  });
}
