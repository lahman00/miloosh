import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import seed from "@/data/growth/authority/registry.json";
import links from "@/data/growth/authority/gsc-links-baseline.json";
import brand from "@/data/growth/authority/brand-baseline.json";
import indexingSeed from "@/data/growth/authority/indexing-proofs.json";
import researchInspections from "@/data/growth/authority/research-inspections-20260927.json";
import reportedCategoryBaseline from "@/docs/growth/receipts/20260926-why-we-dont-rank/domain-pattern.json";
import { parseRegistry, appendAuthority, authorityState, deepLinkBaseline, authorityChanges } from "@/lib/authority/registry";
import { appendBrand, brandSchema, brandMovement, categoryPositions, compareCategoryPositions, authorityObservatory, deepLinkPriority } from "@/lib/authority/measurement";
import { eventExportSchema, referralMovement, indexingProofSchema, indexingFromProof } from "@/lib/authority/inputs";
import { scopeSchema } from "@/lib/google-war/query-store";
import { authorityReferrals } from "@/lib/authority/referrals";
import { authorityAlerts } from "@/lib/authority/alerts";
import { researchTechnicalQa } from "@/lib/authority/research-qa";
import { RESEARCH_PATHS } from "@/lib/analytics/research";
import { readBuild } from "@/lib/google-war/graph";
import { searchSnapshotSchema, inspectionSchema } from "@/lib/google-war/evidence";
import { classifyInspectionEvidence } from "@/lib/google-war/resolver";
import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getAllRoleGuides } from "@/data/guides/registry";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { cohortRegistry } from "@/lib/google-war/cohorts";
import type { FirstPartyEvent } from "@/lib/analytics/events";

