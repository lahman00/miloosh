import fs from "node:fs";
import path from "node:path";
import { getAllSoftware } from "@/data/software";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { queryObservationSchema, latestQueries, queryOwnership, type IntentPage } from "@/lib/google-war/query-store";
import { inspectionSchema } from "@/lib/google-war/evidence";
import { cohortRegistry } from "@/lib/google-war/cohorts";
import { loadCurrentProtection as loadProtection } from "@/lib/google-war/current-protection";
import { protectionFingerprint, staleProtectionAlert } from "@/lib/google-war/current-protection";
import { RESEARCH_PATHS } from "@/lib/analytics/research";
import { researchWatch, outreachSchema, outreachCaptureSchema, outreachDisposition, crawlDelta, movementAlerts, cohortWatch, replyWatch, placementCheckAlerts } from "@/lib/authority/operations";
import { periodSchema, checkpointWindows } from "@/lib/google-war/measurement";
import { organicMoneyFunnel } from "@/lib/google-war/money-funnel";
import { eventExportSchema } from "@/lib/authority/inputs";
import { improvementSchema, verifiedExperimentClock } from "@/lib/google-war/deployment-proof";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import type { runAuthorityReport } from "./authority-report";
import researchSeed from "@/data/growth/authority/research-inspections-20260927.json";
import outreachSeed from "@/data/growth/authority/outreach.json";
import focus from "@/data/growth/authority/winnable-focus.json";
import deployment from "@/docs/growth/receipts/20260927-production-release/deployment.json";
import indexingRequests from "@/docs/growth/receipts/20260927-production-release/indexing-requests.json";

const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const optional = (file: string) => fs.existsSync(file) ? read(file) : null;
const option = (key: string, fallback: string) => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
const escape = (s: unknown) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** One offline composition layer for the existing authority/query/funnel stores.
 * No remote requests, messages, indexing submissions, publishing or deployment. */
