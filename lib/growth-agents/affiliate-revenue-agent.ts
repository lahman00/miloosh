import { notMeasured, type Measured } from "./evidence";
import { findPagesTable, impressionsOf, lookupPage, type GscEvidence } from "./gsc-import";
import type { FunnelEvidence } from "./funnel";
import type { SiteInventory } from "./inventory";
import { softwareUrl } from "./urls";
import type { PartnerFacts } from "./partners";
import { PARTNER_RESTRICTIONS, type PartnerRestriction } from "./partner-restrictions";
import { protectionFor, type ProtectionSnapshot, type ProtectionVerdict } from "./protection";

/**
 * Affiliate Revenue Agent: a pure function from the partner registry, search
 * evidence and (optional) first-party funnel evidence to a statement of where
 * the money path is complete, where it is blocked, and the one revenue
 * improvement worth making next.
 *
 * It keeps six facts separate and never derives one from another: approval,
 * issued link, technical readiness, payout readiness, conversions and
 * commissions/payouts received. The last two have no data source in this
 * repository and are reported as NOT_MEASURED.
 */

/** The partners whose call to action appears on one page: the page's own product(s), and other products it shows a call to action for. */
export type PartnerExposure = { own: PartnerRow[]; viaOtherCtas: PartnerRow[] };

export function partnerExposureFor(page: { softwareSlugs: readonly string[]; otherCtaSlugs: readonly string[] }, bySlug: ReadonlyMap<string, PartnerRow>): PartnerExposure {
  const own = page.softwareSlugs.map((slug) => bySlug.get(slug)).filter((row): row is PartnerRow => Boolean(row));
  const ownSlugs = new Set(own.map((row) => row.slug));
  const viaOtherCtas = page.otherCtaSlugs
    .filter((slug, index, all) => all.indexOf(slug) === index)
    .map((slug) => bySlug.get(slug))
    .filter((row): row is PartnerRow => Boolean(row) && !ownSlugs.has(row!.slug));
  return { own, viaOtherCtas };
}

export type ProgramStatusLookup = (slug: string) => { status: string | null; note: string | null };

export type AffiliateRevenueInputs = {
  now: Date;
  partners: readonly PartnerFacts[] | null;
  restrictions?: readonly PartnerRestriction[];
  gsc: GscEvidence | null;
  inventory: SiteInventory | null;
  protection: ProtectionSnapshot | null;
  funnel: FunnelEvidence;
  /** Ledger status of any product, including products with no active partner. */
  programStatus?: ProgramStatusLookup;
};

export type PartnerDemand = {
  /** Own pages: the partner's software page plus every comparison page that lists it. */
  historicalImpressions: number | null;
  recentImpressions: number | null;
  pagesWithHistoricalDemand: number;
  pagesChecked: number;
  basis: string;
  /**
   * Pages about OTHER products that show a call to action for this partner (decision-guide alternatives, buyer-checklist options).
   * Null when the site inventory was not available, because then the pages cannot be found.
   */
  viaOtherCtas: { pagesChecked: number; pagesWithHistoricalDemand: number; historicalImpressions: number | null } | null;
};

export type PartnerRow = {
  slug: string;
  name: string;
  approval: "REGISTRY_AND_LEDGER_AGREE" | "REGISTRY_ONLY" | "LEDGER_DISAGREES";
  issuedLink: "PRESENT" | "MISSING";
  trackingLocked: boolean;
  technicalPath: "READY" | "NOT_READY";
  payout: PartnerFacts["payout"];
  restrictions: PartnerRestriction[];
  demand: PartnerDemand;
  softwarePageProtection: ProtectionVerdict | "NOT_CHECKED";
  /** Technical path and payout profile verified. This is readiness, not revenue. */
  revenueReady: boolean;
  networkSignals: PartnerFacts["networkSignals"];
};

