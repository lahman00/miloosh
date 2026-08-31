import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  computeRemediationPlan,
  formatRemediationReport,
  KNOWN_STALE_CANDIDATES,
  type RemediationPlanRow,
  type SourceContext,
} from "@/lib/revenue/affiliate-pipeline-repair-plan";
import { isValidTransition, type AffiliatePipelineEntry } from "@/lib/revenue/affiliate-pipeline";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { CANONICAL_AFFILIATE_LEDGER } from "@/data/affiliate/canonical-ledger";

const NOW = "2026-08-31T12:00:00.000Z";

/**
 * Fixture mirroring exactly what
 * data/affiliate/PIPELINE_REMEDIATION_MANIFEST_2026-08-29.md documents as each
 * slug's stale LIVE status, as of 2026-08-29. Hand-built, no real Blob/local-file
 * I/O anywhere in this file — per the task's "fixtures/mocks only" requirement.
 */
function blankFixture(slug: string, status: AffiliatePipelineEntry["status"], overrides: Partial<AffiliatePipelineEntry> = {}): AffiliatePipelineEntry {
  return {
    slug,
    status,
    ownerActionRequired: null,
    submittedAt: "2026-08-14T00:00:00.000Z",
    approvedAt: null,
    rejectedAt: null,
    affiliateUrl: null,
    trackingId: null,
    notes: null,
    history: [{ status, at: "2026-08-15T00:00:00.000Z", note: null }],
    ...overrides,
  };
}

const NINE_STALE_FIXTURE: AffiliatePipelineEntry[] = [
  blankFixture("pipedrive", "pending_review"),
  blankFixture("todoist", "submitted"),
  blankFixture("getresponse", "submitted"),
  blankFixture("constant-contact", "needs_owner_action", { ownerActionRequired: "Waiting on owner to confirm PartnerStack profile." }),
  blankFixture("close", "pending_review"),
  blankFixture("clickup", "pending_review"),
  blankFixture("n8n", "submitted"),
  blankFixture("hubspot", "submitted"),
  blankFixture("help-scout", "pending_review"),
];

function planFor(records: ReturnType<typeof computeRemediationPlan>["records"], slug: string): RemediationPlanRow {
  const record = records.find((r) => r.slug === slug);
  if (!record || record.kind !== "planned") throw new Error(`Expected a planned record for ${slug}, got ${JSON.stringify(record)}`);
  return record;
}

function fieldOf(row: RemediationPlanRow, field: string) {
  const change = row.changes.find((c) => c.field === field);
  if (!change) throw new Error(`No "${field}" change on ${row.slug}`);
  return change;
}

describe("affiliate-pipeline-repair-plan: structural write-safety", () => {
  it("never imports a write-capable symbol (checks real import statements, not comments or descriptive strings)", () => {
    for (const relativePath of [
      "lib/revenue/affiliate-pipeline-repair-plan.ts",
      "scripts/affiliate/pipeline-repair-dry-run.ts",
    ]) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf-8");
      const codeOnly = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");

      // The precise, structural claim: these symbols are never IMPORTED, so there is no
      // identifier in scope that could be called, regardless of what any string prints
      // (e.g. a warning message is allowed to describe what setPipelineStatus() would do
      // without this module ever importing or calling the real thing).
      const importLines = codeOnly.split("\n").filter((line) => /^\s*import\b/.test(line));
      const importBlock = importLines.join("\n");
      expect(importBlock, `${relativePath} must not import writeAffiliatePipeline`).not.toMatch(/writeAffiliatePipeline/);
      expect(importBlock, `${relativePath} must not import setPipelineStatus`).not.toMatch(/setPipelineStatus/);
      expect(importBlock, `${relativePath} must not import correctOwnerActionReason`).not.toMatch(/correctOwnerActionReason/);
      expect(importBlock, `${relativePath} must not import @vercel/blob`).not.toMatch(/@vercel\/blob/);

      // Whole-file (still comment-stripped) checks for anything that could reach a write
      // path without going through a named import at all (a dynamic import of
      // @vercel/blob, or a direct fs write call) — both real code shapes, never mentioned
      // as descriptive text anywhere in this module's own output strings.
      expect(codeOnly, `${relativePath} must not dynamically import @vercel/blob`).not.toMatch(/@vercel\/blob/);
      expect(codeOnly, `${relativePath} must not call a write-flavored fs function`).not.toMatch(/writeFileSync|writeFile\(|fs\.write/);

      // Since the three write-capable symbols are proven un-imported above, TypeScript
      // itself guarantees no call to them can exist in this file (an unimported identifier
      // is a compile error) — confirmed separately by this repo's `npx tsc --noEmit` passing.
    }
  });
});

