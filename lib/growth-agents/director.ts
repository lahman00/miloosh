import { partnerExposureFor, type AffiliateRevenueReport, type PartnerExposure, type PartnerRow } from "./affiliate-revenue-agent";
import { GROWTH_AGENT_SCHEMA_VERSION, opportunitySchema, type Blocker, type Opportunity } from "./contracts";
import { valueOf } from "./evidence";
import type { GoogleRecoveryReport, PageEvaluation } from "./google-recovery-agent";
import type { GuardianReport } from "./guardian";
import { pathOf } from "./urls";

/**
 * Miloosh Director: merges the specialist reports into one prioritised queue.
 *
 * It does not score. Ordering is lexicographic over named evidence classes,
 * so the same evidence always yields the same queue and every position can be
 * explained by naming the field that decided it. It publishes nothing and
 * mutates nothing: its output is a report and an owner-decision list.
 */

export type ActionLane = "GOOGLE" | "AFFILIATE" | "GUARDIAN" | "MEASUREMENT";
export type ActionStatus = "READY" | "WAITING" | "OWNER_DECISION" | "NEEDS_DATA" | "BLOCKED";

export type ActionKind =
  | "OWNER_PAYOUT_ACTION"
  | "REPAIR_TECHNICAL_PATH"
  | "RESOLVE_REGISTRY_CONFLICT"
  | "MEASURE_FUNNEL"
  | "WAIT_FIRST_RECRAWL"
  | "START_REVIEW_CLOCKS"
  | "HANDOFF_TO_PAGE_UPGRADER"
  | "COLLECT_EVIDENCE"
  | "WAIT_FOR_OBSERVATION"
  | "OWNER_DECISION"
  | "RELEASE_GATES";

export type ActionItem = {
  id: string;
  kind: ActionKind;
  lane: ActionLane;
  title: string;
  status: ActionStatus;
  targetUrl: string | null;
  summary: string;
  requiresOwner: boolean;
  dependsOn: string[];
  eligibleAfter: string | null;
  route: { skill: string; reason: string };
  evidence: string[];
  /** Measured historical demand the action concerns, for ordering owner decisions. Demand only; not revenue. */
  historicalImpressionsAtStake: number | null;
  /** Structured facts the Hebrew report fills its templates from. */
  params: Record<string, string | number | null>;
};

export type ProductionContext = {
  deploymentId: string | null;
  createdAt: string | null;
  /** SHA recorded by the owner or the platform; null when unknown. */
  recordedSha: string | null;
};

export type DirectorInputs = {
  now: Date;
  checkoutSha: string;
  branch: string | null;
  google: GoogleRecoveryReport;
  affiliate: AffiliateRevenueReport;
  guardian: GuardianReport | null;
  production: ProductionContext | null;
  /** Human title of the owner action pack behind each payout rail id (already redacted). */
  ownerPackTitles?: Readonly<Record<string, string>>;
  /** Number of pages whose MEASURING experiment record has an elapsed window and awaits the owner. */
  elapsedExperimentRecords?: number;
  shortlistSize?: number;
};

export type OwnerDecision = {
  id: string;
  kind: "PAYOUT_RAIL" | "RELEASE_GATES" | "CLOSE_EXPERIMENTS" | "REGISTRY_CONFLICT" | "TECHNICAL_REPAIR";
  question: string;
  why: string;
  evidence: string[];
  params: Record<string, string | number | null>;
};

export type HeldPage = { url: string; historicalImpressions: number | null; verdict: string; why: string; hasActivePartner: boolean };

export type DirectorReport = {
  schemaVersion: typeof GROWTH_AGENT_SCHEMA_VERSION;
  generatedAt: string;
  checkoutSha: string;
  branch: string | null;
  mode: "READ_ONLY";
  question: string;
  answer: { actionId: string | null; kind: ActionKind | null; summary: string; contentEditsAllowedNow: boolean; whyThisFirst: string[]; whatNotToDo: string[] };
  evidenceBasis: {
    gscCapturedAt: string | null;
    gscDataThrough: string | null;
    gscCapturedVia: string | null;
    historicalWindow: string | null;
    recentWindow: string | null;
    production: ProductionContext | null;
  };
  demandSummary: { verifiedCurrentDemandPages: number; historicalDemandPages: number; hypotheticalDemandPages: 0; note: string };
  shortlist: Opportunity[];
  shortlistRule: string;
  /** Pages dropped because they share a product record with a higher-ranked shortlisted page: changing both would be one interdependent change, not two. */
  overlapsSuppressed: Array<{ url: string; sharedWith: string; sharedProducts: string[] }>;
  heldPages: HeldPage[];
  queue: ActionItem[];
  ownerDecisions: OwnerDecision[];
  blockers: Array<{ id: string; detail: string; resolvableBy: Blocker["resolvableBy"] }>;
  limitations: string[];
};

