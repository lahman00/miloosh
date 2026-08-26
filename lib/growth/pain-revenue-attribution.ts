export type PainRevenueIntegrationState =
  | "NOT_CONNECTED"
  | "CONNECTED_NO_EVENTS"
  | "VERIFIED_EVENTS";

export type PainRevenueEventStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED";
export type PainRevenueEvidenceSource = "PARTNER_API" | "NETWORK_EXPORT" | "MANUAL_FIRST_PARTY";

export type PainRevenueEvent = {
  id: string;
  painCandidateId: string;
  partnerSlug: string;
  sourcePage: string;
  network: string;
  conversionAt: string;
  observedAt: string;
  status: PainRevenueEventStatus;
  commission?: {
    amount: number;
    currency: string;
  };
  evidence: {
    source: PainRevenueEvidenceSource;
    reference: string;
    verifiedAt: string;
  };
};

/**
 * Revenue attribution is deliberately explicit about connection state.
 * An absent value means Miloosh has no verified network integration for
 * this PainCandidate. CONNECTED_NO_EVENTS means a real integration/export
 * was checked but produced no verified events. VERIFIED_EVENTS is derived
 * only when at least one structurally valid, evidenced event is present.
 */
export type PainRevenueAttribution = {
  integrationState: PainRevenueIntegrationState;
  events: PainRevenueEvent[];
};

export type PainCommissionTotal = {
  currency: string;
  amount: number;
};

export type PainRevenueSummary = {
  integrationState: PainRevenueIntegrationState;
  verifiedConversions: number;
  approvedCommissionByCurrency: PainCommissionTotal[];
  pendingCommissionEvents: number;
  rejectedEvents: number;
  validEventCount: number;
};

function isIsoTimestamp(value: string): boolean {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isNonEmpty(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValidCommission(event: PainRevenueEvent): boolean {
  const commission = event.commission;
  return Boolean(
    commission &&
      Number.isFinite(commission.amount) &&
      commission.amount > 0 &&
      /^[A-Z]{3}$/.test(commission.currency),
  );
}

export function isVerifiedPainRevenueEvent(
  event: PainRevenueEvent,
  expectedPainCandidateId?: string,
): boolean {
  if (!isNonEmpty(event.id)) return false;
  if (!isNonEmpty(event.painCandidateId)) return false;
  if (expectedPainCandidateId && event.painCandidateId !== expectedPainCandidateId) return false;
  if (!isNonEmpty(event.partnerSlug)) return false;
  if (!event.sourcePage.startsWith("/")) return false;
  if (!isNonEmpty(event.network)) return false;
  if (!isIsoTimestamp(event.conversionAt) || !isIsoTimestamp(event.observedAt)) return false;
  if (!isNonEmpty(event.evidence.reference)) return false;
  if (!isIsoTimestamp(event.evidence.verifiedAt)) return false;
  if (event.commission && !hasValidCommission(event)) return false;
  return true;
}

export function summarizePainRevenueAttribution(
  attribution: PainRevenueAttribution | undefined,
  expectedPainCandidateId?: string,
): PainRevenueSummary {
  if (!attribution || attribution.integrationState === "NOT_CONNECTED") {
    return {
      integrationState: "NOT_CONNECTED",
      verifiedConversions: 0,
      approvedCommissionByCurrency: [],
      pendingCommissionEvents: 0,
      rejectedEvents: 0,
      validEventCount: 0,
    };
  }

  const uniqueEvents = new Map<string, PainRevenueEvent>();
  for (const event of attribution.events) {
    if (!isVerifiedPainRevenueEvent(event, expectedPainCandidateId)) continue;
    if (!uniqueEvents.has(event.id)) uniqueEvents.set(event.id, event);
  }

  const events = [...uniqueEvents.values()];
  if (events.length === 0) {
    return {
      integrationState: "CONNECTED_NO_EVENTS",
      verifiedConversions: 0,
      approvedCommissionByCurrency: [],
      pendingCommissionEvents: 0,
      rejectedEvents: 0,
      validEventCount: 0,
    };
  }

  const commissionByCurrency = new Map<string, number>();
  let verifiedConversions = 0;
  let pendingCommissionEvents = 0;
  let rejectedEvents = 0;

  for (const event of events) {
    if (event.status === "REJECTED") {
      rejectedEvents += 1;
      continue;
    }

    verifiedConversions += 1;

    if (event.status === "PENDING") {
      if (hasValidCommission(event)) pendingCommissionEvents += 1;
      continue;
    }

    if ((event.status === "APPROVED" || event.status === "PAID") && hasValidCommission(event)) {
      const commission = event.commission!;
      commissionByCurrency.set(
        commission.currency,
        (commissionByCurrency.get(commission.currency) ?? 0) + commission.amount,
      );
    }
  }

  return {
    integrationState: "VERIFIED_EVENTS",
    verifiedConversions,
    approvedCommissionByCurrency: [...commissionByCurrency.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => a.currency.localeCompare(b.currency)),
    pendingCommissionEvents,
    rejectedEvents,
    validEventCount: events.length,
  };
}

export function mergePainCommissionTotals(
  totals: PainCommissionTotal[][],
): PainCommissionTotal[] {
  const merged = new Map<string, number>();
  for (const rows of totals) {
    for (const row of rows) {
      merged.set(row.currency, (merged.get(row.currency) ?? 0) + row.amount);
    }
  }
  return [...merged.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
