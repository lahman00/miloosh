import fs from "node:fs";
import assert from "node:assert/strict";
import { renderedHtml } from "@/lib/seo/rendered-html";
import { buildSupportPricingBenchmark } from "@/lib/support-pricing-benchmark/build";
import { buildCrmPlanGateDataset } from "@/lib/crm-plan-gates/build";
import { buildCmsDecisionMatrix } from "@/lib/cms-decision-matrix/build";
import { parseRegistry, appendAuthority, type AuthorityEntry } from "@/lib/authority/registry";
import seed from "@/data/growth/authority/registry.json";
import { updateLocalStore } from "@/lib/authority/store";

// Explicit opt-in; GET only, public sources only. Never fetch commercial affiliate links.
const safe = (value: string) => {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || u.port || !u.hostname.includes(".") || u.hostname.includes(":") || /^[0-9.]+$/.test(u.hostname) || /\.(local|localhost|internal)$/.test(u.hostname) ||
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname) ||
    /partnerstack|partnerlinks|trypipedrive|try\.monday|try\.elevenlabs|aff\.|affiliate|[?&](partner|ref|aff|linkId)=/i.test(value)) throw new Error("Non-public or tracking URL refused");
  return u;
};
async function readOnlyGet(url: string) {
  const seen = new Set<string>(), chain: Array<{ url: string; status: number }> = [];
  let current = safe(url).href;
  for (let i = 0; i < 6; i++) {
    if (seen.has(current)) return { status: null, chain, classification: "REDIRECT_LOOP", body: "" };
    seen.add(current);
    try {
      const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(12000), headers: { "User-Agent": "MilooshSourceReadOnlyQA/1.0" } });
      chain.push({ url: current, status: response.status });
      if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get("location")) { await response.body?.cancel(); current = safe(new URL(response.headers.get("location")!, current).href).href; continue; }
      const body = await response.text();
      return { status: response.status, chain, classification: response.status === 404 || response.status === 410 ? "BROKEN" : response.status === 200 ? "HTTP_200" : "INACCESSIBLE_NOT_PROVEN_DEAD", body };
    } catch { return { status: null, chain, classification: "NETWORK_OR_ACCESS_UNAVAILABLE", body: "" }; }
  }
  return { status: null, chain, classification: "REDIRECT_LIMIT", body: "" };
}
async function main() {
  assert(process.argv.includes("--read-only"), "Explicit read-only flag required");
  const out = "var/growth/operations"; fs.mkdirSync(out, { recursive: true });
  const timestamp = new Date().toISOString(), exports = [], sources = new Set<string>(), sizes = [];
  for (const [slug, expected] of [
    ["customer-support-pricing-2026", buildSupportPricingBenchmark().rows],
    ["crm-plan-gates-2026", buildCrmPlanGateDataset().rows],
    ["cms-buying-decision-2026", buildCmsDecisionMatrix().rows],
  ] as const) {
    const json = await readOnlyGet("https://miloosh.com/api/research/" + slug), data = JSON.parse(json.body);
    assert.equal(json.status, 200);
    assert.deepEqual(Object.keys(data).sort(), ["dataset", "publisher", "generatedAt", "sampleSize", "inclusionRule", "rows"].sort());
    assert.deepEqual(data.rows, expected);
    assert(!/CRON_SECRET|BLOB_READ_WRITE_TOKEN|affiliateUrl|captured_at|gscImpressions|outreach|receipt|ownPageEditable/i.test(json.body));
    exports.push({ slug, status: 200, topLevelKeys: Object.keys(data), exactPublicRows: true, bytes: Buffer.byteLength(json.body) });
    const html = await readOnlyGet("https://miloosh.com/research/" + slug);
    const parsed = renderedHtml(html.body);
    sizes.push({ route: "/research/" + slug, htmlBytes: Buffer.byteLength(html.body), status: html.status });
    for (const a of parsed.links) {
      if (/^https:\/\//.test(a.href) && new URL(a.href).hostname !== "miloosh.com" && !/sponsored/.test(a.rel ?? "")) {
        try { sources.add(safe(a.href).href); } catch { /* record only intended editorial source links */ }
      }
    }
  }
  const sourceRows: Array<{ url: string; status: number | null; classification: string; chain: unknown }> = [];
  const pending = [...sources];
  await Promise.all(Array.from({ length: 3 }, async () => {
    let url: string | undefined;
    while ((url = pending.shift()) !== undefined) { const r = await readOnlyGet(url); sourceRows.push({ url, status: r.status, classification: r.classification, chain: r.chain }); }
  }));
  const registry = parseRegistry(seed), incoming: AuthorityEntry[] = [], placements = [];
  for (const externalUrl of [...new Set(registry.filter(e => ["qevra-home", "saashub-home", "saashub-research", "hypestar-home", "smartsme-research"].includes(e.id)).map(e => e.externalUrl))]) {
    const response = await readOnlyGet(externalUrl), anchors = renderedHtml(response.body).links;
    for (const entry of registry.filter(e => e.externalUrl === externalUrl)) {
      const links = anchors.filter(a => { try { const u = new URL(a.href); return u.origin + u.pathname.replace(/\/$/, "") === entry.targetUrl?.replace(/\/$/, ""); } catch { return false; } });
      placements.push({ id: entry.id, status: response.status, exactLinks: links.map(a => ({ href: a.href, rel: a.rel })) });
      if (response.status === 200 && links.length) {
        const nofollow = links.filter(a => /nofollow/i.test(a.rel ?? "")).length;
        incoming.push({ ...entry, observations: [{ at: timestamp, status: "VERIFIED_LIVE", method: "PUBLIC_HTTP", exactTargetVerified: true, linkPresent: true,
          rel: nofollow === links.length ? "NOFOLLOW" : nofollow === 0 ? "DOFOLLOW" : "MIXED",
          evidence: "Read-only public GET, exact target anchor observed. No target navigation; absent rel does not guarantee search-engine credit." }] });
      }
    }
  }
  const store = "var/growth/authority/registry.json";
  updateLocalStore(store, previous => appendAuthority(appendAuthority(registry, parseRegistry(previous)), incoming));
  const result = { checkedAt: timestamp, sourceScope: "External editorial links rendered on support, CRM and CMS research assets; not all 354 product sources.", publicExports: exports, sizes, placements,
    sourceLinks: sourceRows.sort((a, b) => a.url.localeCompare(b.url)), brokenSources: sourceRows.filter(r => ["BROKEN", "REDIRECT_LOOP", "REDIRECT_LIMIT"].includes(r.classification)),
    inconclusiveSources: sourceRows.filter(r => ["NETWORK_OR_ACCESS_UNAVAILABLE", "INACCESSIBLE_NOT_PROVEN_DEAD"].includes(r.classification)), merchantNavigations: 0, externalWrites: 0 };
  fs.writeFileSync(out + "/live-checks.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ sources: sources.size, broken: result.brokenSources.length, inconclusive: result.inconclusiveSources.length, placements: placements.length, publicExports: exports.length }));
}
void main().catch(() => { console.error("Read-only operations check failed; no secret values or response bodies logged"); process.exitCode = 1; });
