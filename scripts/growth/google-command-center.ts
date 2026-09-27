import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getAllSoftware } from "@/data/software";
import { getAllRoleGuides } from "@/data/guides/registry";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { WIX_FUNNELS } from "@/lib/wix-funnels";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { readBuild } from "@/lib/google-war/graph";
import { inspectionSchema, searchSnapshotSchema } from "@/lib/google-war/evidence";
import { resolveEvidence, recrawlState, classifyInspectionEvidence } from "@/lib/google-war/resolver";
import { queryObservationSchema, queryOwnership, cannibalization, type IntentPage } from "@/lib/google-war/query-store";
import { cohortRegistry, cohortOverlaps } from "@/lib/google-war/cohorts";
import { rankingDelta, checkpointWindows, cohortResult, periodSchema } from "@/lib/google-war/measurement";
import { improvementSchema, verifiedExperimentClock } from "@/lib/google-war/deployment-proof";
import { eventExportSchema } from "@/lib/authority/inputs";
import { organicMoneyFunnel } from "@/lib/google-war/money-funnel";
import { ingestOffsite, outreachUrl } from "@/lib/google-war/offsite";
import { auditRenderedCtas } from "@/lib/google-war/cta-audit";
import { verifyRecordedTitle } from "@/lib/google-war/change-manifest";
import rankingChanges from "@/docs/growth/receipts/20260926-ranking-war/changes.json";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import { runAuthorityReport } from "./authority-report";
import { runOperationsReport } from "./operations-report";
import authoritySeed from "@/data/growth/authority/registry.json";
import protocolDeviations from "@/data/growth/cohort-protocol-deviations.json";
import { appendAuthority, parseRegistry, legacyOffsiteView } from "@/lib/authority/registry";
import { currentProtectionSnapshot, staleProtectionAlert } from "@/lib/google-war/current-protection";
import { cloroReportSchema } from "@/lib/growth/cloro-visibility";
import cloroBaseline from "@/data/growth/cloro/baseline-20260927.json";

