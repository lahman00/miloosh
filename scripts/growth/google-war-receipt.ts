import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { DECISION_PATHS } from "@/data/seo/decision-paths";
import {
  loadProtection,
  assertSafeLinkChange,
} from "@/lib/google-war/protection";

// Reproducible local receipt from two already-built artifacts. Never publishes.
const directory =
  process.argv[2] ?? "docs/growth/receipts/20260926-google-visibility-war";
const beforeDir = process.argv[3] ?? "var/growth/google-war-baseline";
const afterDir = process.argv[4] ?? "var/growth/google-war";
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const before = read(path.join(beforeDir, "authority-graph.json"));
const after = read(path.join(afterDir, "authority-graph.json"));
const report = read(path.join(afterDir, "latest.json"));
type Row = {
  path: string;
  kind: string;
  inboundSourcePages: number;
  relevantSources: number;
  homeDepth: number | null;
  hubDepth: number | null;
  orphan: boolean;
  nearOrphan: boolean;
  bySourceType: Record<string, number>;
};
type Edge = { from: string; to: string; anchor: string };
const edgeKey = (e: Edge) => [e.from, e.to, e.anchor].join("|");
const previous = new Set(before.edges.map(edgeKey)),
  current = new Set(after.edges.map(edgeKey));
const added: Edge[] = after.edges.filter(
  (e: Edge) => !previous.has(edgeKey(e)),
);
const removed: Edge[] = before.edges.filter(
  (e: Edge) => !current.has(edgeKey(e)),
);
assert.equal(removed.length, 0, "Unexpected removed crawlable anchors");
assert.equal(added.length, 8, "Expected exactly eight new crawlable anchors");
const protections = loadProtection();
for (const e of added) assertSafeLinkChange(e.from, e.to, protections);
for (const [source, items] of Object.entries(DECISION_PATHS))
  for (const item of items) {
    assert(
      !before.edges.some((e: Edge) => e.from === source && e.to === item.href),
      "Existing source/target path was duplicated",
    );
    assert(added.some((e) => e.from === source && e.to === item.href));
  }
for (const p of new Set(protections.map((p) => p.page))) {
  const old = before.edges
    .filter((e: Edge) => e.from === p || e.to === p)
    .map(edgeKey)
    .sort();
  const next = after.edges
    .filter((e: Edge) => e.from === p || e.to === p)
    .map(edgeKey)
    .sort();
  assert.deepEqual(next, old, `Protected link footprint changed: ${p}`);
}
const weak = ["volza", "jotform", "mailerlite", "omnisend", "surveymonkey"];
const previouslyReportedOrphans = [
  "birdeye",
  "chili-piper",
  "consensus",
  "dbt-cloud",
  "dropbox",
  "floqast",
  "hibob",
  "knowbe4",
  "veeam-data-platform",
];
const metrics = (row: Row) => ({
  sources: row.inboundSourcePages,
  relevantSources: row.relevantSources,
  guideSources: row.bySourceType.guide,
  homeDepth: row.homeDepth,
  hubDepth: row.hubDepth,
});
const changes = weak.map((slug) => ({
  url: `/software/${slug}`,
  before: metrics(before.rows.find((r: Row) => r.path === `/software/${slug}`)),
  after: metrics(after.rows.find((r: Row) => r.path === `/software/${slug}`)),
  demand: "UNKNOWN: no exact canonical page row in the supplied export",
  action:
    slug === "volza"
      ? "HOLD: no new relevant trade-intelligence feeder justified"
      : "Added relevant existing guide paths; no ranking/affiliate change",
}));
fs.mkdirSync(directory, { recursive: true });
const write = (name: string, data: unknown) =>
  fs.writeFileSync(
    path.join(directory, name),
    JSON.stringify(data, null, 2) + "\n",
  );
write("high-impression-queue.json", {
  capturedAt: report.generatedAt,
  source: report.top50[0].searchEvidence,
  ranking: report.policy.ranking,
  rows: report.top50,
});
write("authority-graph.json", {
  method: after.method,
  buildId: after.buildId,
  artifactHash: after.artifactHash,
  coverage: report.coverage,
  added,
  removed,
  weakPartners: changes,
  rows: after.rows.map((r: Row) => ({
    url: r.path,
    kind: r.kind,
    ...metrics(r),
    bySourceType: r.bySourceType,
  })),
  fullEdgeArtifact: path.join(afterDir, "authority-graph.json"),
  protectedDirectLinkFootprintsUnchanged: true,
});
write("orphans.json", {
  method: after.method,
  trueSoftwareOrphans: after.rows.filter(
    (r: Row) => r.kind === "software" && r.orphan,
  ),
  nearSoftwareOrphans: after.rows
    .filter((r: Row) => r.kind === "software" && r.nearOrphan)
    .map((r: Row) => ({ url: r.path, ...metrics(r) })),
  reconciledNine: previouslyReportedOrphans.map((slug) => {
    const r = after.rows.find((r: Row) => r.path === `/software/${slug}`);
    return {
      url: r.path,
      ...metrics(r),
      verdict:
        "Not a true orphan; category/hub HTML was excluded by the old contextual-only report. HOLD: no invented feeder or unnecessary noindex.",
    };
  }),
});
write("click-depth.json", {
  method:
    "Breadth-first shortest crawlable HTML path; noindex/nofollow/script/template anchors excluded. Does not claim visual salience or Google authority.",
  beforeBuild: before.buildId,
  afterBuild: after.buildId,
  distribution: Object.fromEntries(
    [
      ...new Set(
        after.rows
          .filter((r: Row) =>
            ["software", "comparison", "guide"].includes(r.kind),
          )
          .map((r: Row) => r.homeDepth),
      ),
    ].map((depth) => [
      String(depth),
      after.rows.filter(
        (r: Row) =>
          ["software", "comparison", "guide"].includes(r.kind) &&
          r.homeDepth === depth,
      ).length,
    ]),
  ),
  weakPartners: changes,
  note: "No shortest-depth reduction claimed: these targets were already two clicks away; gain is relevant source/guide diversity.",
});
write("intent-conflicts.json", {
  structuralConflicts: report.intentConflicts,
  notionTrello: report.notionTrello,
  templateWarnings: report.templateWarnings,
  qualityRegressions: report.qualityRegressions,
});
write("indexation-deltas.json", {
  generatedAt: report.generatedAt,
  observations: report.coverage.inspectionObservations,
  readOnly: true,
  deltas: report.indexationDeltas,
  note: "5 raw UI observations + 26 explicitly reported inspections; no new Google calls. Report timestamps/day placeholders are labelled, not exact inspection times. No newly observed indexation or causal uplift.",
});
write("indexing-request-queue.json", {
  generatedAt: report.generatedAt,
  requestsSent: 0,
  history: report.requestHistory,
  ready: report.indexingQueue.filter(
    (r: { status: string }) => r.status === "READY_TO_REQUEST",
  ),
  rows: report.indexingQueue,
  rule: "Requires recorded production improvement + fresh production verification, technical pass, high value, confirmed non-index inclusion, no protection and no recent request. No submission mechanism.",
});
write("technical-audit.json", report.technicalAudit);
console.log(
  JSON.stringify({
    receipt: directory,
    added: added.length,
    removed: removed.length,
    protectedDirectLinkFootprintsUnchanged: true,
  }),
);