describe("affiliate-pipeline-repair-plan: source-unavailable handling", () => {
  const ctx: SourceContext = { label: "unavailable", entries: null };
  const report = computeRemediationPlan(ctx, KNOWN_STALE_CANDIDATES, NOW);

  it("still plans all 9 candidates (evidence comes from current-truth, not from the pipeline read)", () => {
    expect(report.records).toHaveLength(9);
    expect(report.records.every((r) => r.kind === "planned")).toBe(true);
  });

  it("marks every record's before-state as unverifiable, not silently blank", () => {
    for (const record of report.records) {
      const row = record as RemediationPlanRow;
      expect(row.beforeConfidence).toBe("unverifiable");
      expect(row.beforeStatus).toBe("unknown");
    }
  });

  it("still computes correct intended-after values purely from current-truth", () => {
    const pipedrive = planFor(report.records, "pipedrive");
    expect(fieldOf(pipedrive, "status").after).toBe("activated");
    expect(fieldOf(pipedrive, "affiliateUrl").after).toBe(JSON.stringify(getActivePartner("pipedrive")!.affiliateUrl));
  });

  it("formatRemediationReport prints a loud unavailable-source notice", () => {
    const lines = formatRemediationReport(report).join("\n");
    expect(lines).toMatch(/NOTICE.*no BLOB_READ_WRITE_TOKEN and no local fallback file/);
    expect(lines).toMatch(/UNVERIFIABLE/);
  });
});

describe("affiliate-pipeline-repair-plan: source available but genuinely empty", () => {
  const ctx: SourceContext = { label: "local-fallback", entries: [] };
  const report = computeRemediationPlan(ctx, KNOWN_STALE_CANDIDATES, NOW);

  it("treats every candidate as verified-but-never-tracked (no_entry), matching blankEntry() semantics", () => {
    for (const record of report.records) {
      const row = record as RemediationPlanRow;
      expect(row.beforeConfidence).toBe("verified");
      expect(row.beforeStatus).toBe("no_entry");
    }
  });
});

