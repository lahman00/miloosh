import { readQueue } from "@/lib/social/queue";
import { isPublishedComparison } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { getCategory } from "@/data/categories";
import { getRoleGuide } from "@/data/guides/registry";
import { getComparisonRedirectTarget } from "@/data/redirects";
import { SITE_URL } from "@/lib/site";
import { runAgent } from "@/lib/maintenance/run-agent";
import { writeReport } from "@/lib/maintenance/report-io";
import type { MaintenanceIssue } from "@/types/maintenance";
import { pathToFileURL } from "node:url";

/**
 * Real Human Funnel War Room (2026-08-22) — Phase 19. Zero-tolerance
 * internal-link checker for the social publishing queue, built after
 * finding 90 dead links there in the previous mission: one already-
 * published, verified LIVE Facebook post whose destination 404'd, plus
 * 17 not-yet-published entries pointing at removed/never-published
 * comparisons. That class of bug had no permanent detection — this
 * closes the gap the same way scripts/maintenance/seo.ts already closes
 * it for internal *page* references (escalateCriticalToFailure: true,
 * since a dead internal link is our own bug, not a fact about the
 * outside world).
 *
 * Deliberately NOT a network check (no HTTP calls) — every internal
 * route this file understands (comparison/software/category/guide) is
 * fully knowable from the same in-repo data every page render uses, so
 * checking against that data is both faster and more authoritative than
 * fetching miloosh.com over HTTP would be. External destinations already
 * have real network-based coverage in scripts/maintenance/links.ts.
 */

type InternalLinkKind = "compare" | "software" | "category" | "guide";

function classifyInternalPath(pathname: string): { kind: InternalLinkKind; slug: string } | null {
  const compareMatch = pathname.match(/^\/compare\/([a-z0-9-]+)$/);
  if (compareMatch) return { kind: "compare", slug: compareMatch[1]! };
  const softwareMatch = pathname.match(/^\/software\/([a-z0-9-]+)$/);
  if (softwareMatch) return { kind: "software", slug: softwareMatch[1]! };
  const categoryMatch = pathname.match(/^\/category\/([a-z0-9-]+)$/);
  if (categoryMatch) return { kind: "category", slug: categoryMatch[1]! };
  const guideMatch = pathname.match(/^\/([a-z0-9-]+)$/);
  if (guideMatch && getRoleGuide(guideMatch[1]!)) return { kind: "guide", slug: guideMatch[1]! };
  return null;
}

function isValidInternalRoute(kind: InternalLinkKind, slug: string): boolean {
  if (kind === "compare") {
    const [a, b] = slug.split("-vs-");
    if (a && b && isPublishedComparison(a, b)) return true;
    // A route can be a real, working destination for a visitor without being
    // a published comparison — next.config.ts permanently redirects known-
    // removed comparison routes to a real software page. Genuinely resolved,
    // not dead, even though the comparison itself no longer exists.
    return Boolean(getComparisonRedirectTarget(slug));
  }
  if (kind === "software") return Boolean(getSoftware(slug));
  if (kind === "category") return Boolean(getCategory(slug));
  if (kind === "guide") return Boolean(getRoleGuide(slug));
  return false;
}

async function run() {
  const queue = await readQueue();
  const issues: MaintenanceIssue[] = [];
  let checked = 0;
  let dead = 0;
  const seenDeadLinks = new Set<string>();

  for (const entry of queue) {
    if (entry.state === "SKIPPED") continue; // already excluded from any future publish — not a live risk
    for (const [channel, variant] of Object.entries(entry.channels)) {
      const link = variant?.link;
      if (!link || !link.startsWith(SITE_URL)) continue;
      checked++;
      const pathname = link.slice(SITE_URL.length).split("?")[0]!;
      const classified = classifyInternalPath(pathname);
      if (!classified) continue; // static/unknown route shape — out of scope for this check, not assumed dead
      if (isValidInternalRoute(classified.kind, classified.slug)) continue;

      dead++;
      const dedupeKey = `${pathname}|${entry.state}`;
      if (seenDeadLinks.has(dedupeKey)) continue;
      seenDeadLinks.add(dedupeKey);

      const isLive = entry.state === "PUBLISHED";
      issues.push({
        id: `social-dead-link-${entry.id}-${channel}`,
        severity: "critical",
        title: `${isLive ? "LIVE PUBLISHED POST links to a dead internal route" : "Queued post links to a dead internal route"}: ${pathname}`,
        description: `Queue entry ${entry.id} (state: ${entry.state}, topic: ${entry.topic}), channel ${channel}. ${isLive ? "This post is already public — the link is broken for real visitors right now." : "Not yet published — will 404 if this entry is ever published as-is."} Fix by either restoring the route, adding a redirect in next.config.ts, or transitioning the entry to SKIPPED.`,
        location: entry.id,
      });
    }
  }

  return {
    summary: `Checked ${checked} internal social-queue link references. ${dead > 0 ? `Found ${dead} dead internal route(s).` : "All internal links resolve to real routes."}`,
    issues,
    data: { checked, dead },
  };
}

export async function executeSocialLinksAgent() {
  const report = await runAgent("social-links", run, { escalateCriticalToFailure: true });
  writeReport(report);
  return report;
}

async function main() {
  const report = await executeSocialLinksAgent();
  console.log(`[social-links] ${report.summary}`);
  console.log(`[social-links] run status: ${report.run.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
