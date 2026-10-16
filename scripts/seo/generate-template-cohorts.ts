import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadSiteInventory } from "@/lib/growth-agents/inventory-loader";
import { protectionFor } from "@/lib/growth-agents/protection";
import { headSha, loadProtectionSnapshot } from "@/lib/growth-agents/protection-sources";
import { HOLD_RELEASES } from "@/data/seo/hold-releases";
import { buildTemplateCohorts, type ProtectionRow, type TemplateCohorts } from "@/lib/template-cohorts-build";

/**
 * `npm run seo:template-cohorts -- --base <production-sha> [--hold-until 2026-11-04] [--now <iso>]`
 *
 * Writes data/seo/template-cohorts.json: the protection verdict of every software page and comparison, from the
 * growth Director's own protection mechanism. Read-only apart from that one file.
 *
 * `-- --check-hold` instead verifies that no data file of a product shared with a held page has changed since the
 * base commit recorded in the file; it exits 1 and names the files when one has.
 */

const OUT = "data/seo/template-cohorts.json";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function run(): number {
  const root = process.cwd();
  const file = path.join(root, OUT);

  if (process.argv.includes("--check-hold")) {
    const recorded = JSON.parse(fs.readFileSync(file, "utf8")) as TemplateCohorts;
    const changed = execFileSync("git", ["diff", "--name-only", `${recorded.baseSha}..HEAD`, "--", "data/software"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter((line) => /^data\/software\/[a-z0-9-]+\.json$/.test(line))
      .map((line) => path.basename(line, ".json"));
    const touched = changed.filter((slug) => recorded.productsSharedWithHeldPages.includes(slug));
    console.log(`${changed.length} product data file(s) changed since ${recorded.baseSha.slice(0, 7)}; ${touched.length} of them feed a held page.`);
    if (touched.length > 0) console.error(`Shared with a held page (its measurement could be affected until ${recorded.holdUntil}): ${touched.join(", ")}`);
    return touched.length > 0 ? 1 : 0;
  }

  const baseSha = arg("base");
  if (!baseSha) {
    console.error("Pass --base <the commit production runs>.");
    return 2;
  }
  const now = new Date(arg("now") ?? new Date().toISOString());
  const sha = headSha(root);
  const inventory = loadSiteInventory({ checkoutSha: sha, now });
  const { snapshot } = loadProtectionSnapshot({
    repoRoot: root,
    baseSha,
    today: now.toISOString().slice(0, 10),
    ownWorktreePath: root,
    ignoreWorktreePaths: process.argv.flatMap((arg, i) => (arg === "--ignore-worktree" && process.argv[i + 1] ? [process.argv[i + 1]!] : [])),
    knownComparisonSlugs: new Set(inventory.comparisons.keys()),
    checkoutSha: sha,
    generatedAt: now.toISOString(),
  });
  const rows: ProtectionRow[] = [...inventory.pages].map(([url, entry]) => {
    const result = protectionFor(url, snapshot);
    return { kind: entry.identity.kind, slug: entry.identity.slug, verdict: result.verdict, sources: [...new Set(result.reasons.map((reason) => reason.source))], eligibleAfter: result.eligibleAfter, softwareSlugs: entry.softwareSlugs };
  });
  const full = execFileSync("git", ["rev-parse", baseSha], { cwd: root, encoding: "utf8" }).trim();
  const cohorts = buildTemplateCohorts(rows, { generatedAt: now.toISOString(), baseSha: full, holdUntil: arg("hold-until") ?? "2026-11-04" }, HOLD_RELEASES);
  fs.writeFileSync(file, `${JSON.stringify(cohorts, null, 2)}\n`, "utf8");
  console.log(`${OUT}: software ${cohorts.software.editable.length} editable / ${Object.keys(cohorts.software.held).length} held; comparisons ${cohorts.comparisons.editable.length} editable / ${Object.keys(cohorts.comparisons.held).length} held; ${cohorts.productsSharedWithHeldPages.length} products shared with held pages.`);
  const unknown = rows.filter((row) => row.verdict === "UNKNOWN").length;
  if (unknown > 0) console.warn(`${unknown} page(s) have an UNKNOWN verdict (a protection source could not be read); they are held.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run());
}
