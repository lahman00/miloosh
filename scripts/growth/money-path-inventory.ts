import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";

/**
 * Money-path inventory (read-only): one row per outbound vendor link in the prerendered site.
 *
 *   npm run build && npm run growth:money-path -- --out <dir> [--private-out <dir>]
 *
 * It reads `.next/server/app/**\/*.html` only. It never opens a vendor or affiliate URL. The committed CSV redacts the destination of
 * every affiliate-tagged link to its host (affiliate URLs are not published); `--private-out` writes the full destinations.
 * "Program known" means the repository's own records: ACTIVE in the registry, another ledger status, or UNKNOWN. UNKNOWN is not "no
 * program": nobody checked the vendor.
 */
export type MoneyPathRow = {
  page: string;
  vendor: string;
  destination: string;
  destinationFull: string;
  affiliateTagged: "yes" | "no";
  taggedBy: string;
  programKnown: string;
  ctaPositionPercent: number;
  rel: string;
  disclosurePresent: "yes" | "no";
};

const SKIP_HOSTS = [/(^|\.)miloosh\.com$/i, /(^|\.)linkedin\.com$/i, /(^|\.)x\.com$/i, /(^|\.)twitter\.com$/i, /(^|\.)facebook\.com$/i, /(^|\.)instagram\.com$/i, /(^|\.)youtube\.com$/i];

const strip = (u: string) => u.replace(/#.*$/, "").replace(/\/$/, "");
const hostOf = (u: string) => { try { return new URL(u).host.toLowerCase(); } catch { return ""; } };

export function extractMoneyPathRows(html: string, pageUrl: string, ctx: { partnerUrls: ReadonlyMap<string, string>; partnerStatus: ReadonlyMap<string, string>; hostVendor: ReadonlyMap<string, string> }): MoneyPathRow[] {
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
  const disclosure = /affiliate link|affiliate disclosure|may earn a commission/i.test(body);
  const rows: MoneyPathRow[] = [];
  for (const m of body.matchAll(/<a\b([^>]*)>/gi)) {
    const attrs = m[1] ?? "";
    const href = /href="(https?:\/\/[^"]+)"/i.exec(attrs)?.[1]?.replace(/&amp;/g, "&");
    if (!href) continue;
    const host = hostOf(href);
    if (!host || SKIP_HOSTS.some((re) => re.test(host))) continue;
    const rel = /rel="([^"]*)"/i.exec(attrs)?.[1] ?? "";
    const exact = ctx.partnerUrls.get(strip(href));
    const sponsored = /sponsored/i.test(rel);
    const tagged = Boolean(exact) || sponsored;
    const slug = exact ?? ctx.hostVendor.get(host) ?? host.replace(/^www\./, "");
    const status = ctx.partnerStatus.get(slug);
    rows.push({
      page: pageUrl,
      vendor: slug,
      destination: tagged ? `[affiliate link redacted] ${host}` : strip(href),
      destinationFull: strip(href),
      affiliateTagged: tagged ? "yes" : "no",
      taggedBy: exact && sponsored ? "registry URL + rel=sponsored" : exact ? "registry URL only (no rel=sponsored)" : sponsored ? "rel=sponsored only (URL not in registry)" : "",
      programKnown: status ?? "UNKNOWN",
      ctaPositionPercent: Math.round(((m.index ?? 0) / Math.max(1, body.length)) * 100),
      rel: rel || "(none)",
      disclosurePresent: disclosure ? "yes" : "no",
    });
  }
  return rows;
}

export function buildContext() {
  const partnerUrls = new Map<string, string>();
  const partnerStatus = new Map<string, string>();
  const hostVendor = new Map<string, string>();
  for (const p of ACTIVE_PARTNERS) {
    if (p.affiliateUrl) { partnerUrls.set(strip(p.affiliateUrl), p.slug); hostVendor.set(hostOf(p.affiliateUrl), p.slug); }
    partnerStatus.set(p.slug, `ACTIVE (registry)`);
  }
  for (const r of CURRENT_AFFILIATE_LEDGER) for (const slug of r.productSlugs) if (!partnerStatus.has(slug)) partnerStatus.set(slug, `${r.status} (ledger)`);
  return { partnerUrls, partnerStatus, hostVendor };
}

const csvCell = (v: unknown) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (rows: MoneyPathRow[], full: boolean) => ["page,vendor,destination,affiliate_tagged,tagged_by,program_known,cta_position_percent,rel,disclosure_present", ...rows.map((r) => [r.page, r.vendor, full ? r.destinationFull : r.destination, r.affiliateTagged, r.taggedBy, r.programKnown, r.ctaPositionPercent, r.rel, r.disclosurePresent].map(csvCell).join(","))].join("\n") + "\n";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith(".html")) out.push(p); }
  return out;
}

export function run(): number {
  const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? undefined : process.argv[i + 1]; };
  const root = arg("root") ?? path.join(process.cwd(), ".next/server/app");
  if (!fs.existsSync(root)) { console.error("No build found. Run `npm run build` first."); return 2; }
  const ctx = buildContext();
  const rows: MoneyPathRow[] = [];
  for (const file of walk(root)) {
    const rel = path.relative(root, file).replace(/\.html$/, "");
    if (rel === "_not-found" || rel === "_global-error") continue;
    rows.push(...extractMoneyPathRows(fs.readFileSync(file, "utf8"), rel === "index" ? "/" : `/${rel}`, ctx));
  }
  rows.sort((a, b) => a.page.localeCompare(b.page) || a.ctaPositionPercent - b.ctaPositionPercent);
  const tagged = rows.filter((r) => r.affiliateTagged === "yes");
  const byVendor = new Map<string, { links: number; tagged: number; pages: Set<string> }>();
  for (const r of rows) { const v = byVendor.get(r.vendor) ?? { links: 0, tagged: 0, pages: new Set() }; v.links++; if (r.affiliateTagged === "yes") v.tagged++; v.pages.add(r.page); byVendor.set(r.vendor, v); }
  const summary = {
    pagesScanned: walk(root).length, outboundLinks: rows.length, affiliateTagged: tagged.length,
    taggedWithoutRegistryUrl: tagged.filter((r) => !r.taggedBy.startsWith("registry")).length,
    registryUrlWithoutSponsoredRel: rows.filter((r) => r.taggedBy === "registry URL only (no rel=sponsored)").length,
    taggedOnPagesWithoutDisclosure: tagged.filter((r) => r.disclosurePresent === "no").length,
    untaggedToVendorWithKnownActiveProgram: rows.filter((r) => r.affiliateTagged === "no" && r.programKnown.startsWith("ACTIVE")).length,
    distinctVendors: byVendor.size,
    topUntaggedVendors: [...byVendor.entries()].filter(([, v]) => v.tagged === 0).sort((a, b) => b[1].links - a[1].links).slice(0, 15).map(([vendor, v]) => ({ vendor, links: v.links, pages: v.pages.size })),
  };
  const out = arg("out");
  if (out) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, "money-path.csv"), toCsv(rows, false)); fs.writeFileSync(path.join(out, "money-path-summary.json"), `${JSON.stringify(summary, null, 2)}\n`); }
  const priv = arg("private-out");
  if (priv) { fs.mkdirSync(priv, { recursive: true }); fs.writeFileSync(path.join(priv, "money-path-full.csv"), toCsv(rows, true)); }
  console.log(JSON.stringify(summary, null, 2));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(run());
