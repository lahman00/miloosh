import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { execFileSync, spawnSync } from "node:child_process";
import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getAllRoleGuides } from "@/data/guides/registry";
import { DECISION_PATHS } from "@/data/seo/decision-paths";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import {
  scoreFactualDepth,
  summarizeFactualDepth,
} from "@/scripts/growth/factual-depth-audit";
import {
  buildAuthorityGraph,
  readBuild,
  type Node,
} from "@/lib/google-war/graph";
import {
  appendObservations,
  canonicalPath,
  indexState,
  inspectionDeltas,
  inspectionSchema,
  searchSnapshotSchema,
} from "@/lib/google-war/evidence";
import {
  hasProductionProof,
  improvementSchema,
} from "@/lib/google-war/deployment-proof";
import { loadProtection, protectionFor } from "@/lib/google-war/protection";
import {
  commercialQualityRegressions,
  intentConflicts,
  intentOwner,
  repeatedBuyerText,
} from "@/lib/google-war/quality";
import { indexingEligibility, prioritize } from "@/lib/google-war/priority";
import { resolveEvidence, classifyInspectionEvidence } from "@/lib/google-war/resolver";

const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
};
function write(file: string, value: unknown) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(
    tmp,
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
    { flag: "wx" },
  );
  fs.renameSync(tmp, file);
}
function main() {
  const output = path.resolve(arg("--output", "var/growth/google-war"));
  fs.mkdirSync(output, { recursive: true });
  const lock = path.join(output, ".run.lock");
  const fd = fs.openSync(lock, "wx"); // Concurrent runs never lose observation history.
  try {
    const now = new Date().toISOString();
    const snapshotPath = arg(
      "--gsc",
      "data/growth/google-war/search-snapshot.json",
    );
    const snapshot = searchSnapshotSchema.parse(read(snapshotPath));
    const dist = arg("--dist", ".next-miloosh-qa");
    const build = readBuild(dist);
    const audit = spawnSync(
      "python3",
      ["scripts/deployment/verify-static-release.py", "--dist", dist],
      { encoding: "utf8", maxBuffer: 10_000_000 },
    );
    if (audit.error) throw audit.error;
    const technicalAudit = JSON.parse(audit.stdout);
    if (technicalAudit.buildId !== build.buildId)
      throw new Error("Technical report/build mismatch");
    const sitemapUrls = new Set(
      [
        ...fs
          .readFileSync(path.join(dist, "server/app/sitemap.xml.body"), "utf8")
          .matchAll(/<loc>([^<]+)<\/loc>/g),
      ].map((m) => m[1]),
    );
    const catalog = getAllSoftware(),
      software = new Map(catalog.map((s) => [s.slug, s]));
    const comparisons = new Map(
      PUBLISHED_COMPARISONS.map(([a, b]) => [
        `/compare/${getComparisonSlug(a, b)}`,
        [a, b],
      ]),
    );
    const guides = new Map(getAllRoleGuides().map((g) => [`/${g.slug}`, g]));
    const nodes: Node[] = [...build.html].map(([url, html]) => {
      const item = url.startsWith("/software/")
        ? software.get(url.slice(10))
        : undefined;
      const guide = guides.get(url);
      const products = item
        ? [item.slug]
        : (comparisons.get(url) ?? guide?.products.map((p) => p.slug) ?? []);
      const categories = item
        ? [item.category]
        : guide
          ? [guide.categorySlug]
          : url.startsWith("/category/")
            ? [url.slice(10)]
            : products.flatMap((p) => software.get(p)?.category ?? []);
      return {
        path: url,
        html,
        products,
        categories,
        reviewedTargets: DECISION_PATHS[url]?.map((p) => p.href),
        kind: item
          ? "software"
          : comparisons.has(url)
            ? "comparison"
            : guide
              ? "guide"
              : url.startsWith("/category/")
                ? "category"
                : "hub",
      };
    });
    const graph = buildAuthorityGraph(nodes);
    const nodeMap = new Map(nodes.map((n) => [n.path, n]));
    const protections = loadProtection(process.cwd(), now);
    const conflicts = intentConflicts(
      nodes.filter((n) =>
        ["software", "comparison", "guide", "category"].includes(n.kind),
      ),
    );
    const observations = inspectionSchema
      .array()
      .parse(
        read(arg("--inspections", "data/growth/google-war/inspections.json")),
      );
    // Accept the existing shared URL Inspection cache without an API call or credentials.
    const cachePath = arg("--inspection-cache", "var/agents/state.json");
    if (fs.existsSync(cachePath)) {
      const cache = read(cachePath).urlInspectionCache ?? {};
      for (const [url, value] of Object.entries(cache) as Array<
        [string, { checkedAt: string; result: Record<string, unknown> }]
      >)
        observations.push(
          inspectionSchema.parse({
            url,
            checkedAt: value.checkedAt,
            source: `Cached authenticated URL Inspection API: ${cachePath}`,
            ...Object.fromEntries(
              [
                "verdict",
                "coverageState",
                "lastCrawlTime",
                "googleCanonical",
                "userCanonical",
                "pageFetchState",
                "robotsTxtState",
                "indexingState",
              ].map((k) => [k, value.result[k] ?? null]),
            ),
          }),
        );
    }
    // Keep reported inspection evidence distinct from raw exports/API results.
    const reported = "data/growth/google-war/reported-inspections.json";
    if (fs.existsSync(reported))
      observations.push(...inspectionSchema.array().parse(read(reported)));
    const historyFile = path.join(output, "indexation-history.json");
    const history = appendObservations(
      fs.existsSync(historyFile)
        ? inspectionSchema.array().parse(read(historyFile))
        : [],
      observations,
    );
    const deltas = inspectionDeltas(history);
    const active = new Set(ACTIVE_PARTNERS.map((p) => p.slug as string));
    const search = new Map(snapshot.rows.map((r) => [r.url, r]));
    // Missing or malformed request history fails closed; never assume no requests.
    const requestHistory = z
      .array(
        z.object({
          url: z.string().startsWith("/"),
          requestedAt: z.iso.datetime({ offset: true }),
          precision: z.enum(["day", "instant"]),
          source: z.string().min(1),
        }),
      )
      .parse(read("data/growth/google-war/indexing-requests.json"));
    const recentRequests: Record<string, string> = {};
    for (const request of requestHistory) {
      if (
        !recentRequests[request.url] ||
        Date.parse(request.requestedAt) >
          Date.parse(recentRequests[request.url])
      )
        recentRequests[request.url] = request.requestedAt;
    }
    const changesPath = "data/growth/google-war/improvements.json";
    const improvements = fs.existsSync(changesPath)
      ? improvementSchema.array().parse(read(changesPath))
      : [];
    const rows = graph.rows
      .filter((g) => ["software", "comparison", "guide"].includes(g.kind))
      .map((g) => {
        const node = nodeMap.get(g.path)!;
        const item =
          g.kind === "software" ? software.get(node.products[0]) : undefined;
        const metric = search.get(`https://miloosh.com${g.path}`) ?? null;
        const resolved = resolveEvidence(`https://miloosh.com${g.path}`, history.map(classifyInspectionEvidence), snapshot, now);
        const inspection = resolved.inspected;
        const protectedBy = protectionFor(g.path, protections);
        const depth = item ? scoreFactualDepth(item) : null;
        const relationships = node.products.map((slug) => ({
          slug,
          active: active.has(slug),
          status: CURRENT_AFFILIATE_LEDGER.filter((r) =>
            r.productSlugs.includes(slug),
          ).map((r) => r.status),
        }));
        const decision = prioritize({
          impressions: metric?.impressions ?? null,
          clicks: metric?.clicks ?? null,
          ctr: metric?.ctr ?? null,
          position: metric?.position ?? null,
          index: resolved.state === "INDEXED" && !resolved.rankingEligible ? "UNKNOWN" : resolved.state,
          bucket: depth?.bucket ?? null,
          inbound: g.contentSources,
          depth: g.homeDepth,
          protected: protectedBy.length > 0,
          activeAffiliate: relationships.some((r) => r.active),
          intentConflict: conflicts.some((c) => c.path === g.path),
        });
        const sitemapIncluded = sitemapUrls.has(`https://miloosh.com${g.path}`);
        const technicalPass =
          technicalAudit.failures.length === 0 &&
          !g.noindex &&
          g.canonical.length === 1 &&
          g.canonical[0] === `https://miloosh.com${g.path}` &&
          g.homeDepth !== null;
        return {
          url: g.path,
          kind: g.kind,
          search: metric,
          searchEvidence: {
            source: snapshot.source,
            capturedAt: snapshot.capturedAt,
            window: snapshot.window,
            status: metric
              ? "CACHED_AUTHENTICATED_PAGE_ROW"
              : "UNKNOWN_NO_EXACT_ROW",
          },
          indexation: {
            state: indexState(inspection),
            observation: inspection,
            resolution: resolved,
          },
          technical: {
            localArtifactPass: technicalPass,
            sitemapIncluded,
            productionVerification: hasProductionProof(
              improvements.find((c) => c.url === g.path),
              now,
            )
              ? "RECORDED_CURRENT"
              : "UNKNOWN",
            note: "Sitemap absence alone is not an indexability defect; HTTP 200 is not index inclusion.",
          },
          intentOwner: intentOwner(node),
          affiliate: {
            source:
              "canonical ACTIVE_PARTNERS + CURRENT_AFFILIATE_LEDGER, local source snapshot",
            relationships,
          },
          factualDepth: depth
            ? {
                ...depth,
                evidence:
                  "Local structured-field completeness HEURISTIC; does not verify factual truth, dates or Google quality",
              }
            : null,
          authority: { ...g, evidence: `Emitted HTML build ${build.buildId}` },
          protection: protectedBy.length
            ? protectedBy
            : [
                {
                  state: "SAFE_TO_EDIT",
                  source:
                    "Local receipt/config scope only; production-only experiment state not queried",
                },
              ],
          ...decision,
          indexingRequest: {
            status: indexingEligibility(
              {
                protected: protectedBy.length > 0,
                lastRequestedAt: recentRequests[g.path] ?? null,
                deployedImprovementAt:
                  improvements.find((c) => c.url === g.path)?.deployedAt ??
                  null,
                technicalPass:
                  technicalPass &&
                  hasProductionProof(
                    improvements.find((c) => c.url === g.path),
                    now,
                  ),
                highValue:
                  (metric?.impressions ?? 0) >= 100 ||
                  relationships.some((r) => r.active),
                index: indexState(inspection),
              },
              now,
            ),
            lastRequestedAt: recentRequests[g.path] ?? null,
            note: "Manual review only; no Google submission API is called. Local improvement is not a deployed improvement.",
          },
        };
      });
    rows.sort(
      (a, b) =>
        (b.search?.impressions ?? -1) - (a.search?.impressions ?? -1) ||
        a.url.localeCompare(b.url),
    );
    const top50 = rows
      .filter(
        (r) =>
          r.kind !== "guide" &&
          r.search?.impressions !== null &&
          r.search !== null,
      )
      .slice(0, 50);
    const qualityPath = "data/growth/google-war/quality-baseline.json";
    const quality = fs.existsSync(qualityPath) ? read(qualityPath) : {};
    const regressions = commercialQualityRegressions(
      rows.map((r) => ({
        path: r.url,
        bucket: r.factualDepth?.bucket ?? null,
      })),
      quality,
    );
    const families = ["notion", "trello"].map((slug) => ({
      slug,
      ownPage: search.get(`https://miloosh.com/software/${slug}`) ?? null,
      comparisonPages: rows
        .filter(
          (r) =>
            nodeMap.get(r.url)?.kind === "comparison" &&
            nodeMap.get(r.url)?.products.includes(slug) &&
            r.search,
        )
        .map((r) => r.search),
      verdict:
        "UNCONFIRMED: separate page/query reports cannot prove same-query cannibalization. Preserve head-to-head URLs; obtain query+page evidence before redirecting.",
    }));
    // Google War Phase III (2026-09-26) — Part 42: the dashboard must show
    // INDEXED / DISCOVERED_NOT_INDEXED / CRAWLED_NOT_INDEXED as separate
    // headline numbers and must never collapse them back into one "not
    // indexed" figure. These are two structurally different Google problems
    // (crawl vs. index-selection) that earlier reporting conflated.
    const indexationHeadline: Record<string, number> = {};
    const routeTypeByState: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const state = r.indexation.state;
      indexationHeadline[state] = (indexationHeadline[state] ?? 0) + 1;
      routeTypeByState[r.kind] ??= {};
      routeTypeByState[r.kind][state] =
        (routeTypeByState[r.kind][state] ?? 0) + 1;
    }
    const report = {
      generatedAt: now,
      sourceSha: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      buildId: build.buildId,
      artifactHash: build.artifactHash,
      policy: {
        autonomy: "READ_ONLY_RECOMMENDATIONS",
        massPublishing: false,
        ranking:
          "Observed page impressions descending; nullable evidence; groups/reasons explain intervention, no composite SEO score",
        protectionCoverage:
          "Local committed receipts, local runtime experiments and explicit concurrent reservations; no production Blob read",
        queryPageAttribution:
          "UNAVAILABLE; property-wide query data is not joined to page aggregates",
        buildProvenance:
          "sourceSha is repository HEAD at analysis time, not a deployment SHA; artifactHash identifies the inspected build, including uncommitted source changes",
      },
      coverage: {
        searchRows: snapshot.rows.length,
        canonicalSearchRows: snapshot.rows.filter((r) => canonicalPath(r.url))
          .length,
        inspectionObservations: history.length,
        nodes: nodes.length,
        edges: graph.edges.length,
      },
      technicalAudit,
      factualDepthDistribution: summarizeFactualDepth(
        catalog.map(scoreFactualDepth),
      ),
      rows,
      top50,
      intentConflicts: conflicts,
      notionTrello: families,
      qualityRegressions: regressions,
      templateWarnings: repeatedBuyerText(
        nodes,
        catalog
          .flatMap((s) => [s.description, s.bestFor])
          .filter((s): s is string => Boolean(s)),
      ),
      indexationDeltas: deltas.map((d) => ({
        ...d,
        search: search.get(d.url) ?? null,
        searchSource: snapshot.source,
        searchWindow: snapshot.window,
      })),
      indexingQueue: rows
        .filter(
          (r) => r.search || r.affiliate.relationships.some((p) => p.active),
        )
        .map((r) => ({ url: r.url, ...r.indexingRequest })),
      recentlyImproved: improvements,
      requestHistory,
      indexationHeadline,
      routeTypeByState,
    };
    const transitioned = report.indexationDeltas.filter(
      (d) => d.transitions.length > 0,
    );
    const groups = [
      "INDEXATION_RECOVERY",
      "RANKING_OPPORTUNITY",
      "CTR_OPPORTUNITY",
      "INTERNAL_AUTHORITY_GAP",
      "CONTENT_DEPTH_GAP",
      "INTENT_FRAGMENTATION",
      "EXPERIMENT_PROTECTED",
      "HOLD",
    ] as const;
    const stateOrder = [
      "INDEXED",
      "DISCOVERED_NOT_INDEXED",
      "CRAWLED_NOT_INDEXED",
      "NOT_INDEXED_OTHER",
      "UNKNOWN",
    ] as const;
    const headlineSection =
      `## Indexation state (never collapsed — see Part 42)\n\n` +
      stateOrder
        .map((s) => `- ${s}: ${indexationHeadline[s] ?? 0}`)
        .join("\n") +
      `\n\n### By route type\n\n` +
      Object.entries(routeTypeByState)
        .map(
          ([kind, counts]) =>
            `- ${kind}: ` +
            stateOrder
              .filter((s) => counts[s])
              .map((s) => `${s}=${counts[s]}`)
              .join(", "),
        )
        .join("\n") +
      `\n\n### Transitions since previous capture\n\n${transitioned.length} URLs changed indexation state. ${transitioned.length > 0 ? "Observed between checks, not the exact transition time; no causation claim." : ""}\n` +
      transitioned
        .slice(0, 15)
        .map(
          (d) =>
            `- ${d.url}: ` +
            d.transitions.map((t) => `${t.from} -> ${t.to}`).join(", "),
        )
        .join("\n");
    const md =
      `# Google visibility control report\n\nGenerated ${now}. Local artifact, not production indexation proof.\n\nSearch: ${snapshot.capturedAt}; ${snapshot.window.start}..${snapshot.window.end}. Missing is UNKNOWN.\n\n${headlineSection}\n\n` +
      groups
        .map(
          (group) =>
            `## ${group}\n\n` +
            rows
              .filter((r) => r.groups.includes(group))
              .slice(0, 12)
              .map(
                (r) =>
                  `- ${r.url}: ${r.search?.impressions ?? "UNKNOWN"} impressions; index=${r.indexation.state}; depth=${r.authority.homeDepth ?? "UNKNOWN"}. ${r.action}. ${r.reasons.join("; ")}`,
              )
              .join("\n"),
        )
        .join("\n\n") +
      `\n\n## Indexing requests\n\n${report.indexingQueue.filter((r) => r.status === "READY_TO_REQUEST").length} eligible. No requests sent. Deployment and request history must be evidenced.\n\n## Recently improved\n\n${improvements.map((c) => `- ${c.url}: ${c.deployedAt ?? "LOCAL ONLY"} (${c.source})`).join("\n")}\n\n## Integrity\n\n${regressions.length} quality regressions; ${conflicts.length} structural intent conflicts; ${report.templateWarnings.length} repeated-prose warning groups. Comparison demand share alone does not prove cannibalization.\n`;
    write(historyFile, history);
    write(path.join(output, "latest.json"), report);
    write(path.join(output, "latest.md"), md);
    write(path.join(output, "authority-graph.json"), {
      buildId: build.buildId,
      artifactHash: build.artifactHash,
      ...graph,
    });
    console.log(
      JSON.stringify({
        output,
        top50: top50.length,
        nodes: nodes.length,
        edges: graph.edges.length,
        trueSoftwareOrphans: graph.rows.filter(
          (r) => r.kind === "software" && r.orphan,
        ).length,
        qualityRegressions: regressions.length,
        intentConflicts: conflicts.length,
      }),
    );
    if (regressions.length || technicalAudit.failures.length)
      process.exitCode = 1;
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}
main();
