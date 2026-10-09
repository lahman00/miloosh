import path from "node:path";
import { runAffiliateRevenueAgent, type AffiliateRevenueReport, type ProgramStatusLookup } from "./affiliate-revenue-agent";
import { GROWTH_AGENT_SCHEMA_VERSION } from "./contracts";
import { runDirector, type DirectorReport, type ProductionContext } from "./director";
import { renderHebrewReport } from "./report-he";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import { unavailable } from "./evidence";
import { funnelFromEvents, unavailableFunnel, type FunnelEvidence } from "./funnel";
import { GscImportError, loadGscCapture, type GscEvidence } from "./gsc-import";
import {
  affectedByChangedFiles,
  readGateBaseline,
  readRecordedGateRun,
  runGuardian,
  type GateProvenance,
  type GateResult,
  type GitFacts,
  type GuardianReport,
  type ProductionFacts,
  type WorktreeFacts,
} from "./guardian";
import { runGoogleRecoveryAgent, type GoogleRecoveryReport, type MonetizationLookup, type PageExtras } from "./google-recovery-agent";
import { buildIndexationEvidence, type IndexationEvidence } from "./indexation";
import { derivedUrls, type SiteInventory } from "./inventory";
import type { PartnerFacts } from "./partners";
import { protectionFor, type ProtectionSnapshot } from "./protection";
import { redactDeep, redactText } from "./redact";

/**
 * The read-only orchestration behind `npm run growth:director`.
 *
 * Every side effect (reading files, loading registries, git, the hosting
 * platform, running a gate, writing a report) arrives through `Ports`, so the
 * default run provably writes nothing: `writeText` is called only when an
 * output directory was requested. Tests pass fakes and assert that.
 */

export type CliOptions = {
  repoRoot: string;
  now: Date;
  /** Capture directory holding manifest.json and the committed tables. */
  gscDir: string | null;
  /** Optional directory holding private tables (search queries) kept outside git. */
  gscPrivateDir: string | null;
  extrasFile: string | null;
  eventsFile: string | null;
  baselineFile: string | null;
  gatesFile: string | null;
  /** Result of `growth:rendered-diff` for this change; without it the rendered comparison is NOT_RUN. */
  renderedDiffFile: string | null;
  runGates: boolean;
  checkProduction: boolean;
  /** Owner-recorded production facts used when the platform is not queried. */
  productionOverride: { deploymentId: string | null; createdAt: string | null; sha: string | null } | null;
  releaseDate: string | null;
  baseSha: string | null;
  outDir: string | null;
  strict: boolean;
};

export type Ports = {
  readText(filePath: string): string;
  writeText(filePath: string, content: string): void;
  makeDirectory(dir: string): void;
  headSha(repoRoot: string): string;
  loadInventory(sha: string, now: Date): SiteInventory;
  loadProtection(sha: string, baseSha: string, today: string, now: Date, inventory: SiteInventory): { snapshot: ProtectionSnapshot; divergentWorktrees: Array<{ path: string; branch: string | null; head: string; changedFiles: number }> };
  loadPartners(): PartnerFacts[];
  programStatus: ProgramStatusLookup;
  ownerPackTitles(): Record<string, string>;
  gitFacts(repoRoot: string, baseSha: string | null): GitFacts;
  worktreeFacts(repoRoot: string, baseSha: string | null, own: string): WorktreeFacts[];
  productionFacts(repoRoot: string, currentSha: string): ProductionFacts | null;
  runGates(repoRoot: string): GateResult[];
  isSharedTemplate(file: string): boolean;
};

export type CliResult = {
  exitCode: number;
  stdout: string;
  written: string[];
  director: DirectorReport;
  google: GoogleRecoveryReport;
  affiliate: AffiliateRevenueReport;
  guardian: GuardianReport | null;
  hebrew: string;
};

const MAX_CANDIDATES_IN_JSON = 30;

