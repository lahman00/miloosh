import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { getAllRoleGuides } from "@/data/guides/registry";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface PageLinkMetrics {
  url: string;
  type: "software" | "category" | "guide" | "comparison";
  slug: string;
  name: string;
  inboundComparisons: number;
  inboundAlternatives: number;
  inboundRoleGuides: number;
  inboundCategory: number;
  totalInbound: number;
  isActiveAffiliate: boolean;
}

export function auditInternalLinkIntelligence() {
  const software = getAllSoftware();
  const roleGuides = getAllRoleGuides();
  const activeSlugs = new Set(ACTIVE_PARTNERS.map(p => p.slug as string));

  const compCountMap = new Map<string, number>();
  for (const s of software) compCountMap.set(s.slug, 0);
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    compCountMap.set(a, (compCountMap.get(a) ?? 0) + 1);
    compCountMap.set(b, (compCountMap.get(b) ?? 0) + 1);
  }

  const altCountMap = new Map<string, number>();
  for (const s of software) altCountMap.set(s.slug, 0);
  for (const s of software) {
    if (s.alternatives) {
      for (const alt of s.alternatives) {
        if (altCountMap.has(alt.slug)) {
          altCountMap.set(alt.slug, (altCountMap.get(alt.slug) ?? 0) + 1);
        }
      }
    }
  }

  const guideCountMap = new Map<string, number>();
  for (const s of software) guideCountMap.set(s.slug, 0);
  for (const g of roleGuides) {
    for (const p of g.products) {
      if (guideCountMap.has(p.slug)) {
        guideCountMap.set(p.slug, (guideCountMap.get(p.slug) ?? 0) + 1);
      }
    }
  }

  const softwareRows: PageLinkMetrics[] = software.map(s => {
    const comps = compCountMap.get(s.slug) ?? 0;
    const alts = altCountMap.get(s.slug) ?? 0;
    const guides = guideCountMap.get(s.slug) ?? 0;
    const categoryLink = 1; // from its category page
    const total = comps + alts + guides + categoryLink;

    return {
      url: `/software/${s.slug}`,
      type: "software",
      slug: s.slug,
      name: s.name,
      inboundComparisons: comps,
      inboundAlternatives: alts,
      inboundRoleGuides: guides,
      inboundCategory: categoryLink,
      totalInbound: total,
      isActiveAffiliate: activeSlugs.has(s.slug)
    };
  });

  softwareRows.sort((a, b) => a.totalInbound - b.totalInbound);

  const underlinked = softwareRows.filter(r => r.totalInbound <= 3);
  const overlinked = softwareRows.filter(r => r.totalInbound >= 25);
  const avgInbound = softwareRows.reduce((sum, r) => sum + r.totalInbound, 0) / softwareRows.length;

  return {
    totalSoftware: software.length,
    averageInboundLinks: Number(avgInbound.toFixed(1)),
    underlinkedPages: underlinked,
    overlinkedPages: overlinked,
    softwareRows
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = auditInternalLinkIntelligence();
  const outPath = path.join(process.cwd(), "var/agents/link-intelligence-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`✓ Internal Link Intelligence: Audited ${result.totalSoftware} software pages.`);
  console.log(`  - Average inbound links per software: ${result.averageInboundLinks}`);
  console.log(`  - Underlinked pages (<= 3 inbound links): ${result.underlinkedPages.length}`);
  console.log(`  - Overlinked hub pages (>= 25 inbound links): ${result.overlinkedPages.length}`);
  if (result.underlinkedPages.length > 0) {
    console.log(`\nUnderlinked Pages:`);
    result.underlinkedPages.forEach(p => console.log(`   - [${p.slug}] Inbound: ${p.totalInbound} (comps=${p.inboundComparisons}, alts=${p.inboundAlternatives}, guides=${p.inboundRoleGuides})`));
  }
}
