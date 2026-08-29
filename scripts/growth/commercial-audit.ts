import { getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { getAllRoleGuides } from "@/data/guides/registry";
import {
  computeGraphNodeDegrees,
  findMissingComparisonOpportunities,
  computeMonetizationGaps,
  computeCategoryMoneyMap,
  analyzeInternalLinkGraph,
} from "@/lib/growth-audit";

export function runCommercialAudit() {
  const software = getAllSoftware();
  const categories = getAllCategories();
  const roleGuides = getAllRoleGuides();
  const degrees = computeGraphNodeDegrees(software);
  const gaps = computeMonetizationGaps(software);
  const catMap = computeCategoryMoneyMap(categories, software);
  const linkAudit = analyzeInternalLinkGraph(software, categories);
  const missingComps = findMissingComparisonOpportunities(software);

  const lowDegreeNodes = degrees.filter((d) => d.degree <= 2);

  console.log("================================================================");
  console.log("             MILOOSH COMMERCIAL GROWTH AUDIT REPORT              ");
  console.log("================================================================\n");

  console.log("1. CORE REPOSITORY METRICS");
  console.log("   - Total Software Products: " + software.length);
  console.log("   - Total Categories:        " + categories.length);
  console.log("   - Published Comparisons:   " + PUBLISHED_COMPARISONS.length + " (" + (PUBLISHED_COMPARISONS.length * 2) + " directional edges)");
  console.log("   - Role & Use-Case Guides:  " + roleGuides.length);
  console.log("   - Active Affiliate Partners:" + ACTIVE_PARTNERS.length);
  console.log("   - Avg Inbound Cross-Links: " + (linkAudit.rows.reduce((sum, r) => sum + r.inboundCount, 0) / software.length).toFixed(1) + " per product");
  console.log("   - Orphan / Dead-End Pages: " + linkAudit.orphans.length + "\n");

  console.log("2. ACTIVE AFFILIATE PARTNER COVERAGE");
  ACTIVE_PARTNERS.forEach((partner) => {
    const s = software.find((item) => item.slug === partner.slug);
    const d = degrees.find((item) => item.slug === partner.slug)?.degree ?? 0;
    const guides = roleGuides.filter((g) => g.products.some((p) => p.slug === partner.slug)).length;
    console.log("   - " + (s?.name ?? partner.slug).padEnd(20) + " | Degree: " + String(d).padStart(2) + " | Role Guides: " + guides + " | URL: " + partner.affiliateUrl);
  });
  console.log("");

  console.log("3. LOWEST-DEGREE GRAPH NODES (Degree <= 2)");
  if (lowDegreeNodes.length === 0) {
    console.log("   ✓ Zero products with degree <= 2! Graph is well connected.");
  } else {
    lowDegreeNodes.forEach((node) => {
      console.log("   - " + node.name.padEnd(22) + " (" + node.slug + ") | Category: " + node.category + " | Degree: " + node.degree);
    });
  }
  console.log("");

  console.log("4. TOP UNTAPPED CATEGORY OPPORTUNITIES");
  catMap
    .sort((a, b) => b.untappedValueScore - a.untappedValueScore)
    .slice(0, 6)
    .forEach((cat) => {
      console.log("   - " + cat.name.padEnd(22) + " | Products: " + String(cat.productCount).padStart(2) + " | Untapped Score: " + cat.untappedValueScore + "/100");
    });
  console.log("");

  console.log("5. TOP UNMONETIZED TRAFFIC GAPS (High-Traffic Tools Needing Partner Programs)");
  gaps
    .filter((g) => g.statusGroup !== "A")
    .slice(0, 5)
    .forEach((gap) => {
      console.log("   - " + gap.name.padEnd(20) + " | Traffic Signal: " + String(gap.impressions).padStart(4) + " | Gap Score: " + gap.monetizationGapScore + "/100 | Group: " + gap.statusGroup);
    });
  console.log("");

  console.log("6. TOP 10 MISSING HIGH-INTENT COMPARISON OPPORTUNITIES");
  missingComps.slice(0, 10).forEach((comp, idx) => {
    console.log("   " + String(idx + 1).padStart(2) + ". " + comp.nameA + " vs " + comp.nameB + " (Score: " + comp.score + ") — " + comp.reason);
  });
  console.log("");

  console.log("7. ROLE & USE-CASE GUIDE COVERAGE");
  roleGuides.forEach((guide) => {
    console.log("   - /" + guide.slug.padEnd(42) + " | " + guide.products.length + " products | Category: " + guide.categorySlug);
  });
  console.log("");

  console.log("================================================================");
  console.log("                       AUDIT COMPLETE                           ");
  console.log("================================================================");
}

if (import.meta.url === "file://" + process.argv[1]) {
  runCommercialAudit();
}
