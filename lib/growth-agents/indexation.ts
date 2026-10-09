import { z } from "zod";
import { ageInDays, measured, notMeasured, unavailable, type Measured, type Provenance } from "./evidence";
import { canonicalPageUrl } from "./urls";

/**
 * Indexation and crawl evidence from the Search Console reports that are not
 * performance tables: the sitemap report, the page-indexing report, crawl
 * statistics and per-URL "indexed version" lookups.
 *
 * Each sidecar is a small JSON file captured read-only from the owner's
 * Search Console session. An absent sidecar is NOT_MEASURED, never a clean bill
 * of health, and a report Google last updated before a release says nothing
 * about that release.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTimestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "expected an ISO timestamp");

export const sitemapSidecarSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("sitemaps"),
  property: z.string().min(1),
  capturedAt: isoTimestamp,
  source: z.string().min(1),
  sitemaps: z.array(
    z.object({
      url: z.string().url(),
      type: z.string(),
      submitted: isoDate,
      lastRead: isoDate,
      status: z.enum(["SUCCESS", "HAS_ERRORS", "COULD_NOT_FETCH", "PENDING"]),
      discoveredPages: z.number().int().nonnegative(),
      discoveredVideos: z.number().int().nonnegative().default(0),
    }),
  ),
  notes: z.array(z.string()).default([]),
});

const validationSchema = z.object({
  state: z.enum(["NOT_STARTED", "STARTED", "PASSED", "FAILED"]),
  started: isoDate.optional(),
  failed: isoDate.optional(),
});

export const pageIndexingSidecarSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("page-indexing"),
  property: z.string().min(1),
  capturedAt: isoTimestamp,
  reportLastUpdated: isoDate,
  source: z.string().min(1),
  indexedPages: z.number().int().nonnegative(),
  notIndexedPages: z.number().int().nonnegative(),
  reasons: z.array(
    z.object({
      label: z.string().min(1),
      source: z.string(),
      pages: z.number().int().nonnegative(),
      firstDetected: isoDate.optional(),
      validation: validationSchema,
      sampleLastCrawled: z.union([z.array(z.object({ url: z.string(), lastCrawled: isoDate })), z.string()]).optional(),
      sampleUrls: z.array(z.string()).optional(),
    }),
  ),
  notes: z.array(z.string()).default([]),
});

export const crawlStatsSidecarSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("crawl-stats"),
  property: z.string().min(1),
  capturedAt: isoTimestamp,
  reportLastUpdated: isoDate,
  source: z.string().min(1),
  totalCrawlRequests: z.number().int().nonnegative(),
  averageResponseTimeMs: z.number().nonnegative(),
  hosts: z.array(z.object({ host: z.string(), requests: z.number().int().nonnegative(), status: z.string() })),
  dailySeries: z.string().optional(),
  notes: z.array(z.string()).default([]),
});

export const urlInspectionSidecarSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("url-inspections"),
  property: z.string().min(1),
  capturedAt: isoTimestamp,
  source: z.string().min(1),
  /** True only if the lookups were indexed-version reads. A live test or an indexing request is never recorded here. */
  indexedVersionOnly: z.literal(true),
  inspections: z.array(
    z.object({
      url: z.string().min(1),
      inspectedAt: isoTimestamp,
      coverageState: z.string().min(1),
      lastCrawl: isoTimestamp.nullable(),
      crawlAllowed: z.boolean().nullable(),
      indexingAllowed: z.boolean().nullable(),
      pageFetch: z.string().nullable(),
      userCanonical: z.string().nullable(),
      googleCanonical: z.string().nullable(),
    }),
  ),
  notes: z.array(z.string()).default([]),
});

export type SitemapSidecar = z.infer<typeof sitemapSidecarSchema>;
export type PageIndexingSidecar = z.infer<typeof pageIndexingSidecarSchema>;
export type CrawlStatsSidecar = z.infer<typeof crawlStatsSidecarSchema>;
export type UrlInspectionSidecar = z.infer<typeof urlInspectionSidecarSchema>;

export type UrlInspection = UrlInspectionSidecar["inspections"][number];

export type IndexationEvidence = {
  sitemap: Measured<{ url: string; submitted: string; lastRead: string; status: string; discoveredPages: number }>;
  coverage: Measured<{
    indexed: number;
    notIndexed: number;
    reportLastUpdated: string;
    reasons: PageIndexingSidecar["reasons"];
  }>;
  crawlStats: Measured<{ totalCrawlRequests: number; reportLastUpdated: string; averageResponseTimeMs: number; hostIssues: string[] }>;
  /** Most recent Google crawl date seen per canonical URL in any sample (coverage drilldown or URL inspection). */
  lastCrawlSamples: Map<string, { date: string; evidence: string }>;
  inspections: Map<string, Measured<UrlInspection>>;
  warnings: string[];
};

export type SidecarReader = (fileName: string) => unknown | null;

function provenanceOf(source: string, locator: string, capturedAt: string, caveat?: string): Provenance {
  return { source, locator, capturedAt, ...(caveat ? { caveat } : {}) };
}

