import { NextResponse } from "next/server";
import { buildSupportPricingBenchmark, type SupportPricingRow } from "@/lib/support-pricing-benchmark/build";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS: Array<{ key: keyof SupportPricingRow | "aiDisclosed" | "aiUnitPrice" | "aiUnit"; label: string }> = [
  { key: "slug", label: "slug" },
  { key: "name", label: "name" },
  { key: "status", label: "pricing_status" },
  { key: "model", label: "pricing_model" },
  { key: "entryPerSeat", label: "entry_per_seat" },
  { key: "entryAmount", label: "entry_amount" },
  { key: "entryCurrency", label: "entry_currency" },
  { key: "entryBillingPeriod", label: "entry_billing_period" },
  { key: "recordedStartingPrice", label: "recorded_starting_price" },
  { key: "aiDisclosed", label: "ai_usage_price_disclosed" },
  { key: "aiUnitPrice", label: "ai_usage_unit_price_usd" },
  { key: "aiUnit", label: "ai_usage_unit" },
  { key: "hasFreeTier", label: "has_free_tier" },
  { key: "hasFreeTrial", label: "has_free_trial" },
  { key: "enterpriseContactSales", label: "enterprise_contact_sales" },
  { key: "lastVerified", label: "last_verified" },
  { key: "officialSource", label: "official_source" },
];

/** CSV twin of the JSON dataset route -- same rows, spreadsheet-friendly. */
export async function GET() {
  const benchmark = buildSupportPricingBenchmark();
  const header = COLUMNS.map((c) => csvCell(c.label)).join(",");
  const lines = benchmark.rows.map((row) => {
    const record: Record<string, unknown> = {
      ...row,
      aiDisclosed: row.aiUsagePricing.disclosed,
      aiUnitPrice: row.aiUsagePricing.unitPrice,
      aiUnit: row.aiUsagePricing.unit,
    };
    return COLUMNS.map((c) => csvCell(record[c.key])).join(",");
  });
  const csv = [header, ...lines].join("\n") + "\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customer-support-pricing-benchmark-2026.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