describe("affiliate-pipeline-repair-plan: full known-stale fixture (matches the manifest exactly)", () => {
  const ctx: SourceContext = { label: "live-blob", entries: NINE_STALE_FIXTURE };
  const report = computeRemediationPlan(ctx, KNOWN_STALE_CANDIDATES, NOW);

  it("plans all 5 activations with the real active-partners.ts URL and no invented trackingId", () => {
    for (const slug of ["pipedrive", "todoist", "getresponse", "constant-contact", "close"]) {
      const row = planFor(report.records, slug);
      expect(row.bucket).toBe("activated");
      expect(fieldOf(row, "status").after).toBe("activated");
      expect(fieldOf(row, "affiliateUrl").after).toBe(JSON.stringify(getActivePartner(slug)!.affiliateUrl));
      expect(fieldOf(row, "affiliateUrl").changed).toBe(true);
      const trackingChange = fieldOf(row, "trackingId");
      expect(trackingChange.before).toBe("null");
      expect(trackingChange.after).toBe("null");
      expect(trackingChange.changed).toBe(false);
    }
  });

  it("clears constant-contact's stale ownerActionRequired to null on activation", () => {
    const row = planFor(report.records, "constant-contact");
    const change = fieldOf(row, "ownerActionRequired");
    expect(change.before).toBe(JSON.stringify("Waiting on owner to confirm PartnerStack profile."));
    expect(change.after).toBe("null");
    expect(change.changed).toBe(true);
  });

  it("fills approvedAt from canonical-ledger.ts's real decisionAt when none was already set", () => {
    const pipedrive = planFor(report.records, "pipedrive");
    const ledgerEntry = CANONICAL_AFFILIATE_LEDGER.find((p) => p.programId === "pipedrive")!;
    expect(fieldOf(pipedrive, "approvedAt").after).toBe(JSON.stringify(`${ledgerEntry.decisionAt}T00:00:00.000Z`));

    const close = planFor(report.records, "close");
    const closeLedger = CANONICAL_AFFILIATE_LEDGER.find((p) => p.programId === "close")!;
    expect(fieldOf(close, "approvedAt").after).toBe(JSON.stringify(`${closeLedger.decisionAt}T00:00:00.000Z`));
  });

  it("preserves an already-set approvedAt instead of overwriting it", () => {
    const alreadyApproved = blankFixture("pipedrive", "approved", { approvedAt: "2026-08-10T00:00:00.000Z" });
    const customCtx: SourceContext = { label: "live-blob", entries: [alreadyApproved] };
    const customReport = computeRemediationPlan(customCtx, [KNOWN_STALE_CANDIDATES.find((c) => c.slug === "pipedrive")!], NOW);
    const row = planFor(customReport.records, "pipedrive");
    const change = fieldOf(row, "approvedAt");
    expect(change.before).toBe(JSON.stringify("2026-08-10T00:00:00.000Z"));
    expect(change.after).toBe(JSON.stringify("2026-08-10T00:00:00.000Z"));
    expect(change.changed).toBe(false);
  });

  it("plans all 4 rejections with real canonical-ledger.ts evidence and no affiliateUrl/trackingId invention", () => {
    for (const slug of ["clickup", "n8n", "hubspot", "help-scout"]) {
      const row = planFor(report.records, slug);
      const ledgerEntry = CANONICAL_AFFILIATE_LEDGER.find((p) => p.programId === slug)!;
      expect(row.bucket).toBe("rejected");
      expect(fieldOf(row, "status").after).toBe("rejected");
      expect(fieldOf(row, "ownerActionRequired").after).toBe(JSON.stringify(ledgerEntry.eligibility));
      expect(fieldOf(row, "rejectedAt").after).toBe(JSON.stringify(`${ledgerEntry.decisionAt}T00:00:00.000Z`));
      expect(fieldOf(row, "affiliateUrl").changed).toBe(false);
      expect(fieldOf(row, "trackingId").changed).toBe(false);
      expect(row.evidenceCitation.join(" ")).toContain(ledgerEntry.evidence[0]!);
    }
  });

  it("preserves an already-set rejectedAt instead of overwriting it", () => {
    const alreadyRejected = blankFixture("n8n", "rejected", { rejectedAt: "2026-08-01T00:00:00.000Z" });
    const customCtx: SourceContext = { label: "live-blob", entries: [alreadyRejected] };
    const customReport = computeRemediationPlan(customCtx, [KNOWN_STALE_CANDIDATES.find((c) => c.slug === "n8n")!], NOW);
    const row = planFor(customReport.records, "n8n");
    const change = fieldOf(row, "rejectedAt");
    expect(change.before).toBe(JSON.stringify("2026-08-01T00:00:00.000Z"));
    expect(change.after).toBe(JSON.stringify("2026-08-01T00:00:00.000Z"));
    expect(change.changed).toBe(false);
  });

  it("never rewrites history — only ever reports a single append", () => {
    for (const record of report.records) {
      const row = record as RemediationPlanRow;
      const historyChange = fieldOf(row, "history");
      expect(historyChange.before).toBe("1 entry");
      expect(historyChange.after).toMatch(/^\+1 appended/);
    }
  });

  it("submittedAt and notes are never touched for any of the 9 records", () => {
    for (const record of report.records) {
      const row = record as RemediationPlanRow;
      expect(fieldOf(row, "submittedAt").changed).toBe(false);
      expect(fieldOf(row, "notes").changed).toBe(false);
    }
  });

  /**
   * Cross-checked directly against the real isValidTransition() state machine
   * rather than a hardcoded expectation: none of pending_review, submitted, or
   * needs_owner_action list "activated" as a direct next state (only
   * approved -> affiliate_link_received -> activated does), so all 5
   * activations are flagged; clickup/help-scout's pending_review -> rejected
   * IS listed, so those two are clean, while n8n/hubspot's submitted ->
   * rejected is NOT listed (submitted only allows pending_review or
   * needs_owner_action), so those two are also flagged.
   */
  it("flags every manifest-specified transition that is not single-step-valid under the real state machine, and only those", () => {
    for (const candidate of KNOWN_STALE_CANDIDATES) {
      const fixtureEntry = NINE_STALE_FIXTURE.find((e) => e.slug === candidate.slug)!;
      const row = planFor(report.records, candidate.slug);
      const targetStatus = candidate.bucket === "activated" ? "activated" : "rejected";
      const expectValid = isValidTransition(fixtureEntry.status, targetStatus);
      if (expectValid) {
        expect(row.transitionWarning, `${candidate.slug} should have no warning`).toBeNull();
      } else {
        expect(row.transitionWarning, `${candidate.slug} should carry a warning`).toMatch(/NOT a single-step-valid transition/);
      }
    }

    expect(planFor(report.records, "clickup").transitionWarning).toBeNull();
    expect(planFor(report.records, "help-scout").transitionWarning).toBeNull();
    expect(planFor(report.records, "pipedrive").transitionWarning).not.toBeNull();
    expect(planFor(report.records, "n8n").transitionWarning).not.toBeNull();
  });
});

