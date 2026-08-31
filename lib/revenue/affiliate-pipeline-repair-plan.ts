import { CANONICAL_AFFILIATE_LEDGER } from "@/data/affiliate/canonical-ledger";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { isValidTransition, type AffiliatePipelineEntry, type AffiliatePipelineStatus } from "@/lib/revenue/affiliate-pipeline";

/**
 * Dry-run planning engine for data/affiliate/PIPELINE_REMEDIATION_MANIFEST_2026-08-29.md's
 * "9 remediations" table.
 *
 * READ-ONLY BY CONSTRUCTION: this module never imports writeAffiliatePipeline,
 * setPipelineStatus, correctOwnerActionReason, or @vercel/blob's `put` — it has
 * no code path that could reach a write call, not merely a runtime choice not
 * to call one. See tests/lib/affiliate-pipeline-repair-plan.test.ts's
 * "never imports a write-capable symbol" test, which inspects this file's real
 * source (mirroring tests/category/featured-comparisons.test.ts's existing
 * "lib/category.ts never imports any affiliate module" pattern) rather than
 * trusting this comment.
 *
 * Every field VALUE in a computed plan is re-derived live from
 * data/affiliate/active-partners.ts and data/affiliate/canonical-ledger.ts —
 * nothing here hardcodes a URL, date, or evidence string copied from the
 * manifest. Only the SCOPE (which 9 slugs, which of the two target buckets
 * each belongs to) comes from the manifest, via KNOWN_STALE_CANDIDATES below.
 * If current-truth no longer actually supports a candidate's claimed bucket
 * (drift since 2026-08-29), computeRemediationPlan() reports that record
 * UNRESOLVED rather than trusting the candidate table blindly.
 */

export type RemediationBucket = "activated" | "rejected";

export type KnownStaleCandidate = {
  slug: string;
  bucket: RemediationBucket;
  /**
   * From the manifest's table (2026-08-29) — the LAST DOCUMENTED live status,
   * kept only for an advisory transition-validity check when no fresher read
   * is available in the current environment. Never treated as a live read.
   */
  manifestDocumentedLiveStatus: AffiliatePipelineStatus;
};

/**
 * The exact 9 slugs from the manifest's "The 9 remediations" table, in the
 * same order. This list is the authorization/scope boundary for this tool.
 */
export const KNOWN_STALE_CANDIDATES: readonly KnownStaleCandidate[] = [
  { slug: "pipedrive", bucket: "activated", manifestDocumentedLiveStatus: "pending_review" },
  { slug: "todoist", bucket: "activated", manifestDocumentedLiveStatus: "submitted" },
  { slug: "getresponse", bucket: "activated", manifestDocumentedLiveStatus: "submitted" },
  { slug: "constant-contact", bucket: "activated", manifestDocumentedLiveStatus: "needs_owner_action" },
  { slug: "close", bucket: "activated", manifestDocumentedLiveStatus: "pending_review" },
  { slug: "clickup", bucket: "rejected", manifestDocumentedLiveStatus: "pending_review" },
  { slug: "n8n", bucket: "rejected", manifestDocumentedLiveStatus: "submitted" },
  { slug: "hubspot", bucket: "rejected", manifestDocumentedLiveStatus: "submitted" },
  { slug: "help-scout", bucket: "rejected", manifestDocumentedLiveStatus: "pending_review" },
] as const;

export type PipelineSourceLabel = "live-blob" | "local-fallback" | "unavailable";

/**
 * Pure input to the planner — deliberately decoupled from HOW entries were
 * obtained (no fs/env/network access happens in this module). The CLI script
 * is the only place that performs real I/O and builds this value.
 */
export type SourceContext = {
  label: PipelineSourceLabel;
  /** Real entries from that source; null only when label is "unavailable" (no token, no local fallback file — genuinely nothing to read). */
  entries: AffiliatePipelineEntry[] | null;
};

export type FieldChange = {
  field: string;
  before: string;
  after: string;
  changed: boolean;
  note?: string;
};

