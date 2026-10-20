import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PUBLISHED_COMPARISONS, getComparisonSlug } from "@/data/comparisons";
import { getSoftware } from "@/data/software";
import { isSoftwareIndexingReady } from "@/lib/indexing-quality";
import { parseCsv } from "@/lib/growth-agents/gsc-import";
import { loadSiteInventory } from "@/lib/growth-agents/inventory-loader";
import { loadPartnerFacts } from "@/lib/growth-agents/partners";
import { restrictionsFor } from "@/lib/growth-agents/partner-restrictions";
import { protectionFor } from "@/lib/growth-agents/protection";
import { headSha, loadProtectionSnapshot } from "@/lib/growth-agents/protection-sources";
import { canonicalPageUrl } from "@/lib/growth-agents/urls";

/**
 * `npm run growth:opportunity-matrix -- --gsc-dir <capture> --base-sha <production sha> --now <iso> --out <dir>`
 *
 * Ranks every published comparison page as a buyer opportunity from facts the repository already holds. Read-only.
 * Ordering is lexicographic, not a weighted score, so the same inputs always give the same order and each position can be
 * explained: (1) a partner whose whole path is payout-verified, (2) the page is editable now and both products' data can be
 * edited without changing a protected, observed or in-flight page, (3) the two products are direct substitutes (same category),
 * (4) pricing of both products was verified recently, (5) historical Search Console impressions of the page, (6) slug. Search volume, keyword difficulty and
 * competing results are NOT measured here and are reported as such, never estimated.
 */

const FRESH_DAYS = 45;
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

type Row = {
  slug: string;
  url: string;
  products: [string, string];
  payoutVerifiedPartners: string[];
  otherPartners: string[];
  protection: string;
  bothQualityReady: boolean;
  oldestPricingCheckDays: number | null;
  historicalImpressions: number;
  historicalClicks: number;
  restrictionCount: number;
  hasPricingBoth: boolean;
  hasProsConsBoth: boolean;
  sameCategory: boolean;
  /** Neither product feeds a page that is protected, observed or in flight, so its data may be refreshed. */
  dataEditable: boolean;
};

function ageDays(iso: string | undefined, now: Date): number | null {
  if (!iso) return null;
  return Math.floor((now.getTime() - new Date(`${iso}T00:00:00Z`).getTime()) / 86_400_000);
}