describe("affiliate-pipeline-repair-plan: refuses to guess on ambiguous/unsupported evidence", () => {
  it("reports UNRESOLVED for an 'activated' candidate with no matching ACTIVE_PARTNERS entry", () => {
    const ctx: SourceContext = { label: "unavailable", entries: null };
    const report = computeRemediationPlan(ctx, [{ slug: "notion", bucket: "activated", manifestDocumentedLiveStatus: "pending_review" }], NOW);
    expect(report.records).toHaveLength(1);
    expect(report.records[0]!.kind).toBe("unresolved");
    if (report.records[0]!.kind === "unresolved") {
      expect(report.records[0]!.reason).toMatch(/No verified data\/affiliate\/active-partners\.ts entry/);
    }
  });

  it("reports UNRESOLVED for a 'rejected' candidate whose canonical-ledger.ts status is not REJECTED", () => {
    const ctx: SourceContext = { label: "unavailable", entries: null };
    // pipedrive is real and ACTIVE in canonical-ledger.ts, not REJECTED -- a deliberately wrong bucket to prove the guard is real.
    const report = computeRemediationPlan(ctx, [{ slug: "pipedrive", bucket: "rejected", manifestDocumentedLiveStatus: "pending_review" }], NOW);
    expect(report.records[0]!.kind).toBe("unresolved");
    if (report.records[0]!.kind === "unresolved") {
      expect(report.records[0]!.reason).toMatch(/is not REJECTED/);
    }
  });

  it("formatRemediationReport clearly labels unresolved records and excludes them from the planned count", () => {
    const ctx: SourceContext = { label: "unavailable", entries: null };
    const report = computeRemediationPlan(ctx, [{ slug: "notion", bucket: "activated", manifestDocumentedLiveStatus: "pending_review" }], NOW);
    const text = formatRemediationReport(report).join("\n");
    expect(text).toMatch(/UNRESOLVED, NOT PLANNED/);
    expect(text).toMatch(/Summary: 0 planned, 1 unresolved/);
  });
});

describe("affiliate-pipeline-repair-plan: KNOWN_STALE_CANDIDATES matches the manifest exactly", () => {
  it("has exactly the 9 slugs the manifest names, in the two documented buckets", () => {
    const activated = KNOWN_STALE_CANDIDATES.filter((c) => c.bucket === "activated").map((c) => c.slug).sort();
    const rejected = KNOWN_STALE_CANDIDATES.filter((c) => c.bucket === "rejected").map((c) => c.slug).sort();
    expect(activated).toEqual(["close", "constant-contact", "getresponse", "pipedrive", "todoist"].sort());
    expect(rejected).toEqual(["clickup", "help-scout", "hubspot", "n8n"].sort());
    expect(KNOWN_STALE_CANDIDATES).toHaveLength(9);
  });

  it("every activated candidate currently resolves to a real ACTIVE_PARTNERS URL in this repo today", () => {
    for (const candidate of KNOWN_STALE_CANDIDATES.filter((c) => c.bucket === "activated")) {
      expect(getActivePartner(candidate.slug)?.affiliateUrl, `${candidate.slug} should have a real affiliateUrl`).toBeTruthy();
    }
  });

  it("every rejected candidate is genuinely REJECTED in canonical-ledger.ts today", () => {
    for (const candidate of KNOWN_STALE_CANDIDATES.filter((c) => c.bucket === "rejected")) {
      const ledgerEntry = CANONICAL_AFFILIATE_LEDGER.find((p) => p.programId === candidate.slug);
      expect(ledgerEntry?.status, `${candidate.slug} should be REJECTED`).toBe("REJECTED");
    }
  });
});
