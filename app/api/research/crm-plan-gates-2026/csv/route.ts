import { NextResponse } from "next/server";
import { buildCrmPlanGateDataset } from "@/lib/crm-plan-gates/build";
import type { CrmPlanGateRow } from "@/lib/crm-plan-gates/data";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS: Array<{ key: keyof CrmPlanGateRow; label: string }> = [
  { key: "key", label: "key" },
  { key: "vendor", label: "vendor" },
  { key: "entryPlanName", label: "entry_plan_name" },
  { key: "entryPlanPrice", label: "entry_plan_price" },
  { key: "emailSyncGate", label: "email_sync_gate" },
  { key: "emailSyncOnEntryPlan", label: "email_sync_on_entry_plan" },
  { key: "automationGate", label: "automation_gate" },
  { key: "automationOnEntryPlan", label: "automation_on_entry_plan" },
  { key: "sequencesGate", label: "sequences_gate" },
  { key: "sequencesOnEntryPlan", label: "sequences_on_entry_plan" },
  { key: "pipelineLimits", label: "pipeline_limits" },
  { key: "pipelinesUncapped", label: "pipelines_uncapped" },
  { key: "minimumSeats", label: "minimum_seats" },
  { key: "minimumSeatsStatus", label: "minimum_seats_status" },
  { key: "contactScaling", label: "contact_scaling" },
  { key: "annualBillingRequired", label: "annual_billing_required" },
  { key: "hasFreeTier", label: "has_free_tier" },
  { key: "hasFreeTrial", label: "has_free_trial" },
  { key: "trialDays", label: "trial_days" },
  { key: "confidence", label: "confidence" },
  { key: "officialPricingUrl", label: "official_pricing_url" },
];

/** CSV twin of the JSON dataset route -- same rows, spreadsheet-friendly. */
export async function GET() {
  const dataset = buildCrmPlanGateDataset();
  const header = COLUMNS.map((c) => csvCell(c.label)).join(",");
  const lines = dataset.rows.map((row) => COLUMNS.map((c) => csvCell(row[c.key])).join(","));
  const csv = [header, ...lines].join("\n") + "\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="crm-plan-gates-dataset-2026.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