export type RemediationPlanRow = {
  kind: "planned";
  slug: string;
  bucket: RemediationBucket;
  /** "verified" = read from a real source this run; "unverifiable" = no source was available, before-state is unknown. */
  beforeConfidence: "verified" | "unverifiable";
  beforeSource: PipelineSourceLabel;
  beforeStatus: AffiliatePipelineStatus | "no_entry" | "unknown";
  changes: FieldChange[];
  historyAppend: { status: AffiliatePipelineStatus; at: string; note: string };
  /** Set when the before -> after status jump is not a single-step-valid transition under isValidTransition(). Advisory only — never blocks the plan. */
  transitionWarning: string | null;
  evidenceCitation: string[];
};

export type RemediationPlanUnresolved = {
  kind: "unresolved";
  slug: string;
  bucket: RemediationBucket;
  reason: string;
};

export type RemediationPlanRecord = RemediationPlanRow | RemediationPlanUnresolved;

export type RemediationReport = {
  generatedAt: string;
  sourceLabel: PipelineSourceLabel;
  records: RemediationPlanRecord[];
};

/** audit.ts's own convention for turning a YYYY-MM-DD ledger date into an ISO instant (see its daysSince() calls). Reused, not reinvented. */
function toIsoMidnight(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000Z`;
}

function findBefore(ctx: SourceContext, slug: string): AffiliatePipelineEntry | null {
  if (ctx.label === "unavailable" || !ctx.entries) return null;
  return ctx.entries.find((e) => e.slug === slug) ?? null;
}

function checkTransitionWarning(
  fromStatus: AffiliatePipelineStatus,
  targetStatus: AffiliatePipelineStatus,
  confidence: "verified" | "unverifiable"
): string | null {
  if (isValidTransition(fromStatus, targetStatus)) return null;
  const basis =
    confidence === "verified"
      ? `real current status "${fromStatus}"`
      : `the manifest's LAST-DOCUMENTED status (2026-08-29, NOT independently re-verified this run) "${fromStatus}"`;
  return (
    `NOT a single-step-valid transition under lib/revenue/affiliate-pipeline.ts's isValidTransition(): ` +
    `"${fromStatus}" -> "${targetStatus}" is not listed in VALID_TRANSITIONS["${fromStatus}"]. A live setPipelineStatus() ` +
    `call would throw "Invalid affiliate pipeline transition" using ${basis}. Reaching "${targetStatus}" for real would need ` +
    `either a multi-step fast-track through valid intermediate states (mirroring fastTrackToApproved()'s existing pattern, ` +
    `each step recorded in history) or an explicit, reviewed exception to the normal workflow state machine for this ` +
    `reconciliation. This plan still reports the manifest's intended single-entry mutation verbatim — it does not decide ` +
    `that trade-off on the owner's behalf.`
  );
}