type PartnerTier = 0 | 1 | 2;

const allRows = (exposure: PartnerExposure): PartnerRow[] => [...exposure.own, ...exposure.viaOtherCtas];

/**
 * 0 = at least one call to action on the page leads to a partner with a resolved link and a verified payout rail;
 * 1 = partners are shown but none of them is payable yet; 2 = no active partner is shown.
 */
export function tierOf(rows: readonly PartnerRow[]): PartnerTier {
  if (rows.length === 0) return 2;
  return rows.some((r) => r.payout.readiness === "VERIFIED" && r.technicalPath === "READY") ? 0 : 1;
}

export const SHORTLIST_RULE =
  "A page enters the shortlist only if the checked-out code publishes it, it has a defined path to action (editable now, or in an observation window with an end date) and at least the operating-floor of measured historical impressions. Order: (1) pages with a verified revenue path (a call to action, for the page's own product or another product it shows, that leads to an active partner with a resolved link and a verified payout rail) before the rest; (2) more measured historical impressions first; (3) URL. Whether a page can be changed now or only after its observation window is shown on each entry; it does not change the order. A page that shares a product record with a higher-ranked shortlisted page is suppressed, because editing both would be one interdependent change. No numeric score is used.";

/** Class 0: demand at or above the floor AND a verified revenue path. Class 1: demand at or above the floor otherwise. Below the floor: not shortlisted. */
function valueClass(e: PageEvaluation, tier: PartnerTier, floor: number): 0 | 1 | null {
  if ((e.historical.impressions ?? 0) < floor) return null;
  return tier === 0 ? 0 : 1;
}

export function compareForShortlist(a: { e: PageEvaluation; tier: PartnerTier; value: 0 | 1 }, b: { e: PageEvaluation; tier: PartnerTier; value: 0 | 1 }): number {
  if (a.value !== b.value) return a.value - b.value;
  const da = a.e.historical.impressions ?? -1;
  const db = b.e.historical.impressions ?? -1;
  if (da !== db) return db - da;
  return a.e.url.localeCompare(b.e.url);
}

/** A page the code does not publish has nothing to upgrade: it is a technical question (what does the URL return?), not an opportunity. */
function isActionable(e: PageEvaluation): boolean {
  if (!e.inventory.published) return false;
  return e.protection.verdict === "EDITABLE" || (e.protection.verdict === "OBSERVATION_WINDOW" && e.protection.eligibleAfter !== null);
}

function indexationOf(e: PageEvaluation): Opportunity["indexation"] {
  const coverage = e.coverage;
  const state: Opportunity["indexation"]["state"] =
    !coverage || coverage.state === "NOT_VERIFIED"
      ? "NOT_VERIFIED"
      : /not indexed/i.test(coverage.state)
        ? /discovered/i.test(coverage.state) ? "NOT_INDEXED_DISCOVERED" : "NOT_INDEXED_CRAWLED"
        : /indexed/i.test(coverage.state) ? "INDEXED" : "NOT_VERIFIED";
  return {
    state,
    lastCrawled: coverage?.lastCrawl ? coverage.lastCrawl.slice(0, 10) : null,
    inSitemapPerCode: e.inventory.inSitemapPerCode,
    qualityGateReady: e.inventory.qualityGateReady,
    qualityGateReasons: e.inventory.qualityGateReasons,
    evidence: coverage
      ? `${coverage.evidence}; coverage wording ${coverage.state === "NOT_VERIFIED" ? "not read" : `"${coverage.state}"`}`
      : "No Google coverage reading exists for this URL; the sitemap and quality-gate facts come from the checked-out code, not from Google.",
  };
}

/** What the rendered page was seen to carry, when it was read. */
function renderedNote(e: PageEvaluation): string {
  if (!e.renderedCtas) return "";
  const { sponsoredLinkCount, partnerSlugs } = e.renderedCtas;
  return `. Rendered page read: ${sponsoredLinkCount} sponsored link(s)${partnerSlugs.length > 0 ? ` for ${partnerSlugs.join(", ")}` : ""}`;
}

