import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { pathToFileURL } from "node:url";

const publishedSet = new Set(PUBLISHED_COMPARISONS.map(([a, b]) => `${a}-vs-${b}`));
const reverseSet = new Set(PUBLISHED_COMPARISONS.map(([a, b]) => `${b}-vs-${a}`));

function isPublished(a: string, b: string): boolean {
  return publishedSet.has(`${a}-vs-${b}`) || reverseSet.has(`${a}-vs-${b}`);
}

export interface MissingCandidate {
  slugA: string;
  nameA: string;
  slugB: string;
  nameB: string;
  category: string;
  reason: string;
  mutualAlternative: boolean;
  score: number;
}

export function findMissingDirectComparisons(): MissingCandidate[] {
  const all = getAllSoftware();
  const softwareMap = new Map(all.map(s => [s.slug, s]));
  const missing: MissingCandidate[] = [];

  for (const swA of all) {
    for (const alt of swA.alternatives) {
      const swB = softwareMap.get(alt.slug);
      if (!swB) continue;

      // Only evaluate within same category or explicitly approved adjacent categories
      if (swA.category !== swB.category) continue;

      if (!isPublished(swA.slug, swB.slug)) {
        // Check if swA is also in swB's alternatives (mutual)
        const isMutual = swB.alternatives.some(a => a.slug === swA.slug);

        // Avoid duplicate candidate pairs
        const pairKey = [swA.slug, swB.slug].sort().join("-vs-");
        if (!missing.some(m => [m.slugA, m.slugB].sort().join("-vs-") === pairKey)) {
          let score = 5;
          if (isMutual) score += 5;
          if (swA.features.length >= 3 && swB.features.length >= 3) score += 3;

          missing.push({
            slugA: swA.slug,
            nameA: swA.name,
            slugB: swB.slug,
            nameB: swB.name,
            category: swA.category,
            mutualAlternative: isMutual,
            reason: alt.description || `Direct same-category competitor in ${swA.category}`,
            score
          });
        }
      }
    }
  }

  return missing.sort((a, b) => b.score - a.score);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const candidates = findMissingDirectComparisons();
  console.log("================================================================");
  console.log("       MILOOSH HIGH-SIGNAL MISSING COMPARISONS AUDIT            ");
  console.log("================================================================\n");
  console.log(`Found ${candidates.length} high-signal same-category candidate pairs:\n`);
  candidates.slice(0, 25).forEach((c, idx) => {
    console.log(`${(idx + 1).toString().padStart(2, " ")}. [${c.slugA} vs ${c.slugB}] (${c.category}) — Mutual: ${c.mutualAlternative} | Score: ${c.score}`);
    console.log(`    Rationale: ${c.reason}\n`);
  });
}
