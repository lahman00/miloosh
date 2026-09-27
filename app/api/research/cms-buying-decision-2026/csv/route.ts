import { NextResponse } from "next/server";
import { buildCmsDecisionMatrix } from "@/lib/cms-decision-matrix/build";
import type { CmsRow } from "@/lib/cms-decision-matrix/build";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS: Array<{ key: keyof CmsRow; label: string }> = [
  { key: "slug", label: "slug" },
  { key: "name", label: "name" },
  { key: "recordedStartingPrice", label: "starting_price" },
  { key: "hasFreeTier", label: "has_free_tier" },
  { key: "hostedOrSelfHosted", label: "hosted_or_self_hosted" },
  { key: "documentsImportIntoProduct", label: "documents_import_in" },
  { key: "importNote", label: "import_scope_and_limits" },
  { key: "documentsExportOutOfProduct", label: "documents_export_out" },
  { key: "exportNote", label: "export_scope_and_limits" },
  { key: "commercialSupportAvailable", label: "official_commercial_support" },
  { key: "commercialSupportNote", label: "support_evidence_limits" },
  { key: "officialSource", label: "official_source" },
];

/** CSV twin of the JSON dataset route -- same rows, spreadsheet-friendly. */
export async function GET() {
  const matrix = buildCmsDecisionMatrix();
  const header = COLUMNS.map((c) => csvCell(c.label)).join(",");
  const lines = matrix.rows.map((row) => COLUMNS.map((c) => csvCell(row[c.key])).join(","));
  const csv = [header, ...lines].join("\n") + "\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cms-buying-decision-matrix-2026.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
