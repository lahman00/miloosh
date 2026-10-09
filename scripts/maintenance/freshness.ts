import { getAllSoftware, type Software } from "@/data/software";
import { getAffiliateProgram } from "@/data/revenue/affiliate-programs";
import { runAgent } from "@/lib/maintenance/run-agent";
import { writeReport } from "@/lib/maintenance/report-io";
import type { MaintenanceIssue } from "@/types/maintenance";
import { pathToFileURL } from "node:url";

/**
 * Sprint 12 Phase 3 — Data Freshness Agent. Scores every software entry
 * 0-100 from measurable factors only (dates, field presence, counts) —
 * never from an opinion about whether the facts are still true. A high
 * score means "well-documented and recently checked," not "verified
 * correct today." See the disclaimer repeated in every report this agent
 * produces, and docs/maintenance-system.md.
 */

export type FreshnessFactor = {
  label: string;
  deduction: number;
  reason: string;
};

export type FreshnessScore = {
  slug: string;
  name: string;
  score: number;
  factors: FreshnessFactor[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysSince(isoDate: string, now: Date): number {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - then) / MS_PER_DAY);
}

function ageDeduction(days: number): { deduction: number; bucket: string } {
  if (days <= 30) return { deduction: 0, bucket: "0-30 days" };
  if (days <= 90) return { deduction: 5, bucket: "31-90 days" };
  if (days <= 180) return { deduction: 10, bucket: "91-180 days" };
  if (days <= 365) return { deduction: 20, bucket: "181-365 days" };
  return { deduction: 30, bucket: "over 365 days" };
}

const OPTIONAL_FIELDS: Array<{ key: keyof Software; label: string }> = [
  { key: "founded", label: "founded" },
  { key: "company", label: "company" },
  { key: "platforms", label: "platforms" },
  { key: "pros", label: "pros" },
  { key: "cons", label: "cons" },
  { key: "faq", label: "faq" },
  { key: "tags", label: "tags" },
];

function isFieldPresent(software: Software, key: keyof Software): boolean {
  const value = software[key];
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Exported so other agents (e.g. scripts/agents/growth/freshness-revenue-priority.ts) can reuse the same scoring logic without re-running/re-writing this whole agent's report. */
export function scoreSoftware(software: Software, now: Date): FreshnessScore {
  const factors: FreshnessFactor[] = [];

  // Source access date: present (schema-required) vs. genuinely missing.
  if (!software.accessedAt) {
    factors.push({ label: "Source access date missing", deduction: 15, reason: "accessedAt is not set." });
  } else {
    factors.push({ label: "Source access date documented", deduction: 0, reason: `accessedAt = ${software.accessedAt}.` });
  }

  // Age of source evidence — real day-count decay from accessedAt.
  const age = software.accessedAt ? daysSince(software.accessedAt, now) : Number.POSITIVE_INFINITY;
  const { deduction: ageDed, bucket } = ageDeduction(age);
  factors.push({
    label: "Age of source evidence",
    deduction: ageDed,
    reason: Number.isFinite(age) ? `Sources last checked ${age} day(s) ago (${bucket}).` : "No accessedAt to compute age from.",
  });

  // Missing optional fields.
  for (const { key, label } of OPTIONAL_FIELDS) {
    if (!isFieldPresent(software, key)) {
      factors.push({ label: `Missing ${label}`, deduction: 3, reason: `${label} is not set on this entry.` });
    }
  }
  if (!software.pricing?.model || software.pricing.model === "unknown") {
    factors.push({ label: "Missing pricing model", deduction: 3, reason: "pricing.model is not set or unknown." });
  }

  // Missing official website — schema-required, checked defensively anyway.
  if (!software.website) {
    factors.push({ label: "Missing official website", deduction: 15, reason: "website is not set." });
  }

  // Missing vendor resources.
  const hasAnyVendorLink = software.links && Object.values(software.links).some((value) => Boolean(value));
  if (!hasAnyVendorLink) {
    factors.push({ label: "Missing vendor resources", deduction: 5, reason: "No links.* (pricing/docs/support/integrations/status/community) are set." });
  }

  // Unresolved affiliate status.
  const program = getAffiliateProgram(software.slug);
  if (program?.programExists === "unknown") {
    factors.push({ label: "Unresolved affiliate status", deduction: 8, reason: "Affiliate program status is still \"unknown\" — see data/revenue/affiliate-programs.ts." });
  }

  // Number of verified sources.
  const sourceCount = software.sources.length;
  if (sourceCount <= 1) {
    factors.push({ label: "Thin source coverage", deduction: 5, reason: `Only ${sourceCount} source URL(s) on record.` });
  } else if (sourceCount === 2) {
    factors.push({ label: "Light source coverage", deduction: 2, reason: `${sourceCount} source URLs on record.` });
  }

  const totalDeduction = factors.reduce((sum, factor) => sum + factor.deduction, 0);
  const score = Math.max(0, Math.min(100, 100 - totalDeduction));

  return { slug: software.slug, name: software.name, score, factors: factors.filter((f) => f.deduction > 0) };
}

async function run() {
  const now = new Date();
  const scores = getAllSoftware()
    .map((software) => scoreSoftware(software, now))
    .sort((a, b) => a.score - b.score);

  const issues: MaintenanceIssue[] = scores
    .filter((s) => s.score < 70)
    .map((s) => ({
      id: `freshness-${s.slug}`,
      severity: s.score < 40 ? "critical" : "warning",
      title: `${s.name} freshness score: ${s.score}/100`,
      description: s.factors.map((f) => `-${f.deduction} ${f.label} (${f.reason})`).join(" "),
      location: s.slug,
    }));

  const average = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);

  return {
    summary: `Scored ${scores.length} software entries. Average freshness: ${average}/100. This score measures how recently and thoroughly each entry is documented — it does NOT verify the underlying facts are still accurate. See docs/maintenance-system.md.`,
    issues,
    data: { averageScore: average, rankings: scores },
  };
}

export async function executeFreshnessAgent() {
  const report = await runAgent("freshness", run);

  const extra = report.data
    ? [
        "## Ranking (worst first)",
        "",
        "| Software | Score | Top deductions |",
        "|---|---|---|",
        ...report.data.rankings.map(
          (s) =>
            `| ${s.name} | ${s.score}/100 | ${s.factors
              .slice(0, 3)
              .map((f) => `${f.label} (-${f.deduction})`)
              .join(", ") || "none"} |`
        ),
        "",
        "> **Freshness measures documentation recency and completeness, not factual correctness.** A 100/100 entry can still contain an outdated fact; a low score does not mean anything is currently wrong.",
        "",
      ].join("\n")
    : "";

  writeReport(report, extra);
  return report;
}

async function main() {
  const report = await executeFreshnessAgent();
  console.log(`[freshness] ${report.summary}`);
  console.log(`[freshness] run status: ${report.run.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
