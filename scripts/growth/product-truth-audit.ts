import { getAllSoftware } from "@/data/software";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROTECTED_COHORT = new Set([
  "pipedrive", "airtable", "semrush", "freshdesk", "buffer",
  "ringcentral", "help-scout", "intercom", "front"
]);

const SUPERLATIVE_PATTERNS = [
  /\b(best-in-class|industry-leading|gold standard|exceptional|unmatched|revolutionary|game-changer|unrivaled)\b/gi,
  /\b(outstanding|the benchmark for|the ultimate)\b/gi
];

export interface SuperlativeFinding {
  slug: string;
  name: string;
  category: string;
  isProtected: boolean;
  field: "description" | "best_for" | "pros" | "cons" | "features";
  index?: number;
  match: string;
  fullText: string;
}

export function auditProductTruth(): {
  totalProducts: number;
  pricingVerifiedCount: number;
  pricingMissingCount: number;
  superlativeFindings: SuperlativeFinding[];
  nonProtectedSuperlativeCount: number;
} {
  const software = getAllSoftware();
  const findings: SuperlativeFinding[] = [];
  let pricingVerified = 0;
  let pricingMissing = 0;

  for (const s of software) {
    if (s.pricing && s.pricing.status === "verified" && s.pricing.officialSource) {
      pricingVerified++;
    } else {
      pricingMissing++;
    }

    const isProtected = PROTECTED_COHORT.has(s.slug);

    // Check description
    if (s.description) {
      for (const pattern of SUPERLATIVE_PATTERNS) {
        const matches = s.description.match(pattern);
        if (matches) {
          for (const m of matches) {
            findings.push({
              slug: s.slug,
              name: s.name,
              category: s.category,
              isProtected,
              field: "description",
              match: m,
              fullText: s.description
            });
          }
        }
      }
    }

    // Check best_for
    if (s.bestFor) {
      for (const pattern of SUPERLATIVE_PATTERNS) {
        const matches = s.bestFor.match(pattern);
        if (matches) {
          for (const m of matches) {
            findings.push({
              slug: s.slug,
              name: s.name,
              category: s.category,
              isProtected,
              field: "best_for",
              match: m,
              fullText: s.bestFor
            });
          }
        }
      }
    }

    // Check pros
    if (s.pros) {
      s.pros.forEach((pro, idx) => {
        for (const pattern of SUPERLATIVE_PATTERNS) {
          const matches = pro.match(pattern);
          if (matches) {
            for (const m of matches) {
              findings.push({
                slug: s.slug,
                name: s.name,
                category: s.category,
                isProtected,
                field: "pros",
                index: idx,
                match: m,
                fullText: pro
              });
            }
          }
        }
      });
    }

    // Check cons
    if (s.cons) {
      s.cons.forEach((con, idx) => {
        for (const pattern of SUPERLATIVE_PATTERNS) {
          const matches = con.match(pattern);
          if (matches) {
            for (const m of matches) {
              findings.push({
                slug: s.slug,
                name: s.name,
                category: s.category,
                isProtected,
                field: "cons",
                index: idx,
                match: m,
                fullText: con
              });
            }
          }
        }
      });
    }

    // Check features
    if (s.features) {
      s.features.forEach((feat, idx) => {
        for (const pattern of SUPERLATIVE_PATTERNS) {
          const matches = feat.match(pattern);
          if (matches) {
            for (const m of matches) {
              findings.push({
                slug: s.slug,
                name: s.name,
                category: s.category,
                isProtected,
                field: "features",
                index: idx,
                match: m,
                fullText: feat
              });
            }
          }
        }
      });
    }
  }

  const nonProtected = findings.filter(f => !f.isProtected);

  return {
    totalProducts: software.length,
    pricingVerifiedCount: pricingVerified,
    pricingMissingCount: pricingMissing,
    superlativeFindings: findings,
    nonProtectedSuperlativeCount: nonProtected.length
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = auditProductTruth();
  const outPath = path.join(process.cwd(), "var/agents/product-truth-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`✓ Product Data Truth Audit: ${result.totalProducts} total products`);
  console.log(`  - Pricing verified with official source: ${result.pricingVerifiedCount}`);
  console.log(`  - Pricing needing verification:          ${result.pricingMissingCount}`);
  console.log(`  - Total superlative findings:            ${result.superlativeFindings.length}`);
  console.log(`  - Non-protected superlative findings:    ${result.nonProtectedSuperlativeCount}`);
  
  if (result.nonProtectedSuperlativeCount > 0) {
    console.log(`\nNon-Protected Superlatives to Clean:`);
    result.superlativeFindings.filter(f => !f.isProtected).forEach(f => {
      console.log(`   - [${f.slug}] in ${f.field}: "${f.match}" -> "${f.fullText}"`);
    });
  }
}
