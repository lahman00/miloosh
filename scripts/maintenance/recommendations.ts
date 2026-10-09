import { getRecommendations } from "@/lib/recommend/engine";
import { RECOMMENDATION_FIXTURES, type FixtureAssertion, type RegressionFixture } from "@/lib/maintenance/recommendation-fixtures";
import type { SoftwareRecommendation } from "@/lib/recommend/types";
import { runAgent } from "@/lib/maintenance/run-agent";
import { writeReport } from "@/lib/maintenance/report-io";
import type { MaintenanceIssue } from "@/types/maintenance";
import { pathToFileURL } from "node:url";

/**
 * Sprint 12 Phase 5 — Recommendation Regression Agent. Runs every fixture
 * in lib/maintenance/recommendation-fixtures.ts against the real,
 * deterministic engine (lib/recommend/engine.ts) and checks structural
 * assertions. No LLM involved — this is exact, reproducible evaluation.
 */

function evaluateAssertion(assertion: FixtureAssertion, recs: SoftwareRecommendation[]): string | null {
  const byRank = (rank: number) => recs.find((r) => r.rank === rank);

  switch (assertion.kind) {
    case "resultCount":
      return recs.length === assertion.expected ? null : `Expected ${assertion.expected} recommendations, got ${recs.length}.`;

    case "topCategory": {
      const top = byRank(1);
      if (!top) return "No #1 recommendation returned.";
      return top.software.category === assertion.expected
        ? null
        : `Expected top pick category "${assertion.expected}", got "${top.software.category}" (${top.software.slug}).`;
    }

    case "topCategoryIn": {
      const top = byRank(1);
      if (!top) return "No #1 recommendation returned.";
      return assertion.expected.includes(top.software.category)
        ? null
        : `Expected top pick category to be one of [${assertion.expected.join(", ")}], got "${top.software.category}" (${top.software.slug}).`;
    }

    case "topSlug": {
      const top = byRank(1);
      if (!top) return "No #1 recommendation returned.";
      return top.software.slug === assertion.expected
        ? null
        : `Expected top pick "${assertion.expected}", got "${top.software.slug}".`;
    }

    case "exactMatchPercent": {
      const target = byRank(assertion.rank);
      if (!target) return `No #${assertion.rank} recommendation returned.`;
      return target.scoring.matchPercent === assertion.expected
        ? null
        : `Expected rank ${assertion.rank} (${target.software.slug}) matchPercent === ${assertion.expected}, got ${target.scoring.matchPercent}.`;
    }

    case "minMatchPercent": {
      const target = byRank(assertion.rank);
      if (!target) return `No #${assertion.rank} recommendation returned.`;
      return target.scoring.matchPercent >= assertion.min
        ? null
        : `Expected rank ${assertion.rank} (${target.software.slug}) matchPercent >= ${assertion.min}, got ${target.scoring.matchPercent}.`;
    }

    case "factorPresent": {
      const target = byRank(assertion.rank);
      if (!target) return `No #${assertion.rank} recommendation returned.`;
      const found = target.scoring.factors.some(
        (f) => f.direction === assertion.direction && f.label.toLowerCase().includes(assertion.labelIncludes.toLowerCase())
      );
      return found
        ? null
        : `Expected rank ${assertion.rank} (${target.software.slug}) to have a ${assertion.direction} factor mentioning "${assertion.labelIncludes}"; factors: ${target.scoring.factors.map((f) => f.label).join(", ") || "(none)"}.`;
    }

    case "factorAbsent": {
      const target = byRank(assertion.rank);
      if (!target) return `No #${assertion.rank} recommendation returned.`;
      const found = target.scoring.factors.some((f) => f.label.toLowerCase().includes(assertion.labelIncludes.toLowerCase()));
      return !found
        ? null
        : `Expected rank ${assertion.rank} (${target.software.slug}) to have NO factor mentioning "${assertion.labelIncludes}", but found one.`;
    }

    case "allFactorsZeroPoints": {
      const offenders = recs.flatMap((rec) =>
        rec.scoring.factors
          .filter((f) => f.label.toLowerCase().includes(assertion.labelIncludes.toLowerCase()) && f.points !== 0)
          .map((f) => `${rec.software.slug}: "${f.label}" = ${f.points}`)
      );
      return offenders.length === 0
        ? null
        : `Expected every factor mentioning "${assertion.labelIncludes}" to contribute 0 points; found: ${offenders.join("; ")}.`;
    }
  }
}

function evaluateFixture(fixture: RegressionFixture): { passed: boolean; failures: string[] } {
  const { recommendations } = getRecommendations(fixture.answers, 3);
  const failures = fixture.assertions
    .map((assertion) => evaluateAssertion(assertion, recommendations))
    .filter((failure): failure is string => failure !== null);
  return { passed: failures.length === 0, failures };
}

async function run() {
  const results = RECOMMENDATION_FIXTURES.map((fixture) => ({
    fixture,
    ...evaluateFixture(fixture),
  }));

  const failedFixtures = results.filter((r) => !r.passed);

  const issues: MaintenanceIssue[] = failedFixtures.map(({ fixture, failures }) => ({
    id: `recommendation-regression-${fixture.name}`,
    severity: "critical",
    title: `Recommendation regression: ${fixture.name}`,
    description: `${fixture.description} Failures: ${failures.join(" | ")}`,
    location: fixture.name,
  }));

  return {
    summary: `Ran ${results.length} recommendation regression fixtures. ${results.length - failedFixtures.length} passed, ${failedFixtures.length} failed.`,
    issues,
    data: {
      totalFixtures: results.length,
      passed: results.length - failedFixtures.length,
      failed: failedFixtures.length,
      results: results.map((r) => ({ name: r.fixture.name, description: r.fixture.description, passed: r.passed, failures: r.failures })),
    },
  };
}

export async function executeRecommendationsAgent() {
  const report = await runAgent("recommendations", run, { escalateCriticalToFailure: true });

  const extra = report.data
    ? [
        "## Fixture results",
        "",
        "| Fixture | Status |",
        "|---|---|",
        ...report.data.results.map((r) => `| ${r.name} | ${r.passed ? "✅ pass" : "❌ FAIL"} |`),
        "",
      ].join("\n")
    : "";

  writeReport(report, extra);
  return report;
}

async function main() {
  const report = await executeRecommendationsAgent();
  console.log(`[recommendations] ${report.summary}`);
  console.log(`[recommendations] run status: ${report.run.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
