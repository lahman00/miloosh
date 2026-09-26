import { NextResponse } from "next/server";
import { buildCrmPlanGateDataset } from "@/lib/crm-plan-gates/build";

/**
 * Public dataset export for the CRM Plan-Gate Dataset 2026
 * (docs/growth/receipts/20260927-research-night). Only fields already
 * visible on the research page itself -- no internal-only data.
 */
export async function GET() {
  const dataset = buildCrmPlanGateDataset();
  return NextResponse.json(
    {
      dataset: "CRM Plan-Gate Dataset 2026",
      publisher: "Miloosh",
      generatedAt: dataset.generatedAt,
      sampleSize: dataset.sampleSize,
      inclusionRule: dataset.inclusionRule,
      rows: dataset.rows,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
