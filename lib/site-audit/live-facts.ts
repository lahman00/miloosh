import { parsePageFacts } from "./page-facts";

/** What a live response says about which build produced it. */
export type LiveFacts = {
  url: string;
  status: number;
  /** Deployment ids found in the HTML (asset query strings and data attributes). */
  deployments: string[];
  footerLine: string | null;
  /** Edge region from x-vercel-id, for example "fra1". */
  region: string | null;
  cache: string | null;
  age: string | null;
};

export function extractLiveFacts(url: string, status: number, html: string, headers: Pick<Headers, "get">): LiveFacts {
  const deployments = [...new Set([...html.matchAll(/dpl_[A-Za-z0-9]{20,}/g)].map((match) => match[0]))].sort();
  const vercelId = headers.get("x-vercel-id");
  return {
    url,
    status,
    deployments,
    footerLine: parsePageFacts(new URL(url).pathname, html).footerLine,
    region: vercelId ? (vercelId.split("::")[0] ?? null) : null,
    cache: headers.get("x-vercel-cache"),
    age: headers.get("age"),
  };
}

/** Whether the pages came from one build: one footer line and one deployment id. Empty when consistent. */
export function liveInconsistencies(facts: readonly LiveFacts[]): string[] {
  const problems: string[] = [];
  const footers = new Map<string, string[]>();
  const deployments = new Map<string, string[]>();
  for (const fact of facts) {
    if (fact.status !== 200) problems.push(`${fact.url} answered HTTP ${fact.status}`);
    footers.set(fact.footerLine ?? "(no footer line)", [...(footers.get(fact.footerLine ?? "(no footer line)") ?? []), fact.url]);
    for (const id of fact.deployments) deployments.set(id, [...(deployments.get(id) ?? []), fact.url]);
  }
  if (footers.size > 1) for (const [line, urls] of footers) problems.push(`footer "${line}" on ${urls.length} page(s), for example ${urls[0]}`);
  if (deployments.size > 1) for (const [id, urls] of deployments) problems.push(`deployment ${id} on ${urls.length} page(s), for example ${urls[0]}`);
  return problems;
}
