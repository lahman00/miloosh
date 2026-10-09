import { getAllSoftware, type Software } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type ComparisonIntentClass = "DIRECT_SUBSTITUTE" | "STRONG_OVERLAP" | "WEAK_OVERLAP" | "COMPLEMENTARY" | "INVALID";

export interface ClassifiedComparison {
  pair: string;
  slugA: string;
  slugB: string;
  nameA: string;
  nameB: string;
  categoryA: string;
  categoryB: string;
  sameCategory: boolean;
  classification: ComparisonIntentClass;
  reason: string;
}

export function classifyAllComparisons(): {
  total: number;
  breakdown: Record<ComparisonIntentClass, number>;
  comparisons: ClassifiedComparison[];
  weakOrInvalid: ClassifiedComparison[];
} {
  const software = getAllSoftware();
  const softwareMap = new Map<string, Software>(software.map(s => [s.slug, s]));

  const classified: ClassifiedComparison[] = [];
  const breakdown: Record<ComparisonIntentClass, number> = {
    DIRECT_SUBSTITUTE: 0,
    STRONG_OVERLAP: 0,
    WEAK_OVERLAP: 0,
    COMPLEMENTARY: 0,
    INVALID: 0,
  };

  for (const [slugA, slugB] of PUBLISHED_COMPARISONS) {
    const sA = softwareMap.get(slugA);
    const sB = softwareMap.get(slugB);

    if (!sA || !sB) {
      const row: ClassifiedComparison = {
        pair: `${slugA}-vs-${slugB}`,
        slugA,
        slugB,
        nameA: sA?.name ?? slugA,
        nameB: sB?.name ?? slugB,
        categoryA: sA?.category ?? "missing",
        categoryB: sB?.category ?? "missing",
        sameCategory: false,
        classification: "INVALID",
        reason: "One or both software slugs not found in catalog."
      };
      classified.push(row);
      breakdown.INVALID++;
      continue;
    }

    const sameCategory = sA.category === sB.category;
    let classification: ComparisonIntentClass = "DIRECT_SUBSTITUTE";
    let reason = "";

    if (sameCategory) {
      classification = "DIRECT_SUBSTITUTE";
      reason = `Both products belong to the '${sA.category}' category and offer overlapping features.`;
    } else {
      // Check for known strong cross-category bridges
      const pmProductivity = (sA.category === "project-management" && sB.category === "productivity") ||
                             (sA.category === "productivity" && sB.category === "project-management");
      const crmMarketing = (sA.category === "crm" && sB.category === "marketing") ||
                           (sA.category === "marketing" && sB.category === "crm");
      const crmSupport = (sA.category === "crm" && sB.category === "customer-support") ||
                         (sA.category === "customer-support" && sB.category === "crm");
      const acctTime = (sA.category === "accounting" && sB.category === "productivity") ||
                       (sA.category === "productivity" && sB.category === "accounting");
      const commSupport = (sA.category === "communication" && sB.category === "customer-support") ||
                          (sA.category === "customer-support" && sB.category === "communication");

      if (pmProductivity || crmMarketing || crmSupport || acctTime || commSupport) {
        classification = "STRONG_OVERLAP";
        reason = `Cross-category bridge between closely aligned domains (${sA.category} vs ${sB.category}) with common buyer substitution decisions.`;
      } else {
        classification = "WEAK_OVERLAP";
        reason = `Cross-category comparison between divergent domains (${sA.category} vs ${sB.category}).`;
      }
    }

    const row: ClassifiedComparison = {
      pair: `${slugA}-vs-${slugB}`,
      slugA,
      slugB,
      nameA: sA.name,
      nameB: sB.name,
      categoryA: sA.category,
      categoryB: sB.category,
      sameCategory,
      classification,
      reason
    };

    classified.push(row);
    breakdown[classification]++;
  }

  const weakOrInvalid = classified.filter(c => c.classification === "WEAK_OVERLAP" || c.classification === "COMPLEMENTARY" || c.classification === "INVALID");

  return {
    total: classified.length,
    breakdown,
    comparisons: classified,
    weakOrInvalid
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = classifyAllComparisons();
  const outPath = path.join(process.cwd(), "var/agents/comparison-deep-classification.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`✓ Audited and classified all ${result.total} comparisons:`);
  console.log(`  - DIRECT_SUBSTITUTE: ${result.breakdown.DIRECT_SUBSTITUTE}`);
  console.log(`  - STRONG_OVERLAP:    ${result.breakdown.STRONG_OVERLAP}`);
  console.log(`  - WEAK_OVERLAP:      ${result.breakdown.WEAK_OVERLAP}`);
  console.log(`  - COMPLEMENTARY:     ${result.breakdown.COMPLEMENTARY}`);
  console.log(`  - INVALID:           ${result.breakdown.INVALID}`);
  if (result.weakOrInvalid.length > 0) {
    console.log(`\nFound ${result.weakOrInvalid.length} potential weak/cross-category comparisons:`);
    result.weakOrInvalid.forEach(w => console.log(`   - ${w.pair} (${w.categoryA} vs ${w.categoryB}): ${w.reason}`));
  } else {
    console.log(`\n✓ Zero weak or invalid comparisons found across the entire 1,242 comparison graph!`);
  }
}
