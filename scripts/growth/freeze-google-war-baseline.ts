import fs from "node:fs";
import path from "node:path";
import {
  CONCURRENT_CONTROL,
  CONCURRENT_TREATMENT,
} from "@/lib/google-war/protection";
import { inspectionSchema } from "@/lib/google-war/evidence";

// Explicit one-time freeze; defaults never run from the daily report. No overwrite.
const reportFile = process.argv[2];
if (!reportFile)
  throw new Error("Pass the pre-change Google War latest.json artifact");
const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
const data = "data/growth/google-war";
const receipt = "docs/growth/receipts/20260926-google-visibility-war";
const write = (file: string, value: unknown) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
fs.mkdirSync(receipt, { recursive: true });
write(
  path.join(data, "quality-baseline.json"),
  Object.fromEntries(
    report.top50
      .filter(
        (r: { factualDepth?: { bucket: string } }) =>
          r.factualDepth && ["A", "B"].includes(r.factualDepth.bucket),
      )
      .map((r: { url: string; factualDepth: { bucket: string } }) => [
        r.url,
        r.factualDepth.bucket,
      ]),
  ),
);
write(path.join(receipt, "google-war-baseline.json"), {
  generatedAt: report.generatedAt,
  sourceSha: report.sourceSha,
  buildId: report.buildId,
  artifactHash: report.artifactHash,
  coverage: report.coverage,
  factualDepthDistribution: report.factualDepthDistribution,
  top50: report.top50,
  note: "Frozen pre-navigation build; scores measure structured-field completeness, not verified truth. Impressions are cached authenticated page rows, not present-day indexing evidence.",
});
const empty = {
  verdict: null,
  coverageState: "Crawled - currently not indexed",
  lastCrawlTime: null,
  googleCanonical: null,
  userCanonical: null,
  pageFetchState: null,
  robotsTxtState: null,
  indexingState: null,
};
const reported = [...CONCURRENT_TREATMENT, ...CONCURRENT_CONTROL].map(
  (slug) => ({
    url: `https://miloosh.com/software/${slug}`,
    checkedAt: "2026-09-26T09:55:58Z",
    source:
      "REPORTED_INSPECTION: af33baeef83f9909c24b6e610f4080a02850835b commit message. Timestamp is report commit time, NOT inspection time; raw API/UI result unavailable.",
    ...empty,
  }),
);
for (const slug of ["pipedrive", "wrike"])
  reported.push({
    url: `https://miloosh.com/software/${slug}`,
    checkedAt: "2026-09-26T00:00:00Z",
    source:
      "REPORTED_INSPECTION: docs/growth/receipts/20260926-google-demand-capture/tier-a-actions.md; day-precision report, NOT an exact inspection timestamp.",
    ...empty,
  });
write(
  path.join(data, "reported-inspections.json"),
  inspectionSchema
    .array()
    .parse(reported)
    .map((r) =>
      r.url.endsWith("/pipedrive")
        ? {
            ...r,
            lastCrawlTime: "2026-08-30T19:22:52Z",
            googleCanonical: r.url,
            pageFetchState: "SUCCESSFUL",
            robotsTxtState: "ALLOWED",
            indexingState: "INDEXING_ALLOWED",
          }
        : r.url.endsWith("/wrike")
          ? { ...r, lastCrawlTime: "2026-08-16T12:59:50Z" }
          : r,
    ),
);
console.log(
  JSON.stringify({ baseline: receipt, reportedInspections: reported.length }),
);