export type PayoutBlocker = {
  railId: string;
  railLabel: string;
  readiness: "UNVERIFIED" | "OWNER_ACTION_REQUIRED";
  partners: string[];
  ownerActionPackId: string;
  /**
   * Historical impressions on every page that shows these partners (their own pages and pages of other products that show them as
   * other product's page), each page counted once. Demand only; not a revenue estimate.
   */
  historicalImpressionsAtStake: number | null;
  /** The part of the total that sits on the partners' own pages. */
  ownPagesImpressions: number | null;
  /** The part that sits on other products' pages that show a partner's call to action; null when the inventory was not available. */
  viaOtherCtasImpressions: number | null;
  pagesWithHistoricalDemand: number;
};

export type NonPartnerDemandRow = {
  url: string;
  historicalImpressions: number;
  programStatus: string | null;
  programNote: string | null;
};

export type RevenueRecommendation = {
  kind: "REPAIR_TECHNICAL_PATH" | "RESOLVE_REGISTRY_CONFLICT" | "OWNER_PAYOUT_ACTION" | "MEASURE_FUNNEL" | "NO_ACTION";
  summary: string;
  subject: string | null;
  evidence: string[];
  requiresOwnerDecision: boolean;
};

export type AffiliateRevenueReport = {
  status: "OK" | "NEEDS_DATA";
  generatedAt: string;
  missingInputs: string[];
  counts: {
    activePartners: number;
    issuedLinks: number;
    technicalPathReady: number;
    payoutVerified: number;
    payoutOwnerActionRequired: number;
    payoutUnverified: number;
    revenueReady: number;
    ledgerDisagreements: number;
  };
  partners: PartnerRow[];
  payoutBlockers: PayoutBlocker[];
  commercialPaths: {
    comparisonsTotal: number;
    comparisonsWithActivePartnerOnOneSide: number;
    comparisonsWithActivePartnerOnBothSides: number;
    monetizedComparisonsInSitemap: number;
  } | null;
  nonPartnerDemand: NonPartnerDemandRow[];
  funnel: FunnelEvidence;
  outcomes: {
    conversions: Measured<number>;
    approvedCommissions: Measured<Array<{ currency: string; amount: number }>>;
    payoutsReceived: Measured<Array<{ currency: string; amount: number }>>;
  };
  recommendation: RevenueRecommendation;
  limitations: string[];
};

/** Pages of other products that show a call to action for `slug`. The partner's own software page is never counted here. */
function otherCtaExposureUrls(slug: string, inventory: SiteInventory | null): string[] | null {
  if (!inventory) return null;
  const own = softwareUrl(slug);
  return [...inventory.pages.values()]
    .filter((entry) => entry.identity.kind === "software" && entry.url !== own && entry.otherCtaSlugs.includes(slug))
    .map((entry) => entry.url)
    .sort();
}

function demandFor(urls: readonly string[], gsc: GscEvidence | null): Omit<PartnerDemand, "viaOtherCtas"> {
  if (!gsc || !findPagesTable(gsc, "historical")) {
    return { historicalImpressions: null, recentImpressions: null, pagesWithHistoricalDemand: 0, pagesChecked: urls.length, basis: "no Search Console capture" };
  }
  let historical = 0;
  let recent = 0;
  let recentKnown = true;
  let withDemand = 0;
  for (const url of urls) {
    const h = impressionsOf(lookupPage(gsc, "historical", url));
    const r = impressionsOf(lookupPage(gsc, "recent", url));
    if (h !== null) {
      historical += h;
      if (h > 0) withDemand += 1;
    }
    if (r === null) recentKnown = false;
    else recent += r;
  }
  return {
    historicalImpressions: historical,
    recentImpressions: recentKnown ? recent : null,
    pagesWithHistoricalDemand: withDemand,
    pagesChecked: urls.length,
    basis: "Search Console page tables; the partner's software page plus every comparison page that lists it",
  };
}

