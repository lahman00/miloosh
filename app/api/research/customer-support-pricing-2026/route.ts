import { NextResponse } from "next/server";
import { buildSupportPricingBenchmark } from "@/lib/support-pricing-benchmark/build";

/**
 * Public dataset export for the Customer Support Pricing Benchmark 2026
 * (docs/growth/receipts/20260926-citable-research). Only fields already
 * visible on the research page itself -- no internal-only data. Exists so
 * a journalist, researcher, or another site can verify or reuse the
 * underlying observations without re-typing the on-page table.
 */
export async function GET() {
  const benchmark = buildSupportPricingBenchmark();
  return NextResponse.json(
    {
      dataset: "Customer Support Pricing Benchmark 2026",
      publisher: "Miloosh",
      generatedAt: benchmark.generatedAt,
      sampleSize: benchmark.sampleSize,
      inclusionRule: benchmark.inclusionRule,
      rows: benchmark.rows,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
