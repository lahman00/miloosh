import { getAllSoftware, type Software } from "@/data/software";
import { getAllCategories, type Category } from "@/data/categories";
import { PUBLISHED_COMPARISONS, getComparisonSlug, getComparisonsInvolving } from "@/data/comparisons";
import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";
import type { InternalLinkAuditRow } from "./types";
import { HEURISTIC_TRAFFIC_SIGNAL } from "./comparison-graph";

export function analyzeInternalLinkGraph(
  software: Software[] = getAllSoftware(),
  categories: Category[] = getAllCategories(),
  heuristicSignalBySlug: Record<string, number> = HEURISTIC_TRAFFIC_SIGNAL
): {
  rows: InternalLinkAuditRow[];
  orphans: string[];
  underlinkedSoftware: InternalLinkAuditRow[];
  underlinkedActiveAffiliates: InternalLinkAuditRow[];
  totalUniquePages: number;
} {
  const inboundMap = new Map<string, Set<string>>();
  function addInbound(target: string, source: string) {
    if (!inboundMap.has(target)) inboundMap.set(target, new Set());
    inboundMap.get(target)!.add(source);
  }

  // 1. Homepage links
  for (const cat of categories) addInbound(`/category/${cat.slug}`, "/");
  for (const s of software) addInbound(`/software/${s.slug}`, "/");
  for (const [a, b] of PUBLISHED_COMPARISONS.slice(0, 20)) {
    addInbound(`/compare/${getComparisonSlug(a, b)}`, "/");
  }

  // 2. /compare index page
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    addInbound(`/compare/${getComparisonSlug(a, b)}`, "/compare");
  }

  // 3. Category pages
  for (const cat of categories) {
    const catProds = software.filter((s) => s.category === cat.slug);
    const catSlugs = new Set(catProds.map((s) => s.slug));
    for (const s of catProds) {
      addInbound(`/software/${s.slug}`, `/category/${cat.slug}`);
    }
    const catComps = PUBLISHED_COMPARISONS.filter(([a, b]) => catSlugs.has(a) && catSlugs.has(b));
    for (const [a, b] of catComps) {
      addInbound(`/compare/${getComparisonSlug(a, b)}`, `/category/${cat.slug}`);
    }
  }

  // 4. Software pages
  for (const s of software) {
    const src = `/software/${s.slug}`;
    addInbound(`/category/${s.category}`, src);
    if (s.alternatives) {
      for (const alt of s.alternatives) {
        addInbound(`/software/${alt.slug}`, src);
      }
    }
    const comps = getComparisonsInvolving(s.slug);
    for (const [a, b] of comps) {
      addInbound(`/compare/${getComparisonSlug(a, b)}`, src);
    }
  }

  // 5. Comparison pages
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    const compSlug = getComparisonSlug(a, b);
    const src = `/compare/${compSlug}`;
    addInbound(`/software/${a}`, src);
    addInbound(`/software/${b}`, src);
    const sA = software.find((s) => s.slug === a);
    const sB = software.find((s) => s.slug === b);
    if (sA) addInbound(`/category/${sA.category}`, src);
    if (sB) addInbound(`/category/${sB.category}`, src);
  }

  const activeSet = new Set<string>(ACTIVE_PARTNER_SLUGS);
  const rows: InternalLinkAuditRow[] = [];

  for (const s of software) {
    const url = `/software/${s.slug}`;
    const inCount = inboundMap.get(url)?.size ?? 0;
    rows.push({
      url,
      type: "software",
      inboundCount: inCount,
      isActiveAffiliate: activeSet.has(s.slug),
      heuristicSignal: heuristicSignalBySlug[s.slug] ?? 0,
    });
  }

  for (const cat of categories) {
    const url = `/category/${cat.slug}`;
    const inCount = inboundMap.get(url)?.size ?? 0;
    rows.push({
      url,
      type: "category",
      inboundCount: inCount,
      isActiveAffiliate: false,
      heuristicSignal: 0,
    });
  }

  for (const [a, b] of PUBLISHED_COMPARISONS) {
    const url = `/compare/${getComparisonSlug(a, b)}`;
    const inCount = inboundMap.get(url)?.size ?? 0;
    rows.push({
      url,
      type: "comparison",
      inboundCount: inCount,
      isActiveAffiliate: activeSet.has(a) || activeSet.has(b),
      heuristicSignal: 0,
    });
  }

  const orphans = rows.filter((r) => r.inboundCount === 0).map((r) => r.url);
  const underlinkedSoftware = rows.filter((r) => r.type === "software" && r.inboundCount < 5).sort((a, b) => a.inboundCount - b.inboundCount);
  const underlinkedActiveAffiliates = rows.filter((r) => r.type === "software" && r.isActiveAffiliate && r.inboundCount < 10).sort((a, b) => a.inboundCount - b.inboundCount);

  return {
    rows,
    orphans,
    underlinkedSoftware,
    underlinkedActiveAffiliates,
    totalUniquePages: inboundMap.size,
  };
}
