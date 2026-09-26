import { z } from "zod";

const metric = z.number().finite().nonnegative().nullable();
export const searchSnapshotSchema = z
  .object({
    capturedAt: z.string().datetime({ offset: true }),
    source: z.string().min(1),
    window: z
      .object({ start: z.iso.date(), end: z.iso.date() })
      .refine((w) => w.start <= w.end, "Reversed search window"),
    rows: z.array(
      z.object({
        url: z.string().url(),
        clicks: metric,
        impressions: metric,
        ctr: z.number().min(0).max(1).nullable(),
        position: metric,
      }),
    ),
  })
  .refine(
    (s) => new Set(s.rows.map((r) => r.url)).size === s.rows.length,
    "Duplicate page rows",
  );
export type SearchSnapshot = z.infer<typeof searchSnapshotSchema>;
export const inspectionSchema = z.object({
  url: z.string().url(),
  checkedAt: z.string().datetime({ offset: true }),
  source: z.string().min(1),
  verdict: z.string().nullable(),
  coverageState: z.string().nullable(),
  lastCrawlTime: z.string().nullable(),
  googleCanonical: z.string().nullable(),
  userCanonical: z.string().nullable(),
  pageFetchState: z.string().nullable(),
  robotsTxtState: z.string().nullable(),
  indexingState: z.string().nullable(),
});
export type Inspection = z.infer<typeof inspectionSchema>;
export type IndexState =
  | "INDEXED"
  | "CRAWLED_NOT_INDEXED"
  | "DISCOVERED_NOT_INDEXED"
  | "NOT_INDEXED_OTHER"
  | "UNKNOWN";

/** Narrow importer for the supplied Hebrew UI captures, including stale panels. */
export function importInspectionUi(
  row: { url: string; capturedAt: string; text: string },
  source: string,
): Inspection {
  const start = row.text.lastIndexOf(`${row.url}\nבדיקת כתובת אתר`);
  if (start === -1)
    throw new Error("Inspection panel does not identify the requested URL");
  const panel = row.text.slice(start);
  const self =
    /קנונית לפי בחירת Google\s*(?:\s*)?כתובת האתר שנמצאת בבדיקה/.test(panel);
  return inspectionSchema.parse({
    url: row.url,
    checkedAt: row.capturedAt,
    source,
    verdict: null,
    coverageState: /נסרק.*לא נכלל באינדקס/.test(panel)
      ? "Crawled - currently not indexed"
      : null,
    // Preserve the displayed value. The capture does not establish a timezone.
    lastCrawlTime: panel.match(/סריקה אחרונה\s*\n([^\n]+)/)?.[1] ?? null,
    userCanonical:
      panel.match(/קנונית על פי הצהרת המשתמש\s*\n(https:\/\/\S+)/)?.[1] ?? null,
    googleCanonical: self ? row.url : null,
    pageFetchState: /אחזור דף\s*\nמצליח/.test(panel) ? "SUCCESSFUL" : null,
    robotsTxtState: /מותר לבצע סריקה\?\s*\nכן/.test(panel) ? "ALLOWED" : null,
    indexingState: /מותר ליצור אינדקס\?\s*\nכן/.test(panel)
      ? "INDEXING_ALLOWED"
      : null,
  });
}

/** Exact property URLs stay separate: never sum www/apex or query variants. */
export function canonicalPath(url: string): string | null {
  try {
    const u = new URL(url);
    return u.origin === "https://miloosh.com" &&
      !u.search &&
      !u.hash &&
      (u.pathname === "/" || !u.pathname.endsWith("/"))
      ? u.pathname
      : null;
  } catch {
    return null;
  }
}

export function indexState(inspection: Inspection | null): IndexState {
  if (!inspection) return "UNKNOWN";
  const coverage = inspection.coverageState?.toLowerCase() ?? "";
  if (
    /crawled.*(?:not indexed|not currently indexed)/.test(coverage) ||
    /נסרק.*לא נכלל באינדקס/.test(coverage)
  )
    return "CRAWLED_NOT_INDEXED";
  if (/discovered.*not indexed/.test(coverage)) return "DISCOVERED_NOT_INDEXED";
  if (inspection.verdict === "PASS") return "INDEXED";
  return inspection.verdict &&
    !["UNKNOWN", "VERDICT_UNSPECIFIED", "NEUTRAL"].includes(inspection.verdict)
    ? "NOT_INDEXED_OTHER"
    : "UNKNOWN";
}

/** Normalizes an authenticated UI export; no query-to-page inference. */
export function importPageTable(
  raw: unknown,
  window: SearchSnapshot["window"],
  source: string,
): SearchSnapshot {
  const input = z
    .object({ capturedAt: z.string(), rows: z.array(z.array(z.string())) })
    .parse(raw);
  const number = (value: string | undefined) => {
    if (!value || !/^[\d,.]+%?$/.test(value.trim())) return null;
    const n = Number(value.replaceAll(",", "").replace("%", ""));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const rows = input.rows
    .filter((r) => /^https:\/\/(www\.)?miloosh\.com\//.test(r[0]))
    .map((r) => ({
      url: r[0].split(/\s/)[0],
      clicks: number(r[1]),
      impressions: number(r[2]),
      ctr: number(r[3]) === null ? null : number(r[3])! / 100,
      position: number(r[4]),
    }));
  if (new Set(rows.map((r) => r.url)).size !== rows.length)
    throw new Error("Duplicate GSC page rows; refusing to double-count");
  if (!rows.length) throw new Error("No authenticated page-table rows found");
  return searchSnapshotSchema.parse({
    capturedAt: input.capturedAt,
    source,
    window,
    rows,
  });
}

/** Append-only observation semantics: repeated runs do not create new checks. */
export function appendObservations(
  history: Inspection[],
  observations: Inspection[],
): Inspection[] {
  const records = new Map(
    history.map((r) => [`${r.url}|${r.checkedAt}|${r.source}`, r]),
  );
  for (const row of observations) {
    const key = `${row.url}|${row.checkedAt}|${row.source}`;
    if (
      records.has(key) &&
      JSON.stringify(records.get(key)) !== JSON.stringify(row)
    )
      throw new Error("Conflicting immutable inspection observation");
    records.set(key, row);
  }
  return [...records.values()].sort(
    (a, b) =>
      Date.parse(a.checkedAt) - Date.parse(b.checkedAt) ||
      a.url.localeCompare(b.url) ||
      a.source.localeCompare(b.source),
  );
}

export function inspectionDeltas(history: Inspection[]) {
  return [...new Set(history.map((r) => r.url))].sort().map((url) => {
    const rows = history
      .filter((r) => r.url === url)
      .sort(
        (a, b) =>
          Date.parse(a.checkedAt) - Date.parse(b.checkedAt) ||
          a.source.localeCompare(b.source),
      );
    const transitions = rows.slice(1).flatMap((current, i) =>
      indexState(current) !== indexState(rows[i])
        ? [
            {
              from: indexState(rows[i]),
              to: indexState(current),
              observedAt: current.checkedAt,
              previousObservationAt: rows[i].checkedAt,
              source: current.source,
              note: "Observed between checks, not the exact transition time; no causation claim.",
            },
          ]
        : [],
    );
    return { url, baseline: rows[0], current: rows.at(-1)!, transitions };
  });
}
