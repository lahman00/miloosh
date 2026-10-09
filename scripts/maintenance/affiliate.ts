import { getAllSoftware } from "@/data/software";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { getAffiliateActivation } from "@/lib/revenue/affiliate-manager";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getRevenueScores } from "@/lib/revenue/scoring";
import { getRevenueTier } from "@/lib/revenue/tiers";
import { runAgent } from "@/lib/maintenance/run-agent";
import { writeReport } from "@/lib/maintenance/report-io";
import type { MaintenanceIssue } from "@/types/maintenance";
import { pathToFileURL } from "node:url";

/**
 * Sprint 12 Phase 7 — Affiliate Opportunity Agent. Reads only
 * data/revenue/affiliate-programs.ts and the existing revenue scoring —
 * never fabricates a program status, never touches
 * config/affiliate-credentials.json or env vars beyond checking whether
 * something is active. Never reports a raw affiliate URL/ID — only
 * whether one is configured — so this report is safe to display on the
 * internal dashboard without exposing a secret.
 */

const STALE_RESEARCH_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysSince(isoDate: string, now: Date): number {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - then) / MS_PER_DAY);
}

async function run() {
  const now = new Date();
  const allSoftware = getAllSoftware();
  const softwareBySlug = new Map(allSoftware.map((s) => [s.slug, s]));
  const scores = getRevenueScores(allSoftware);
  const tierBySlug = new Map(scores.map((s) => [s.slug, getRevenueTier(s.totalScore)]));

  const issues: MaintenanceIssue[] = [];

  const confirmedNotActivated: string[] = [];
  const unresolved: string[] = [];
  const highTierNoProgram: string[] = [];
  const staleResearch: string[] = [];

  for (const program of AFFILIATE_PROGRAMS) {
    const software = softwareBySlug.get(program.slug);
    const name = software?.name ?? program.slug;
    const tier = tierBySlug.get(program.slug);
    const activation = getAffiliateActivation(program.slug);
    // softwareToAffiliateLink() (lib/affiliate.ts) — the resolver that actually
    // decides the live CTA — checks BOTH this env/config activation AND the
    // canonical active-partners.ts registry. Checking only the former here
    // produced a false "not activated" warning for every one of the 13 real
    // active partners (all activated via active-partners.ts, none via env
    // vars), which is the actually-used mechanism for real revenue today.
    const isActive = activation.isActive || Boolean(getActivePartner(program.slug)?.affiliateUrl);

    if (program.programExists === "yes" && !isActive) {
      confirmedNotActivated.push(program.slug);
      issues.push({
        id: `affiliate-confirmed-not-activated-${program.slug}`,
        severity: tier === "A" ? "warning" : "info",
        title: `${name}: confirmed affiliate program not activated`,
        description: `programExists is "yes"${program.networkName ? ` (${program.networkName})` : ""}, but no affiliate URL is currently configured (checked env vars, config/affiliate-credentials.json, and data/affiliate/active-partners.ts). ${tier === "A" ? "This is a Tier A product — see docs/affiliate-applications.md." : "Applying is optional for lower tiers, but the program is confirmed real."}`,
        location: program.slug,
      });
    }

    if (program.programExists === "unknown") {
      unresolved.push(program.slug);
      issues.push({
        id: `affiliate-unresolved-${program.slug}`,
        severity: "info",
        title: `${name}: affiliate program status unresolved`,
        description: `Official pages couldn't confirm or rule out a program as of ${program.lastVerifiedAt}. ${program.notes}`,
        location: program.slug,
      });
    }

    if ((tier === "A" || tier === "B") && program.programExists !== "yes") {
      highTierNoProgram.push(program.slug);
      issues.push({
        id: `affiliate-high-tier-no-program-${program.slug}`,
        severity: "warning",
        title: `${name}: Tier ${tier} commercial priority but no confirmed program`,
        description: `Revenue Tier ${tier} (see /internal/revenue) but affiliate programExists is "${program.programExists}" — high traffic/relevance value with no clear monetization path today.`,
        location: program.slug,
      });
    }

    const age = daysSince(program.lastVerifiedAt, now);
    if (age > STALE_RESEARCH_DAYS) {
      staleResearch.push(program.slug);
      issues.push({
        id: `affiliate-stale-research-${program.slug}`,
        severity: "warning",
        title: `${name}: affiliate research is ${age} days old`,
        description: `lastVerifiedAt = ${program.lastVerifiedAt}, over the ${STALE_RESEARCH_DAYS}-day freshness threshold. Re-check official sources before relying on this status.`,
        location: program.slug,
      });
    }
  }

  return {
    summary: `Reviewed ${AFFILIATE_PROGRAMS.length} affiliate program records. ${confirmedNotActivated.length} confirmed-but-inactive, ${unresolved.length} unresolved, ${highTierNoProgram.length} high-tier without a confirmed program, ${staleResearch.length} with research older than ${STALE_RESEARCH_DAYS} days. No program status was changed and no credentials were read or written.`,
    issues,
    data: {
      confirmedNotActivated,
      unresolved,
      highTierNoProgram,
      staleResearch,
      // Never include the activation's actual URL/ID — only whether one exists.
      activationOverview: AFFILIATE_PROGRAMS.map((p) => ({
        slug: p.slug,
        programExists: p.programExists,
        isActive: getAffiliateActivation(p.slug).isActive,
      })),
    },
  };
}

export async function executeAffiliateAgent() {
  const report = await runAgent("affiliate", run);

  const extra = report.data
    ? [
        "## Confirmed but not activated",
        "",
        report.data.confirmedNotActivated.join(", ") || "None.",
        "",
        "## Unresolved (needs manual research)",
        "",
        report.data.unresolved.join(", ") || "None.",
        "",
        "## High commercial tier, no confirmed program",
        "",
        report.data.highTierNoProgram.join(", ") || "None.",
        "",
        "## Stale research (>90 days)",
        "",
        report.data.staleResearch.join(", ") || "None — all research is current.",
        "",
      ].join("\n")
    : "";

  writeReport(report, extra);
  return report;
}

async function main() {
  const report = await executeAffiliateAgent();
  console.log(`[affiliate] ${report.summary}`);
  console.log(`[affiliate] run status: ${report.run.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
