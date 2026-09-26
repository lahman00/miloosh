import { renderedHtml, decodeHtml } from "@/lib/seo/rendered-html";
import type { Node } from "./graph";

export function intentOwner(
  node: Pick<Node, "path" | "kind" | "products">,
): string {
  return node.kind === "software"
    ? `alternatives:${node.products[0]}`
    : node.kind === "comparison"
      ? `versus:${[...node.products].sort().join(":")}`
      : `${node.kind}:${node.path}`;
}
export function intentConflicts(nodes: Node[]) {
  const owners = new Map<string, string>();
  const issues: Array<{ path: string; reason: string; evidence: string }> = [];
  for (const n of nodes) {
    const page = renderedHtml(n.html),
      key = intentOwner(n);
    if (owners.has(key))
      issues.push({
        path: n.path,
        reason: "DUPLICATE_PRIMARY_OWNER",
        evidence: owners.get(key)!,
      });
    owners.set(key, n.path);
    if (
      page.canonicals.length !== 1 ||
      page.canonicals[0] !== `https://miloosh.com${n.path}`
    )
      issues.push({
        path: n.path,
        reason: "CANONICAL_OWNERSHIP",
        evidence: JSON.stringify(page.canonicals),
      });
    if (n.kind === "comparison" && !/\bvs\.?\b|versus/i.test(page.title))
      issues.push({
        path: n.path,
        reason: "COMPARISON_INTENT_TITLE",
        evidence: page.title,
      });
    if (
      (n.kind === "comparison" || n.kind === "guide") &&
      /^Best .+ alternatives(?:\s*\(\d{4}\))?\s*(?:\||$)/i.test(page.title)
    )
      issues.push({
        path: n.path,
        reason: "GENERIC_ALTERNATIVES_ON_NON_OWNER",
        evidence: page.title,
      });
  }
  return issues;
}
/** Warning only. Compare buyer prose, not navigation, feature lists or vendor facts. */
export function repeatedBuyerText(nodes: Node[], factText: string[] = []) {
  const normalize = (text: string) =>
    decodeHtml(text).replace(/\s+/g, " ").trim().toLowerCase();
  const facts = new Set(factText.map(normalize));
  const groups = new Map<string, Set<string>>();
  for (const n of nodes.filter((n) =>
    ["software", "comparison"].includes(n.kind),
  )) {
    const main = n.html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
    for (const match of main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
      const text = decodeHtml(match[1].replace(/<[^>]*>/g, " "))
        .replace(/\s+/g, " ")
        .trim();
      if (
        text.length < 120 ||
        !/choose|switch|best for|fits|workflow/i.test(text) ||
        /affiliate|commission|copyright|disclaimer|sources policy/i.test(
          text,
        ) ||
        facts.has(normalize(text.replace(/^Choose .+? if this fits:\s*/i, "")))
      )
        continue;
      const paths = groups.get(text) ?? new Set<string>();
      paths.add(n.path);
      groups.set(text, paths);
    }
  }
  return [...groups]
    .filter(([, paths]) => paths.size >= 5)
    .map(([text, paths]) => ({
      severity: "WARNING",
      text,
      paths: [...paths],
      reason:
        "Repeated decision prose on >=5 pages; editorial review, not an automatic rewrite or build failure",
    }));
}
export function commercialQualityRegressions(
  current: Array<{ path: string; bucket: string | null }>,
  baseline: Record<string, string>,
) {
  const byPath = new Map(current.map((r) => [r.path, r]));
  return Object.entries(baseline)
    .filter(([, bucket]) => ["A", "B"].includes(bucket))
    .flatMap(([path]) => {
      const row = byPath.get(path) ?? { path, bucket: null };
      return row.bucket === null || ["C", "D"].includes(row.bucket)
        ? [row]
        : [];
    });
}
