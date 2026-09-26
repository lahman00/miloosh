import { CRM_PLAN_GATES, type CrmPlanGateRow } from "./data";

/**
 * CRM Plan-Gate Dataset 2026 -- aggregate, non-ranking statistics only.
 * Every count below answers "how many vendors gate X behind an upgrade
 * from their entry paid plan," never "which vendor is better." No score,
 * no weighting, no recommended pick.
 */
export interface CrmPlanGateStat {
  label: string;
  trueCount: number;
  falseCount: number;
  unknownCount: number;
  trueVendors: string[];
}

export interface CrmPlanGateDataset {
  generatedAt: string;
  sampleSize: number;
  inclusionRule: string;
  rows: CrmPlanGateRow[];
  stats: CrmPlanGateStat[];
  hasFreeTierCount: number;
  annualBillingRequiredCount: number;
  confirmedMinimumSeatVendors: string[];
  confirmedNoMinimumSeatVendors: string[];
}

function boolStat(label: string, rows: CrmPlanGateRow[], pick: (r: CrmPlanGateRow) => boolean | null): CrmPlanGateStat {
  const trueVendors = rows.filter((r) => pick(r) === true).map((r) => r.vendor);
  const falseCount = rows.filter((r) => pick(r) === false).length;
  const unknownCount = rows.filter((r) => pick(r) === null).length;
  return { label, trueCount: trueVendors.length, falseCount, unknownCount, trueVendors };
}

export function buildCrmPlanGateDataset(rows: CrmPlanGateRow[] = CRM_PLAN_GATES): CrmPlanGateDataset {
  const stats: CrmPlanGateStat[] = [
    boolStat("Two-way email sync included on the entry (or free) plan", rows, (r) => r.emailSyncOnEntryPlan),
    boolStat("Workflow automation included on the entry paid plan", rows, (r) => r.automationOnEntryPlan),
    boolStat("Sales sequences/cadences included on the entry paid plan", rows, (r) => r.sequencesOnEntryPlan),
    boolStat("No disclosed cap on the number of pipelines", rows, (r) => r.pipelinesUncapped),
  ];

  return {
    generatedAt: new Date().toISOString(),
    sampleSize: rows.length,
    inclusionRule: "The 7 CRM vendors named in the mission brief (Pipedrive, Close, HubSpot, Zoho CRM, Freshsales, Salesforce, monday CRM) -- not a hand-picked-to-fit-a-conclusion list, and not exhaustive of the CRM category.",
    rows,
    stats,
    hasFreeTierCount: rows.filter((r) => r.hasFreeTier === true).length,
    annualBillingRequiredCount: rows.filter((r) => r.annualBillingRequired === true).length,
    confirmedMinimumSeatVendors: rows.filter((r) => r.minimumSeatsStatus === "confirmed_minimum").map((r) => r.vendor),
    confirmedNoMinimumSeatVendors: rows.filter((r) => r.minimumSeatsStatus === "confirmed_none").map((r) => r.vendor),
  };
}