function affiliateOf(e: PageEvaluation, exposure: PartnerExposure): Opportunity["affiliate"] {
  const rows = allRows(exposure);
  if (e.kind !== "software" && e.kind !== "compare") {
    return { relationship: "NOT_APPLICABLE", partnerSlugs: [], otherCtaPartnerSlugs: [], issuedLink: "NOT_APPLICABLE", payoutReadiness: "NOT_APPLICABLE", note: "This page type has no single product to monetize; partner links appear through the products it lists." };
  }
  if (rows.length === 0) {
    return { relationship: "NO_ACTIVE_PARTNER", partnerSlugs: [], otherCtaPartnerSlugs: [], issuedLink: "NOT_APPLICABLE", payoutReadiness: "NOT_APPLICABLE", note: "No product on this page, and no other product it shows a call to action for, has an active partner; the page can earn visibility and decision usefulness only." };
  }
  const verified = rows.filter((r) => r.payout.readiness === "VERIFIED").length;
  const viaSlugs = new Set(exposure.viaOtherCtas.map((r) => r.slug));
  return {
    relationship: "ACTIVE_PARTNER",
    partnerSlugs: rows.map((r) => r.slug),
    otherCtaPartnerSlugs: rows.filter((r) => viaSlugs.has(r.slug)).map((r) => r.slug),
    issuedLink: rows.every((r) => r.issuedLink === "PRESENT") ? "PRESENT" : "MISSING",
    payoutReadiness: verified === rows.length ? "ALL_VERIFIED" : verified === 0 ? "NONE_VERIFIED" : "SOME_UNVERIFIED",
    note: `${rows.map((r) => `${r.name}${viaSlugs.has(r.slug) ? " (shown as another option)" : ""}: payout rail ${r.payout.railId} is ${r.payout.readiness}`).join("; ")}${renderedNote(e)}`,
  };
}

type Step = { kind: Opportunity["recommendedAction"]["kind"]; summary: string; handoffSkill: string | null; status: Opportunity["status"] };

function nextStepOf(e: PageEvaluation, tier: PartnerTier): Step {
  const p = e.protection;
  if (e.eligible) {
    return { kind: "HANDOFF_TO_PAGE_UPGRADER", summary: "Every gate passed: hand this exact URL to the page upgrader for one verified local change.", handoffSkill: "miloosh-money-page-upgrader", status: "READY" };
  }
  if (p.verdict === "PROTECTED") {
    const closure = p.reasons.some((r) => r.needsClosure);
    return {
      kind: "OWNER_DECISION",
      summary: closure
        ? "Do not edit. The experiment record is still MEASURING although its declared window has ended; only the owner can close it so the page can be reviewed."
        : "Do not edit. The page belongs to a protected experiment or cohort; measurement is the only permitted work.",
      handoffSkill: null,
      status: "OWNER_DECISION",
    };
  }
  if (p.verdict === "IN_FLIGHT") {
    return { kind: "OWNER_DECISION", summary: "Do not edit or deploy. Unfinished work on this page exists in another worktree; the owner decides whether to finish, release or discard it first.", handoffSkill: null, status: "OWNER_DECISION" };
  }
  if (p.verdict === "OBSERVATION_WINDOW") {
    const inFlight = p.reasons.some((r) => r.source === "in-flight-work") ? " Unfinished work on this page also exists in another worktree; the owner decides what happens to it before any edit." : "";
    return { kind: "WAIT_FOR_OBSERVATION", summary: `Do not edit before ${p.eligibleAfter}. The page changed recently and its review window protects the measurement; the clock starts at the first observed Google recrawl.${inFlight}`, handoffSkill: null, status: "WAITING" };
  }
  const evidenceSteps = [...new Set(e.blockers.filter((b) => b.resolvableBy === "AGENT_EVIDENCE").map((b) => b.nextInput).filter((s): s is string => Boolean(s)))];
  if (evidenceSteps.length > 0) {
    return {
      kind: "COLLECT_EVIDENCE",
      summary: `Collect read-only evidence first: ${evidenceSteps.join("; ")}.${tier === 2 ? " With no active partner this is a visibility-only improvement and needs the owner to choose that objective." : ""}`,
      handoffSkill: "miloosh-revenue-recovery-finder",
      status: "NEEDS_DATA",
    };
  }
  return { kind: "OWNER_DECISION", summary: "Only owner decisions remain for this page.", handoffSkill: null, status: "OWNER_DECISION" };
}

function confidenceOf(kind: Opportunity["recommendedAction"]["kind"]): Opportunity["confidence"] {
  // Confidence in the classification of the recommended step (what blocks the page), not in any future result.
  if (kind === "WAIT_FOR_OBSERVATION" || kind === "OWNER_DECISION") return "HIGH";
  if (kind === "COLLECT_EVIDENCE") return "MEDIUM";
  return "LOW";
}