/** Builds indexation evidence from whichever sidecars the reader can supply. Missing or invalid sidecars degrade to NOT_MEASURED / UNAVAILABLE. */
export function buildIndexationEvidence(read: SidecarReader, directoryLabel: string): IndexationEvidence {
  const warnings: string[] = [];
  const lastCrawlSamples = new Map<string, { date: string; evidence: string }>();
  const inspections = new Map<string, Measured<UrlInspection>>();

  const parse = <T extends z.ZodTypeAny>(file: string, schema: T): z.infer<T> | null | "INVALID" => {
    let raw: unknown;
    try {
      raw = read(file);
    } catch {
      return null;
    }
    if (raw === null || raw === undefined) return null;
    const result = schema.safeParse(raw);
    if (!result.success) {
      warnings.push(`${file} is present but invalid: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      return "INVALID";
    }
    return result.data;
  };

  const sitemapRaw = parse("sitemaps.json", sitemapSidecarSchema);
  let sitemap: IndexationEvidence["sitemap"];
  if (sitemapRaw === null) sitemap = notMeasured("no sitemaps.json capture was provided");
  else if (sitemapRaw === "INVALID") sitemap = unavailable("sitemaps.json failed validation");
  else if (sitemapRaw.sitemaps.length === 0) sitemap = unavailable("the sitemap report lists no submitted sitemap", provenanceOf("gsc-ui-capture", `${directoryLabel}/sitemaps.json`, sitemapRaw.capturedAt));
  else {
    const first = [...sitemapRaw.sitemaps].sort((a, b) => b.discoveredPages - a.discoveredPages)[0]!;
    sitemap = measured(
      { url: first.url, submitted: first.submitted, lastRead: first.lastRead, status: first.status, discoveredPages: first.discoveredPages },
      provenanceOf("gsc-ui-capture", `${directoryLabel}/sitemaps.json`, sitemapRaw.capturedAt, "Dates carry no time of day in the UI."),
    );
  }

  const coverageRaw = parse("page-indexing.json", pageIndexingSidecarSchema);
  let coverage: IndexationEvidence["coverage"];
  if (coverageRaw === null) coverage = notMeasured("no page-indexing.json capture was provided");
  else if (coverageRaw === "INVALID") coverage = unavailable("page-indexing.json failed validation");
  else {
    coverage = measured(
      { indexed: coverageRaw.indexedPages, notIndexed: coverageRaw.notIndexedPages, reportLastUpdated: coverageRaw.reportLastUpdated, reasons: coverageRaw.reasons },
      provenanceOf("gsc-ui-capture", `${directoryLabel}/page-indexing.json`, coverageRaw.capturedAt, `Google last updated this report on ${coverageRaw.reportLastUpdated}.`),
    );
    for (const reason of coverageRaw.reasons) {
      if (Array.isArray(reason.sampleLastCrawled)) {
        for (const sample of reason.sampleLastCrawled) {
          const url = canonicalPageUrl(sample.url);
          if (!url) continue;
          const previous = lastCrawlSamples.get(url);
          if (!previous || sample.lastCrawled > previous.date) {
            lastCrawlSamples.set(url, { date: sample.lastCrawled, evidence: `page-indexing sample: ${reason.label}` });
          }
        }
      }
    }
  }

  const crawlRaw = parse("crawl-stats.json", crawlStatsSidecarSchema);
  let crawlStats: IndexationEvidence["crawlStats"];
  if (crawlRaw === null) crawlStats = notMeasured("no crawl-stats.json capture was provided");
  else if (crawlRaw === "INVALID") crawlStats = unavailable("crawl-stats.json failed validation");
  else {
    crawlStats = measured(
      {
        totalCrawlRequests: crawlRaw.totalCrawlRequests,
        reportLastUpdated: crawlRaw.reportLastUpdated,
        averageResponseTimeMs: crawlRaw.averageResponseTimeMs,
        hostIssues: crawlRaw.hosts.filter((h) => !/no issues/i.test(h.status)).map((h) => `${h.host}: ${h.status}`),
      },
      provenanceOf("gsc-ui-capture", `${directoryLabel}/crawl-stats.json`, crawlRaw.capturedAt, crawlRaw.dailySeries ? `Daily series: ${crawlRaw.dailySeries}` : undefined),
    );
  }

  const inspectionRaw = parse("url-inspections.json", urlInspectionSidecarSchema);
  if (inspectionRaw && inspectionRaw !== "INVALID") {
    for (const inspection of inspectionRaw.inspections) {
      const url = canonicalPageUrl(inspection.url);
      if (!url) continue;
      inspections.set(
        url,
        measured(inspection, provenanceOf("gsc-ui-capture", `${directoryLabel}/url-inspections.json`, inspection.inspectedAt, "Indexed version as Google last stored it; not a live test.")),
      );
      if (inspection.lastCrawl) {
        const date = inspection.lastCrawl.slice(0, 10);
        const previous = lastCrawlSamples.get(url);
        if (!previous || date > previous.date) lastCrawlSamples.set(url, { date, evidence: "URL inspection" });
      }
    }
  }

  return { sitemap, coverage, crawlStats, lastCrawlSamples, inspections, warnings };
}

/** Whether Google's sampled crawl dates for these URLs show any crawl on or after `releaseDate`. Only the sample is covered. */
export function postReleaseCrawlObserved(
  evidence: IndexationEvidence,
  urls: readonly string[],
  releaseDate: string,
): { sampled: number; crawledAfterRelease: number; newestCrawl: string | null } {
  let sampled = 0;
  let crawledAfterRelease = 0;
  let newest: string | null = null;
  for (const raw of urls) {
    const url = canonicalPageUrl(raw);
    const sample = url ? evidence.lastCrawlSamples.get(url) : undefined;
    if (!sample) continue;
    sampled += 1;
    if (sample.date >= releaseDate) crawledAfterRelease += 1;
    if (newest === null || sample.date > newest) newest = sample.date;
  }
  return { sampled, crawledAfterRelease, newestCrawl: newest };
}

/** Age of the coverage report in days, or null when it was not measured. */
export function coverageReportAgeDays(evidence: IndexationEvidence, now: Date): number | null {
  if (evidence.coverage.state === "MEASURED" || evidence.coverage.state === "PARTIAL" || evidence.coverage.state === "STALE") {
    return ageInDays(`${evidence.coverage.value.reportLastUpdated}T00:00:00Z`, now);
  }
  return null;
}
