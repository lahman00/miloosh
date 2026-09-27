import { NextResponse } from "next/server";
import { buildCmsDecisionMatrix } from "@/lib/cms-decision-matrix/build";

/** Public dataset export for the CMS Buying Decision Matrix 2026. */
export async function GET() {
  const matrix = buildCmsDecisionMatrix();
  return NextResponse.json(
    {
      dataset: "CMS Buying Decision Matrix 2026",
      publisher: "Miloosh",
      generatedAt: matrix.generatedAt,
      sampleSize: matrix.sampleSize,
      inclusionRule: matrix.inclusionRule,
      rows: matrix.rows,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