function buyerIntentOf(e: PageEvaluation, name: string): Opportunity["buyerIntent"] {
  const intent = e.intent;
  if (intent && intent.source === "GSC_QUERY_TABLE" && intent.decisionShare !== null && intent.decisionQueries !== null) {
    const percent = Math.round(intent.decisionShare * 100);
    return {
      summary: `${percent}% of the ${intent.listedImpressions} impressions Search Console lists for ${name} (${intent.decisionQueries} of ${intent.listedQueries} listed queries) came from searches that compare, replace or price a product: ${intent.commercial === true ? "a buyer-intent page" : intent.commercial === false ? "mostly not purchase decisions" : "too few to classify"}. Anonymised queries are not listed.`,
      basis: "QUERY_EVIDENCE",
    };
  }
  if (intent && intent.source === "EXPLICIT") return { summary: `Page-level query evidence ${intent.commercial ? "shows" : "does not show"} commercial intent for ${name}.`, basis: "QUERY_EVIDENCE" };
  return {
    summary:
      e.kind === "compare"
        ? `A buyer choosing between the two products in ${name}; the pattern observed on this site is brand-plus-alternatives comparison searching, not yet confirmed for this page.`
        : e.kind === "software"
          ? `A buyer evaluating or replacing ${name}; the pattern observed on this site is brand-plus-alternatives, pricing and competitor searching, not yet confirmed for this page.`
          : `A buyer on a ${e.kind} page.`,
    basis: "PAGE_TYPE",
  };
}

export function buildOpportunity(e: PageEvaluation, exposure: PartnerExposure, tier: PartnerTier): Opportunity {
  const rows = allRows(exposure);
  const step = nextStepOf(e, tier);
  const name = e.title ?? pathOf(e.url);
  const hist = e.historical;
  const rec = e.recent;
  const windowText = (w: typeof hist) => (w.window ? `${w.window.start} to ${w.window.end}` : "an unknown window");
  const partner = affiliateOf(e, exposure);
  const unverified = rows.filter((r) => r.payout.readiness !== "VERIFIED");
  const ready = rows.filter((r) => r.payout.readiness === "VERIFIED" && r.technicalPath === "READY");
  const viaSlugs = new Set(exposure.viaOtherCtas.map((r) => r.slug));
  const shown = rows.map((r) => `${r.name}${viaSlugs.has(r.slug) ? " (as another option shown)" : ""}`).join(" and ");
  const commercialText =
    tier === 0
      ? `Shows ${shown}. For ${ready.map((r) => r.name).join(" and ")} the issued link, disclosure, sponsored rel and tracked CTA resolve and the payout rail is verified, so a qualified click on ${ready.length === 1 ? "it" : "them"} could end in a payable commission.`
      : tier === 1
        ? `Shows ${shown}, but no payout rail is verified (${unverified.map((r) => `${r.name}: ${r.payout.railId} is ${r.payout.readiness}`).join("; ")}), so a click cannot yet be shown to end in a payable commission.`
        : "No product on this page, and no other product it shows a call to action for, has an active partner: the page earns visibility and decision usefulness only.";
  const recentText = rec.state === "MEASURED" ? `${rec.impressions} impressions` : rec.state === "ZERO_BY_COMPLETE_TABLE" || rec.state === "ZERO_BY_EXACT_PAGE_CHECK" ? "zero impressions" : "not observed";
  const limitations = [
    "No conversion, commission or received-payout record exists; those stages are NOT_MEASURED, not zero.",
    `Demand is historical: ${hist.impressions ?? "unknown"} impressions in ${windowText(hist)}; recent demand is ${recentText} in ${windowText(rec)}.`,
    "Historical visibility proves historical observations, not current search volume, future ranking or recoverable revenue.",
  ];
  if (e.derived.blocking.length > 0) limitations.push(`${e.derived.blocking.length} of ${e.derived.total} pages that share this page's data are protected, observed or in flight.`);

  return opportunitySchema.parse({
    id: `opp:${e.kind}:${pathOf(e.url)}`,
    targetUrl: e.url,
    pageKind: e.kind,
    buyerIntent: buyerIntentOf(e, name),
    demand: { class: e.demandClass, historical: hist, recent: rec, dailyImpressionLoss: e.dailyImpressionLoss, declinePercent: e.declinePercent },
    indexation: indexationOf(e),
    protection: { verdict: e.protection.verdict, eligibleAfter: e.protection.eligibleAfter, reasons: e.protection.reasons.map((r) => `${r.source}: ${r.detail}`) },
    affiliate: partner,
    commercial: { opportunity: commercialText, limitations },
    recommendedAction: { kind: step.kind, summary: step.summary, handoffSkill: step.handoffSkill },
    confidence: confidenceOf(step.kind),
    evidenceSources: [
      "docs/growth/receipts/20261009-growth-agent-system/evidence/gsc-ui-capture-20261009 (Search Console, read-only)",
      "lib/growth-agents protection snapshot (repository registries and git)",
      "data/affiliate registries (partner facts, no URLs)",
    ],
    ownerDecision: { required: step.status === "OWNER_DECISION", question: step.status === "OWNER_DECISION" ? step.summary : null },
    measurement: {
      baseline: `${hist.impressions ?? "?"} impressions in ${windowText(hist)} (${hist.impressionsPerDay ?? "?"} per observed day) versus ${rec.impressions ?? "?"} in ${windowText(rec)}.`,
      metric: "Impressions and clicks for this exact URL in equivalent finalised Search Console windows; Google crawl and coverage state recorded separately.",
      // Only an existing observation window has an end date. A page that is free to edit has no review date until a change ships and Google recrawls it.
      firstReviewAfter: e.protection.eligibleAfter ?? null,
      clockStart: "The first observed Google recrawl after the change is released, never the deployment date.",
    },
    status: step.status,
    blockers: e.blockers.map((b) => ({ ...b })),
  });
}

