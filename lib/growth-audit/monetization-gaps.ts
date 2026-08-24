import { getAllSoftware, type Software } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { getComparisonsInvolving } from "@/data/comparisons";
import type { MonetizationGapRow, MonetizationStatusGroup } from "./types";
import { KNOWN_GSC_IMPRESSIONS } from "./comparison-graph";

export function computeMonetizationGaps(
  software: Software[] = getAllSoftware(),
  pendingSlugs: Set<string> = new Set(["freshdesk", "freshsales", "amplitude", "toggl-track", "clickup", "activecampaign", "close", "kit", "wrike", "zendesk", "freshbooks"]),
  rejectedSlugs: Set<string> = new Set(["hubspot", "n8n", "brevo", "help-scout"]),
  ownerBlockedSlugs: Set<string> = new Set(["semrush", "lastpass", "woocommerce", "reclaim-ai", "crowdstrike", "tidio", "miro"]),
  gscImpressions: Record<string, number> = KNOWN_GSC_IMPRESSIONS
): MonetizationGapRow[] {
  const activeSlugs = new Set<string>(
    ACTIVE_PARTNERS.filter((p) => p.status === "active" && Boolean(p.affiliateUrl)).map((p) => p.slug as string)
  );
  activeSlugs.add("shopify");
  activeSlugs.add("wix");

  const progMap = new Map(AFFILIATE_PROGRAMS.map((p) => [p.slug, p]));
  const gaps: MonetizationGapRow[] = [];

  for (const s of software) {
    const isActive = activeSlugs.has(s.slug);
    const prog = progMap.get(s.slug);

    let statusGroup: MonetizationStatusGroup = "E";
    if (isActive) {
      statusGroup = "A";
    } else if (pendingSlugs.has(s.slug)) {
      statusGroup = "B";
    } else if (ownerBlockedSlugs.has(s.slug)) {
      statusGroup = "D";
    } else if (prog && prog.programExists === "yes") {
      statusGroup = "C";
    } else if (rejectedSlugs.has(s.slug) || (prog && prog.programExists === "no")) {
      statusGroup = "F";
    } else if (prog && prog.programExists === "unknown") {
      statusGroup = "E";
    } else {
      statusGroup = "E";
    }

    const imp = gscImpressions[s.slug] ?? 0;
    const comps = getComparisonsInvolving(s.slug).length;

    // 1. Search Demand score (0-35)
    let demandScore = 2;
    if (imp >= 800) demandScore = 35;
    else if (imp >= 300) demandScore = 28;
    else if (imp >= 100) demandScore = 22;
    else if (imp >= 50) demandScore = 16;
    else if (imp >= 10) demandScore = 10;
    else if (imp > 0) demandScore = 5;

    // 2. Commercial intent score (0-25)
    const highIntentCats = ["crm", "customer-support", "marketing", "ecommerce", "accounting", "field-service-management", "security"];
    const medIntentCats = ["project-management", "analytics", "automation", "scheduling", "cms", "api", "ai"];
    const intentScore = highIntentCats.includes(s.category) ? 25 : medIntentCats.includes(s.category) ? 18 : 10;

    // 3. Actionability score (0-25)
    let actionScore = 0;
    if (statusGroup === "B") actionScore = 25; // Pending approval
    else if (statusGroup === "C") actionScore = 20; // Ready to apply
    else if (statusGroup === "D") actionScore = 15; // Owner blocked
    else if (statusGroup === "E") actionScore = 8;  // Uncertain/unresearched
    else if (statusGroup === "F") actionScore = 0;  // No program / rejected
    else if (statusGroup === "A") actionScore = 0;  // Already active

    // 4. Comparison leverage (0-15)
    const compScore = Math.min(15, comps);

    const totalScore = demandScore + intentScore + actionScore + compScore;

    let notes = prog?.notes ?? "Unresearched program status in repository";
    if (statusGroup === "B") notes = "Application submitted; pending network review";
    else if (statusGroup === "D") notes = "Verified program; requires owner action/login to unblock";
    else if (statusGroup === "A") notes = "Active monetized partner with live link";

    gaps.push({
      slug: s.slug,
      name: s.name,
      category: s.category,
      statusGroup,
      impressions: imp,
      comparisonsCount: comps,
      monetizationGapScore: totalScore,
      demandScore,
      intentScore,
      actionScore,
      compScore,
      notes,
    });
  }

  return gaps.sort((a, b) => b.monetizationGapScore - a.monetizationGapScore || b.impressions - a.impressions || a.name.localeCompare(b.name));
}
