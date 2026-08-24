import { ACTIVE_PARTNER_SLUGS } from "@/data/affiliate/active-partners";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getAlternativeGuide, ALTERNATIVE_GUIDES } from "@/data/seo/alternative-guides";
import { getSoftware } from "@/data/software";
import { readSeoExperimentBaselines, recordSeoExperimentBatch } from "@/lib/seo-factory/store";
import type { SeoExperiment } from "@/lib/seo-factory/types";

function plusDays(value: string, days: number): string { return new Date(new Date(value).getTime() + days * 86_400_000).toISOString(); }
function affiliateStatus(slug: string): string {
  if ((ACTIVE_PARTNER_SLUGS as readonly string[]).includes(slug)) return "ACTIVE";
  if (slug === "freshdesk") return "PENDING";
  if (slug === "help-scout") return "REJECTED";
  if (slug === "semrush") return "OWNER_ACTION";
  if (slug === "intercom") return "NONE";
  return "NON_ACTIVE";
}

async function main() {
  const deploymentTimestamp = process.argv.find((arg) => arg.startsWith("--deployment="))?.slice("--deployment=".length);
  if (!deploymentTimestamp || Number.isNaN(Date.parse(deploymentTimestamp))) throw new Error("Pass an ISO deployment timestamp with --deployment=<timestamp>.");
  const baselines = await readSeoExperimentBaselines();
  const experiments: SeoExperiment[] = Object.keys(ALTERNATIVE_GUIDES).map((slug) => {
    const page = `/software/${slug}`; const baseline = baselines.find((item) => item.page === page); const guide = getAlternativeGuide(slug); const software = getSoftware(slug);
    if (!baseline || !guide || !software) throw new Error(`Missing immutable baseline, guide, or software for ${slug}.`);
    const inboundLinks = PUBLISHED_COMPARISONS.filter(([a, b]) => a === slug || b === slug).map(([a, b]) => `/compare/${getComparisonSlug(a, b)} -> ${page}#alternative-decision-heading`);
    return {
      id: `seo-exec-2026-08-20-${slug}`, page, intervention: "Product-specific alternatives decision guide and contextual comparison graph", recordedAt: deploymentTimestamp, reason: guide.diagnosis,
      baseline: baseline.query, measurementWindowDays: 28, result: null, decision: "MEASURING", baselineId: baseline.id, queryCluster: baseline.queryCluster, diagnosis: guide.diagnosis,
      exactChange: `Added “${guide.heading}”, three product-specific buying dimensions, three alternative routes, comparison links, a ${software.category} category path, and contextual inbound links from comparisons involving ${software.name}.`,
      evidenceSources: guide.evidenceSources,
      internalLinksChanged: [...guide.decisions.map((item) => `/software/${item.alternativeSlug}`), ...guide.decisions.map((item) => `/compare/${item.comparisonSlug}`), `/category/${software.category}`, ...inboundLinks],
      deploymentTimestamp, affiliateStatusAtT0: affiliateStatus(slug),
      checkpoints: [{ days: 7, dueAt: plusDays(deploymentTimestamp, 7), kind: "DIRECTIONAL", measuredAt: null }, { days: 14, dueAt: plusDays(deploymentTimestamp, 14), kind: "DIRECTIONAL", measuredAt: null }, { days: 28, dueAt: plusDays(deploymentTimestamp, 28), kind: "PRIMARY", measuredAt: null }],
    };
  });
  const result = await recordSeoExperimentBatch(experiments);
  if (!result.recorded) throw new Error("Experiment cohort was not recorded; an ID or active page already exists. No partial write occurred.");
  console.log(JSON.stringify({ recorded: experiments.length, ids: experiments.map((item) => item.id), deploymentTimestamp }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