function heldPageRows(google: GoogleRecoveryReport, bySlug: ReadonlyMap<string, PartnerRow>, limit: number): HeldPage[] {
  return google.candidates
    .filter((c) => c.protection.verdict === "PROTECTED" || c.protection.verdict === "IN_FLIGHT")
    .sort((a, b) => (b.historical.impressions ?? 0) - (a.historical.impressions ?? 0) || a.url.localeCompare(b.url))
    .slice(0, limit)
    .map((c) => ({
      url: c.url,
      historicalImpressions: c.historical.impressions,
      verdict: c.protection.verdict,
      why: c.protection.reasons[0] ? `${c.protection.reasons[0].source}: ${c.protection.reasons[0].detail}` : "protected",
      hasActivePartner: allRows(partnerExposureFor(c, bySlug)).length > 0,
    }));
}

function captureLimitation(via: string | null): string {
  if (via === "ui-table-capture") return "The Search Console data was read from the owner's signed-in session as tables, not as an export file; row counts and totals were cross-checked against the report headers.";
  if (via === "ui-export-csv") return "The Search Console data came from an export file the owner downloaded; the manifest records its window and filters.";
  if (via === "api") return "The Search Console data came from the Search Console API; the manifest records its window and filters.";
  return "No Search Console capture was read, so no performance statement is made.";
}