function planActivated(slug: string, ctx: SourceContext, now: string): RemediationPlanRecord {
  const partner = getActivePartner(slug);
  if (!partner || !partner.affiliateUrl) {
    return {
      kind: "unresolved",
      slug,
      bucket: "activated",
      reason: `No verified data/affiliate/active-partners.ts entry with a non-null affiliateUrl for "${slug}". The manifest claims this record should become "activated", but current-truth no longer (or never did) support that. Refusing to guess a URL.`,
    };
  }
  const ledgerEntry = CANONICAL_AFFILIATE_LEDGER.find((p) => p.programId === slug);
  if (!ledgerEntry || ledgerEntry.status !== "ACTIVE" || ledgerEntry.affiliateUrl !== partner.affiliateUrl) {
    return {
      kind: "unresolved",
      slug,
      bucket: "activated",
      reason: `data/affiliate/canonical-ledger.ts's "${slug}" entry is not a matching ACTIVE record with the same affiliateUrl as active-partners.ts (found status=${ledgerEntry?.status ?? "MISSING"}, affiliateUrl=${ledgerEntry?.affiliateUrl ?? "MISSING"}). Refusing to guess which source is right.`,
    };
  }

  const before = findBefore(ctx, slug);
  const beforeConfidence: "verified" | "unverifiable" = ctx.label === "unavailable" ? "unverifiable" : "verified";
  const beforeStatus: AffiliatePipelineStatus | "no_entry" | "unknown" =
    beforeConfidence === "unverifiable" ? "unknown" : before ? before.status : "no_entry";
  const targetStatus: AffiliatePipelineStatus = "activated";

  const beforeOwnerActionRequired = before?.ownerActionRequired ?? null;
  // Only clears a REAL previous non-null reason; never sets a new one for "activated". Mirrors the manifest's explicit
  // "ownerActionRequired (clear to null)" instruction for constant-contact, generalized to: an activated partner should
  // never keep a stale pending-action reason, but this tool never invents a new reason for this field.
  const afterOwnerActionRequired: string | null = null;

  const beforeApprovedAt = before?.approvedAt ?? null;
  const afterApprovedAt = beforeApprovedAt ?? (ledgerEntry.decisionAt ? toIsoMidnight(ledgerEntry.decisionAt) : null);

  const beforeAffiliateUrl = before?.affiliateUrl ?? null;
  const afterAffiliateUrl = partner.affiliateUrl;

  const beforeTrackingId = before?.trackingId ?? null;
  // Deliberately preserved, not derived. The manifest's "Fields to mutate" column lists trackingId for these 5 rows but,
  // unlike affiliateUrl (quoted verbatim in the manifest), never gives an explicit trackingId value anywhere in the
  // manifest or canonical-ledger.ts. scripts/affiliate/status.ts treats trackingId as free-text operator input with no
  // codified derivation rule (e.g. "parse it from the URL's last path segment") anywhere else in this codebase. Rather
  // than invent a plausible-looking but undocumented convention, this tool leaves trackingId untouched and reports that
  // decision plainly — refusing to guess on an ambiguous field without blocking the rest of the well-evidenced record.
  const afterTrackingId = beforeTrackingId;

  const beforeSubmittedAt = before?.submittedAt ?? null;
  const afterSubmittedAt = beforeSubmittedAt; // manifest: "Do not touch submittedAt retroactively -- it's already correct on all 9."

  const beforeNotes = before?.notes ?? null;
  const afterNotes = beforeNotes; // not listed as a field to mutate

  const historyNote = `Reconciled to canonical active-partners.ts truth, ${now.slice(0, 10)}.`;

  const changes: FieldChange[] = [
    { field: "status", before: beforeStatus, after: targetStatus, changed: beforeStatus !== targetStatus },
    { field: "affiliateUrl", before: fmt(beforeAffiliateUrl), after: fmt(afterAffiliateUrl), changed: beforeAffiliateUrl !== afterAffiliateUrl },
    { field: "approvedAt", before: fmt(beforeApprovedAt), after: fmt(afterApprovedAt), changed: beforeApprovedAt !== afterApprovedAt },
    {
      field: "ownerActionRequired",
      before: fmt(beforeOwnerActionRequired),
      after: fmt(afterOwnerActionRequired),
      changed: beforeOwnerActionRequired !== afterOwnerActionRequired,
    },
    { field: "trackingId", before: fmt(beforeTrackingId), after: fmt(afterTrackingId), changed: false, note: "not specified by manifest; preserved, not fabricated" },
    { field: "submittedAt", before: fmt(beforeSubmittedAt), after: fmt(afterSubmittedAt), changed: false, note: "manifest: never touch retroactively" },
    { field: "notes", before: fmt(beforeNotes), after: fmt(afterNotes), changed: false, note: "not listed as a field to mutate" },
    {
      field: "history",
      before: `${before?.history.length ?? 0} entr${(before?.history.length ?? 0) === 1 ? "y" : "ies"}`,
      after: `+1 appended (status="${targetStatus}", note="${historyNote}")`,
      changed: true,
      note: "append-only; no existing entry rewritten",
    },
  ];

  return {
    kind: "planned",
    slug,
    bucket: "activated",
    beforeConfidence,
    beforeSource: ctx.label,
    beforeStatus,
    changes,
    historyAppend: { status: targetStatus, at: now, note: historyNote },
    transitionWarning: checkTransitionWarning(
      beforeConfidence === "verified" ? (before?.status ?? "unresearched") : KNOWN_STALE_CANDIDATES.find((c) => c.slug === slug)!.manifestDocumentedLiveStatus,
      targetStatus,
      beforeConfidence
    ),
    evidenceCitation: [
      `data/affiliate/active-partners.ts: affiliateUrl "${partner.affiliateUrl}"`,
      `data/affiliate/canonical-ledger.ts programId "${slug}": status ACTIVE, decisionAt ${ledgerEntry.decisionAt ?? "null"}`,
    ],
  };
}