function demandWithExposure(slug: string, ownUrls: readonly string[], gsc: GscEvidence | null, inventory: SiteInventory | null): PartnerDemand {
  const own = demandFor(ownUrls, gsc);
  const altUrls = otherCtaExposureUrls(slug, inventory);
  if (altUrls === null) return { ...own, viaOtherCtas: null };
  const alt = demandFor(altUrls, gsc);
  return { ...own, viaOtherCtas: { pagesChecked: altUrls.length, pagesWithHistoricalDemand: alt.pagesWithHistoricalDemand, historicalImpressions: alt.historicalImpressions } };
}

const LIMITATIONS = [
  "No conversion, commission or received-payout record exists in the repository; those stages are NOT_MEASURED, not zero.",
  "Impressions at stake are search demand on pages that list the partner. They are not clicks, conversions or revenue and no earnings are forecast.",
  "Restrictions come from recorded program terms only; a partner with no recorded restriction is NOT_RECORDED, not unrestricted.",
  "The first-party click store and the revenue outbound log describe the same clicks differently and are never added together.",
];

export function runAffiliateRevenueAgent(inputs: AffiliateRevenueInputs): AffiliateRevenueReport {
  const generatedAt = inputs.now.toISOString();
  const outcomes = {
    conversions: notMeasured<number>("No network conversion report is stored in the repository or was provided."),
    approvedCommissions: notMeasured<Array<{ currency: string; amount: number }>>("No network commission report is stored in the repository or was provided."),
    payoutsReceived: notMeasured<Array<{ currency: string; amount: number }>>("No payout receipt is stored in the repository or was provided."),
  };
  if (!inputs.partners) {
    return {
      status: "NEEDS_DATA",
      generatedAt,
      missingInputs: ["partner registry"],
      counts: { activePartners: 0, issuedLinks: 0, technicalPathReady: 0, payoutVerified: 0, payoutOwnerActionRequired: 0, payoutUnverified: 0, revenueReady: 0, ledgerDisagreements: 0 },
      partners: [],
      payoutBlockers: [],
      commercialPaths: null,
      nonPartnerDemand: [],
      funnel: inputs.funnel,
      outcomes,
      recommendation: { kind: "NO_ACTION", summary: "The partner registry could not be read, so no revenue statement is made.", subject: null, evidence: [], requiresOwnerDecision: false },
      limitations: LIMITATIONS,
    };
  }

  const restrictions = inputs.restrictions ?? PARTNER_RESTRICTIONS;
  const partners: PartnerRow[] = inputs.partners
    .map((p): PartnerRow => {
      const urls = [p.softwarePageUrl, ...p.comparisonPageUrls];
      return {
        slug: p.slug,
        name: p.name,
        approval: !p.registryActive ? "LEDGER_DISAGREES" : p.ledgerAgrees ? "REGISTRY_AND_LEDGER_AGREE" : p.ledgerStatus === null ? "REGISTRY_ONLY" : "LEDGER_DISAGREES",
        issuedLink: p.issuedLinkPresent ? "PRESENT" : "MISSING",
        trackingLocked: p.trackingLocked,
        technicalPath: p.technicalPathReady ? "READY" : "NOT_READY",
        payout: p.payout,
        restrictions: restrictions.filter((r) => r.partnerSlug === p.slug),
        demand: demandWithExposure(p.slug, urls, inputs.gsc, inputs.inventory),
        softwarePageProtection: inputs.protection ? protectionFor(p.softwarePageUrl, inputs.protection).verdict : "NOT_CHECKED",
        revenueReady: p.revenueReady,
        networkSignals: p.networkSignals,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const counts = {
    activePartners: partners.length,
    issuedLinks: partners.filter((p) => p.issuedLink === "PRESENT").length,
    technicalPathReady: partners.filter((p) => p.technicalPath === "READY").length,
    payoutVerified: partners.filter((p) => p.payout.readiness === "VERIFIED").length,
    payoutOwnerActionRequired: partners.filter((p) => p.payout.readiness === "OWNER_ACTION_REQUIRED").length,
    payoutUnverified: partners.filter((p) => p.payout.readiness === "UNVERIFIED").length,
    revenueReady: partners.filter((p) => p.revenueReady).length,
    ledgerDisagreements: partners.filter((p) => p.approval !== "REGISTRY_AND_LEDGER_AGREE").length,
  };

  // Payout blockers: one row per rail that is not verified, ranked by the demand its partners' pages carry.
  const facts = new Map(inputs.partners.map((p) => [p.slug, p]));
  const railGroups = new Map<string, PartnerRow[]>();
  for (const row of partners) {
    if (row.payout.readiness === "VERIFIED") continue;
    const list = railGroups.get(row.payout.railId) ?? [];
    list.push(row);
    railGroups.set(row.payout.railId, list);
  }
  const payoutBlockers: PayoutBlocker[] = [...railGroups.entries()].map(([railId, rows]) => {
    const ownUrls = new Set<string>();
    const altUrls = new Set<string>();
    let altKnown = inputs.inventory !== null;
    for (const row of rows) {
      const f = facts.get(row.slug)!;
      ownUrls.add(f.softwarePageUrl);
      for (const u of f.comparisonPageUrls) ownUrls.add(u);
      const exposure = otherCtaExposureUrls(row.slug, inputs.inventory);
      if (exposure === null) altKnown = false;
      else for (const u of exposure) altUrls.add(u);
    }
    // A page that is both a partner's own page and another partner's exposure page is counted once, as an own page.
    const altOnly = [...altUrls].filter((u) => !ownUrls.has(u));
    const own = demandFor([...ownUrls], inputs.gsc);
    const total = demandFor([...ownUrls, ...altOnly], inputs.gsc);
    const alt = altKnown ? demandFor(altOnly, inputs.gsc) : null;
    return {
      railId,
      railLabel: rows[0]!.payout.railLabel,
      readiness: rows[0]!.payout.readiness as "UNVERIFIED" | "OWNER_ACTION_REQUIRED",
      partners: rows.map((r) => r.slug).sort(),
      ownerActionPackId: rows[0]!.payout.ownerActionPackId,
      historicalImpressionsAtStake: total.historicalImpressions,
      ownPagesImpressions: own.historicalImpressions,
      viaOtherCtasImpressions: alt ? alt.historicalImpressions : null,
      pagesWithHistoricalDemand: total.pagesWithHistoricalDemand,
    };
  });
  payoutBlockers.sort((a, b) => {
    const da = a.historicalImpressionsAtStake ?? -1;
    const db = b.historicalImpressionsAtStake ?? -1;
    if (da !== db) return db - da;
    if (a.partners.length !== b.partners.length) return b.partners.length - a.partners.length;
    return a.railId.localeCompare(b.railId);
  });

  // Commercial paths over the whole catalogue.
  let commercialPaths: AffiliateRevenueReport["commercialPaths"] = null;
  const nonPartnerDemand: NonPartnerDemandRow[] = [];
  if (inputs.inventory) {
    const active = new Set(partners.map((p) => p.slug));
    let oneSide = 0;
    let bothSides = 0;
    let monetizedInSitemap = 0;
    for (const comparison of inputs.inventory.comparisons.values()) {
      const sides = comparison.softwareSlugs.filter((s) => active.has(s)).length;
      if (sides === 1) oneSide += 1;
      if (sides === 2) bothSides += 1;
      if (sides >= 1 && inputs.inventory.pages.get(`https://miloosh.com/compare/${comparison.slug}`)?.inSitemap) monetizedInSitemap += 1;
    }
    commercialPaths = {
      comparisonsTotal: inputs.inventory.comparisons.size,
      comparisonsWithActivePartnerOnOneSide: oneSide,
      comparisonsWithActivePartnerOnBothSides: bothSides,
      monetizedComparisonsInSitemap: monetizedInSitemap,
    };
    const table = inputs.gsc ? findPagesTable(inputs.gsc, "historical") : null;
    if (table) {
      for (const record of table.pages.values()) {
        const entry = inputs.inventory.pages.get(record.canonicalUrl);
        if (!entry || (entry.identity.kind !== "software" && entry.identity.kind !== "compare")) continue;
        if (entry.softwareSlugs.some((s) => active.has(s))) continue;
        const slug = entry.softwareSlugs[0] ?? null;
        const lookup = slug && inputs.programStatus ? inputs.programStatus(slug) : { status: null, note: null };
        nonPartnerDemand.push({ url: record.canonicalUrl, historicalImpressions: record.metrics.impressions, programStatus: lookup.status, programNote: lookup.note });
      }
      nonPartnerDemand.sort((a, b) => b.historicalImpressions - a.historicalImpressions || a.url.localeCompare(b.url));
    }
  }

  // One recommendation at a time, in a fixed order of precedence.
  const technicalGaps = partners.filter((p) => p.technicalPath === "NOT_READY").sort((a, b) => (b.demand.historicalImpressions ?? 0) - (a.demand.historicalImpressions ?? 0) || a.slug.localeCompare(b.slug));
  const conflicts = partners.filter((p) => p.approval !== "REGISTRY_AND_LEDGER_AGREE");
  let recommendation: RevenueRecommendation;
  if (technicalGaps.length > 0) {
    const top = technicalGaps[0]!;
    recommendation = {
      kind: "REPAIR_TECHNICAL_PATH",
      summary: `Repair the affiliate path for ${top.name}: its CTA, disclosure, sponsored rel or tracked link does not resolve to the issued asset.`,
      subject: top.slug,
      evidence: [`${top.slug}: technical path NOT_READY`, `${technicalGaps.length} partner(s) affected`],
      requiresOwnerDecision: false,
    };
  } else if (conflicts.length > 0) {
    const top = conflicts[0]!;
    recommendation = {
      kind: "RESOLVE_REGISTRY_CONFLICT",
      summary: `Resolve the disagreement between the active registry and the current ledger for ${top.name} before directing traffic to it.`,
      subject: top.slug,
      evidence: [`${top.slug}: approval ${top.approval}`],
      requiresOwnerDecision: true,
    };
  } else if (payoutBlockers.length > 0) {
    const top = payoutBlockers[0]!;
    const stake = top.historicalImpressionsAtStake === null ? "an unmeasured amount of" : `${top.historicalImpressionsAtStake}`;
    recommendation = {
      kind: "OWNER_PAYOUT_ACTION",
      summary: `Owner action: complete payout setup for "${top.railLabel}" (${top.partners.join(", ")}). Pages that show these partners (their own pages and other products' pages that show them) drew ${stake} historical impressions; until the rail is verified, a click on them cannot be shown to end in a payable commission.`,
      subject: top.railId,
      evidence: [`rail ${top.railId} is ${top.readiness}`, `owner action pack ${top.ownerActionPackId}`, `${top.pagesWithHistoricalDemand} page(s) with historical demand`],
      requiresOwnerDecision: true,
    };
  } else if (inputs.funnel.state !== "MEASURED") {
    recommendation = {
      kind: "MEASURE_FUNNEL",
      summary: "Every partner path is technically ready and payout-verified, but the first-party funnel could not be read, so qualified clicks cannot be counted.",
      subject: null,
      evidence: [inputs.funnel.state === "UNAVAILABLE" || inputs.funnel.state === "NOT_MEASURED" ? inputs.funnel.reason : "funnel evidence is not decision-grade"],
      requiresOwnerDecision: false,
    };
  } else {
    recommendation = { kind: "NO_ACTION", summary: "No registry, technical or payout blocker was found; monitor qualified clicks and network conversions.", subject: null, evidence: [], requiresOwnerDecision: false };
  }

  return {
    status: "OK",
    generatedAt,
    missingInputs: [],
    counts,
    partners,
    payoutBlockers,
    commercialPaths,
    nonPartnerDemand: nonPartnerDemand.slice(0, 25),
    funnel: inputs.funnel,
    outcomes,
    recommendation,
    limitations: LIMITATIONS,
  };
}

