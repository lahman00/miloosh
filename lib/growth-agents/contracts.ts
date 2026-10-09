import { z } from "zod";

/**
 * Versioned output contracts of the growth agents.
 *
 * Every report the CLI writes is parsed against these schemas first, so a
 * consumer (a skill, a dashboard, a later agent) can rely on field names and
 * on the status vocabularies below. Bump GROWTH_AGENT_SCHEMA_VERSION when a
 * field changes meaning, never silently.
 */

export const GROWTH_AGENT_SCHEMA_VERSION = 1 as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const url = z.string().url();

export const provenanceSchema = z.object({
  source: z.string().min(1),
  locator: z.string().min(1),
  capturedAt: z.string().min(1),
  caveat: z.string().optional(),
});

/** Why an opportunity cannot be executed yet, and what would unblock it. */
export const blockerSchema = z.object({
  code: z.enum([
    "PROTECTED_EXPERIMENT",
    "OBSERVATION_WINDOW_ACTIVE",
    "IN_FLIGHT_WORK",
    "PROTECTION_UNKNOWN",
    "DERIVED_PAGE_BLOCKED",
    "NOT_PUBLISHED_BY_CODE",
    "RECENT_DEMAND_NOT_VERIFIED",
    "NO_MEASURED_HISTORICAL_DEMAND",
    "NO_POSITIVE_DEMAND_LOSS",
    "LIVE_TECHNICAL_NOT_CHECKED",
    "LIVE_TECHNICAL_DEFECT",
    "GOOGLE_COVERAGE_NOT_CHECKED",
    "BUYER_INTENT_NOT_CONFIRMED",
    "CONTENT_GAP_NOT_CONFIRMED",
    "MONETIZATION_NOT_VERIFIED",
    "NO_ACTIVE_PARTNER",
    "RELEASE_GATE_FAILING",
  ]),
  detail: z.string().min(1),
  /** Who or what can clear it. */
  resolvableBy: z.enum(["WAIT_UNTIL", "OWNER_DECISION", "AGENT_EVIDENCE", "CODE_CHANGE", "NOT_RESOLVABLE"]),
  eligibleAfter: isoDate.optional(),
  /** The smallest input that would clear an AGENT_EVIDENCE blocker. */
  nextInput: z.string().optional(),
});

export const demandClassSchema = z.enum(["CURRENT_VERIFIED", "CURRENT_TRACE", "HISTORICAL_ONLY", "NO_MEASURED_DEMAND", "UNKNOWN"]);

export const measuredWindowSchema = z.object({
  state: z.enum(["MEASURED", "ZERO_BY_COMPLETE_TABLE", "ZERO_BY_EXACT_PAGE_CHECK", "NOT_OBSERVED", "UNAVAILABLE"]),
  impressions: z.number().int().nonnegative().nullable(),
  clicks: z.number().int().nonnegative().nullable(),
  position: z.number().positive().nullable(),
  window: z.object({ start: isoDate, end: isoDate }).nullable(),
  /** Impressions divided by the days the property had data in the window (historical) or the window length (recent). */
  impressionsPerDay: z.number().nonnegative().nullable(),
  note: z.string().optional(),
});

export const opportunitySchema = z.object({
  id: z.string().min(1),
  targetUrl: url,
  pageKind: z.enum(["home", "software", "compare", "category", "guide", "legal", "other"]),
  buyerIntent: z.object({
    summary: z.string().min(1),
    basis: z.enum(["QUERY_EVIDENCE", "PAGE_TYPE", "NOT_VERIFIED"]),
  }),
  demand: z.object({
    class: demandClassSchema,
    historical: measuredWindowSchema,
    recent: measuredWindowSchema,
    dailyImpressionLoss: z.number().nullable(),
    declinePercent: z.number().nullable(),
  }),
  indexation: z.object({
    state: z.enum(["INDEXED", "NOT_INDEXED_CRAWLED", "NOT_INDEXED_DISCOVERED", "NOT_VERIFIED"]),
    lastCrawled: isoDate.nullable(),
    inSitemapPerCode: z.boolean().nullable(),
    qualityGateReady: z.boolean().nullable(),
    qualityGateReasons: z.array(z.string()),
    evidence: z.string().min(1),
  }),
  protection: z.object({
    verdict: z.enum(["EDITABLE", "PROTECTED", "OBSERVATION_WINDOW", "IN_FLIGHT", "UNKNOWN"]),
    eligibleAfter: isoDate.nullable(),
    reasons: z.array(z.string()),
  }),
  affiliate: z.object({
    relationship: z.enum(["ACTIVE_PARTNER", "NO_ACTIVE_PARTNER", "NOT_APPLICABLE", "NOT_VERIFIED"]),
    /** Every active partner whose call to action appears on the page: the page's own product(s) and other products it shows a call to action for. */
    partnerSlugs: z.array(z.string()),
    /** The subset of `partnerSlugs` that appears only because the page shows a call to action for that other product (decision guide or buyer checklist). */
    otherCtaPartnerSlugs: z.array(z.string()),
    issuedLink: z.enum(["PRESENT", "MISSING", "NOT_APPLICABLE"]),
    payoutReadiness: z.enum(["ALL_VERIFIED", "SOME_UNVERIFIED", "NONE_VERIFIED", "NOT_APPLICABLE"]),
    note: z.string(),
  }),
  commercial: z.object({
    opportunity: z.string().min(1),
    limitations: z.array(z.string().min(1)).min(1),
  }),
  recommendedAction: z.object({
    kind: z.enum([
      "HANDOFF_TO_PAGE_UPGRADER",
      "COLLECT_EVIDENCE",
      "WAIT_FOR_OBSERVATION",
      "OWNER_DECISION",
      "TECHNICAL_TRIAGE",
      "NO_ACTION",
    ]),
    summary: z.string().min(1),
    handoffSkill: z.string().nullable(),
  }),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  evidenceSources: z.array(z.string().min(1)).min(1),
  ownerDecision: z.object({ required: z.boolean(), question: z.string().nullable() }),
  measurement: z.object({
    baseline: z.string().min(1),
    metric: z.string().min(1),
    firstReviewAfter: isoDate.nullable(),
    clockStart: z.string().min(1),
  }),
  status: z.enum(["READY", "BLOCKED", "NEEDS_DATA", "WAITING", "OWNER_DECISION"]),
  blockers: z.array(blockerSchema),
});

export type Blocker = z.infer<typeof blockerSchema>;
export type DemandClass = z.infer<typeof demandClassSchema>;
export type MeasuredWindowView = z.infer<typeof measuredWindowSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
