import { getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getAllRoleGuides } from "@/data/guides/registry";
import { HEURISTIC_TRAFFIC_SIGNAL } from "@/lib/growth-audit/comparison-graph";
import fs from "node:fs";
import path from "node:path";

export interface CategoryAuditRow {
  slug: string;
  name: string;
  tier: "TIER 1 (Strategic)" | "TIER 2 (High Utility)" | "TIER 3 (Maintenance)" | "TIER 4 (Niche)";
  productCount: number;
  comparisonCount: number;
  roleGuidesCount: number;
  activeAffiliatesCount: number;
  activeAffiliateDensityPct: number;
  totalGscImpressions: number;
  strategicRationale: string;
}

export function auditCategoryIntelligence(): {
  totalCategories: number;
  tierSummary: Record<string, number>;
  categories: CategoryAuditRow[];
} {
  const software = getAllSoftware();
  const categories = getAllCategories();
  const roleGuides = getAllRoleGuides();
  const activeSlugs = new Set(ACTIVE_PARTNERS.map(p => p.slug as string));

  const compsByCat = new Map<string, number>();
  for (const c of categories) compsByCat.set(c.slug, 0);

  for (const [a, b] of PUBLISHED_COMPARISONS) {
    const sA = software.find(s => s.slug === a);
    const sB = software.find(s => s.slug === b);
    if (sA && compsByCat.has(sA.category)) {
      compsByCat.set(sA.category, (compsByCat.get(sA.category) ?? 0) + 1);
    }
    if (sB && sA?.category !== sB?.category && compsByCat.has(sB.category)) {
      compsByCat.set(sB.category, (compsByCat.get(sB.category) ?? 0) + 1);
    }
  }

  const rows: CategoryAuditRow[] = categories.map(cat => {
    const catSoftware = software.filter(s => s.category === cat.slug);
    const activeAffs = catSoftware.filter(s => activeSlugs.has(s.slug)).length;
    const catGuides = roleGuides.filter(g => g.categorySlug === cat.slug).length;
    
    let totalImp = 0;
    for (const s of catSoftware) {
      totalImp += HEURISTIC_TRAFFIC_SIGNAL[s.slug] ?? 0;
    }

    const comps = compsByCat.get(cat.slug) ?? 0;
    const density = catSoftware.length > 0 ? Number(((activeAffs / catSoftware.length) * 100).toFixed(1)) : 0;

    let tier: CategoryAuditRow["tier"] = "TIER 3 (Maintenance)";
    let strategicRationale = "";

    const tier1Cats = ["crm", "customer-support", "marketing", "accounting", "communication", "security"];
    const tier2Cats = ["project-management", "productivity", "field-service-management", "property-management", "scheduling", "analytics", "ecommerce", "ai"];

    if (tier1Cats.includes(cat.slug)) {
      tier = "TIER 1 (Strategic)";
      strategicRationale = "High contract value B2B software category with recurrent subscription affiliate programs and high organic buyer search volume.";
    } else if (tier2Cats.includes(cat.slug)) {
      tier = "TIER 2 (High Utility)";
      strategicRationale = "High daily active usage tools with solid commercial intent, team upgrades, and active comparison interest.";
    } else {
      tier = "TIER 3 (Maintenance)";
      strategicRationale = "Specialized technical or developer documentation tools; maintain high factual accuracy and direct substitute comparisons.";
    }

    return {
      slug: cat.slug,
      name: cat.name,
      tier,
      productCount: catSoftware.length,
      comparisonCount: comps,
      roleGuidesCount: catGuides,
      activeAffiliatesCount: activeAffs,
      activeAffiliateDensityPct: density,
      totalGscImpressions: totalImp,
      strategicRationale
    };
  });

  rows.sort((a, b) => {
    const tierOrder = { "TIER 1 (Strategic)": 1, "TIER 2 (High Utility)": 2, "TIER 3 (Maintenance)": 3, "TIER 4 (Niche)": 4 };
    return tierOrder[a.tier] - tierOrder[b.tier] || b.productCount - a.productCount;
  });

  const tierSummary: Record<string, number> = {};
  for (const r of rows) {
    tierSummary[r.tier] = (tierSummary[r.tier] ?? 0) + 1;
  }

  return {
    totalCategories: categories.length,
    tierSummary,
    categories: rows
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = auditCategoryIntelligence();
  const outPath = path.join(process.cwd(), "var/agents/category-intelligence-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`✓ Category Intelligence Audit: Audited all ${result.totalCategories} categories.`);
  console.log(`✓ Tier Summary:`, result.tierSummary);
  console.log(`\nRanked Categories:`);
  result.categories.forEach(c => {
    console.log(`   - [${c.tier}] ${c.name.padEnd(25)} | Products: ${String(c.productCount).padStart(2)} | Comps: ${String(c.comparisonCount).padStart(3)} | Guides: ${c.roleGuidesCount} | Active Affs: ${c.activeAffiliatesCount} | Heuristic signal: ${c.totalGscImpressions}`);
  });
}