const arg = (key: string, fallback: string) => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const escape = (s: unknown) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const write = (file: string, data: unknown) => fs.writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n");
function main() {
  const out = arg("--output", "var/growth/google-command"), now = new Date().toISOString();
  const google = read(arg("--google-report", "var/growth/google-war/latest.json"));
  const cloroFile = arg("--cloro-report", "var/growth/cloro/latest.json");
  const cloro = cloroReportSchema.parse(fs.existsSync(cloroFile) ? read(cloroFile) : cloroBaseline);
  const protection = currentProtectionSnapshot();
  const protectionAlert = staleProtectionAlert(google.protectionFingerprint, protection.fingerprint);
  const graph = read(arg("--graph", "var/growth/google-war/authority-graph.json"));
  const build = readBuild(arg("--dist", ".next-miloosh-qa"));
  if (build.artifactHash !== google.artifactHash || graph.artifactHash !== build.artifactHash) throw new Error("Mixed build artifacts");
  const snapshot = searchSnapshotSchema.parse(read("data/growth/google-war/search-snapshot.json"));
  const inspections = [...inspectionSchema.array().parse(read("data/growth/google-war/inspections.json")),
    ...inspectionSchema.array().parse(read("data/growth/google-war/reported-inspections.json"))].map(classifyInspectionEvidence);
  const queries = queryObservationSchema.array().parse(read(arg("--queries", "var/growth/google-command/query-page.json")));
  const periodsFile = arg("--periods", "var/growth/google-command/page-periods.json");
  const periods = fs.existsSync(periodsFile) ? periodSchema.array().parse(read(periodsFile)) : [];
  const improvements = improvementSchema.array().parse(read("data/growth/google-war/improvements.json"));
  const software = getAllSoftware(), active = new Set<string>(ACTIVE_PARTNERS.map(p => p.slug));
  const comparisons = new Map(PUBLISHED_COMPARISONS.map(([a, b]) => [`/compare/${getComparisonSlug(a, b)}`, [a, b]]));
  const guides = new Map(getAllRoleGuides().map(g => [`/${g.slug}`, g.products.map(p => p.slug)]));
  const pages: IntentPage[] = [...build.html.keys()].map(page => ({ page: `https://miloosh.com${page}`,
    kind: page.startsWith("/software/") ? "software" : comparisons.has(page) ? "comparison" : "other",
    products: page.startsWith("/software/") ? [page.slice(10)] : comparisons.get(page) ?? guides.get(page) ?? [],
  }));
  const ownership = queries.map(r => ({ ...r, ...queryOwnership(r, pages, software) }));
  const cohorts = cohortRegistry();
  const interventionVerification = rankingChanges.changesExecuted.map(c => verifyRecordedTitle(c, build.html));
  const registered = new Set(protection.entries.map(p => p.page));
  const deployed = (page: string) => verifiedExperimentClock(improvements.find(i => i.url === page), now);
  const deltas = (page: string, days: 7 | 14 | 28, requireRecrawl = false) => {
    if (interventionVerification.some(v => v.canonical === page && v.status === "EXPECTED_TITLE_NOT_RENDERED")) return { status: "WAIT_INTERVENTION_VERIFICATION" as const };
    const at = deployed(page);
    if (!at) return { status: "WAIT_DEPLOYMENT" as const };
    const observation = resolveEvidence(`https://miloosh.com${page}`, inspections, snapshot, now).inspected;
    if (requireRecrawl && !["INDEXED", "RECRAWLED_EXCLUDED"].includes(recrawlState(observation, at))) return { status: "WAIT_RECRAWL" as const };
    const windows = checkpointWindows(at, days);
    const select = (window: { start: string; end: string }) => periods.filter(p => p.captured_at <= now && p.page === `https://miloosh.com${page}` && p.query === null && p.scope.country === null && p.scope.device === null && p.scope.searchType === "web" && JSON.stringify(p.window) === JSON.stringify(window)).sort((a, b) => b.captured_at.localeCompare(a.captured_at))[0];
    const before = select(windows.before), after = select(windows.after);
    return before && after ? rankingDelta(before, after, at, days) : { status: "WAIT_MATCHING_DATA" as const, windows };
  };
  let funnel: ReturnType<typeof organicMoneyFunnel> | null = null;
  const eventsFile = arg("--events", "var/growth/operations/events.json");
  if (fs.existsSync(eventsFile)) {
    const bundle = eventExportSchema.parse(read(eventsFile));
    funnel = organicMoneyFunnel(bundle.events as FirstPartyEvent[], bundle.start, bundle.end);
  }
  const rows = pages.map(p => {
    const url = new URL(p.page).pathname, source = google.rows.find((r: { url: string }) => r.url === url);
    const resolved = resolveEvidence(p.page, inspections, snapshot, now);
    const relatedProtected = p.products.some(slug => registered.has(`/software/${slug}`) || google.rows.find((r: { url: string }) => r.url === `/software/${slug}`)?.protection.some((r: { state: string }) => r.state !== "SAFE_TO_EDIT"));
    const safe = !protectionAlert && Boolean(source?.technical.localArtifactPass) && !registered.has(url) && !relatedProtected && !source?.protection.some((r: { state: string }) => r.state !== "SAFE_TO_EDIT");
    const monetizable = p.products.filter(s => active.has(s));
    return { url, kind: p.kind, ...resolved, safe, activeProducts: monetizable, commerciallyRelevant: p.products.length > 0,
      intentEvidence: ownership.filter(q => q.page === p.page).map(q => ({ query: q.query, impressions: q.impressions, classification: q.classification })),
      buyerIntent: ownership.some(q => q.page === p.page && /\b(alternatives?|competitors?|vs|versus|pricing|cost)\b/i.test(q.query)) ? "OBSERVED_DECISION_QUERY" : p.products.length ? "STRUCTURAL_COMMERCIAL_INTENT_ONLY" : "UNVERIFIED",
      recrawl: recrawlState(resolved.inspected, deployed(url)),
      handoffs: funnel?.rows.find(r => r.page === url)?.observedMerchantHandoffSessions ?? (funnel ? 0 : null),
      observationOnly: !safe,
    };
  });
  const lost = rows.filter(r => r.lostIndexation || r.suspectedLostIndexation);
  const striking = rows.filter(r => r.rankingEligible && r.safe && r.commerciallyRelevant && (r.search?.impressions ?? 0) >= 100 && r.search?.position != null && r.search.position >= 8 && r.search.position <= 20);
  const ctr = rows.filter(r => r.rankingEligible && r.safe && (r.search?.impressions ?? 0) >= 100 && r.search?.position != null && r.search.position >= 1 && r.search.position <= 10 && r.search.ctr != null && r.search.ctr < .01);
  const money = rows.filter(r => r.activeProducts.length && (r.search?.impressions ?? 0) > 0).sort((a, b) => (b.search!.impressions! - a.search!.impressions!) || ((a.search?.position ?? Infinity) - (b.search?.position ?? Infinity)) || Number(b.buyerIntent === "OBSERVED_DECISION_QUERY") - Number(a.buyerIntent === "OBSERVED_DECISION_QUERY") || ((b.handoffs ?? -1) - (a.handoffs ?? -1)) || a.url.localeCompare(b.url));
  const merchants = software.map(s => ({ slug: s.slug, active: shouldShowAffiliateDisclosure(s), homepage: s.website,
    ctaUrls: [...new Set([getSoftwareCtaUrl(s), getSoftwareCtaUrl(s, "pricing"), ...(s.slug === "wix" && active.has("wix") ? Object.values(WIX_FUNNELS).map(f => f.url) : [])])],
  }));
  const cta = [...build.html].map(([url, html]) => ({ url, ...auditRenderedCtas(html, merchants) }));
  const authorityStore = "var/growth/authority/registry.json";
  const authorityRegistry = appendAuthority(parseRegistry(authoritySeed), fs.existsSync(authorityStore) ? parseRegistry(read(authorityStore)) : []);
  const offsite = ingestOffsite(legacyOffsiteView(authorityRegistry, now));
  const hubspot = CURRENT_AFFILIATE_LEDGER.find(p => p.programId === "hubspot");
  if (hubspot?.status !== "REJECTED" || hubspot.affiliateUrl || active.has("hubspot") || !hubspot.evidence.some(e => e.includes("Low reach"))) throw new Error("HubSpot operational truth regression");
  const checkpoints = cohorts.map(c => ({ ...c, overlapWarnings: cohortOverlaps(cohorts).filter(o => o.groups.some(g => g.startsWith(c.id))),
    checkpoints: ([7, 14, 28] as const).map(days => ({ days,
      treatment: c.treatment.map(page => ({ page, recrawl: rows.find(r => r.url === page)?.recrawl ?? "UNKNOWN", result: deltas(page, days, true) })),
      control: c.control.map(page => ({ page, result: deltas(page, days) })),
      // Missing windows remain missing; no zero-imputation of an absent page.
      results: cohortResult(c.treatment.map(page => deltas(page, days, true)), c.control.map(page => deltas(page, days)), protocolDeviations.filter(d => d.cohortId === c.id && d.status === "REVIEW_REQUIRED")),
    })) }));
  const manifest = cohorts.flatMap(c => c.treatment.map(url => ({ url, commit: c.id === "ranking-intent-20260926" ? execFileSync("git", ["rev-parse", rankingChanges.commits[0]], { encoding: "utf8" }).trim() : execFileSync("git", ["log", "-1", "--format=%H", "--", c.source], { encoding: "utf8" }).trim() || null,
    commitMeaning: c.id === "ranking-intent-20260926" ? "Intervention commit from change receipt; not deployment proof" : "Commit recording source receipt/membership, not deployment proof", reason: c.intervention, experiment: c.id, primaryIntervention: c.intervention, recordedDate: c.recordedDate, deployedAt: deployed(url), verification: improvements.find(i => i.url === url)?.verification ?? null, localVerification: interventionVerification.find(v => v.canonical === url) ?? { status: "NO_EXACT_EXPECTATION_RECORDED" } })));
  const authority = runAuthorityReport();
  const operations = runOperationsReport(authority);
  const report = {
    protectionFingerprint: protection.fingerprint,
    protectionAlerts: protectionAlert ? [protectionAlert] : [],
    operationsControlRoom: { report: "../operations/latest.json", dashboard: "../operations/index.html", alerts: operations.alerts.length },
    authorityControlRoom: { report: "../authority/latest.json", dashboard: "../authority/index.html", gscLinks: authority.authorityBaseline.totalExternalLinks, observedDeepLinkPairs: authority.deepLinkBaseline.deepLinkPlacements, referralData: authority.referralTraffic.status, alerts: authority.alerts.length },
    cloroVisibility: cloro,
    generatedAt: now, sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), buildId: build.buildId, artifactHash: build.artifactHash,
    policy: { mode: "READ_ONLY_CONTROL_ROOM", massPublishing: false, rankingPolicy: "Measured impressions, position, verified partner readiness and observed handoffs; no predicted revenue", gscWindow: snapshot.window, gscCapturedAt: snapshot.capturedAt, attribution: "GSC aggregates cannot be joined to individual visitors; referral activity is not a Google ranking cause", apiRequests: 0, merchantRequests: 0, blobWrites: 0 },
    counts: { routes: build.html.size, queryObservations: queries.length, measuredQueryPages: new Set(queries.map(q => q.page)).size, lostIndexation: lost.length, lostWithAuthenticatedEvidence: lost.filter(r => r.lostIndexation).length, lostReportedOnly: lost.filter(r => r.suspectedLostIndexation).length, strikingDistance: striking.length, ctr: ctr.length, cohorts: cohorts.length, activePartners: ACTIVE_PARTNERS.length, commercialLinksChecked: cta.reduce((s, r) => s + r.checked, 0) },
    queues: { RANKING_LOST_INDEXATION: lost, INDEX_SELECTION: lost, RANKING_STRIKING_DISTANCE: striking, CTR: ctr, TOP_MONEY_OPPORTUNITIES: money },
    ownership, queryCoverage: pages.map(p => ({ page: p.page, status: queries.some(q => q.page === p.page) ? "MEASURED_PARTIAL_QUERIES" : "NO_DATA" })), cannibalization: cannibalization(queries), cohorts: checkpoints, manifest, interventionVerification,
    internalAuthority: { artifactHash: graph.artifactHash, source: "Emitted rendered HTML, not live post-integration crawl", rows: graph.rows.filter((r: { path: string }) => registered.has(r.path)), anchorContext: graph.edges.filter((e: { to: string }) => registered.has(e.to)) },
    offsite: offsite.map(r => ({ ...r, attributed: r.campaign ? funnel?.referralCampaigns.filter(c => JSON.stringify(c.dimensions) === JSON.stringify([r.campaign!.source, r.campaign!.medium, r.campaign!.name])) ?? null : null, controlledUrl: r.campaign ? outreachUrl(r.targetUrl, r.campaign.source, r.campaign.name) : null })),
    offsiteIngestion: fs.existsSync(path.join(out, "offsite-ingestion.json")) ? read(path.join(out, "offsite-ingestion.json")) : { status: "NO_EXTERNAL_LEDGER_IMPORTED" },
    funnel: funnel ?? { status: "UNAVAILABLE", reason: "No complete first-party event export supplied; not zero visits/handoffs", affiliateConversions: null },
    hubspot: { status: "DECLINED", canonicalStatus: hubspot.status, reason: "Low reach (traffic, followers)", source: "data/affiliate/canonical-ledger.ts" },
    ctaAudit: { checked: cta.reduce((s, r) => s + r.checked, 0), findings: cta.flatMap(r => r.findings.map(f => ({ url: r.url, ...f }))), merchantRequests: 0 },
  };
  fs.mkdirSync(out, { recursive: true });
  write(path.join(out, "latest.json"), report);
  write(path.join(out, "site-change-manifest.json"), manifest);
  const sections = Object.entries(report.queues).map(([title, items]) => `<section><h2>${escape(title)} (${items.length})</h2><div class="scroll"><table><thead><tr><th>Page</th><th>Index state</th><th>Impressions</th><th>Position</th><th>Safe to act</th><th>Handoffs</th></tr></thead><tbody>${items.slice(0, 30).map(r => `<tr><td>${escape(r.url)}</td><td>${escape(r.state)}</td><td>${r.search?.impressions ?? "UNKNOWN"}</td><td>${r.search?.position ?? "UNKNOWN"}</td><td>${r.safe ? "Review allowed" : "Observe only"}</td><td>${r.handoffs ?? "UNKNOWN"}</td></tr>`).join("")}</tbody></table></div></section>`).join("");
  write(path.join(out, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Miloosh · Google intelligence</title><style>body{font:16px/1.5 system-ui;background:#091727;color:#e8f0f7;margin:0;padding:clamp(16px,4vw,48px)}main{max-width:1300px;margin:auto}h1{font-size:clamp(28px,4vw,48px)}section{background:#12283d;padding:20px;border-radius:12px;margin:22px 0}h2{overflow-wrap:anywhere;font-size:20px}.scroll{overflow:auto}table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #35516a;white-space:nowrap}.notice{color:#f1cf7b}a{color:#a4d6ff}</style><main><p>PRIVATE LOCAL REPORT · LEVEL 0 · NO PUBLISHING</p><h1>Google intelligence & revenue</h1><p><a href="../operations/index.html">Day operations: Google, research, outreach and alerts</a> · <a href="../authority/index.html">Authority control room: links, research journeys and Google observations</a></p><p>Build ${escape(build.buildId)} · Evidence captured ${escape(snapshot.capturedAt)}<br>GSC window ${escape(snapshot.window.start)}–${escape(snapshot.window.end)}</p><p class="notice">${lost.length} historical ranking URLs require index selection. Missing data stays UNKNOWN. No revenue forecast or causal claim.</p><section><h2>Evidence coverage</h2><p>${queries.length} query×page observations · ${cohorts.length} cohorts · ${ACTIVE_PARTNERS.length} active partners</p><p>Cloro: brand recognized by ${escape(cloro.summary.brandRecognizedProviders.join(",") || "none")}; generic visible cases ${escape(cloro.summary.genericVisibleCases.join(",") || "none")}; mode ${escape(cloro.mode)}; charged credits ${escape(cloro.chargedCredits ?? "UNKNOWN")}.</p><p>Organic funnel: ${funnel ? `${funnel.eligibleOrganicSessions} classified sessions (estimates)` : "UNAVAILABLE — no complete event export supplied"}. Merchant arrival and conversion: UNKNOWN.</p><p>Experiments await verified deployment and matching finalized windows. Off-site: ${offsite.filter(r => r.status === "VERIFIED_LIVE").length} previously verified placements; sending an email is not a placement.</p></section>${sections}<section><h2>Audit / exports</h2><p>${report.ctaAudit.checked} tracked links inspected; ${report.ctaAudit.findings.filter(f => f.severity === "BLOCK").length} blocking findings, ${report.ctaAudit.findings.filter(f => f.severity === "REVIEW").length} review findings.</p><p><a href="latest.json">Full evidence, ownership, cohorts, graph and attribution JSON</a> · <a href="site-change-manifest.json">Change manifest</a></p></section></main></html>`);
  console.log(JSON.stringify({ output: out, ...report.counts, blockingCtaFindings: report.ctaAudit.findings.filter(f => f.severity === "BLOCK").length, analytics: funnel ? "COMPLETE_EXPORT" : "UNAVAILABLE" }));
  if (process.argv.includes("--strict") && (protectionAlert || report.ctaAudit.findings.some(f => f.severity === "BLOCK"))) process.exitCode = 1;
}
try { main(); } catch (error) { console.error(error instanceof Error ? error.message : "Command-center failed"); process.exitCode = 1; }
