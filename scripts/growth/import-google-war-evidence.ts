import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { importPageTable, importInspectionUi } from "@/lib/google-war/evidence";

// Explicit one-time import; never discovers credentials, calls Google or logs raw UI text.
const file = process.argv[2];
const start = process.argv[4],
  end = process.argv[5];
if (!file || !start || !end)
  throw new Error(
    "Usage: import-google-war-evidence.ts PAGE_JSON INSPECTION_JSON START_DATE END_DATE. Dates must match the authenticated export.",
  );
const raw = fs.readFileSync(file, "utf8");
const source = `Authenticated GSC UI page export; ${path.basename(file)}; sha256:${createHash("sha256").update(raw).digest("hex")}`;
const snapshot = importPageTable(JSON.parse(raw), { start, end }, source);
const inspectionFile = process.argv[3];
const inspections = inspectionFile
  ? JSON.parse(fs.readFileSync(inspectionFile, "utf8")).map(
      (r: { url: string; capturedAt: string; text: string }) =>
        importInspectionUi(
          r,
          `Authenticated UI export: ${path.basename(inspectionFile)}; panel-scoped normalization; crawl time is displayed text with UNKNOWN timezone`,
        ),
    )
  : [];
fs.mkdirSync("data/growth/google-war", { recursive: true });
fs.writeFileSync(
  "data/growth/google-war/search-snapshot.json",
  JSON.stringify(snapshot, null, 2) + "\n",
  { flag: "wx" },
);
fs.writeFileSync(
  "data/growth/google-war/inspections.json",
  JSON.stringify(inspections, null, 2) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    rows: snapshot.rows.length,
    capturedAt: snapshot.capturedAt,
    inspections: inspections.length,
  }),
);
