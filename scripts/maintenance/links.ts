import { getAllSoftware } from "@/data/software";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { checkUrlsWithConcurrency, type LinkCheckResult, type LinkCheckOutcome } from "@/lib/maintenance/http";
import { runAgent } from "@/lib/maintenance/run-agent";
import { writeReport } from "@/lib/maintenance/report-io";
import type { MaintenanceIssue, SourceEvidence } from "@/types/maintenance";

/**
 * Sprint 12 Phase 2 — Link Health Agent. Read-only: checks every official
 * product URL, source URL, vendor-resource URL, and (when configured) an
 * activated affiliate URL against the live internet. Never modifies
 * data/software/*.json or any other file — see docs/maintenance-system.md.
 */

type UrlKind = "official" | "source" | "vendor-resource" | "affiliate" | "affiliate-research-source";

type UrlLocation = {
  softwareSlug: string;
  kind: UrlKind;
  fieldLabel: string;
};

type CollectedUrl = {
  url: string;
  locations: UrlLocation[];
};

export function collectUrls(): CollectedUrl[] {
  const bySlug = new Map<string, CollectedUrl>();

  function add(url: string | undefined | null, softwareSlug: string, kind: UrlKind, fieldLabel: string) {
    if (!url) return;
    const existing = bySlug.get(url);
    const location: UrlLocation = { softwareSlug, kind, fieldLabel };
    if (existing) {
      existing.locations.push(location);
    } else {
      bySlug.set(url, { url, locations: [location] });
    }
  }

  for (const software of getAllSoftware()) {
    add(software.website, software.slug, "official", "website");
    software.sources.forEach((url, index) => add(url, software.slug, "source", `sources[${index}]`));
    add(software.links?.pricing, software.slug, "vendor-resource", "links.pricing");
    add(software.links?.docs, software.slug, "vendor-resource", "links.docs");
    add(software.links?.support, software.slug, "vendor-resource", "links.support");
    add(software.links?.integrations, software.slug, "vendor-resource", "links.integrations");
    add(software.links?.status, software.slug, "vendor-resource", "links.status");
    add(software.links?.community, software.slug, "vendor-resource", "links.community");

    // WAR MODE mission (2026-08-22) Phase 27 revenue-leak finding: this
    // used to check getAffiliateActivation() alone (the env-var/config-file
    // activation mechanism) -- but none of the 14 real, revenue-generating
    // active partners use that mechanism; they're all activated through
    // data/affiliate/active-partners.ts instead (see tests/lib/active-
    // partners.test.ts's "no active partner is ever reported as 'not
    // activated'" regression, which fixed the identical gap in
    // scripts/maintenance/affiliate.ts on 2026-08-21 but never propagated
    // the fix here). The result: this checker had zero live-URL-health
    // coverage of any real revenue-bearing affiliate link. getSoftwareCtaUrl
    // is the actual resolver every live CTA calls, so checking its result
    // (only when it's genuinely an affiliate link, per
    // shouldShowAffiliateDisclosure) tracks the single source of truth
    // instead of re-deriving activation status here.
    if (shouldShowAffiliateDisclosure(software)) {
      add(getSoftwareCtaUrl(software), software.slug, "affiliate", "resolved affiliate CTA URL");
    }
  }

  for (const program of AFFILIATE_PROGRAMS) {
    program.sourceUrls.forEach((url, index) =>
      add(url, program.slug, "affiliate-research-source", `affiliate-programs sourceUrls[${index}]`)
    );
  }

  return [...bySlug.values()];
}

const CRITICAL_OUTCOMES: LinkCheckOutcome[] = ["not_found", "gone", "invalid_url"];

export function severityForOutcome(outcome: LinkCheckOutcome): "critical" | "warning" {
  return CRITICAL_OUTCOMES.includes(outcome) ? "critical" : "warning";
}

const OUTCOME_TITLE: Record<LinkCheckOutcome, string> = {
  ok: "OK",
  not_found: "404 Not Found",
  gone: "410 Gone",
  client_error: "Client error",
  server_error: "Server error",
  redirect_chain_too_long: "Excessive redirect chain",
  cross_domain_redirect: "Redirect to an unrelated domain",
  connection_failure: "Connection failure",
  invalid_url: "Invalid URL",
  timeout: "Request timed out",
  bot_blocked: "Reachable, but blocks automated checks",
};

async function run() {
  const collected = collectUrls();
  const results = await checkUrlsWithConcurrency(collected.map((c) => c.url));

  const byUrl = new Map<string, LinkCheckResult>(results.map((result) => [result.url, result]));
  const issues: MaintenanceIssue[] = [];
  const byOutcome: Record<string, number> = {};

  for (const { url, locations } of collected) {
    const result = byUrl.get(url);
    if (!result) continue;

    byOutcome[result.outcome] = (byOutcome[result.outcome] ?? 0) + 1;
    if (result.outcome === "ok") continue;

    const evidence: SourceEvidence[] = [
      {
        url,
        checkedAt: result.checkedAt,
        status:
          result.outcome === "cross_domain_redirect" || result.outcome === "redirect_chain_too_long"
            ? "redirect"
            : result.outcome === "connection_failure" || result.outcome === "timeout"
              ? "unreachable"
              : result.outcome === "bot_blocked"
                ? "unknown"
                : "broken",
        httpStatus: result.httpStatus,
        details: result.details,
      },
    ];

    const affected = locations.map((location) => `${location.softwareSlug} (${location.kind}: ${location.fieldLabel})`).join(", ");

    issues.push({
      id: `link-${result.outcome}-${url}`,
      severity: severityForOutcome(result.outcome),
      title: `${OUTCOME_TITLE[result.outcome]}: ${url}`,
      description: `Referenced by: ${affected}.${result.details ? ` ${result.details}` : ""}${result.redirectChain.length > 1 ? ` Redirect chain: ${result.redirectChain.join(" -> ")}` : ""}`,
      location: locations[0].softwareSlug,
      evidence,
    });
  }

  const brokenCount = collected.length - (byOutcome.ok ?? 0);

  return {
    summary: `Checked ${collected.length} unique URLs across ${getAllSoftware().length} software entries. ${byOutcome.ok ?? 0} OK, ${brokenCount} with issues.`,
    issues,
    data: {
      totalUrlsChecked: collected.length,
      byOutcome,
      results: collected.map((c) => ({ ...byUrl.get(c.url)!, locations: c.locations })),
    },
  };
}

export async function executeLinksAgent() {
  const report = await runAgent("links", run);

  const extra = report.data
    ? [
        "## Results by outcome",
        "",
        Object.entries(report.data.byOutcome)
          .map(([outcome, count]) => `- ${outcome}: ${count}`)
          .join("\n") || "No URLs checked.",
        "",
      ].join("\n")
    : "";

  writeReport(report, extra);
  return report;
}

async function main() {
  const report = await executeLinksAgent();
  console.log(`[links] ${report.summary}`);
  console.log(`[links] run status: ${report.run.status}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
