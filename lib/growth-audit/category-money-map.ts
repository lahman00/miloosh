import { getAllSoftware, type Software } from "@/data/software";
import { getAllCategories, type Category } from "@/data/categories";
import { PUBLISHED_COMPARISONS } from "@/data/comparisons";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import type { CategoryMoneyMapRow } from "./types";
import { KNOWN_GSC_IMPRESSIONS } from "./comparison-graph";

export function computeCategoryMoneyMap(
  categories: Category[] = getAllCategories(),
  software: Software[] = getAllSoftware(),
  pendingSlugs: Set<string> = new Set(["freshdesk", "freshsales", "amplitude", "toggl-track", "clickup", "activecampaign", "close", "kit", "wrike", "zendesk", "freshbooks"]),
  gscImpressions: Record<string, number> = KNOWN_GSC_IMPRESSIONS,
  gscClicks: Record<string, number> = { "intercom": 1, "airtable": 1 },
  gscPositions: Record<string, number> = {
    "intercom": 86.0, "freshdesk": 80.0, "semrush": 76.9, "front": 75.4, "help-scout": 73.9,
    "sprout-social": 81.6, "buffer": 84.1, "clickup": 88.6, "pipedrive": 77.1, "airtable": 79.3,
    "ringcentral": 67.8, "lastpass": 67.8, "todoist": 69.1, "confluence": 49.8, "mulesoft": 57.5,
    "ecwid": 54.0, "coda": 44.5, "adobe-analytics": 22.0, "segment": 22.0, "postmark": 10.0,
    "shortcut": 3.7, "gitlab": 7.0, "postman": 7.0, "docker": 7.0, "vercel": 7.0
  }
): CategoryMoneyMapRow[] {
  const activeSlugs = new Set<string>(
    ACTIVE_PARTNERS.filter((p) => p.status === "active" && Boolean(p.affiliateUrl)).map((p) => p.slug as string)
  );
  activeSlugs.add("shopify");
  activeSlugs.add("wix");

  return categories.map((cat) => {
    const prods = software.filter((s) => s.category === cat.slug);
    const prodSlugs = new Set(prods.map((s) => s.slug));
    const intraComps = PUBLISHED_COMPARISONS.filter(([a, b]) => prodSlugs.has(a) && prodSlugs.has(b)).length;
    const maxPossibleComps = (prods.length * (prods.length - 1)) / 2;
    const density = maxPossibleComps > 0 ? (intraComps / maxPossibleComps) * 100 : 0;

    let totalImp = 0;
    let totalClicks = 0;
    let weightedPosSum = 0;

    for (const p of prods) {
      const imp = gscImpressions[p.slug] ?? 0;
      const clicks = gscClicks[p.slug] ?? 0;
      const pos = gscPositions[p.slug] ?? null;

      totalImp += imp;
      totalClicks += clicks;
      if (pos !== null && imp > 0) {
        weightedPosSum += pos * imp;
      }
    }

    const avgPosition = totalImp > 0 ? weightedPosSum / totalImp : null;
    const ctrPct = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0;

    const activeProds = prods.filter((p) => activeSlugs.has(p.slug));
    const pendingProds = prods.filter((p) => pendingSlugs.has(p.slug));
    const viableProds = prods.filter((p) => {
      const prog = AFFILIATE_PROGRAMS.find((pr) => pr.slug === p.slug);
      return prog && prog.programExists === "yes";
    });

    const affiliateCoveragePct = (activeProds.length / prods.length) * 100;

    let activeImp = 0;
    let activeClicks = 0;
    for (const ap of activeProds) {
      activeImp += gscImpressions[ap.slug] ?? 0;
      activeClicks += gscClicks[ap.slug] ?? 0;
    }

    const currentValueScore = Math.min(100, Math.round(
      (activeProds.length * 15) + (activeClicks * 25) + (Math.min(30, Math.log10(activeImp + 1) * 12)) + (affiliateCoveragePct * 0.3)
    ));

    const highIntentCats = ["crm", "customer-support", "marketing", "ecommerce", "accounting", "field-service-management", "security"];
    const catWeight = highIntentCats.includes(cat.slug) ? 1.2 : 1.0;
    const unmonetizedImp = totalImp - activeImp;
    const untappedValueScore = Math.min(100, Math.round(
      ((Math.min(45, Math.log10(unmonetizedImp + 1) * 13)) +
      (pendingProds.length * 10) +
      (viableProds.length * 4) +
      (prods.length * 1.5)) * catWeight
    ));

    return {
      slug: cat.slug,
      name: cat.name,
      productCount: prods.length,
      comparisonCount: intraComps,
      comparisonDensityPct: Math.round(density * 10) / 10,
      impressions: totalImp,
      clicks: totalClicks,
      ctrPct: Math.round(ctrPct * 100) / 100,
      avgPosition: avgPosition !== null ? Math.round(avgPosition * 10) / 10 : null,
      activeAffiliatesCount: activeProds.length,
      pendingAffiliatesCount: pendingProds.length,
      viableAffiliatesCount: viableProds.length,
      affiliateCoveragePct: Math.round(affiliateCoveragePct * 10) / 10,
      currentValueScore,
      untappedValueScore,
    };
  }).sort((a, b) => b.untappedValueScore - a.untappedValueScore || b.impressions - a.impressions);
}