const csvCell = (value: string | number | null): string => {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Every evaluated page, one compact row each, so the full ranking is auditable without a 300 KB JSON file. */
export function candidatesCsv(google: GoogleRecoveryReport): string {
  const header = ["url", "kind", "historical_impressions", "historical_position", "recent_impressions", "recent_state", "daily_loss", "demand_class", "protection", "eligible_after", "derived_blocking", "quality_gate_ready", "eligible", "eligible_editorial", "blocker_codes"];
  const rows = google.candidates.map((c) =>
    [c.url, c.kind, c.historical.impressions, c.historical.position, c.recent.impressions, c.recent.state, c.dailyImpressionLoss, c.demandClass, c.protection.verdict, c.protection.eligibleAfter, `${c.derived.blocking.length}/${c.derived.total}`, c.inventory.qualityGateReady === null ? "" : String(c.inventory.qualityGateReady), String(c.eligible), String(c.eligibleEditorial), [...new Set(c.blockers.map((b) => b.code))].join("|")].map(csvCell).join(","),
  );
  return `${[header.join(","), ...rows].join("\n")}\n`;
}

function readJson<T>(ports: Ports, filePath: string): T | null {
  try {
    return JSON.parse(ports.readText(filePath)) as T;
  } catch {
    return null;
  }
}

/**
 * The gate results the Guardian will judge, with where they came from. A recorded file carries the commit it was produced for;
 * results that were just run belong to this checkout by construction; nothing supplied means nothing was run.
 */
function gateEvidenceOf(options: CliOptions, ports: Ports, git: GitFacts): { gates: GateResult[]; provenance: GateProvenance } {
  if (options.gatesFile) {
    const run = readRecordedGateRun(readJson<unknown>(ports, options.gatesFile));
    return run
      ? { gates: run.results, provenance: { source: "RECORDED_FILE", ranOnSha: run.sha, dirtyWhenRun: run.dirty } }
      : { gates: [], provenance: { source: "RECORDED_FILE", ranOnSha: null, dirtyWhenRun: null, problem: "The gate file could not be read as gate results, so no gate result is used." } };
  }
  const gates = options.runGates ? ports.runGates(options.repoRoot) : [];
  return {
    gates,
    provenance: options.runGates ? { source: "RAN_NOW", ranOnSha: git.headSha, dirtyWhenRun: git.dirtyPaths.length > 0 } : { source: "NONE", ranOnSha: null, dirtyWhenRun: null },
  };
}

export function loadEvidence(options: CliOptions, ports: Ports): { gsc: GscEvidence | null; indexation: IndexationEvidence | null; problems: string[] } {
  const problems: string[] = [];
  if (!options.gscDir) return { gsc: null, indexation: null, problems: ["No --gsc-dir was given."] };
  const dir = options.gscDir;
  const reader = (name: string): string => {
    try {
      return ports.readText(path.join(dir, name));
    } catch (error) {
      if (options.gscPrivateDir) return ports.readText(path.join(options.gscPrivateDir, name));
      throw error;
    }
  };
  let gsc: GscEvidence | null = null;
  try {
    gsc = loadGscCapture(reader);
  } catch (error) {
    problems.push(error instanceof GscImportError ? error.message : `The capture could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  const indexation = buildIndexationEvidence((name) => {
    try {
      return JSON.parse(ports.readText(path.join(dir, name)));
    } catch {
      return null;
    }
  }, path.basename(dir));
  return { gsc, indexation, problems };
}

/**
 * Whether a call to action on the page leads to an active partner with a resolved link. A software page shows the
 * partner CTA of its own product and of every other product its decision guide and buyer checklist show, so both count. Payout readiness is
 * a separate fact reported by the Affiliate agent.
 */
export function monetizationLookup(inventory: SiteInventory, partners: readonly PartnerFacts[]): MonetizationLookup {
  const active = new Map(partners.map((p) => [p.slug, p]));
  return (url) => {
    const entry = inventory.pages.get(url);
    if (!entry) return { verified: null, detail: "The page is not in the inventory, so its products are unknown." };
    if (entry.softwareSlugs.length === 0 && entry.otherCtaSlugs.length === 0) return { verified: null, detail: "This page type has no product of its own to monetize." };
    const own = entry.softwareSlugs.map((s) => active.get(s)).filter((p): p is PartnerFacts => Boolean(p));
    const ownSlugs = new Set(own.map((p) => p.slug));
    const via = [...new Set(entry.otherCtaSlugs)].map((s) => active.get(s)).filter((p): p is PartnerFacts => Boolean(p) && !ownSlugs.has(p!.slug));
    const hits = [...own, ...via];
    if (hits.length === 0) return { verified: false, detail: "No product on this page, and no other product it shows a call to action for, has an active partner." };
    const resolved = hits.filter((p) => p.technicalPathReady && p.issuedLinkPresent && p.ledgerAgrees);
    const names = (list: readonly PartnerFacts[]) => list.map((p) => p.slug).join(", ");
    const where = `${own.length > 0 ? `own product: ${names(own)}` : ""}${own.length > 0 && via.length > 0 ? "; " : ""}${via.length > 0 ? `shown as another option: ${names(via)}` : ""}`;
    const expectedPartnerSlugs = hits.map((p) => p.slug);
    return resolved.length > 0
      ? { verified: true, detail: `Active partner call to action with a resolved issued link (${where}). Payout readiness is reported separately.`, expectedPartnerSlugs }
      : { verified: false, detail: `An active partner is shown (${where}) but its path is not fully resolved.`, expectedPartnerSlugs };
  };
}

export function runDirectorCli(options: CliOptions, ports: Ports): CliResult {
  const now = options.now;
  const today = now.toISOString().slice(0, 10);
  const sha = ports.headSha(options.repoRoot);
  const baseSha = options.baseSha ?? sha;

  const { gsc, indexation, problems } = loadEvidence(options, ports);
  const inventory = ports.loadInventory(sha, now);
  const protection = ports.loadProtection(sha, baseSha, today, now, inventory);
  const partners = ports.loadPartners();

  const extras = new Map<string, PageExtras>();
  if (options.extrasFile) {
    const raw = readJson<Array<{ url: string } & PageExtras>>(ports, options.extrasFile);
    for (const item of raw ?? []) {
      const { url, ...rest } = item;
      // Several entries for one URL (for example a live check and a query read) are combined, later fields winning.
      extras.set(url, { ...(extras.get(url) ?? {}), ...rest });
    }
  }

  let funnel: FunnelEvidence;
  if (options.eventsFile) {
    const events = readJson<FirstPartyEvent[]>(ports, options.eventsFile);
    funnel = events
      ? funnelFromEvents(events, { source: "first-party-events-file", locator: options.eventsFile, capturedAt: now.toISOString() }, null)
      : unavailable("The events file could not be read as JSON; the funnel is UNAVAILABLE, not zero.");
  } else {
    funnel = unavailableFunnel("No first-party event export was provided and the production analytics store is not read by default, so sessions and qualified clicks are UNAVAILABLE, not zero.");
  }

  const releaseDate = options.releaseDate ?? options.productionOverride?.createdAt?.slice(0, 10) ?? null;
  const google = runGoogleRecoveryAgent({
    now,
    gsc,
    protection: protection.snapshot,
    inventory,
    indexation,
    extras,
    monetization: monetizationLookup(inventory, partners),
    ...(releaseDate ? { releaseDate } : {}),
  });
  if (problems.length > 0) {
    google.warnings.push(...problems);
    google.missingInputs.push(...problems.map((p) => ({ input: "Search Console capture", howToProvide: p })));
  }

  const affiliate = runAffiliateRevenueAgent({ now, partners, gsc, inventory, protection: protection.snapshot, funnel, programStatus: ports.programStatus });

  // Guardian
  const git = ports.gitFacts(options.repoRoot, options.baseSha);
  const worktrees = ports.worktreeFacts(options.repoRoot, options.baseSha, options.repoRoot);
  const production = options.checkProduction ? ports.productionFacts(options.repoRoot, sha) : null;
  const gateEvidence = gateEvidenceOf(options, ports, git);
  const baseline = options.baselineFile ? readGateBaseline(readJson<unknown>(ports, options.baselineFile)) : null;
  const renderedDiff = options.renderedDiffFile ? readJson<{ compared?: number; differing?: number; differingSample?: string[] }>(ports, options.renderedDiffFile) : null;
  const affected = affectedByChangedFiles(git.changedFiles, (slug) => derivedUrls(inventory, `https://miloosh.com/software/${slug}`), ports.isSharedTemplate);
  const affectedNonEditable = affected.affectedUrls
    .map((url) => protectionFor(url, protection.snapshot))
    .filter((r) => r.verdict !== "EDITABLE")
    .map((r) => ({ url: r.url, verdict: r.verdict }));
  const guardian = runGuardian({
    now,
    git,
    worktrees,
    gates: gateEvidence.gates,
    gateProvenance: gateEvidence.provenance,
    baseline,
    ...(options.baselineFile && !baseline ? { baselineProblem: "The baseline file could not be read as gate results, so no baseline is used." } : {}),
    protection: { affectedUrls: affected.affectedUrls, affectedNonEditable, sharedTemplateChanged: affected.sharedTemplateChanged },
    production,
    renderedDiff: renderedDiff && typeof renderedDiff.compared === "number" && typeof renderedDiff.differing === "number" ? { compared: renderedDiff.compared, differing: renderedDiff.differing, differingSample: renderedDiff.differingSample ?? [] } : null,
  });

  const productionContext: ProductionContext | null = production
    ? { deploymentId: production.deploymentId, createdAt: production.createdAt, recordedSha: production.deployedSha }
    : options.productionOverride
      ? { deploymentId: options.productionOverride.deploymentId, createdAt: options.productionOverride.createdAt, recordedSha: options.productionOverride.sha }
      : null;

  const elapsed = new Set<string>();
  for (const [url, reasons] of protection.snapshot.byUrl) if (reasons.some((r) => r.needsClosure)) elapsed.add(url);

  const director = runDirector({
    now,
    checkoutSha: sha,
    branch: git.branch,
    google,
    affiliate,
    guardian,
    production: productionContext,
    ownerPackTitles: ports.ownerPackTitles(),
    elapsedExperimentRecords: elapsed.size,
  });
  const hebrew = redactText(renderHebrewReport(director, google, affiliate, guardian));

  const written: string[] = [];
  if (options.outDir) {
    ports.makeDirectory(options.outDir);
    const kept = google.candidates.slice(0, MAX_CANDIDATES_IN_JSON);
    const googleForFile = { ...google, candidates: kept, candidatesOmittedFromJson: google.candidates.length - kept.length };
    const files: Array<[string, string]> = [
      ["director-report.json", `${JSON.stringify(redactDeep({ schemaVersion: GROWTH_AGENT_SCHEMA_VERSION, director, google: googleForFile, affiliate, guardian }), null, 2)}\n`],
      ["director-report.he.md", hebrew],
      ["candidates.csv", candidatesCsv(google)],
    ];
    for (const [name, content] of files) {
      const target = path.join(options.outDir, name);
      ports.writeText(target, content);
      written.push(target);
    }
  }

  const needsData = google.status === "NEEDS_DATA" || affiliate.status === "NEEDS_DATA";
  return {
    exitCode: options.strict && needsData ? 3 : 0,
    stdout: hebrew,
    written,
    director,
    google,
    affiliate,
    guardian,
    hebrew,
  };
}