function planRejected(slug: string, ctx: SourceContext, now: string): RemediationPlanRecord {
  const ledgerEntry = CANONICAL_AFFILIATE_LEDGER.find((p) => p.programId === slug);
  if (!ledgerEntry || ledgerEntry.status !== "REJECTED") {
    return {
      kind: "unresolved",
      slug,
      bucket: "rejected",
      reason: `data/affiliate/canonical-ledger.ts's "${slug}" entry is not REJECTED (found status=${ledgerEntry?.status ?? "MISSING"}). The manifest claims this record should become "rejected". Refusing to guess.`,
    };
  }
  const activePartner = getActivePartner(slug);
  if (activePartner) {
    return {
      kind: "unresolved",
      slug,
      bucket: "rejected",
      reason: `"${slug}" is REJECTED in canonical-ledger.ts but ALSO present in ACTIVE_PARTNERS — contradictory current-truth. Refusing to guess which one is right; this would itself be a serious data-integrity issue worth flagging loudly.`,
    };
  }

  const before = findBefore(ctx, slug);
  const beforeConfidence: "verified" | "unverifiable" = ctx.label === "unavailable" ? "unverifiable" : "verified";
  const beforeStatus: AffiliatePipelineStatus | "no_entry" | "unknown" =
    beforeConfidence === "unverifiable" ? "unknown" : before ? before.status : "no_entry";
  const targetStatus: AffiliatePipelineStatus = "rejected";

  const beforeOwnerActionRequired = before?.ownerActionRequired ?? null;
  const afterOwnerActionRequired = ledgerEntry.eligibility; // real, already-on-file short reason (e.g. "Declined by vendor")

  const beforeRejectedAt = before?.rejectedAt ?? null;
  const afterRejectedAt = beforeRejectedAt ?? (ledgerEntry.decisionAt ? toIsoMidnight(ledgerEntry.decisionAt) : null);

  const beforeAffiliateUrl = before?.affiliateUrl ?? null;
  const afterAffiliateUrl = beforeAffiliateUrl; // untouched -- not listed as a field to mutate for rejected rows

  const beforeTrackingId = before?.trackingId ?? null;
  const afterTrackingId = beforeTrackingId; // untouched, same reasoning as the activated bucket

  const beforeSubmittedAt = before?.submittedAt ?? null;
  const afterSubmittedAt = beforeSubmittedAt;

  const beforeNotes = before?.notes ?? null;
  const afterNotes = beforeNotes;

  const historyNote = `Reconciled to canonical-ledger.ts REJECTED evidence (${ledgerEntry.evidence.join("; ")}), ${now.slice(0, 10)}.`;

  const changes: FieldChange[] = [
    { field: "status", before: beforeStatus, after: targetStatus, changed: beforeStatus !== targetStatus },
    {
      field: "ownerActionRequired",
      before: fmt(beforeOwnerActionRequired),
      after: fmt(afterOwnerActionRequired),
      changed: beforeOwnerActionRequired !== afterOwnerActionRequired,
    },
    { field: "rejectedAt", before: fmt(beforeRejectedAt), after: fmt(afterRejectedAt), changed: beforeRejectedAt !== afterRejectedAt },
    { field: "affiliateUrl", before: fmt(beforeAffiliateUrl), after: fmt(afterAffiliateUrl), changed: false, note: "not listed as a field to mutate for rejected rows" },
    { field: "trackingId", before: fmt(beforeTrackingId), after: fmt(afterTrackingId), changed: false, note: "not specified by manifest; preserved, not fabricated" },
    { field: "submittedAt", before: fmt(beforeSubmittedAt), after: fmt(afterSubmittedAt), changed: false, note: "manifest: never touch retroactively" },
    { field: "notes", before: fmt(beforeNotes), after: fmt(afterNotes), changed: false, note: "not listed as a field to mutate" },
    {
      field: "history",
      before: `${before?.history.length ?? 0} entr${(before?.history.length ?? 0) === 1 ? "y" : "ies"}`,
      after: `+1 appended (status="${targetStatus}", note="${historyNote}")`,
      changed: true,
      note: "append-only; no existing entry rewritten",
    },
  ];

  return {
    kind: "planned",
    slug,
    bucket: "rejected",
    beforeConfidence,
    beforeSource: ctx.label,
    beforeStatus,
    changes,
    historyAppend: { status: targetStatus, at: now, note: historyNote },
    transitionWarning: checkTransitionWarning(
      beforeConfidence === "verified" ? (before?.status ?? "unresearched") : KNOWN_STALE_CANDIDATES.find((c) => c.slug === slug)!.manifestDocumentedLiveStatus,
      targetStatus,
      beforeConfidence
    ),
    evidenceCitation: [`data/affiliate/canonical-ledger.ts programId "${slug}": status REJECTED, decisionAt ${ledgerEntry.decisionAt ?? "null"}, evidence: ${ledgerEntry.evidence.join("; ")}`],
  };
}

