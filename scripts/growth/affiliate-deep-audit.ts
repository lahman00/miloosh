import { getAllSoftware } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { getAllRoleGuides } from "@/data/guides/registry";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface ActivePartnerMonetizationReport {
  slug: string;
  name: string;
  category: string;
  affiliateUrl: string;
  softwarePageUrl: string;
  totalComparisons: number;
  monetizedComparisonsCount: number;
  dualMonetizedComparisonsCount: number;
  roleGuidesCount: number;
  roleGuides: string[];
  dualMonetizedPartners: string[];
  complianceNotes?: string;
}

export function auditAffiliateMonetization() {
  const software = getAllSoftware();
  const roleGuides = getAllRoleGuides();
  const activeSlugs = new Set(ACTIVE_PARTNERS.map(p => p.slug as string));

  const partnerReports: ActivePartnerMonetizationReport[] = [];

  for (const partner of ACTIVE_PARTNERS) {
    const s = software.find(item => item.slug === partner.slug);
    const comps = PUBLISHED_COMPARISONS.filter(([a, b]) => a === partner.slug || b === partner.slug);
    
    const dualPartners: string[] = [];
    let dualCount = 0;

    for (const [a, b] of comps) {
      const other = a === partner.slug ? b : a;
      if (activeSlugs.has(other)) {
        dualCount++;
        dualPartners.push(other);
      }
    }

    const matchingGuides = roleGuides
      .filter(g => g.products.some(p => p.slug === partner.slug))
      .map(g => g.slug);

    let complianceNotes: string | undefined;
    if (partner.slug === "setmore") {
      complianceNotes = "STRICT COMPLIANCE: NO PAID MEDIA / PPC / BRAND ADS PERMITTED. Organic traffic only.";
    }

    partnerReports.push({
      slug: partner.slug,
      name: s?.name ?? partner.slug,
      category: s?.category ?? "unknown",
      affiliateUrl: partner.affiliateUrl ?? "MISSING",
      softwarePageUrl: `https://miloosh.com/software/${partner.slug}`,
      totalComparisons: comps.length,
      monetizedComparisonsCount: comps.length, // all comparisons involving this partner are monetized
      dualMonetizedComparisonsCount: dualCount,
      roleGuidesCount: matchingGuides.length,
      roleGuides: matchingGuides,
      dualMonetizedPartners: dualPartners,
      complianceNotes
    });
  }

  // Check network breakdown
  const networkCounts: Record<string, number> = {};
  let viableProgramsCount = 0;
  let noProgramCount = 0;
  let unknownProgramCount = 0;

  for (const prog of AFFILIATE_PROGRAMS) {
    if (prog.networkName) {
      networkCounts[prog.networkName] = (networkCounts[prog.networkName] ?? 0) + 1;
    }
    if (prog.programExists === "yes") viableProgramsCount++;
    else if (prog.programExists === "no") noProgramCount++;
    else unknownProgramCount++;
  }

  return {
    activePartnersCount: ACTIVE_PARTNERS.length,
    partnerReports,
    networkCounts,
    viableProgramsCount,
    noProgramCount,
    unknownProgramCount
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = auditAffiliateMonetization();
  const outPath = path.join(process.cwd(), "var/agents/affiliate-deep-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(audit, null, 2));
  console.log(`✓ Audited all ${audit.activePartnersCount} active affiliate partners and ${AFFILIATE_PROGRAMS.length} catalog programs.`);
  console.log(`✓ Network distribution:`, audit.networkCounts);
  console.log(`\nActive Partner Monetization Matrix:`);
  audit.partnerReports.forEach(p => {
    console.log(`   - ${p.name.padEnd(20)} | Comps: ${String(p.totalComparisons).padStart(2)} (Dual: ${p.dualMonetizedComparisonsCount}) | Role Guides: ${p.roleGuidesCount} | URL: ${p.affiliateUrl.slice(0, 45)}...`);
  });
}