export function run(): number {
  const gscDir = arg("gsc-dir");
  const baseSha = arg("base-sha");
  if (!gscDir || !baseSha) {
    console.error("Pass --gsc-dir <capture folder> and --base-sha <the commit production runs>.");
    return 2;
  }
  const now = new Date(arg("now") ?? new Date().toISOString());
  const root = process.cwd();
  const sha = headSha(root);
  const inventory = loadSiteInventory({ checkoutSha: sha, now });
  const { snapshot } = loadProtectionSnapshot({ repoRoot: root, baseSha, today: now.toISOString().slice(0, 10), ownWorktreePath: root, knownComparisonSlugs: new Set(inventory.comparisons.keys()), checkoutSha: sha, generatedAt: now.toISOString() });

  const impressions = new Map<string, { i: number; c: number }>();
  const table = parseCsv(fs.readFileSync(path.join(gscDir, "pages-historical.csv"), "utf8"));
  for (const [page, clicks, imps] of table.slice(1)) {
    const url = canonicalPageUrl(page ?? "");
    if (!url) continue;
    const prev = impressions.get(url) ?? { i: 0, c: 0 };
    impressions.set(url, { i: prev.i + Number(imps?.replace(/,/g, "") || 0), c: prev.c + Number(clicks?.replace(/,/g, "") || 0) });
  }

  const heldProducts = new Set<string>();
  for (const [url, entry] of inventory.pages) if (protectionFor(url, snapshot).verdict !== "EDITABLE") for (const slug of entry.softwareSlugs) heldProducts.add(slug);

  const partners = new Map(loadPartnerFacts().map((p) => [p.slug, p]));
  const rows: Row[] = [];
  for (const [a, b] of PUBLISHED_COMPARISONS) {
    const sa = getSoftware(a);
    const sb = getSoftware(b);
    if (!sa || !sb) continue;
    const slug = getComparisonSlug(a, b);
    const url = `https://miloosh.com/compare/${slug}`;
    const side = [a, b].map((s) => partners.get(s)).filter((p): p is NonNullable<typeof p> => Boolean(p));
    const checks = [sa, sb].map((s) => ageDays(s.pricing?.lastVerified, now));
    const perf = impressions.get(url) ?? { i: 0, c: 0 };
    rows.push({
      slug,
      url,
      products: [a, b],
      payoutVerifiedPartners: side.filter((p) => p.revenueReady).map((p) => p.slug),
      otherPartners: side.filter((p) => !p.revenueReady).map((p) => `${p.slug} (${p.payout.readiness})`),
      protection: protectionFor(url, snapshot).verdict,
      bothQualityReady: isSoftwareIndexingReady(sa, now) && isSoftwareIndexingReady(sb, now),
      oldestPricingCheckDays: checks.some((d) => d === null) ? null : Math.max(...(checks as number[])),
      historicalImpressions: perf.i,
      historicalClicks: perf.c,
      restrictionCount: side.reduce((n, p) => n + restrictionsFor(p.slug).length, 0),
      hasPricingBoth: sa.pricing?.status === "verified" && sb.pricing?.status === "verified",
      hasProsConsBoth: Boolean(sa.pros?.length && sb.pros?.length && sa.cons?.length && sb.cons?.length),
      sameCategory: sa.category === sb.category,
      dataEditable: !heldProducts.has(a) && !heldProducts.has(b),
    });
  }

  const eligible = rows.filter((r) => r.payoutVerifiedPartners.length > 0);
  const rank = (r: Row) => [r.protection === "EDITABLE" && r.dataEditable ? 0 : r.protection === "EDITABLE" ? 1 : 2, r.sameCategory ? 0 : 1, r.oldestPricingCheckDays !== null && r.oldestPricingCheckDays <= FRESH_DAYS && r.hasPricingBoth ? 0 : 1, -r.historicalImpressions, r.slug] as const;
  eligible.sort((x, y) => {
    const a = rank(x), b = rank(y);
    for (let i = 0; i < a.length; i += 1) if (a[i]! < b[i]!) return -1; else if (a[i]! > b[i]!) return 1;
    return 0;
  });

  const outDir = arg("out");
  const header = ["rank", "comparison", "payout_verified_partner", "other_partner", "protection", "data_editable", "same_category", "both_quality_ready", "oldest_pricing_check_days", "pricing_verified_both", "sourced_pros_and_cons_both", "historical_impressions", "historical_clicks", "partner_restrictions"];
  const lines = eligible.map((r, i) => [i + 1, r.slug, r.payoutVerifiedPartners.join("+"), r.otherPartners.join("+"), r.protection, r.dataEditable, r.sameCategory, r.bothQualityReady, r.oldestPricingCheckDays ?? "UNKNOWN", r.hasPricingBoth, r.hasProsConsBoth, r.historicalImpressions, r.historicalClicks, r.restrictionCount].join(","));
  const csv = `${header.join(",")}\n${lines.join("\n")}\n`;
  const summary = {
    generatedAt: now.toISOString(),
    baseSha,
    comparisons: rows.length,
    withPayoutVerifiedPartner: eligible.length,
    editable: eligible.filter((r) => r.protection === "EDITABLE").length,
    editableWithEditableData: eligible.filter((r) => r.protection === "EDITABLE" && r.dataEditable).length,
    editableDataSameCategory: eligible.filter((r) => r.protection === "EDITABLE" && r.dataEditable && r.sameCategory).length,
    editableAndFresh: eligible.filter((r) => r.protection === "EDITABLE" && r.oldestPricingCheckDays !== null && r.oldestPricingCheckDays <= FRESH_DAYS && r.hasPricingBoth).length,
    withHistoricalImpressions: eligible.filter((r) => r.historicalImpressions > 0).length,
    notMeasured: ["search volume", "keyword difficulty", "competing results", "conversion rate"],
  };
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "opportunity-matrix.csv"), csv);
    fs.writeFileSync(path.join(outDir, "opportunity-matrix.json"), `${JSON.stringify({ summary, rows: eligible }, null, 2)}\n`);
  }
  console.log(JSON.stringify(summary, null, 2));
  console.log(lines.slice(0, 40).join("\n"));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(run());