export function runOperationsReport(authority: ReturnType<typeof runAuthorityReport>) {
  const out = "var/growth/operations", now = new Date().toISOString();
  const previous = optional(path.join(out, "latest.json"));
  const cmsRelease = optional("docs/growth/receipts/20260927-cms-release/deployment.json");
  const currentDeployment = cmsRelease?.status === "READY_VERIFIED_PRODUCTION" ? cmsRelease : deployment;
  const cmsIndexing = optional("docs/growth/receipts/20260927-cms-release/indexing-request.json");
  const inspections = inspectionSchema.array().parse(optional(option("--research-inspections", "var/growth/operations/research-inspections.json")) ?? researchSeed);
  const queries = latestQueries(queryObservationSchema.array().parse(optional("var/growth/google-command/query-page.json") ?? []));
  const software = getAllSoftware();
  const pages: IntentPage[] = [
    ...software.map(s => ({ page: "https://miloosh.com/software/" + s.slug, kind: "software" as const, products: [s.slug] })),
    ...PUBLISHED_COMPARISONS.map(([a, b]) => ({ page: "https://miloosh.com/compare/" + getComparisonSlug(a, b), kind: "comparison" as const, products: [a, b] })),
  ];
  const ownership = queries.map(q => ({ ...q, ...queryOwnership(q, pages, software) }));
  const protections = loadProtection();
  const top = focus.targets.map(t => ({ ...t, source: focus.source, editAllowed: false,
    protected: protections.some(p => p.page === new URL(t.page).pathname),
    observations: ownership.filter(q => q.page === t.page && q.query === t.query),
  }));
  const requests = new Map(indexingRequests.requests.map(r => [r.url, r.observedAt]));
  if (cmsIndexing?.status === "ACCEPTED" && cmsIndexing.requestedAt) requests.set(cmsIndexing.url, cmsIndexing.requestedAt);
  const research = RESEARCH_PATHS.map(route => {
    const url = "https://miloosh.com" + route, i = inspections.filter(i => i.url === url).sort((a,b) => b.checkedAt.localeCompare(a.checkedAt))[0];
    return i ? researchWatch(previous?.researchInspections?.find((p: { url: string }) => p.url === i.url) ?? null, i, requests.get(i.url) ?? null) :
      { url, checkedAt: null, requestedAt: requests.get(url) ?? null, state: "UNKNOWN", coverageState: "NO_CAPTURED_INSPECTION", lastCrawl: null, alert: null };
  });
  const outreach = outreachCaptureSchema.parse(optional(option("--outreach", "var/growth/operations/outreach.json")) ?? outreachSeed);
  const contacts = outreach.contacts;
  const crawl = optional("var/growth/google-command/production-crawl/latest.json");
  const priorCrawl = optional("var/growth/operations/baseline/production-crawl.json");
  const health = optional("var/growth/google-command/production/health.json");
  const sourceChecks = optional(path.join(out, "live-checks.json"));
  const releaseCheck = optional("var/growth/google-command/release/gates.json");
  const periods = periodSchema.array().parse(optional("var/growth/google-command/page-periods.json") ?? []).filter(p => p.captured_at <= now).sort((a, b) => b.captured_at.localeCompare(a.captured_at));
  const improvements = improvementSchema.array().parse(read("data/growth/google-war/improvements.json"));
  const movement = improvements.flatMap(i => ([7, 14, 28] as const).map(days => {
    const deployedAt = verifiedExperimentClock(i, now);
    if (!deployedAt) return { page: i.url, days, status: "WAIT_DEPLOYMENT", alerts: [] as string[] };
    const windows = checkpointWindows(deployedAt, days);
    const after = periods.filter(p => p.page === "https://miloosh.com" + i.url && JSON.stringify(p.window) === JSON.stringify(windows.after));
    const matched = after.flatMap(a => {
      const b = periods.find(p => p.page === a.page && p.query === a.query && JSON.stringify(p.scope) === JSON.stringify(a.scope) && JSON.stringify(p.window) === JSON.stringify(windows.before));
      return b ? [{ query: a.query, ...movementAlerts(b, a, deployedAt, days) }] : [];
    });
    return { page: i.url, days, status: matched.length ? "OBSERVATIONS" : "WAIT_MATCHING_DATA", matched, alerts: matched.flatMap(m => m.alerts) };
  }));
  const allInspections = inspectionSchema.array().parse([...read("data/growth/google-war/inspections.json"), ...read("data/growth/google-war/reported-inspections.json")]);
  const indexation = cohortRegistry().map(c => ({ id: c.id, monitorOnly: true, rows: [...c.treatment, ...c.control].map(page => {
    const at = verifiedExperimentClock(improvements.find(i => i.url === page), now);
    return { page, ...cohortWatch("https://miloosh.com" + page, allInspections, at, now),
      note: "UNKNOWN is retained when exact deployment/crawl timezone proof is absent; never relabel it NOT_RECRAWLED." };
  }) }));
  const events = optional(option("--events", "var/growth/operations/events.json"));
  const bundle = events ? eventExportSchema.parse(events) : null;
  const organic = bundle ? organicMoneyFunnel(bundle.events as FirstPartyEvent[], bundle.start, bundle.end) : { status: "UNKNOWN", reason: "No complete readable first-party production export. Vercel Web Analytics returned not_found; not zero." };
  const protectionAlert = staleProtectionAlert(optional("var/growth/google-war/latest.json")?.protectionFingerprint, protectionFingerprint());
  const alerts = [...(protectionAlert ? [protectionAlert] : []), ...authority.alerts.map(a => ({ code: a.code, target: a.target, reason: a.reason })),
    ...placementCheckAlerts(sourceChecks?.placements ?? []),
    ...(releaseCheck?.results ?? []).filter((g: { exitCode: number | null; error: string | null }) => g.exitCode !== 0 || g.error).map((g: { name: string; end: string }) => ({ code: "RELEASE_GATE_FAILED", target: g.name, reason: "Recorded local release gate failed at " + g.end + "; production health does not override this hold." })),
    ...research.filter(r => r.alert).map(r => ({ code: r.alert!, target: r.url, reason: "New crawl text observed; exclusion is not indexation success. No resubmission." })),
    ...movement.flatMap(m => m.alerts.map(code => ({ code, target: m.page, reason: "Matched final windows only; directional, not causal or statistically significant." }))),
  ];
  const result = { generatedAt: now, productionDeploymentReference: currentDeployment, productionHealth: health,
    cmsIndexing: cmsIndexing ?? { status: "NOT_REQUESTED" },
    crawl: crawl && priorCrawl ? { capturedAt: crawl.capturedAt, complete: crawl.complete, failures: crawl.failures, delta: crawlDelta(priorCrawl.rows, crawl.rows) } : { status: "UNKNOWN" },
    google: { brand: authority.brandHistory.at(-1), brandMovement: authority.brandedSearchMovement, ranking: movement, topWinnable: top },
    queryPageMap: ownership, wrongOwner: ownership.filter(q => q.classification === "LIKELY_WRONG_OWNER"),
    authority: { baseline: authority.deepLinkBaseline, changes: authority.changes, registry: authority.registry, timeline: authority.observatory },
    research, researchInspections: inspections, indexation,
    outreach: { ...outreach, contacts: contacts.map(c => ({ ...c, disposition: outreachDisposition(c.email, contacts) })),
      ...replyWatch(previous?.outreach?.contacts ? outreachSchema.array().parse(previous.outreach.contacts) : null, contacts),
      note: "Known recipients only; CheckedAt is mailbox evidence time, not report refresh. Compare captured IDs, never infer a live inbox check from running this offline report. No messages sent." },
    revenue: { eventCoverage: bundle ? { status: "COMPLETE", fullHistoryRecords: bundle.events.length, start: bundle.start, endExclusive: bundle.end,
      rawEventsInWindow: bundle.events.filter(e => e.timestamp >= bundle.start && e.timestamp < bundle.end).length,
      exclusionCountScope: "Referral classifier exclusions describe full history, not window visitors. Empty eligible rows are not proof of zero humans." } : { status: "UNKNOWN" },
      referrals: authority.referralTraffic, research: authority.researchRevenue, organic,
      researchDownloads: "UNKNOWN: no dedicated CSV download event in current deployed vocabulary; HTTP QA is not consumption.",
      jsonUsage: "UNKNOWN: no dedicated measured API-consumption event; HTTP QA is not usage.",
      conversions: null, merchantArrival: "UNOBSERVABLE: handoff is not arrival/conversion" },
    affiliates: { active: ACTIVE_PARTNERS.map(p => p.slug), ledger: CURRENT_AFFILIATE_LEDGER.map(p => ({ program: p.programId, status: p.status })),
      hubspot: "DECLINED_LOW_REACH", saascomparely: "NOT_AFFILIATE_NOT_EARNED_AUTHORITY" },
    experiments: { protectedPages: new Set(protections.map(p => p.page)).size, cohorts: authority.protectedCohorts, integrationPreview: optional(path.join(out, "integration-preview.json")) },
    alerts, sourceChecks, releaseCheck,
    safety: { productionChanged: false, messagesSent: 0, indexingRequests: 0, merchantNavigations: 0, publicDataWrites: 0 },
  };
  fs.mkdirSync(path.join(out, "history"), { recursive: true });
  fs.writeFileSync(path.join(out, "latest.json"), JSON.stringify(result, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "history", now.replaceAll(":", "-") + ".json"), JSON.stringify(result, null, 2) + "\n");
  const summary = [
    "# Miloosh Google operations", "Generated " + now + ". Evidence timestamps remain separate; no causal claims.",
    "## Google", "Query×page observations: " + ownership.length + "; likely wrong-owner observations: " + result.wrongOwner.length + ". Ranking requires matching final windows.",
    "Brand: " + JSON.stringify(result.google.brand) + ". Post-release search outcome is not yet measured.",
    "## Research", ...research.map(r => r.url + ": " + r.state + " / " + r.coverageState + "; last crawl " + (r.lastCrawl ?? "UNKNOWN")),
    "## Authority", JSON.stringify(authority.deepLinkBaseline), "Newly verified links are not necessarily newly earned: " + JSON.stringify(authority.changes),
    "## Outreach", ...result.outreach.contacts.map(c => c.organization + ": " + c.disposition + "; replies " + c.replyIds.length),
    "## Revenue", JSON.stringify(result.revenue),
    "## Experiments", result.experiments.protectedPages + " protected URLs. Integration preview is not deployment authorization.",
    "## Alerts", ...alerts.map(a => a.code + ": " + a.target + " — " + a.reason),
    "## Top winnable SERPs — monitoring queue, not permission to rewrite",
    ...top.map(t => t.rank + ". " + t.query + " → " + t.page + "; exact-primary-query observations: " + t.observations.length + "; protected=" + t.protected),
  ].join("\n\n") + "\n";
  fs.writeFileSync(path.join(out, "morning.md"), summary);
  const table = (headers: string[], rows: unknown[][]) => '<div class="scroll"><table><thead><tr>' + headers.map(h => "<th>" + escape(h) + "</th>").join("") + "</tr></thead><tbody>" + rows.map(row => "<tr>" + row.map(v => "<td>" + escape(v ?? "UNKNOWN") + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
  const sections = [
    ["Google", table(["Query", "Monitoring target", "Priority", "Evidence", "Protected"], top.map(t => [t.query, t.page, t.rank, t.observations.length ? `${t.observations.length} captured exact-query row(s); see dates in JSON` : t.attribution, t.protected])) + "<p>Targets without captured query rows remain reported/unconfirmed, not measured demand. Tables scroll horizontally on narrow screens.</p><p>" + escape("Brand window: " + result.google.brand?.window.start + "–" + result.google.brand?.window.end + "; no post-release movement proven.") + "</p>"],
    ["Authority", table(["Source", "Target", "State"], authority.registry.map(a => [a.source, a.targetUrl, a.status]))],
    ["Research", table(["URL", "Google", "Last crawl (displayed)", "Checked"], research.map(r => [r.url, r.state + ": " + r.coverageState, r.lastCrawl, r.checkedAt]))],
    ["Outreach", table(["Organization", "Send state", "Observed replies"], result.outreach.contacts.map(c => [c.organization, c.disposition, c.replyIds.length]))],
    ["Revenue", "<p>Referral visits, research usage and organic funnel: " + escape(bundle ? "complete export supplied; see JSON" : "UNKNOWN — complete first-party export unavailable") + ".</p><p>QA handoffs are mocked. They are not merchant visits or conversions.</p>"],
    ["Experiments", "<p>" + result.experiments.protectedPages + " protected URLs. No cohort/content edits. Candidate integration: " + escape(result.experiments.integrationPreview?.status ?? "UNKNOWN") + ".</p>"],
    ["Alerts", table(["Code", "Target", "Reason"], alerts.map(a => [a.code, a.target, a.reason]))],
  ];
  fs.writeFileSync(path.join(out, "index.html"), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Miloosh Operations</title><style>body{font:16px/1.5 system-ui;background:#0b1828;color:#e2edf8;margin:0;padding:clamp(14px,3vw,40px)}main{max-width:1280px;margin:auto}section{padding:18px;background:#142c43;border-radius:12px;margin:20px 0}h1{font-size:clamp(26px,4vw,40px)}.scroll{overflow:auto}td,th{padding:10px;text-align:left;border-bottom:1px solid #35516a;min-width:120px;max-width:420px;overflow-wrap:anywhere}a{color:#9bdcff}p{overflow-wrap:anywhere}</style><main><p>PRIVATE LOCAL · READ ONLY · NO AUTO DEPLOY</p><h1>Google operations command center</h1><p>' + escape(now) + '</p><p><a href="latest.json">Evidence JSON</a> · <a href="morning.md">Day report</a></p>' + sections.map(([name, body]) => "<section><h2>" + name + "</h2>" + body + "</section>").join("") + "</main></html>");
  // Keep the existing morning entrypoint canonical; dashboards link to this extension.
  fs.writeFileSync("var/growth/authority/morning.md", summary);
  console.log(JSON.stringify({ operationsReport: out, queries: ownership.length, wrongOwner: result.wrongOwner.length, alerts: alerts.length, productionChanged: false }));
  return result;
}
