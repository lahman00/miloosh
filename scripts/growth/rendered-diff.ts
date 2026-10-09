import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compareRendered, type RenderedComparison } from "@/lib/growth-agents/rendered-diff";

/**
 * `npm run growth:rendered-diff -- --base <dir> --candidate <dir> [--out <file>]`
 *
 * Compares the prerendered HTML of two Next.js builds (the `.next/server/app` folder of each) after removing build
 * noise, and reports which pages differ. Read-only: it reads two folders and writes nothing unless --out is given.
 * Exit 0 when every page is identical and both builds hold the same pages, 1 otherwise, 2 for invalid arguments.
 */

const USAGE = `Usage: npm run growth:rendered-diff -- --base <dir> --candidate <dir> [--out <file>]

  --base <dir>       .next/server/app of the base build.
  --candidate <dir>  .next/server/app of the candidate build.
  --out <file>       Write the JSON here. Without it the JSON is only printed.
  --help
`;

export type RenderedDiffDeps = {
  listHtml(dir: string): string[];
  readText(file: string): string;
  writeText(file: string, content: string): void;
};

export function parseArgs(argv: string[], repoRoot: string): { base: string; candidate: string; out: string | null } | { help: true } {
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(arg.slice(2), next);
      i += 1;
    } else flags.set(arg.slice(2), true);
  }
  if (flags.has("help")) return { help: true };
  for (const key of flags.keys()) if (!["base", "candidate", "out"].includes(key)) throw new Error(`Unknown option --${key}\n${USAGE}`);
  const value = (name: string): string | null => (typeof flags.get(name) === "string" ? (flags.get(name) as string) : null);
  const base = value("base");
  const candidate = value("candidate");
  if (!base || !candidate) throw new Error(`Both --base and --candidate are required.\n${USAGE}`);
  return { base: path.resolve(repoRoot, base), candidate: path.resolve(repoRoot, candidate), out: value("out") ? path.resolve(repoRoot, value("out")!) : null };
}

export function run(options: { base: string; candidate: string; out: string | null }, deps: RenderedDiffDeps): { exitCode: number; result: RenderedComparison & { baseFiles: number; candidateFiles: number }; json: string } {
  const load = (dir: string) => new Map(deps.listHtml(dir).map((relative) => [relative, deps.readText(path.join(dir, relative))] as const));
  const base = load(options.base);
  const candidate = load(options.candidate);
  const compared = compareRendered(base, candidate);
  const result = { ...compared, baseFiles: base.size, candidateFiles: candidate.size };
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (options.out) deps.writeText(options.out, json);
  const empty = base.size === 0 || candidate.size === 0;
  const clean = !empty && compared.differing === 0 && compared.onlyInBase.length === 0 && compared.onlyInCandidate.length === 0;
  return { exitCode: clean ? 0 : 1, result, json };
}

function walkHtml(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith(".html")) out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  };
  visit(root);
  return out.sort();
}

export function main(argv: string[], repoRoot = process.cwd(), deps?: RenderedDiffDeps): number {
  let options: ReturnType<typeof parseArgs>;
  try {
    options = parseArgs(argv, repoRoot);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
  if ("help" in options) {
    console.log(USAGE);
    return 0;
  }
  const realDeps: RenderedDiffDeps = deps ?? {
    listHtml: walkHtml,
    readText: (file) => fs.readFileSync(file, "utf8"),
    writeText: (file, content) => fs.writeFileSync(file, content, "utf8"),
  };
  const outcome = run(options, realDeps);
  if (!options.out) process.stdout.write(outcome.json);
  else console.error(`written: ${options.out}`);
  const r = outcome.result;
  console.error(`${r.baseFiles} base page(s), ${r.candidateFiles} candidate page(s), ${r.compared} compared, ${r.differing} differ, ${r.onlyInBase.length} only in base, ${r.onlyInCandidate.length} only in candidate.`);
  return outcome.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