export function runDirector(inputs: DirectorInputs): DirectorReport {
  const { google, affiliate, guardian } = inputs;
  const generatedAt = inputs.now.toISOString();
  const bySlug = new Map(affiliate.partners.map((p) => [p.slug, p]));
  const size = inputs.shortlistSize ?? 5;
  const floor = google.config.minHistoricalImpressions;

  const queue: ActionItem[] = [];
  const ownerDecisions: OwnerDecision[] = [];
  const blockers: DirectorReport["blockers"] = [];

  const shortlistable = google.candidates
    .filter(isActionable)
    .map((e) => {
      const tier = tierOf(allRows(partnerExposureFor(e, bySlug)));
      return { e, tier, value: valueClass(e, tier, floor) };
    })
    .filter((x): x is { e: PageEvaluation; tier: PartnerTier; value: 0 | 1 } => x.value !== null)
    .sort(compareForShortlist);
  const chosen: typeof shortlistable = [];
  const overlapsSuppressed: DirectorReport["overlapsSuppressed"] = [];
  const ownerOfProduct = new Map<string, string>();
  for (const item of shortlistable) {
    const shared = item.e.softwareSlugs.filter((slug) => ownerOfProduct.has(slug));
    if (shared.length > 0) {
      overlapsSuppressed.push({ url: item.e.url, sharedWith: ownerOfProduct.get(shared[0]!)!, sharedProducts: shared });
      continue;
    }
    if (chosen.length >= size) continue;
    chosen.push(item);
    for (const slug of item.e.softwareSlugs) ownerOfProduct.set(slug, item.e.url);
  }
  const shortlist = chosen.map(({ e, tier }) => buildOpportunity(e, partnerExposureFor(e, bySlug), tier));

  const guardianBlocked = guardian ? guardian.verdict !== "RELEASE_ALLOWED" : true;
  if (guardian) {
    for (const reason of guardian.reasons) blockers.push({ id: `guardian:${blockers.length + 1}`, detail: reason.detail, resolvableBy: "OWNER_DECISION" });
  } else {
    blockers.push({ id: "guardian:not-run", detail: "The Release & Quality Guardian was not run, so release safety is NOT_VERIFIED.", resolvableBy: "AGENT_EVIDENCE" });
  }

  const post = google.indexation.postReleaseCrawl;
  if (post) {
    const noneYet = post.crawledAfterRelease === 0;
    queue.push({
      id: noneYet ? "measure:first-recrawl" : "measure:start-clocks",
      kind: noneYet ? "WAIT_FIRST_RECRAWL" : "START_REVIEW_CLOCKS",
      lane: "MEASUREMENT",
      title: noneYet ? "Wait for the first observed Google recrawl of the released pages" : "Start the 14/28-day review clocks for the recrawled pages",
      status: noneYet ? "WAITING" : "READY",
      targetUrl: null,
      summary: noneYet
        ? `${post.sampled} sampled URL(s) show no Google crawl on or after ${post.releaseDate} (newest sampled crawl ${post.newestCrawl ?? "unknown"}). The 14/28-day review clocks cannot start until a recrawl is observed.`
        : `${post.crawledAfterRelease} of ${post.sampled} sampled URL(s) were crawled on or after ${post.releaseDate}.`,
      requiresOwner: false,
      dependsOn: [],
      eligibleAfter: null,
      route: { skill: "miloosh-google-recovery-director", reason: "Measurement clocks start at the first observed recrawl." },
      evidence: ["page-indexing samples and URL inspections in the Search Console capture"],
      historicalImpressionsAtStake: null,
      params: { sampled: post.sampled, crawledAfterRelease: post.crawledAfterRelease, releaseDate: post.releaseDate, newestCrawl: post.newestCrawl },
    });
  }

  for (const opp of shortlist) {
    const kind: ActionKind =
      opp.recommendedAction.kind === "HANDOFF_TO_PAGE_UPGRADER" ? "HANDOFF_TO_PAGE_UPGRADER" : opp.recommendedAction.kind === "COLLECT_EVIDENCE" ? "COLLECT_EVIDENCE" : opp.recommendedAction.kind === "WAIT_FOR_OBSERVATION" ? "WAIT_FOR_OBSERVATION" : "OWNER_DECISION";
    queue.push({
      id: `google:${opp.id}`,
      kind,
      lane: "GOOGLE",
      title: `${opp.recommendedAction.kind.replace(/_/g, " ").toLowerCase()}: ${pathOf(opp.targetUrl)}`,
      status: opp.status === "READY" ? "READY" : opp.status === "WAITING" ? "WAITING" : opp.status === "OWNER_DECISION" ? "OWNER_DECISION" : opp.status === "NEEDS_DATA" ? "NEEDS_DATA" : "BLOCKED",
      targetUrl: opp.targetUrl,
      summary: opp.recommendedAction.summary,
      requiresOwner: opp.ownerDecision.required,
      dependsOn: kind === "HANDOFF_TO_PAGE_UPGRADER" ? ["guardian:release-gates"] : [],
      eligibleAfter: opp.protection.eligibleAfter,
      route: { skill: opp.recommendedAction.handoffSkill ?? "miloosh-project-manager", reason: "Routed by the recommended action's kind." },
      evidence: opp.evidenceSources,
      historicalImpressionsAtStake: opp.demand.historical.impressions,
      params: { url: opp.targetUrl, path: pathOf(opp.targetUrl), eligibleAfter: opp.protection.eligibleAfter },
    });
  }

  const rec = affiliate.recommendation;
  const topBlocker = affiliate.payoutBlockers[0];
  if (rec.kind !== "NO_ACTION") {
    const packTitle = topBlocker ? inputs.ownerPackTitles?.[topBlocker.ownerActionPackId] : undefined;
    queue.push({
      id: `affiliate:${rec.kind.toLowerCase()}:${rec.subject ?? "general"}`,
      kind: rec.kind as ActionKind,
      lane: "AFFILIATE",
      title: rec.kind === "OWNER_PAYOUT_ACTION" && topBlocker ? `Complete payout setup: ${topBlocker.railLabel}` : rec.summary.slice(0, 80),
      status: rec.requiresOwnerDecision ? "OWNER_DECISION" : "READY",
      targetUrl: null,
      summary: rec.summary + (packTitle ? ` Prepared owner action pack: "${packTitle}".` : ""),
      requiresOwner: rec.requiresOwnerDecision,
      dependsOn: [],
      eligibleAfter: null,
      route: { skill: "miloosh-project-manager", reason: "Account-level payout action; the owner executes it, nothing is sent or changed by an agent." },
      evidence: rec.evidence,
      historicalImpressionsAtStake: rec.kind === "OWNER_PAYOUT_ACTION" && topBlocker ? topBlocker.historicalImpressionsAtStake : null,
      params:
        rec.kind === "OWNER_PAYOUT_ACTION" && topBlocker
          ? { railLabel: topBlocker.railLabel, partners: topBlocker.partners.join(", "), impressions: topBlocker.historicalImpressionsAtStake, ownImpressions: topBlocker.ownPagesImpressions, otherCtaImpressions: topBlocker.viaOtherCtasImpressions, pages: topBlocker.pagesWithHistoricalDemand, packId: topBlocker.ownerActionPackId }
          : { subject: rec.subject },
    });
    if (rec.requiresOwnerDecision) {
      ownerDecisions.push({
        id: `owner:${rec.kind.toLowerCase()}:${rec.subject ?? "general"}`,
        kind: rec.kind === "OWNER_PAYOUT_ACTION" ? "PAYOUT_RAIL" : "REGISTRY_CONFLICT",
        question: rec.summary,
        why: "Payout readiness is account-level and cannot be inferred from an approved link.",
        evidence: rec.evidence,
        params:
          rec.kind === "OWNER_PAYOUT_ACTION" && topBlocker
            ? { railLabel: topBlocker.railLabel, partners: topBlocker.partners.join(", "), impressions: topBlocker.historicalImpressionsAtStake, ownImpressions: topBlocker.ownPagesImpressions, otherCtaImpressions: topBlocker.viaOtherCtasImpressions, pages: topBlocker.pagesWithHistoricalDemand, readiness: topBlocker.readiness }
            : { subject: rec.subject },
      });
    }
  }
  for (const extra of affiliate.payoutBlockers.slice(1)) {
    ownerDecisions.push({
      id: `owner:payout:${extra.railId}`,
      kind: "PAYOUT_RAIL",
      question: `Payout rail "${extra.railLabel}" (${extra.partners.join(", ")}) is ${extra.readiness}.`,
      why: `${extra.historicalImpressionsAtStake ?? "unmeasured"} historical impressions on ${extra.pagesWithHistoricalDemand} page(s) that list these partners.`,
      evidence: [`owner action pack ${extra.ownerActionPackId}`],
      params: { railLabel: extra.railLabel, partners: extra.partners.join(", "), impressions: extra.historicalImpressionsAtStake, ownImpressions: extra.ownPagesImpressions, otherCtaImpressions: extra.viaOtherCtasImpressions, pages: extra.pagesWithHistoricalDemand, readiness: extra.readiness },
    });
  }

  queue.push({
    id: "guardian:release-gates",
    kind: "RELEASE_GATES",
    lane: "GUARDIAN",
    title: guardian ? `Release gates are ${guardian.verdict.replace(/_/g, " ").toLowerCase()}` : "Run the Release & Quality Guardian",
    status: guardianBlocked ? "BLOCKED" : "READY",
    targetUrl: null,
    summary: guardian ? guardian.reasons.map((r) => r.detail).join(" ") || "All required gates passed." : "No gate result was supplied; release safety is NOT_VERIFIED.",
    requiresOwner: guardianBlocked,
    dependsOn: [],
    eligibleAfter: null,
    route: { skill: "miloosh-release-guardian", reason: "Gate failures are reported, never waived or bypassed." },
    evidence: guardian ? guardian.checks.filter((c) => c.status === "FAIL" || c.status === "NOT_RUN").map((c) => `${c.id}: ${c.detail}`) : [],
    historicalImpressionsAtStake: null,
    params: { verdict: guardian?.verdict ?? "NOT_RUN" },
  });
  if (guardian && guardian.verdict !== "RELEASE_ALLOWED") {
    ownerDecisions.push({
      id: "owner:release-gates",
      kind: "RELEASE_GATES",
      question: "Which of the unmerged fixes may be integrated so the release gates can pass? No agent merges, waives or bypasses a gate.",
      why: guardian.reasons.map((r) => r.detail).join(" "),
      evidence: guardian.checks.filter((c) => c.status === "FAIL").map((c) => `${c.id}: ${c.detail}`),
      params: { verdict: guardian.verdict },
    });
  }
  if ((inputs.elapsedExperimentRecords ?? 0) > 0) {
    ownerDecisions.push({
      id: "owner:close-elapsed-experiments",
      kind: "CLOSE_EXPERIMENTS",
      question: `${inputs.elapsedExperimentRecords} page(s) belong to experiment records that are still MEASURING although their declared window has ended. Close each as won, lost or inconclusive?`,
      why: "Until closed, the page stays protected and cannot be reviewed.",
      evidence: ["docs/work-revenue-experiment-receipt-*.json"],
      params: { count: inputs.elapsedExperimentRecords ?? 0 },
    });
  }
  for (const t of google.technicalTriage.slice(0, 4)) {
    blockers.push({ id: `triage:${pathOf(t.url)}`, detail: `${pathOf(t.url)} had ${t.historicalImpressions} historical impression(s) but is not published by the checked-out code; confirm what it returns today.`, resolvableBy: "AGENT_EVIDENCE" });
  }

  // Next action: fixed precedence, no scores.
  const rank = (item: ActionItem): number => {
    if (item.status === "READY" && !item.requiresOwner && item.lane !== "GUARDIAN") return 0;
    if (item.status === "OWNER_DECISION" && item.lane !== "GUARDIAN") return 1;
    if (item.status === "NEEDS_DATA") return 2;
    if (item.status === "WAITING") return 3;
    return 4;
  };
  const ordered = [...queue].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const da = a.historicalImpressionsAtStake ?? -1;
    const db = b.historicalImpressionsAtStake ?? -1;
    if (da !== db) return db - da;
    const wa = a.eligibleAfter ?? "9999-99-99";
    const wb = b.eligibleAfter ?? "9999-99-99";
    if (wa !== wb) return wa.localeCompare(wb);
    return a.id.localeCompare(b.id);
  });
  const first = ordered[0] ?? null;

  const verifiedCurrent = google.candidates.filter((c) => c.demandClass === "CURRENT_VERIFIED").length;
  const historicalOnly = google.candidates.filter((c) => c.demandClass === "HISTORICAL_ONLY" || c.demandClass === "CURRENT_TRACE").length;
  const nothingEditable = google.nextAction.kind === "WAIT_FOR_OBSERVATION" || google.shortlist.every((c) => !c.eligible);

  const sitemapRead = google.indexation.sitemap ? valueOf(google.indexation.sitemap) : null;
  const whyFirst: string[] = [];
  if (first) {
    whyFirst.push("Chosen by fixed precedence (agent-executable ready work, then owner decisions, then evidence gaps, then waiting items); ties by measured historical demand, then date, then id.");
    if (first.lane === "AFFILIATE") whyFirst.push("It is the only action that can change the outcome path now without touching a measured page or waiting on Google.");
    if (first.historicalImpressionsAtStake !== null) whyFirst.push(`${first.historicalImpressionsAtStake} historical impressions sit on the pages it concerns (demand evidence, not a revenue forecast).`);
    if (nothingEditable) whyFirst.push("No ranked page can be edited without confounding a running observation window or a protected experiment, so a content change is not the most defensible action.");
  }

  return {
    schemaVersion: GROWTH_AGENT_SCHEMA_VERSION,
    generatedAt,
    checkoutSha: inputs.checkoutSha,
    branch: inputs.branch,
    mode: "READ_ONLY",
    question: "What is the single most valuable, defensible action Miloosh should take next to acquire commercially relevant visitors and improve the chance of affiliate revenue?",
    answer: {
      actionId: first?.id ?? null,
      kind: first?.kind ?? null,
      summary: first ? `${first.title}. ${first.summary}` : "No action could be derived from the evidence supplied.",
      contentEditsAllowedNow: !nothingEditable,
      whyThisFirst: whyFirst,
      whatNotToDo: [
        "Do not edit any page inside an observation window or a protected experiment.",
        sitemapRead
          ? `Do not request indexing or resubmit the sitemap: Google read the sitemap on ${sitemapRead.lastRead} and the owner's indexing quality gate forbids mass requests.`
          : "Do not request indexing in batches or resubmit the sitemap repeatedly: the owner's indexing quality gate forbids mass requests.",
        "Do not deploy, merge or waive any release gate; the Guardian reports them, the owner decides.",
        "Do not treat historical impressions as current demand or as revenue.",
      ],
    },
    evidenceBasis: {
      gscCapturedAt: google.windows.capturedAt,
      gscDataThrough: google.windows.dataThrough,
      gscCapturedVia: google.windows.capturedVia,
      historicalWindow: google.windows.historical ? `${google.windows.historical.window.start}..${google.windows.historical.window.end}` : null,
      recentWindow: google.windows.recent ? `${google.windows.recent.window.start}..${google.windows.recent.window.end}` : null,
      production: inputs.production,
    },
    demandSummary: {
      verifiedCurrentDemandPages: verifiedCurrent,
      historicalDemandPages: historicalOnly,
      hypotheticalDemandPages: 0,
      note: verifiedCurrent === 0 ? "No ranked page has verified current demand; every ranked page's demand is historical." : `${verifiedCurrent} ranked page(s) have verified current demand.`,
    },
    shortlist,
    shortlistRule: SHORTLIST_RULE,
    overlapsSuppressed: overlapsSuppressed.slice(0, 20),
    heldPages: heldPageRows(google, bySlug, 10),
    queue: ordered,
    ownerDecisions,
    blockers,
    limitations: [
      captureLimitation(google.windows.capturedVia),
      "Search Console reports do not show a final-data date; the three-day finalisation rule is an assumption shared with the repository's own helper.",
      google.cannibalization.pageQueryTablesCaptured > 0
        ? `Queries were captured for ${google.cannibalization.pageQueryTablesCaptured} page(s) only, so cannibalization stays NOT_MEASURED site-wide; no keyword difficulty or Domain Rating was available, so no low-competition claim is made.`
        : "Page-by-query rows were not captured, so cannibalization is NOT_MEASURED; no keyword difficulty or Domain Rating was available, so no low-competition claim is made.",
      "Conversions, commissions and received payouts have no data source in this repository and are NOT_MEASURED.",
      ...(valueOf(affiliate.funnel) ? [] : ["The first-party funnel could not be read in this run, so human sessions and qualified partner clicks are UNAVAILABLE, not zero."]),
    ],
  };
}
