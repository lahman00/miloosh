import fs from "node:fs";
import path from "node:path";

export type Protection = {
  page: string;
  state: "ACTIVE_EXPERIMENT" | "COOLDOWN" | "RESERVED";
  until: string | null;
  source: string;
  reason: string;
};
export const LEGACY_RESERVED = [
  "pipedrive",
  "airtable",
  "semrush",
  "freshdesk",
  "buffer",
  "ringcentral",
  "help-scout",
  "intercom",
  "front",
];
export const CONCURRENT_TREATMENT = [
  "whimsical",
  "scribe",
  "marketo-engage",
  "lucidchart",
  "firebase",
  "vercel",
  "netlify",
  "hotjar",
  "fullstory",
  "contentful",
  "perplexity",
  "synthesia",
  "jasper",
  "copy-ai",
];
export const CONCURRENT_CONTROL = [
  "adyen",
  "braze",
  "knowledgeowl",
  "bloomfire",
  "gitbook",
  "workos",
  "webflow",
  "twilio",
  "swaggerhub",
  "sanity",
];
export type ExperimentInput = {
  page: string;
  decision: string;
  recordedAt: string;
  measurementWindowDays: number;
};
export function experimentProtection(
  experiments: ExperimentInput[],
  now: string,
  source: string,
): Protection[] {
  if (!Number.isFinite(Date.parse(now)))
    throw new Error("Invalid protection clock");
  return experiments.flatMap((e) => {
    const end = Date.parse(e.recordedAt) + e.measurementWindowDays * 86_400_000;
    if (!Number.isFinite(end) || e.measurementWindowDays < 0)
      throw new Error(`Invalid experiment date: ${source}`);
    if (e.decision !== "MEASURING" && end <= Date.parse(now)) return [];
    return [
      {
        page: e.page,
        state:
          e.decision === "MEASURING"
            ? ("ACTIVE_EXPERIMENT" as const)
            : ("COOLDOWN" as const),
        until: new Date(end).toISOString(),
        source,
        reason:
          e.decision === "MEASURING"
            ? "Still MEASURING; overdue checkpoint never silently unlocks editing"
            : "Measurement cooldown",
      },
    ];
  });
}
export function reservedProtection(): Protection[] {
  return [
    ...LEGACY_RESERVED,
    ...CONCURRENT_TREATMENT,
    ...CONCURRENT_CONTROL,
  ].map((slug) => ({
    page: `/software/${slug}`,
    state: "RESERVED",
    until: null,
    source: LEGACY_RESERVED.includes(slug)
      ? "Legacy conservative protected cohort in gsc-opportunity-miner; not proof of an active experiment"
      : "af33baeef83f9909c24b6e610f4080a02850835b: concurrent Claude treatment/control cohort",
    reason: "Existing reservation; explicit review required to release",
  }));
}
export function loadProtection(
  root = process.cwd(),
  now = new Date().toISOString(),
): Protection[] {
  const entries: Protection[] = reservedProtection();
  const docs = path.join(root, "docs");
  const files = fs.existsSync(docs)
    ? fs
        .readdirSync(docs)
        .filter((f) => /experiment.*\.json$/.test(f))
        .map((f) => path.join(docs, f))
    : [];
  const runtime = path.join(root, "var/agents/seo-factory-experiments.json");
  if (fs.existsSync(runtime)) files.push(runtime);
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")); // Corrupt protection must fail closed.
    const experiments = Array.isArray(raw) ? raw : raw.experiments;
    if (
      !Array.isArray(experiments) ||
      experiments.some(
        (e) =>
          !e.page ||
          !e.decision ||
          !e.recordedAt ||
          typeof e.measurementWindowDays !== "number",
      )
    )
      throw new Error(
        `Invalid experiment protection: ${path.relative(root, file)}`,
      );
    entries.push(
      ...experimentProtection(experiments, now, path.relative(root, file)),
    );
  }
  return entries;
}
export function protectionFor(page: string, protections: Protection[]) {
  return protections.filter((p) => p.page === page);
}
export function assertSafeLinkChange(
  source: string,
  target: string,
  protections: Protection[],
) {
  if ([source, target].some((p) => protectionFor(p, protections).length))
    throw new Error(`Protected link change: ${source} -> ${target}`);
}
