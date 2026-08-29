export type MonetizationStatusGroup =
  | "A" // active affiliate — already monetizable
  | "B" // affiliate program verified — application pending
  | "C" // affiliate program verified — ready to apply
  | "D" // affiliate program verified — owner blocker
  | "E" // program existence uncertain or unresearched
  | "F" // verified no viable program
  | "G"; // research stale and needs re-verification

export type GraphNodeDegree = {
  slug: string;
  name: string;
  category: string;
  degree: number;
  isActiveAffiliate: boolean;
  affiliateProgramStatus: "yes" | "no" | "unknown" | "unresearched";
};

export type MissingComparisonCandidate = {
  pair: string;
  slugA: string;
  slugB: string;
  nameA: string;
  nameB: string;
  categoryA: string;
  categoryB: string;
  sameCategory: boolean;
  score: number;
  demandScore: number;
  affiliateScore: number;
  categoryScore: number;
  isolationScore: number;
  minDegree: number;
  isDualMonetized: boolean;
  isSingleMonetized: boolean;
  /** Heuristic traffic-priority signal, NOT a verified GSC measurement -- see lib/growth-audit/comparison-graph.ts. */
  heuristicSignalA: number;
  heuristicSignalB: number;
  reason: string;
};

export type MonetizationGapRow = {
  slug: string;
  name: string;
  category: string;
  statusGroup: MonetizationStatusGroup;
  impressions: number;
  comparisonsCount: number;
  monetizationGapScore: number;
  demandScore: number;
  intentScore: number;
  actionScore: number;
  compScore: number;
  notes: string;
};

export type CategoryMoneyMapRow = {
  slug: string;
  name: string;
  productCount: number;
  comparisonCount: number;
  comparisonDensityPct: number;
  impressions: number;
  clicks: number;
  ctrPct: number;
  avgPosition: number | null;
  activeAffiliatesCount: number;
  pendingAffiliatesCount: number;
  viableAffiliatesCount: number;
  affiliateCoveragePct: number;
  currentValueScore: number;
  untappedValueScore: number;
};

export type InternalLinkAuditRow = {
  url: string;
  type: "software" | "category" | "comparison" | "other";
  inboundCount: number;
  isActiveAffiliate: boolean;
  /** Heuristic traffic-priority signal, NOT a verified GSC measurement -- see lib/growth-audit/comparison-graph.ts. */
  heuristicSignal: number;
};

export type OpportunityType =
  | "SEO improvement"
  | "new comparison"
  | "new software page"
  | "affiliate application candidate"
  | "internal linking"
  | "category improvement"
  | "programmatic SEO"
  | "technical SEO"
  | "conversion optimization";

export type MasterOpportunityRow = {
  rank: number;
  opportunity: string;
  type: OpportunityType;
  target: string;
  evidence: string;
  gscImpressions: number | null;
  currentPosition: number | null;
  affiliateStatus: "ACTIVE" | "PENDING" | "VIABLE" | "OWNER_BLOCKED" | "UNCERTAIN" | "NONE";
  commercialIntent: "High" | "Medium" | "Low";
  implementationEffort: "Low" | "Medium" | "High";
  risk: "Low" | "Medium" | "High";
  confidence: "High" | "Medium" | "Low";
  opportunityScore: number;
  recommendedAction: string;
};