function fmt(value: string | null): string {
  return value === null ? "null" : JSON.stringify(value);
}

export function computeRemediationPlan(
  ctx: SourceContext,
  candidates: readonly KnownStaleCandidate[] = KNOWN_STALE_CANDIDATES,
  now: string = new Date().toISOString()
): RemediationReport {
  const records = candidates.map((candidate) =>
    candidate.bucket === "activated" ? planActivated(candidate.slug, ctx, now) : planRejected(candidate.slug, ctx, now)
  );
  return { generatedAt: now, sourceLabel: ctx.label, records };
}

export function formatRemediationReport(report: RemediationReport): string[] {
  const lines: string[] = [];
  lines.push("================================================================");
  lines.push("   AFFILIATE PIPELINE STALENESS — DRY-RUN REPAIR PLAN (no writes) ");
  lines.push("================================================================");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Pipeline read source: ${report.sourceLabel}`);
  if (report.sourceLabel === "unavailable") {
    lines.push("");
    lines.push("*** NOTICE: no BLOB_READ_WRITE_TOKEN and no local fallback file were available in this environment. ***");
    lines.push("*** Current live pipeline state could NOT be read. Every \"before\" value below is UNVERIFIABLE —      ***");
    lines.push("*** not re-checked this run. Intended-after values are still fully computed from current-truth      ***");
    lines.push("*** (active-partners.ts / canonical-ledger.ts), which do not require pipeline access. Re-run this   ***");
    lines.push("*** tool in an environment with real pipeline access before treating this as execution-ready.       ***");
  }
  lines.push("");
  lines.push("This is a DRY RUN. This module never imports a write-capable function — see");
  lines.push("tests/lib/affiliate-pipeline-repair-plan.test.ts. No Vercel Blob write is reachable from this code path.");
  lines.push("");

  const planned = report.records.filter((r): r is RemediationPlanRow => r.kind === "planned");
  const unresolved = report.records.filter((r): r is RemediationPlanUnresolved => r.kind === "unresolved");

  for (const record of report.records) {
    lines.push("----------------------------------------------------------------");
    if (record.kind === "unresolved") {
      lines.push(`[${record.slug}] bucket=${record.bucket} — UNRESOLVED, NOT PLANNED`);
      lines.push(`  reason: ${record.reason}`);
      continue;
    }
    const confidenceLabel =
      record.beforeConfidence === "verified" ? `verified via ${record.beforeSource}` : `UNVERIFIABLE (${record.beforeSource})`;
    lines.push(`[${record.slug}] bucket=${record.bucket} — before-status=${record.beforeStatus} (${confidenceLabel})`);
    for (const change of record.changes) {
      const marker = change.changed ? "~" : " ";
      const noteSuffix = change.note ? `   // ${change.note}` : "";
      lines.push(`  ${marker} ${change.field.padEnd(18)}: ${change.before}  ->  ${change.after}${noteSuffix}`);
    }
    if (record.transitionWarning) {
      lines.push(`  ! WARNING: ${record.transitionWarning}`);
    }
    for (const evidence of record.evidenceCitation) {
      lines.push(`  evidence: ${evidence}`);
    }
  }

  lines.push("----------------------------------------------------------------");
  lines.push("");
  lines.push(`Summary: ${planned.length} planned, ${unresolved.length} unresolved, ${report.records.length} candidate(s) total.`);
  const withWarnings = planned.filter((r) => r.transitionWarning !== null).length;
  if (withWarnings > 0) {
    lines.push(`${withWarnings} planned record(s) carry a transition-validity warning — see WARNING lines above before any live execution.`);
  }

  return lines;
}
