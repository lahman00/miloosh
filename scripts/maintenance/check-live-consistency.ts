import { pathToFileURL } from "node:url";
import { extractLiveFacts, liveInconsistencies, type LiveFacts } from "@/lib/site-audit/live-facts";

/**
 * `npm run check:live -- [--origin https://miloosh.com] [--path /x ...]`
 *
 * Fetches a handful of the site's own public pages (at most 25, one at a time) and checks that they come from one
 * build: the same footer line and the same deployment id. A mix means two versions are being served. Read-only; it
 * never requests an external or partner URL.
 */

const DEFAULT_PATHS = ["/", "/software/pipedrive", "/software/slack", "/compare/hubspot-vs-pipedrive", "/compare/wix-vs-shopify", "/category/crm", "/guides", "/research/saas-pricing-pressure-index-2026"];
const MAX_PAGES = 25;

export async function main(argv: string[]): Promise<number> {
  const origin = (argv[argv.indexOf("--origin") + 1] && argv.includes("--origin") ? argv[argv.indexOf("--origin") + 1]! : "https://miloosh.com").replace(/\/$/, "");
  const paths = argv.flatMap((arg, i) => (arg === "--path" && argv[i + 1] ? [argv[i + 1]!] : []));
  const targets = (paths.length > 0 ? paths : DEFAULT_PATHS).slice(0, MAX_PAGES);
  const facts: LiveFacts[] = [];
  for (const target of targets) {
    const url = `${origin}${target}`;
    const response = await fetch(url, { headers: { "User-Agent": "MilooshConsistencyCheck/1.0 (+https://miloosh.com)" }, redirect: "follow" });
    facts.push(extractLiveFacts(url, response.status, await response.text(), response.headers));
  }
  for (const fact of facts) console.log(`${fact.status}  ${fact.url}  region ${fact.region ?? "?"}  cache ${fact.cache ?? "?"}  age ${fact.age ?? "?"}  deployments ${fact.deployments.join(",") || "none"}  footer ${fact.footerLine ?? "none"}`);
  const problems = liveInconsistencies(facts);
  console.log(problems.length === 0 ? `\nConsistent: ${facts.length} pages share one footer line and one deployment id.` : `\nINCONSISTENT:\n  ${problems.join("\n  ")}`);
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
