import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The growth agents are read-only by construction. These tests read the agents' own source and fail if a
 * module that should be pure starts touching the filesystem, the network or the environment, or if an
 * adapter starts issuing a command that can change a repository, a deployment or an account.
 */

const ROOT = process.cwd();
const LIB = path.join(ROOT, "lib/growth-agents");
const source = (file: string) => fs.readFileSync(path.join(LIB, file), "utf8");
const allModules = fs.readdirSync(LIB).filter((f) => f.endsWith(".ts"));

/** Modules that gather facts from git, the hosting platform or the registries. Everything else must be pure. */
const ADAPTERS = new Set(["protection-sources.ts", "guardian-sources.ts", "inventory-loader.ts", "partners.ts", "director-cli.ts", "live-check-source.ts"]);
const PURE = allModules.filter((f) => !ADAPTERS.has(f));

/** Type-only imports are erased at compile time, so they can never run anything. */
const stripTypeImports = (text: string) => text.replace(/\b(import|export)\s+type\s+[^;]*?from\s+["'][^"']+["'];?/g, "");

const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/([^:])\/\/.*$/gm, "$1");

describe("pure modules have no side effects", () => {
  it("covers every module in the folder (a new module is pure unless it is deliberately listed as an adapter)", () => {
    expect(PURE.length).toBeGreaterThanOrEqual(12);
    expect(allModules).toEqual(expect.arrayContaining([...ADAPTERS]));
  });

  it.each(PURE)("%s imports no filesystem, process, network or database module", (file) => {
    const code = stripComments(source(file));
    expect(code).not.toMatch(/from ["']node:(fs|child_process|net|http|https|dns|os|worker_threads|vm)["']/);
    expect(code).not.toMatch(/from ["'](fs|child_process|http|https|axios|node-fetch|undici|@vercel\/blob|@vercel\/kv|@upstash)[^"']*["']/);
    expect(code).not.toMatch(/\brequire\(/);
  });

  it.each(PURE)("%s calls no write, network, clock or environment API", (file) => {
    const code = stripComments(source(file));
    expect(code).not.toMatch(/\b(writeFile|writeFileSync|appendFile|appendFileSync|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|rename|renameSync|copyFile|copyFileSync|createWriteStream)\s*\(/);
    expect(code).not.toMatch(/\bfetch\s*\(/);
    expect(code).not.toMatch(/\bXMLHttpRequest\b|\bWebSocket\b/);
    expect(code).not.toMatch(/process\.env|process\.exit|process\.cwd/);
    expect(code).not.toMatch(/Date\.now\s*\(|new Date\s*\(\s*\)/);
    expect(code).not.toMatch(/Math\.random\s*\(/);
  });

  it.each(PURE)("%s imports nothing from the site's write paths (analytics store, outbound recorder, blob storage, pipeline)", (file) => {
    const code = stripTypeImports(stripComments(source(file)));
    const imports = [...code.matchAll(/from ["']([^"']+)["']/g)].map((m) => m[1]!);
    for (const spec of imports) {
      expect(spec, `${file} imports ${spec}`).not.toMatch(/analytics\/(events|store|record|local-store)|affiliate\/(pipeline|status|outbound)|seo-factory|social\/(publish|queue)|blob/);
    }
  });
});

describe("adapters only read", () => {
  const ALLOWED_GIT = new Set(["rev-parse", "branch", "status", "diff", "rev-list", "log", "worktree", "cat-file", "merge-base"]);
  const FORBIDDEN_GIT_VERBS = /\b(commit|push|pull|fetch|checkout|switch|reset|clean|stash|merge(?!-base)|rebase|add|rm|mv|restore|cherry-pick|apply|am|tag|gc|prune|remote|config|update-ref|symbolic-ref)\b/;

  it("issues only read-only git subcommands", () => {
    for (const file of ["protection-sources.ts", "guardian-sources.ts"]) {
      const code = stripComments(source(file));
      const calls = [...code.matchAll(/\b(?:git|gitOrNull)\(\s*[^,]+,\s*\[\s*"([a-z-]+)"(?:\s*,\s*"([^"]+)")?/g)];
      expect(calls.length, file).toBeGreaterThan(0);
      for (const call of calls) {
        expect(ALLOWED_GIT.has(call[1]!), `${file}: git ${call[1]}`).toBe(true);
        if (call[1] === "worktree") expect(call[2], `${file}: git worktree ${call[2]}`).toBe("list");
        if (call[1] === "branch") expect(call[2], `${file}: git branch ${call[2]}`).toBe("--show-current");
        if (call[1] === "merge-base") expect(call[2]).toBe("--is-ancestor");
      }
      // The generic wrapper spreads its caller's arguments; every call through it was checked above.
      const direct = [...code.matchAll(/execFileSync\(\s*"git"\s*,\s*\[([^\]]*)\]/g)].filter((call) => !call[1]!.includes("..."));
      for (const call of direct) {
        const verb = /"([a-z-]+)"/.exec(call[1]!.replace(/"--no-optional-locks"/, ""))?.[1];
        expect(ALLOWED_GIT.has(verb ?? ""), `${file}: direct git ${verb}`).toBe(true);
      }
      expect(code).not.toMatch(new RegExp(`\\[\\s*"${FORBIDDEN_GIT_VERBS.source.slice(2, -2)}"`));
    }
  });

  it("never lets git take an optional lock on a repository it only reads", () => {
    for (const file of ["protection-sources.ts", "guardian-sources.ts"]) {
      const code = source(file);
      expect(code).toMatch(/--no-optional-locks/);
      expect(code).toMatch(/GIT_OPTIONAL_LOCKS:\s*"0"/);
    }
  });

  it("reads the hosting platform with `vercel inspect` and GitHub with a GET-style `gh api` only", () => {
    const code = stripComments(source("guardian-sources.ts"));
    const vercelCalls = [...code.matchAll(/\brun\(\s*"vercel"\s*,\s*\[\s*"([a-z-]+)"/g)].map((m) => m[1]);
    expect(vercelCalls).toEqual(["inspect"]);
    const ghCalls = [...code.matchAll(/\brun\(\s*"gh"\s*,\s*\[\s*"([a-z-]+)"([^\]]*)\]/g)];
    expect(ghCalls.length).toBe(1);
    expect(ghCalls[0]![1]).toBe("api");
    expect(ghCalls[0]![2]).not.toMatch(/-X|--method|-f\b|-F\b|--field|--input|POST|PATCH|PUT|DELETE/);
  });

  it("runs only the repository's own gate commands, without bypass flags, and only when asked", () => {
    const code = stripComments(source("guardian-sources.ts"));
    expect(code).not.toMatch(/--force|--no-verify|audit fix|--legacy-peer-deps|--ignore-scripts=false/);
    // One spawn for the read-only command runner (vercel inspect, gh api) and one for the repository's own gates.
    const spawns = [...code.matchAll(/spawnSync\(/g)];
    expect(spawns).toHaveLength(2);
    expect(code).not.toMatch(/\brun\(\s*"(?!vercel"|gh")/);
    const cli = stripComments(source("director-cli.ts"));
    expect(cli).toMatch(/options\.runGates\s*\?\s*ports\.runGates/);
  });

  it("the orchestrator writes through its port only when an output directory was requested", () => {
    const cli = stripComments(source("director-cli.ts"));
    const writes = [...cli.matchAll(/ports\.(writeText|makeDirectory)\(/g)];
    expect(writes).toHaveLength(2);
    expect(cli).toMatch(/if \(options\.outDir\) \{[\s\S]*ports\.makeDirectory[\s\S]*ports\.writeText/);
    expect(cli).not.toMatch(/node:fs/);
  });

  it("the live page adapter sends only GET requests to Miloosh's own hosts, never follows an off-site redirect and sends no body", () => {
    const code = stripComments(source("live-check-source.ts"));
    expect(code).toMatch(/new Set\(\["miloosh\.com", "www\.miloosh\.com"\]\)/);
    expect(code).toMatch(/method: "GET"/);
    expect(code).toMatch(/redirect: "manual"/);
    expect(code).not.toMatch(/method:\s*"(POST|PUT|PATCH|DELETE|HEAD|OPTIONS)"/);
    expect(code).not.toMatch(/\bbody\s*:|FormData|JSON\.stringify|credentials\s*:|cookie/i);
    expect(code).not.toMatch(/node:(fs|child_process)|process\.env/);
    // It receives its fetch from the caller; it never calls the global one itself.
    expect(code).not.toMatch(/(^|[^.\w])fetch\(/m);
  });

  it("the live page parser never requests the links it finds", () => {
    const code = stripComments(source("live-check.ts"));
    expect(code).not.toMatch(/\bfetch\b|XMLHttpRequest|http\.get|https\.get|new URL\([^)]*\)\.href\s*;\s*await/);
  });

  it("the partner loader carries no affiliate URL field", () => {
    const code = stripComments(source("partners.ts"));
    expect(code).not.toMatch(/affiliateUrl:\s*partner\.affiliateUrl|applicationUrl|referral/i);
  });
});

describe("the command-line entry points", () => {
  const read = (file: string) => stripComments(fs.readFileSync(path.join(ROOT, file), "utf8"));
  const director = read("scripts/growth/growth-director.ts");
  const outreach = read("scripts/growth/outreach-ledger-check.ts");
  const pageCheck = read("scripts/growth/page-live-check.ts");
  const renderedDiff = read("scripts/growth/rendered-diff.ts");
  const fsCalls = (code: string) => new Set([...code.matchAll(/fs\.([A-Za-z]+)\(/g)].map((m) => m[1]));

  it("the director touches the filesystem only to read, plus the two writes the orchestrator asks for when --out is given", () => {
    expect(fsCalls(director)).toEqual(new Set(["readFileSync", "writeFileSync", "mkdirSync"]));
    expect(director).toMatch(/writeText:\s*\(p, content\) => fs\.writeFileSync/);
    expect(director).toMatch(/makeDirectory:\s*\(dir\) => fs\.mkdirSync/);
  });

  it("the outreach ledger check opens one file for reading and can write nothing", () => {
    expect(fsCalls(outreach)).toEqual(new Set(["readFileSync"]));
  });

  it("the page check reads files and writes one only when --out is given, through its injected writer", () => {
    expect(fsCalls(pageCheck)).toEqual(new Set(["readFileSync", "writeFileSync"]));
    expect(pageCheck).toMatch(/if \(options\.out\) \{\s*deps\.writeText\(options\.out/);
    expect(pageCheck).toMatch(/if \(!options\.out\) process\.stdout\.write/);
  });

  it("the rendered-output comparison reads two build folders and writes one file only when --out is given", () => {
    expect(fsCalls(renderedDiff)).toEqual(new Set(["readdirSync", "readFileSync", "writeFileSync"]));
    expect(renderedDiff).toMatch(/if \(options\.out\) deps\.writeText\(options\.out/);
    expect(renderedDiff).toMatch(/if \(!options\.out\) process\.stdout\.write/);
    expect(renderedDiff).not.toMatch(/\bfetch\s*\(|child_process|unlinkSync|rmSync|renameSync|mkdirSync/);
  });

  it("the page check requests nothing but the pages it was given, through the allow-listed adapter", () => {
    expect([...pageCheck.matchAll(/\bfetch\s*\(/g)]).toHaveLength(1);
    expect(pageCheck).toMatch(/observeLivePage\(url, deps\.fetchImpl\)/);
    expect(pageCheck).toMatch(/Only miloosh\.com page URLs are checked/);
    expect(pageCheck).not.toMatch(/method\s*:|body\s*:|POST|child_process/);
  });

  it("neither the director nor the ledger check calls fetch or a deployment, push, merge or account API", () => {
    for (const code of [director, outreach, pageCheck, renderedDiff]) {
      expect(code).not.toMatch(/vercel (deploy|--prod|promote)|git push|gh (pr|release|api -X)|child_process/);
    }
    for (const code of [director, outreach, renderedDiff]) expect(code).not.toMatch(/\bfetch\s*\(/);
  });
});
