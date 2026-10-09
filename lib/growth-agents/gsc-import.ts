import { z } from "zod";
import {
  ISO_DATE_RE,
  compareDates,
  ctrOf,
  inclusiveDays,
  parseIsoDate,
  round,
  windowsOverlap,
  type DateWindow,
} from "./evidence";
import { canonicalPageUrl, pathOf } from "./urls";

/**
 * Credential-free import path for authenticated Google Search Console data.
 *
 * The Search Console API connector is unavailable (a paid wrapper answered
 * `payment_required`) and no service account is configured, so evidence enters
 * as a capture directory: a `manifest.json` plus CSV tables in the same column
 * layout as the Search Console "Export" download (`Top pages`, `Top queries`,
 * `Date` + `Clicks,Impressions,CTR,Position`). A capture can come from an
 * export file or from a table the owner's signed-in browser displayed; the
 * manifest says which, and states the property, filters, Pacific-time windows
 * and the last day Google had finalised.
 *
 * Nothing here reads files or the network: callers hand in the text. A page
 * that is absent from a table is never silently a zero (see `lookupPage`).
 */

export const GSC_CAPTURE_SCHEMA_VERSION = 1;

export class GscImportError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid Search Console capture:\n- ${problems.join("\n- ")}`);
    this.name = "GscImportError";
  }
}

const isoDate = z
  .string()
  .regex(ISO_DATE_RE, "expected YYYY-MM-DD")
  .refine((value) => parseIsoDate(value) !== null, "not a real calendar date");

const isoTimestamp = z
  .string()
  .refine((value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value) && !Number.isNaN(Date.parse(value)), "expected an ISO UTC timestamp ending in Z");

const windowSchema = z
  .object({ start: isoDate, end: isoDate })
  .refine((w) => compareDates(w.start, w.end) <= 0, "window start is after its end");

export const gscTableSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["historical", "recent", "context"]),
  kind: z.enum(["pages", "queries", "dates"]),
  /** File name inside the capture directory. No path separators: a capture never reaches outside its folder. */
  file: z.string().regex(/^[A-Za-z0-9._-]+$/, "file must be a bare file name"),
  window: windowSchema,
  /** First day inside the window on which the property has any data. Earlier days are "no data", not zero. */
  firstDataDate: isoDate.optional(),
  /** The row total the Search Console pager reported ("1-N of M" gives M). */
  rowsReported: z.number().int().nonnegative(),
  /** True only when every reported row is present in the file. */
  complete: z.boolean(),
  /** Why an absent URL may be read as "no impressions in this window". Without it an absent URL stays NOT_OBSERVED. */
  zeroIfAbsentJustification: z.string().min(1).optional(),
  /** Property-level totals the report header showed. Impressions may be a rounded display string such as "25.6K". */
  propertyTotals: z
    .object({
      clicks: z.number().int().nonnegative(),
      impressions: z.number().int().nonnegative().optional(),
      impressionsDisplayed: z.string().optional(),
      position: z.number().positive().optional(),
    })
    .optional(),
  truncation: z.string().optional(),
  /**
   * "private" tables (search queries) are never committed: the repository is public and its convention keeps
   * query-level data outside git. A private table that is not present is skipped with a warning, not an error.
   */
  visibility: z.enum(["committed", "private"]).default("committed"),
  /**
   * For a queries table read with the report filtered to one page: which page. The importer attributes the table to
   * a page only when the filter names that page's exact path and the table's impressions agree with the pages table.
   */
  pageFilter: z.object({ mode: z.enum(["contains", "equals"]), value: z.string().regex(/^\/\S*$/, "a path starting with /") }).optional(),
});

export const exactPageCheckSchema = z.object({
  url: z.string().min(1),
  window: windowSchema,
  result: z.enum(["NO_DATA", "DATA"]),
  checkedAt: isoTimestamp,
  method: z.string().min(1),
});

export const gscCaptureManifestSchema = z.object({
  schemaVersion: z.literal(GSC_CAPTURE_SCHEMA_VERSION),
  captureId: z.string().min(1),
  property: z.string().min(1),
  searchType: z.literal("web"),
  /** Explicit filter set; {} means no filters, never "unknown". */
  filters: z.record(z.string(), z.string()),
  timezone: z.literal("America/Los_Angeles"),
  capturedAt: isoTimestamp,
  capturedVia: z.enum(["ui-table-capture", "ui-export-csv", "api"]),
  /** Last day Google had finalised when the capture was taken. */
  dataThrough: isoDate,
  dataThroughRule: z.string().min(1),
  tables: z.array(gscTableSchema).min(1),
  exactPageChecks: z.array(exactPageCheckSchema).default([]),
  notes: z.array(z.string()).default([]),
});

export type GscTableManifest = z.infer<typeof gscTableSchema>;
export type ExactPageCheck = z.infer<typeof exactPageCheckSchema>;
export type GscCaptureManifest = z.infer<typeof gscCaptureManifestSchema>;

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, CRLF, UTF-8 BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0) || row.length > 1) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.length > 0) || row.length > 1) rows.push(row);
  return rows;
}

export type PageMetrics = {
  clicks: number;
  impressions: number;
  /** Fraction (0.026 = 2.6%). Null when impressions are zero. */
  ctr: number | null;
  /** Average position, 1 = top. Null when the source gave none. */
  position: number | null;
};

type RawRow = { key: string; metrics: PageMetrics };

const NULL_CELLS = new Set(["", "-", "—", "–", "n/a", "N/A"]);

function parseCount(cell: string, label: string, problems: string[]): number | null {
  const cleaned = cell.trim().replace(/,/g, "");
  if (!/^\d+$/.test(cleaned)) {
    problems.push(`${label}: "${cell}" is not an exact whole number (rounded display values such as "25.6K" are not accepted in a table)`);
    return null;
  }
  return Number(cleaned);
}

function parseCtr(cell: string): number | null {
  const cleaned = cell.trim();
  if (NULL_CELLS.has(cleaned)) return null;
  const match = /^(\d+(?:\.\d+)?)\s*%$/.exec(cleaned);
  return match ? Number(match[1]) / 100 : null;
}

function parsePosition(cell: string): number | null {
  const cleaned = cell.trim();
  if (NULL_CELLS.has(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const KEY_HEADERS: Record<GscTableManifest["kind"], ReadonlySet<string>> = {
  pages: new Set(["top pages", "pages", "page", "url"]),
  queries: new Set(["top queries", "queries", "query"]),
  dates: new Set(["date", "dates"]),
};

function parseTable(kind: GscTableManifest["kind"], csv: string, label: string, problems: string[]): RawRow[] {
  const records = parseCsv(csv);
  if (records.length === 0) {
    problems.push(`${label}: file is empty`);
    return [];
  }
  const header = records[0]!.map((cell) => cell.trim().toLowerCase());
  const keyIndex = header.findIndex((cell) => KEY_HEADERS[kind].has(cell));
  const index = {
    clicks: header.indexOf("clicks"),
    impressions: header.indexOf("impressions"),
    ctr: header.indexOf("ctr"),
    position: header.indexOf("position"),
  };
  if (keyIndex !== 0 || index.clicks < 0 || index.impressions < 0) {
    problems.push(`${label}: header must start with a ${kind} column and contain Clicks and Impressions (found: ${records[0]!.join(" | ")})`);
    return [];
  }
  const rows: RawRow[] = [];
  records.slice(1).forEach((record, offset) => {
    const where = `${label} row ${offset + 2}`;
    const key = (record[keyIndex] ?? "").trim();
    if (!key) {
      problems.push(`${where}: empty ${kind} key`);
      return;
    }
    const clicks = parseCount(record[index.clicks] ?? "", `${where} clicks`, problems);
    const impressions = parseCount(record[index.impressions] ?? "", `${where} impressions`, problems);
    if (clicks === null || impressions === null) return;
    if (clicks > impressions) {
      problems.push(`${where}: clicks (${clicks}) exceed impressions (${impressions})`);
      return;
    }
    const position = index.position >= 0 ? parsePosition(record[index.position] ?? "") : null;
    if (impressions === 0 && position !== null) {
      problems.push(`${where}: a position was reported for zero impressions`);
      return;
    }
    const ctr = index.ctr >= 0 ? parseCtr(record[index.ctr] ?? "") : ctrOf(clicks, impressions);
    rows.push({ key, metrics: { clicks, impressions, ctr: ctr ?? ctrOf(clicks, impressions), position } });
  });
  return rows;
}

export type PageVariant = { url: string; metrics: PageMetrics };

export type PageRecord = {
  canonicalUrl: string;
  metrics: PageMetrics;
  /** The URLs Search Console listed that collapsed into this canonical page (apex and www). */
  variants: PageVariant[];
};

export type DailyRow = { date: string; clicks: number; impressions: number; position: number | null; final: boolean };

export type GscTableBase = {
  id: string;
  role: GscTableManifest["role"];
  window: DateWindow;
  /** Inclusive calendar days in the window. */
  windowDays: number;
  /** Inclusive days from the first day with data (or the window start) to the window end. The honest rate denominator. */
  observedDays: number;
  /** True when the window ends on or before the last finalised day. */
  finalized: boolean;
  complete: boolean;
  rowsReported: number;
  rowsCaptured: number;
  zeroIfAbsentJustification: string | null;
  propertyTotals: GscTableManifest["propertyTotals"] | null;
  truncation: string | null;
  file: string;
};

export type GscPagesTable = GscTableBase & {
  kind: "pages";
  pages: Map<string, PageRecord>;
  /** Sum over listed rows. Differs from the property total because a result can list several of the site's URLs. */
  rowSum: { clicks: number; impressions: number };
};

export type GscQueriesTable = GscTableBase & {
  kind: "queries";
  /** The page this table was filtered to, or null for the property-wide table. */
  pageFilter: { mode: "contains" | "equals"; value: string } | null;
  queries: Array<{ query: string; metrics: PageMetrics }>;
  rowSum: { clicks: number; impressions: number };
  /** Impressions the property reported that no listed query accounts for (anonymised queries). Null when the total is unknown. */
  unlistedImpressions: number | null;
};

export type GscDatesTable = GscTableBase & {
  kind: "dates";
  days: DailyRow[];
  firstRowDate: string | null;
};

export type GscEvidence = {
  manifest: GscCaptureManifest;
  capturedAt: string;
  dataThrough: string;
  property: string;
  tables: Array<GscPagesTable | GscQueriesTable | GscDatesTable>;
  exactPageChecks: ExactPageCheck[];
  /** Non-fatal observations: truncated tables, windows that are not finalised, and similar. */
  warnings: string[];
};

/** Merges the apex and www rows of one canonical page: sums counts and weights position by impressions. */
function mergePageRows(canonicalUrl: string, variants: PageVariant[]): PageRecord {
  const clicks = variants.reduce((sum, v) => sum + v.metrics.clicks, 0);
  const impressions = variants.reduce((sum, v) => sum + v.metrics.impressions, 0);
  const weighted = variants.reduce((sum, v) => sum + (v.metrics.position ?? 0) * v.metrics.impressions, 0);
  const positioned = variants.reduce((sum, v) => sum + (v.metrics.position === null ? 0 : v.metrics.impressions), 0);
  return {
    canonicalUrl,
    metrics: {
      clicks,
      impressions,
      ctr: ctrOf(clicks, impressions),
      position: positioned > 0 ? round(weighted / positioned, 1) : null,
    },
    variants,
  };
}

function baseOf(table: GscTableManifest, rowsCaptured: number, dataThrough: string): GscTableBase {
  const days = inclusiveDays(table.window.start, table.window.end);
  const observedStart =
    table.firstDataDate && compareDates(table.firstDataDate, table.window.start) > 0 ? table.firstDataDate : table.window.start;
  return {
    id: table.id,
    role: table.role,
    window: table.window,
    windowDays: days,
    observedDays: inclusiveDays(observedStart, table.window.end),
    finalized: compareDates(table.window.end, dataThrough) <= 0,
    complete: table.complete,
    rowsReported: table.rowsReported,
    rowsCaptured,
    zeroIfAbsentJustification: table.zeroIfAbsentJustification ?? null,
    propertyTotals: table.propertyTotals ?? null,
    truncation: table.truncation ?? null,
    file: table.file,
  };
}

/**
 * Validates a capture and turns its tables into typed evidence.
 * Throws GscImportError listing every problem found, so a bad capture is fixed in one pass.
 */
export function buildGscEvidence(manifestInput: unknown, files: Readonly<Record<string, string>>): GscEvidence {
  const parsed = gscCaptureManifestSchema.safeParse(manifestInput);
  if (!parsed.success) {
    throw new GscImportError(parsed.error.issues.map((issue) => `manifest ${issue.path.join(".") || "(root)"}: ${issue.message}`));
  }
  const manifest = parsed.data;
  const problems: string[] = [];
  const warnings: string[] = [];

  const ids = new Set<string>();
  for (const table of manifest.tables) {
    if (ids.has(table.id)) problems.push(`duplicate table id "${table.id}"`);
    ids.add(table.id);
  }
  for (const kind of ["pages", "queries", "dates"] as const) {
    const historicals = manifest.tables.filter((t) => t.kind === kind && t.role === "historical");
    const recents = manifest.tables.filter((t) => t.kind === kind && t.role === "recent");
    for (const historical of historicals) {
      for (const recent of recents) {
        if (windowsOverlap(historical.window, recent.window)) problems.push(`${kind}: the historical window of "${historical.id}" and the recent window of "${recent.id}" overlap`);
        else if (compareDates(historical.window.end, recent.window.start) >= 0) problems.push(`${kind}: the historical window of "${historical.id}" must end before the recent window of "${recent.id}" starts`);
      }
    }
  }
  for (const table of manifest.tables) {
    if (table.pageFilter && table.kind !== "queries") problems.push(`table "${table.id}": a page filter belongs on a queries table`);
  }

  const tables: GscEvidence["tables"] = [];
  for (const table of manifest.tables) {
    const text = files[table.file];
    if (text === undefined) {
      if (table.visibility === "private") {
        warnings.push(`table "${table.id}" is private and was not provided; query-level evidence is NOT_MEASURED for this run.`);
      } else {
        problems.push(`table "${table.id}": file ${table.file} was not provided`);
      }
      continue;
    }
    const label = `table "${table.id}"`;
    const rows = parseTable(table.kind, text, label, problems);
    if (table.complete && rows.length !== table.rowsReported) {
      problems.push(`${label}: marked complete but has ${rows.length} rows while the pager reported ${table.rowsReported}`);
    }
    if (!table.complete && rows.length >= table.rowsReported) {
      problems.push(`${label}: marked incomplete but has ${rows.length} of ${table.rowsReported} rows`);
    }
    if (!table.complete) warnings.push(`${label} is a partial capture (${rows.length} of ${table.rowsReported} rows). ${table.truncation ?? ""}`.trim());
    if (compareDates(table.window.end, manifest.dataThrough) > 0 && table.kind !== "dates") {
      warnings.push(`${label} ends ${table.window.end}, after the last finalised day ${manifest.dataThrough}; its numbers are not final.`);
    }

    const base = baseOf(table, rows.length, manifest.dataThrough);
    const rowSum = rows.reduce((sum, r) => ({ clicks: sum.clicks + r.metrics.clicks, impressions: sum.impressions + r.metrics.impressions }), { clicks: 0, impressions: 0 });

    if (table.kind === "pages") {
      const grouped = new Map<string, PageVariant[]>();
      const seen = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.key)) problems.push(`${label}: URL listed twice: ${row.key}`);
        seen.add(row.key);
        const canonical = canonicalPageUrl(row.key);
        if (!canonical) {
          problems.push(`${label}: not a Miloosh page URL: ${row.key}`);
          continue;
        }
        const list = grouped.get(canonical) ?? [];
        list.push({ url: row.key, metrics: row.metrics });
        grouped.set(canonical, list);
      }
      const pages = new Map<string, PageRecord>();
      for (const [canonical, variants] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        pages.set(canonical, mergePageRows(canonical, variants));
      }
      if (table.propertyTotals && table.propertyTotals.clicks !== rowSum.clicks && table.complete) {
        warnings.push(`${label}: page-row clicks (${rowSum.clicks}) differ from the property total (${table.propertyTotals.clicks}).`);
      }
      tables.push({ ...base, kind: "pages", pages, rowSum });
    } else if (table.kind === "queries") {
      const total = table.propertyTotals?.impressions;
      tables.push({
        ...base,
        kind: "queries",
        pageFilter: table.pageFilter ?? null,
        queries: rows.map((r) => ({ query: r.key, metrics: r.metrics })),
        rowSum,
        unlistedImpressions: total === undefined ? null : Math.max(0, total - rowSum.impressions),
      });
    } else {
      const seenDates = new Set<string>();
      const days: DailyRow[] = [];
      for (const row of rows) {
        if (!ISO_DATE_RE.test(row.key) || parseIsoDate(row.key) === null) {
          problems.push(`${label}: "${row.key}" is not a YYYY-MM-DD date`);
          continue;
        }
        if (seenDates.has(row.key)) problems.push(`${label}: date listed twice: ${row.key}`);
        seenDates.add(row.key);
        if (compareDates(row.key, table.window.start) < 0 || compareDates(row.key, table.window.end) > 0) {
          problems.push(`${label}: ${row.key} lies outside the declared window`);
        }
        days.push({
          date: row.key,
          clicks: row.metrics.clicks,
          impressions: row.metrics.impressions,
          position: row.metrics.position,
          final: compareDates(row.key, manifest.dataThrough) <= 0,
        });
      }
      days.sort((a, b) => a.date.localeCompare(b.date));
      tables.push({ ...base, kind: "dates", days, firstRowDate: days[0]?.date ?? null });
    }
  }

  for (const check of manifest.exactPageChecks) {
    if (!canonicalPageUrl(check.url)) problems.push(`exact page check: not a Miloosh page URL: ${check.url}`);
  }
  if (problems.length > 0) throw new GscImportError(problems);

  return {
    manifest,
    capturedAt: manifest.capturedAt,
    dataThrough: manifest.dataThrough,
    property: manifest.property,
    tables,
    exactPageChecks: manifest.exactPageChecks,
    warnings,
  };
}

/** Reads manifest.json and every table it names through an injected reader (the CLI passes a file reader). */
export function loadGscCapture(readText: (fileName: string) => string): GscEvidence {
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(readText("manifest.json"));
  } catch (error) {
    throw new GscImportError([`manifest.json could not be read as JSON: ${error instanceof Error ? error.message : String(error)}`]);
  }
  const files: Record<string, string> = {};
  const tables = (manifestJson as { tables?: Array<{ file?: unknown }> }).tables ?? [];
  for (const table of Array.isArray(tables) ? tables : []) {
    if (typeof table.file === "string" && /^[A-Za-z0-9._-]+$/.test(table.file)) {
      try {
        files[table.file] = readText(table.file);
      } catch {
        // buildGscEvidence reports the missing file together with every other problem.
      }
    }
  }
  return buildGscEvidence(manifestJson, files);
}

export function findPagesTable(evidence: GscEvidence, role: "historical" | "recent"): GscPagesTable | null {
  return (evidence.tables.find((t): t is GscPagesTable => t.kind === "pages" && t.role === role) ?? null);
}

/** The property-wide queries table (no page filter). */
export function findQueriesTable(evidence: GscEvidence, role: "historical" | "recent"): GscQueriesTable | null {
  return (evidence.tables.find((t): t is GscQueriesTable => t.kind === "queries" && t.role === role && t.pageFilter === null) ?? null);
}

export type PageQueryEvidence =
  | { state: "MEASURED"; table: GscQueriesTable; page: PageMetrics; note: string }
  | { state: "NOT_OBSERVED"; reason: string };

/**
 * The queries a page earned in a window, when a queries table filtered to exactly that page was captured.
 * A table is attributed to the page only when the filter names the page's exact path and the table's own
 * impressions agree with the pages table; otherwise the filter may have matched other pages, so nothing is claimed.
 */
export function pageQueryEvidence(evidence: GscEvidence, role: "historical" | "recent", url: string): PageQueryEvidence {
  const canonical = canonicalPageUrl(url);
  if (!canonical) return { state: "NOT_OBSERVED", reason: `${url} is not a Miloosh page URL` };
  const path = pathOf(canonical);
  const candidates = evidence.tables.filter((t): t is GscQueriesTable => t.kind === "queries" && t.role === role && t.pageFilter !== null && t.pageFilter.value === path);
  if (candidates.length === 0) return { state: "NOT_OBSERVED", reason: `no ${role} queries table filtered to ${path} was captured` };
  const table = candidates[0]!;
  const pages = findPagesTable(evidence, role);
  const listed = pages?.pages.get(canonical);
  if (!listed) return { state: "NOT_OBSERVED", reason: `the ${role} pages table does not list ${path}, so the filtered queries table cannot be checked against it` };
  const declared = table.propertyTotals?.impressions;
  if (declared === undefined) return { state: "NOT_OBSERVED", reason: `the filtered queries table for ${path} declares no impression total to check against the pages table` };
  if (declared !== listed.metrics.impressions) {
    return { state: "NOT_OBSERVED", reason: `the filtered queries table for ${path} reports ${declared} impressions but the pages table lists ${listed.metrics.impressions}; the filter may have matched other pages` };
  }
  return { state: "MEASURED", table, page: listed.metrics, note: `${table.rowsCaptured} of ${table.rowsReported} query rows; impressions agree with the pages table (${declared})` };
}

export function findDatesTable(evidence: GscEvidence, role: "historical" | "recent"): GscDatesTable | null {
  return (evidence.tables.find((t): t is GscDatesTable => t.kind === "dates" && t.role === role) ?? null);
}

export type PagePerformance =
  | { state: "MEASURED"; metrics: PageMetrics; variants: PageVariant[]; table: GscTableBase }
  | { state: "EXACT_EMPTY"; check: ExactPageCheck; table: GscTableBase }
  | { state: "ABSENT_FROM_COMPLETE_TABLE"; justification: string; table: GscTableBase }
  | { state: "NOT_OBSERVED"; reason: string; table: GscTableBase }
  | { state: "UNAVAILABLE"; reason: string };

/**
 * What the capture says about one page in one window.
 *
 * A listed page is MEASURED. An unlisted page is only a zero when something
 * justifies it: an exact-page check that returned no data, or a complete,
 * unfiltered table whose manifest explains why absence means no impressions.
 * Otherwise it is NOT_OBSERVED, which the agents never convert into a number.
 */
export function lookupPage(evidence: GscEvidence, role: "historical" | "recent", url: string): PagePerformance {
  const canonical = canonicalPageUrl(url);
  const table = findPagesTable(evidence, role);
  if (!canonical) return { state: "UNAVAILABLE", reason: `${url} is not a Miloosh page URL` };
  if (!table) return { state: "UNAVAILABLE", reason: `the capture has no ${role} pages table` };
  const record = table.pages.get(canonical);
  if (record) return { state: "MEASURED", metrics: record.metrics, variants: record.variants, table };
  const check = evidence.exactPageChecks.find(
    (c) =>
      canonicalPageUrl(c.url) === canonical &&
      c.result === "NO_DATA" &&
      compareDates(c.window.start, table.window.start) <= 0 &&
      compareDates(c.window.end, table.window.end) >= 0,
  );
  if (check) return { state: "EXACT_EMPTY", check, table };
  if (table.complete && table.zeroIfAbsentJustification) {
    return { state: "ABSENT_FROM_COMPLETE_TABLE", justification: table.zeroIfAbsentJustification, table };
  }
  return {
    state: "NOT_OBSERVED",
    reason: table.complete
      ? "absent from a complete table, but the manifest gives no justification for reading absence as zero"
      : "absent from a partial table",
    table,
  };
}

/** Impressions if the capture supports a number (listed or justified zero), otherwise null. */
export function impressionsOf(perf: PagePerformance): number | null {
  if (perf.state === "MEASURED") return perf.metrics.impressions;
  if (perf.state === "EXACT_EMPTY" || perf.state === "ABSENT_FROM_COMPLETE_TABLE") return 0;
  return null;
}

export function clicksOf(perf: PagePerformance): number | null {
  if (perf.state === "MEASURED") return perf.metrics.clicks;
  if (perf.state === "EXACT_EMPTY" || perf.state === "ABSENT_FROM_COMPLETE_TABLE") return 0;
  return null;
}