const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const option = (name: string) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
const escape = (s: unknown) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
export function runAuthorityReport() {
  const now = new Date().toISOString(), out = "var/growth/authority", dist = option("--dist") ?? ".next-miloosh-qa", build = readBuild(dist);
  const store = path.join(out, "registry.json"), brandStore = path.join(out, "brand-history.json");
  const registry = appendAuthority(parseRegistry(seed), fs.existsSync(store) ? parseRegistry(read(store)) : []);
  const brandHistory = appendBrand([brandSchema.parse(brand)], fs.existsSync(brandStore) ? read(brandStore) : []);
  const movement = brandMovement(brandHistory.at(-2), brandHistory.at(-1));
  const latestBrand = brandHistory.at(-1)!;
  const states = registry.map(e => authorityState(e, now));
  const previousReportFile = option("--previous-report") ?? (fs.existsSync(path.join(out, "latest.json")) ? path.join(out, "latest.json") : undefined);
  const previousReport = previousReportFile ? z.object({ generatedAt: z.iso.datetime({ offset: true }), registry: z.array(z.unknown()) }).passthrough().parse(read(previousReportFile)) : null;
  const changes = previousReport ? authorityChanges(parseRegistry(previousReport.registry), previousReport.generatedAt, registry, now) : { status: "UNKNOWN", reason: "No earlier report supplied via --previous-report; current/first-observed is not newly earned" };
  const snapshot = searchSnapshotSchema.parse(read("data/growth/google-war/search-snapshot.json"));
  const researchInspectionFile = option("--research-inspections") ?? "var/growth/operations/research-inspections.json";
  const inspections = [...inspectionSchema.array().parse(read("data/growth/google-war/inspections.json")), ...inspectionSchema.array().parse(read("data/growth/google-war/reported-inspections.json")), ...inspectionSchema.array().parse(fs.existsSync(researchInspectionFile) ? read(researchInspectionFile) : researchInspections)].map(classifyInspectionEvidence);
  const active = new Set<string>(ACTIVE_PARTNERS.map(p => p.slug));
  const pages = getAllSoftware().map(p => ({ url: `https://miloosh.com/software/${p.slug}`, category: p.category, commercial: true, activePartner: active.has(p.slug) }));
  const supportPages = [...pages,
    ...PUBLISHED_COMPARISONS.map(([a, b]) => ({ url: `https://miloosh.com/compare/${getComparisonSlug(a, b)}`, category: "comparison", commercial: true })),
    ...getAllRoleGuides().map(g => ({ url: `https://miloosh.com/${g.slug}`, category: g.categorySlug, commercial: true })),
  ].filter(p => build.html.has(new URL(p.url).pathname));
  const categoryScopeFile = option("--search-scope"), previousScopeFile = option("--previous-search-scope");
  const category = categoryPositions(snapshot, pages, categoryScopeFile ? scopeSchema.parse(read(categoryScopeFile)) : null);
  const previousPeriodFile = option("--previous-search");
  const categoryMovement = previousPeriodFile ? compareCategoryPositions(categoryPositions(searchSnapshotSchema.parse(read(previousPeriodFile)), pages, previousScopeFile ? scopeSchema.parse(read(previousScopeFile)) : null), category) : { status: "UNKNOWN", reason: "No matching previous snapshot; reported Claude medians lack reproducible membership/window and are not a comparison baseline" };
  const sitemap = fs.readFileSync(path.join(dist, "server/app/sitemap.xml.body"), "utf8");
  const research = RESEARCH_PATHS.map(route => researchTechnicalQa(route, build.html.get(route), sitemap, build.html));
  const eventsFile = option("--events") ?? (fs.existsSync("var/growth/operations/events.json") ? "var/growth/operations/events.json" : undefined);
  let referral: ReturnType<typeof authorityReferrals> | null = null, researchFunnel: ReturnType<typeof authorityReferrals> | null = null;
  if (eventsFile) {
    const bundle = eventExportSchema.parse(read(eventsFile));
    referral = authorityReferrals(bundle.events as FirstPartyEvent[], bundle.start, bundle.end);
    researchFunnel = authorityReferrals(bundle.events as FirstPartyEvent[], bundle.start, bundle.end, "research");
  }
  const previousEventsFile = option("--previous-events");
  const priorBundle = previousEventsFile ? eventExportSchema.parse(read(previousEventsFile)) : null;
  const referralChange = referralMovement(priorBundle ? authorityReferrals(priorBundle.events as FirstPartyEvent[], priorBundle.start, priorBundle.end) : null, referral);
  const proofFile = option("--indexing-proof"), proofs = indexingProofSchema.array().parse(proofFile ? read(proofFile) : indexingSeed);
  if (new Set(proofs.map(p => p.url)).size !== proofs.length) throw new Error("Duplicate indexing proof URL");
  const observatory = authorityObservatory(registry, inspections, snapshot, now);
  const priority = deepLinkPriority(registry, snapshot, supportPages, inspections, now);
  const alerts = authorityAlerts(registry, now, new Set(build.html.keys()), research, movement.firstObservedBrandSignal, referralChange);
  const output = { generatedAt: now, sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), buildId: build.buildId, artifactHash: build.artifactHash,
    authorityBaseline: links, deepLinkBaseline: deepLinkBaseline(registry, now), registry: states, changes, brandBaseline: brand, brandHistory, brandedSearchMovement: movement,
    domainPosition: category, domainPositionMovement: categoryMovement,
    historicalClaudeCategoryReceipt: { source: "docs/growth/receipts/20260926-why-we-dont-rank/domain-pattern.json", data: reportedCategoryBaseline, status: "REPORTED_AGGREGATE_NOT_REPRODUCIBLE_BASELINE", note: "Window/membership not attached; cannot prove a domain ranking ceiling or compare against a changed sample" },
    referralTraffic: referral ?? { status: "UNKNOWN", reason: "Complete first-party export unavailable; not zero sessions" },
    referralMovement: referralChange,
    researchRevenue: researchFunnel ?? { status: "UNKNOWN", reason: "Complete first-party export unavailable; no inferred conversions" },
    observatory, deepLinkPriority: priority, alerts, researchQa: research,
    indexingQueue: research.map(r => { const url = `https://miloosh.com${r.url}`; return { url, state: indexingFromProof(url, proofs.find(p => p.url === url), now), requestsMade: 0 }; }),
    protectedCohorts: cohortRegistry().map(c => ({ id: c.id, treatment: c.treatment.length, control: c.control.length })),
    measurementWarnings: ["GSC Links counts are not the public placement registry; never sum them", "First observation is not a link earning/publication date", "Temporal order does not establish causation", "No automatic outreach, indexing, publishing or deployment", "No report data is exposed as a public app route"],
  };
  fs.mkdirSync(path.join(out, "history"), { recursive: true });
  const write = (file: string, data: unknown) => fs.writeFileSync(path.join(out, file), JSON.stringify(data, null, 2) + "\n");
  write("latest.json", output); write(`history/${now.replaceAll(":", "-")}.json`, output);
  const lines = ["# Weekly authority observations", `Captured ${now}`, "No causal claims. No new link earned is asserted from a new check alone.",
    `GSC: ${links.totalExternalLinks} reported links; ${links.homepageLinks} homepage, ${links.deepLinks} deep. ${links.infrastructureCandidateLinks} infrastructure candidates, ${links.otherReportedLinks} other reported links from ${links.otherDomains} domains.`,
    `Public verified registry: ${output.deepLinkBaseline.homepagePlacements} homepage placement-target pairs, ${output.deepLinkBaseline.deepLinkPlacements} deep-link pairs.`,
    `Branded observations: ${latestBrand.impressions} impressions, ${latestBrand.clicks} clicks, ${latestBrand.window.start}..${latestBrand.window.end} only. Movement: ${movement.status}.`,
    `Referral/research funnel: ${referral ? "AVAILABLE classified estimates" : "UNKNOWN — no complete export"}.`,
    `Category ranking movement: ${JSON.stringify(categoryMovement)}. Temporal observation, not a causal effect.`,
    "## URLs and temporal sequence", ...observatory.map(r => `- ${r.targetUrl}: external=${r.externalState}; Google=${r.googleState}; crawl after observed mention=${r.crawlAfterMention}; performance=${r.performanceRelation}`),
    "## Alerts", ...alerts.map(a => `- ${a.code}: ${a.target} — ${a.reason}`),
    "## Changes since a prior period", JSON.stringify(changes), "Matching windows and stable samples required for ranking/brand movement."];
  fs.writeFileSync(path.join(out, "weekly.md"), lines.join("\n\n") + "\n");
  fs.writeFileSync(path.join(out, "morning.md"), ["# Morning Google + authority", `Generated ${now}`, `New external mentions/deep links: ${JSON.stringify(changes)}. Current verified deep-link pairs: ${output.deepLinkBaseline.deepLinkPlacements}.`, `Removed: ${states.filter(e => e.status === "REMOVED").length}; visibility conflicts: ${states.filter(e => e.conflict).length}.`, `Brand movement: ${movement.status}. Research referral traffic: ${referral ? "AVAILABLE" : "UNKNOWN"}.`, ...observatory.filter(r => r.targetUrl?.includes("/research/")).map(r => `${r.targetUrl}: Google ${r.googleState}, post-mention crawl ${r.crawlAfterMention}`), ...alerts.map(a => `${a.code}: ${a.target}`)].join("\n\n") + "\n");
  fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Miloosh Authority Observatory</title><style>body{font:16px/1.5 system-ui;background:#091727;color:#e8f0f7;margin:0;padding:clamp(16px,4vw,48px)}main{max-width:1200px;margin:auto}section{background:#12283d;padding:20px;border-radius:12px;margin:22px 0}h1{font-size:clamp(28px,4vw,44px)}.scroll{overflow:auto}td,th{padding:10px;text-align:left;white-space:nowrap;border-bottom:1px solid #35516a}p,li{overflow-wrap:anywhere}a{color:#a4d6ff}.warning{color:#f1cf7b}</style><main><p>PRIVATE LOCAL · OBSERVATIONAL · NO OUTREACH</p><h1>Authority impact control room</h1><p>${escape(now)} · Build ${escape(build.buildId)}</p><section><h2>Separate baselines</h2><p>GSC reports ${links.homepageLinks} homepage links and ${links.deepLinks} deep links. Public verification finds ${output.deepLinkBaseline.deepLinkPlacements} deep-link placement pairs. These are different datasets, not a contradiction to hide.</p><p>Branded search: ${latestBrand.impressions} observed impressions in ${latestBrand.window.start}–${latestBrand.window.end}. CTR: ${latestBrand.impressions ? latestBrand.clicks / latestBrand.impressions : 'undefined (zero impressions)' }.</p><p class="warning">Referral/research revenue: ${referral ? "classified session estimates" : "UNKNOWN — no complete event export"}. Google recrawl/ranking change does not prove external-link impact.</p></section><section><h2>Current external evidence</h2><div class="scroll"><table><tr><th>Source</th><th>Target</th><th>Status</th><th>Link / rel</th></tr>${states.map(e => `<tr><td>${escape(e.source)}</td><td>${escape(e.targetUrl ? new URL(e.targetUrl).pathname : "Brand mention only")}</td><td>${escape(e.status)}${e.conflict ? " · CONFLICT" : ""}</td><td>${escape(e.linkPresent)} / ${escape(e.rel)}</td></tr>`).join("")}</table></div></section><section><h2>Alerts</h2><ul>${alerts.map(a => `<li>${escape(a.code)}: ${escape(a.target)} — ${escape(a.reason)}</li>`).join("")}</ul></section><section><h2>Exports</h2><p><a href="latest.json">Evidence / temporal observations / support queue</a> · <a href="weekly.md">Weekly report</a> · <a href="morning.md">Morning report</a></p></section></main></html>`);
  console.log(JSON.stringify({ authorityReport: out, placements: registry.length, verified: states.filter(e => e.status === "VERIFIED_LIVE").length, deepLinkPairs: output.deepLinkBaseline.deepLinkPlacements, alerts: alerts.length, researchQa: research.map(r => r.status), productionChanged: false }));
  if (research.some(r => r.failures.length)) throw new Error("Research technical QA failed");
  return output;
}
if (process.argv[1]?.endsWith("authority-report.ts")) {
  try { runAuthorityReport(); } catch (e) { console.error(e instanceof Error ? e.message : "Authority report failed"); process.exitCode = 1; }
}
