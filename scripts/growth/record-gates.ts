import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { GateResult, RecordedGateRun } from "@/lib/growth-agents/guardian";
import { recordGateRun } from "@/lib/growth-agents/guardian-sources";

/**
 * `npm run growth:record-gates -- --out <file> [--checkout <dir>]`
 *
 * Runs the repository's own release gates (the commands CI runs: audit, tests, validate:data, lint, typecheck, build)
 * in a checkout and writes one JSON record that names the commit and says whether the checkout was clean. The commit
 * and the cleanliness are read from the checkout, never typed in, so the Guardian can tell which commit a result
 * describes. Use a clean checkout of exactly the commit under review.
 *
 * Not read-only on disk: the commands write gitignored build output (`.next`). It never edits a gate, passes a bypass
 * flag, retries, installs a package or deploys, and it refuses to overwrite an existing file. A failing gate is a
 * result, not an error: exit 0 when the record was written, 2 for invalid arguments or an existing output file.
 */

const USAGE = `Usage: npm run growth:record-gates -- --out <file> [--checkout <dir>]

  --out <file>      Where to write the JSON record. Must not exist yet.
  --checkout <dir>  The checkout to run the gates in (default: the current directory). Use a clean checkout of the commit under review.
  --help
`;

export type RecordGatesDeps = {
  record(checkout: string, onGate: (result: GateResult) => void): RecordedGateRun;
  writeText(file: string, content: string): void;
  exists(file: string): boolean;
  log(line: string): void;
};

export function parseArgs(argv: string[], repoRoot: string): { checkout: string; out: string } | { help: true } {
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
  for (const key of flags.keys()) if (!["checkout", "out"].includes(key)) throw new Error(`Unknown option --${key}\n${USAGE}`);
  const value = (name: string): string | null => (typeof flags.get(name) === "string" ? (flags.get(name) as string) : null);
  const out = value("out");
  if (!out) throw new Error(`--out is required.\n${USAGE}`);
  return { checkout: path.resolve(repoRoot, value("checkout") ?? "."), out: path.resolve(repoRoot, out) };
}

/** Several of the repository's own scripts compare `import.meta.url` with a hand-built `file://` string, which differs for paths with spaces or non-ASCII characters; tests that run them then fail for that reason alone. */
export function pathWarning(checkout: string): string | null {
  return /[^\x21-\x7E]/.test(checkout) ? `The checkout path contains spaces or non-ASCII characters (${checkout}). Some of the repository's own scripts mis-detect their entry point on such paths, so tests can fail for that reason alone. Prefer a clean checkout under a plain path.` : null;
}

export function main(argv: string[], repoRoot = process.cwd(), deps?: RecordGatesDeps): number {
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
  const real: RecordGatesDeps = deps ?? {
    record: (checkout, onGate) => recordGateRun(checkout, { onGate }),
    writeText: (file, content) => fs.writeFileSync(file, content, { encoding: "utf8", flag: "wx" }),
    exists: (file) => fs.existsSync(file),
    log: (line) => console.error(line),
  };
  if (real.exists(options.out)) {
    console.error(`${options.out} already exists; this command never overwrites a record.`);
    return 2;
  }
  const warning = pathWarning(options.checkout);
  if (warning) real.log(`NOTE: ${warning}`);
  const record = real.record(options.checkout, (result) => real.log(`${result.gate}: ${result.status} (${result.summary})`));
  real.writeText(options.out, `${JSON.stringify(record, null, 2)}\n`);
  real.log(`recorded ${record.results.length} gate result(s) for ${record.sha.slice(0, 7)}${record.dirty ? " (the checkout was NOT clean, so the Guardian will not trust this record)" : " in a clean checkout"}: ${options.out}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
