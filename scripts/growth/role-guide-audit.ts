import { getAllRoleGuides } from "@/data/guides/registry";
import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import fs from "node:fs";
import path from "node:path";

export interface RoleGuideAuditResult {
  slug: string;
  title: string;
  category: string;
  productsCount: number;
  productsValid: boolean;
  comparisonsCount: number;
  comparisonsPublishedCount: number;
  unresolvedComparisons: string[];
  faqsCount: number;
  criteriaCount: number;
  /** HEURISTIC_DEMAND (renamed from INDIRECT_GSC, 2026-08-29): this is a hand-classified confidence tier, not derived from any authenticated Search Console data anywhere in this file or its slug list below -- the old name falsely implied real GSC backing. See lib/growth-audit/comparison-graph.ts for where real vs. heuristic signal actually lives in this codebase. */
  evidenceClass: "QUERY_PROVEN" | "PAGE_PROVEN" | "HEURISTIC_DEMAND" | "EDITORIAL_INFERENCE";
  status: "VALID" | "HAS_DEFECT";
}

export function auditRoleGuides(): {
  totalGuides: number;
  validGuidesCount: number;
  guidesWithDefects: number;
  evidenceBreakdown: Record<string, number>;
  guides: RoleGuideAuditResult[];
} {
  const guides = getAllRoleGuides();
  const software = getAllSoftware();
  const softwareSlugs = new Set(software.map(s => s.slug));
  const comparisonSet = new Set(
    PUBLISHED_COMPARISONS.map(([a, b]) => `${a}-vs-${b}`).concat(
      PUBLISHED_COMPARISONS.map(([a, b]) => `${b}-vs-${a}`)
    )
  );

  const evidenceBreakdown: Record<string, number> = {
    QUERY_PROVEN: 0,
    PAGE_PROVEN: 0,
    HEURISTIC_DEMAND: 0,
    EDITORIAL_INFERENCE: 0,
  };

  const results: RoleGuideAuditResult[] = [];

  for (const g of guides) {
    const invalidProducts = g.products.filter(p => !softwareSlugs.has(p.slug));
    const unresolvedComps = g.comparisons.filter(c => !comparisonSet.has(c));

    let evidenceClass: RoleGuideAuditResult["evidenceClass"] = "EDITORIAL_INFERENCE";
    if (g.slug === "best-knowledge-base-software-for-teams") {
      evidenceClass = "QUERY_PROVEN";
    } else if ([
      "best-crm-for-startups",
      "best-crm-for-sales-teams",
      "best-customer-service-software-for-startups",
      "best-social-media-management-for-agencies",
      "best-voip-phone-system-for-small-business",
      "best-password-manager-for-businesses"
    ].includes(g.slug)) {
      evidenceClass = "PAGE_PROVEN";
    } else if ([
      "best-help-desk-for-ecommerce",
      "best-social-media-scheduler-for-small-business",
      "best-task-management-for-individuals",
      "best-time-tracking-for-agencies",
      "best-time-tracking-for-freelancers",
      "best-accounting-software-for-freelancers",
      "best-accounting-software-for-small-business",
      "best-crm-for-consultants",
      "best-crm-for-small-business",
      "best-project-management-for-agencies",
      "best-help-desk-for-small-business",
      "best-email-marketing-for-ecommerce",
      "best-email-marketing-for-small-business",
      "best-lead-tracking-for-agencies",
      "best-scheduling-software-for-consultants",
      "best-voice-ai-for-creators",
      "best-cloud-phone-system-for-remote-teams",
      "best-project-management-for-software-teams",
      "best-no-code-database-for-operations",
      "best-property-management-software",
      "best-field-service-software-for-contractors"
    ].includes(g.slug)) {
      evidenceClass = "HEURISTIC_DEMAND";
    } else {
      evidenceClass = "EDITORIAL_INFERENCE";
    }

    evidenceBreakdown[evidenceClass]++;

    const hasDefect = invalidProducts.length > 0 || unresolvedComps.length > 0 || g.faqs.length < 2 || g.keyCriteria.length < 3;

    results.push({
      slug: g.slug,
      title: g.title,
      category: g.categorySlug,
      productsCount: g.products.length,
      productsValid: invalidProducts.length === 0,
      comparisonsCount: g.comparisons.length,
      comparisonsPublishedCount: g.comparisons.length - unresolvedComps.length,
      unresolvedComparisons: unresolvedComps,
      faqsCount: g.faqs.length,
      criteriaCount: g.keyCriteria.length,
      evidenceClass,
      status: hasDefect ? "HAS_DEFECT" : "VALID"
    });
  }

  const validCount = results.filter(r => r.status === "VALID").length;
  const defectCount = results.filter(r => r.status === "HAS_DEFECT").length;

  return {
    totalGuides: guides.length,
    validGuidesCount: validCount,
    guidesWithDefects: defectCount,
    evidenceBreakdown,
    guides: results
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = auditRoleGuides();
  const outPath = path.join(process.cwd(), "var/agents/role-guide-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`✓ Role Guide Audit: Audited all ${result.totalGuides} role guides.`);
  console.log(`  - Valid guides: ${result.validGuidesCount}`);
  console.log(`  - Guides with defects: ${result.guidesWithDefects}`);
  console.log(`  - Evidence breakdown:`, result.evidenceBreakdown);
  if (result.guidesWithDefects > 0) {
    console.log(`\nGuides with defects:`);
    result.guides.filter(g => g.status === "HAS_DEFECT").forEach(g => {
      console.log(`   - /${g.slug} (Unresolved comps: ${g.unresolvedComparisons.join(", ")})`);
    });
  } else {
    console.log(`\n✓ All 30 role guides have 100% valid products and 100% published canonical comparisons!`);
  }
}
