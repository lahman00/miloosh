import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { renderedHtml, internalTarget } from "@/lib/seo/rendered-html";

export type Node = {
  path: string;
  kind: string;
  categories: string[];
  products: string[];
  html: string;
  reviewedTargets?: string[];
};
export type Edge = {
  from: string;
  to: string;
  anchor: string;
  content: boolean;
  relevant: boolean;
};
export function distances(nodes: Set<string>, edges: Edge[], starts: string[]) {
  const distance = new Map(
    starts.filter((s) => nodes.has(s)).map((s) => [s, 0]),
  );
  const adjacency = new Map<string, Set<string>>();
  for (const e of edges) {
    const to = adjacency.get(e.from) ?? new Set<string>();
    to.add(e.to);
    adjacency.set(e.from, to);
  }
  const queue = [...distance.keys()];
  for (let i = 0; i < queue.length; i++)
    for (const to of adjacency.get(queue[i]) ?? [])
      if (!distance.has(to)) {
        distance.set(to, distance.get(queue[i])! + 1);
        queue.push(to);
      }
  return distance;
}
export function buildAuthorityGraph(input: Node[]) {
  const nodes = new Map(input.map((n) => [n.path, n]));
  const edges: Edge[] = [];
  // Script/comment/template payloads are not crawlable DOM anchors.
  const crawlable = (html: string) =>
    html
      .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");
  const pages = new Map(
    input.map((n) => [n.path, renderedHtml(crawlable(n.html))]),
  );
  for (const n of input) {
    const page = pages.get(n.path)!;
    if (page.robots?.includes("nofollow") || page.robots?.includes("noindex"))
      continue;
    const content =
      crawlable(n.html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
    const mainPairs = new Set(
      renderedHtml(content).links.map((l) => `${l.href}|${l.text}`),
    );
    for (const a of page.links) {
      const u = internalTarget(a.href, n.path);
      if (
        !u ||
        u.search ||
        u.pathname === n.path ||
        a.rel?.split(/\s+/).includes("nofollow")
      )
        continue;
      const target = nodes.get(u.pathname);
      if (!target || pages.get(target.path)?.robots?.includes("noindex"))
        continue;
      const isContent = mainPairs.has(`${a.href}|${a.text}`);
      // Structural relevance only: category/product overlap, not semantic authority or PageRank.
      const relevant =
        isContent &&
        (n.reviewedTargets?.includes(target.path) ||
          n.categories.some((c) => target.categories.includes(c)) ||
          n.products.some((p) => target.products.includes(p)));
      edges.push({
        from: n.path,
        to: target.path,
        anchor: a.text,
        content: isContent,
        relevant,
      });
    }
  }
  const fromHome = distances(new Set(nodes.keys()), edges, ["/"]);
  const fromHubs = distances(new Set(nodes.keys()), edges, [
    "/",
    "/categories",
    "/browse",
    "/compare",
    "/guides",
  ]);
  const rows = input.map((n) => {
    const incoming = edges.filter((e) => e.to === n.path);
    const sources = [...new Set(incoming.map((e) => e.from))];
    const page = pages.get(n.path)!;
    return {
      path: n.path,
      kind: n.kind,
      totalInboundLinks: incoming.length,
      inboundSourcePages: sources.length,
      relevantInboundLinks: incoming.filter((e) => e.relevant).length,
      relevantSources: new Set(
        incoming.filter((e) => e.relevant).map((e) => e.from),
      ).size,
      contentSources: new Set(
        incoming.filter((e) => e.content).map((e) => e.from),
      ).size,
      bySourceType: Object.fromEntries(
        ["software", "comparison", "guide", "category", "hub"].map((kind) => [
          kind,
          sources.filter((p) => nodes.get(p)?.kind === kind).length,
        ]),
      ),
      sourceDiversity: new Set(sources.map((p) => nodes.get(p)?.kind)).size,
      anchorDiversity: new Set(incoming.map((e) => e.anchor.toLowerCase()))
        .size,
      homeDepth: fromHome.get(n.path) ?? null,
      hubDepth: fromHubs.get(n.path) ?? null,
      orphan: sources.length === 0,
      nearOrphan: sources.length > 0 && sources.length <= 2,
      canonical: page.canonicals,
      noindex: Boolean(page.robots?.includes("noindex")),
      title: page.title,
      description: page.description ?? null,
      h1: page.h1s,
    };
  });
  return {
    method:
      "Crawlable emitted HTML anchors; all-source graph; relevance is structural overlap or explicitly reviewed decision paths, not Google authority. Depth includes crawlable navigation even when visually collapsed.",
    rows,
    edges,
  };
}
export function readBuild(dist: string): {
  buildId: string;
  artifactHash: string;
  html: Map<string, string>;
} {
  const html = new Map<string, string>();
  const directory = path.join(dist, "server/app");
  function walk(dir: string) {
    for (const f of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, f.name);
      if (f.isDirectory()) walk(file);
      else if (f.name.endsWith(".html")) {
        const route =
          "/" +
          path
            .relative(directory, file)
            .replace(/\.html$/, "")
            .replace(/^index$/, "");
        if (!/^\/(?:_|api(?:\/|$)|internal(?:\/|$))/.test(route))
          html.set(route, fs.readFileSync(file, "utf8"));
      }
    }
  }
  walk(directory);
  if (!html.has("/"))
    throw new Error(
      "Complete local production build required; no invented graph",
    );
  const hash = createHash("sha256");
  for (const [route, body] of html) hash.update(route).update(body);
  return {
    buildId: fs.readFileSync(path.join(dist, "BUILD_ID"), "utf8").trim(),
    artifactHash: hash.digest("hex"),
    html,
  };
}
