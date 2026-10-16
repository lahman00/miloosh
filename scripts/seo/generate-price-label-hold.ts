import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadSiteInventory } from "@/lib/growth-agents/inventory-loader";
import { OWNER_PRICE_LABEL_FACTUAL_RELEASES } from "@/data/seo/price-label-factual-releases";
import { protectionFor } from "@/lib/growth-agents/protection";
import { headSha, loadProtectionSnapshot } from "@/lib/growth-agents/protection-sources";

/**
 * `npm run seo:price-label-hold -- --base <production sha> [--hold-until 2026-11-04] [--now <iso>]`
 *
 * Writes data/seo/price-label-hold.json: the software profiles whose protection verdict is not EDITABLE (protected,
 * in a release observation window or in flight), except exactly those with owner-approved factual label corrections.
 * holdUntil is the mandatory review date; it does not automatically lift a hold or invalidate newer observation windows.
 * Read-only apart from that file.
 */
const OUT = "data/seo/price-label-hold.json";
const arg = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};

function run(): number {
  const baseSha = arg("base");
  if (!baseSha) {
    console.error("Pass --base <the commit production runs>.");
    return 2;
  }
  const root = process.cwd();
  const now = new Date(arg("now") ?? new Date().toISOString());
  const sha = headSha(root);
  const inventory = loadSiteInventory({ checkoutSha: sha, now });
  const { snapshot } = loadProtectionSnapshot({ repoRoot: root, baseSha, today: now.toISOString().slice(0, 10), ownWorktreePath: root, knownComparisonSlugs: new Set(inventory.comparisons.keys()), checkoutSha: sha, generatedAt: now.toISOString() });
  const approved = new Set(Object.keys(OWNER_PRICE_LABEL_FACTUAL_RELEASES));
  const allSoftware = new Set([...inventory.pages.values()].filter((entry) => entry.identity.kind === "software").map((entry) => entry.identity.slug));
  for (const [slug, release] of Object.entries(OWNER_PRICE_LABEL_FACTUAL_RELEASES)) {
    if (!allSoftware.has(slug) || !release.reason.trim() || !release.evidence.startsWith("https://")
      || release.approvedOn > now.toISOString().slice(0, 10)) {
      console.error(`Invalid or future factual release record: ${slug}`);
      return 2;
    }
  }
  const held: string[] = [];
  for (const [url, entry] of inventory.pages) {
    if (entry.identity.kind !== "software" || !entry.identity.slug) continue;
    if (protectionFor(url, snapshot).verdict !== "EDITABLE" && !approved.has(entry.identity.slug)) held.push(entry.identity.slug);
  }
  const full = execFileSync("git", ["rev-parse", baseSha], { cwd: root, encoding: "utf8" }).trim();
  const data = { generatedAt: now.toISOString(), baseSha: full, holdUntil: arg("hold-until") ?? "2026-11-04", heldSoftware: held.sort() };
  fs.writeFileSync(path.join(root, OUT), `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`${OUT}: ${held.length} held software profile(s).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(run());
