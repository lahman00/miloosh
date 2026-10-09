import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkLedgerText } from "@/lib/growth-agents/distribution";

/**
 * `npm run growth:outreach-check -- <ledger.json>`: validates an outreach ledger.
 * Read-only: it opens one file, prints the problems it finds and writes nothing.
 * Exit 0 when the ledger is internally honest, 1 when it has problems, 2 when it cannot be read.
 */
export function main(argv: string[], repoRoot = process.cwd()): number {
  const file = argv[0];
  if (!file || argv.length !== 1 || file.startsWith("--")) {
    console.error("Usage: npm run growth:outreach-check -- <ledger.json>");
    return 2;
  }
  let text: string;
  try {
    text = fs.readFileSync(path.resolve(repoRoot, file), "utf8");
  } catch (error) {
    console.error(`Cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  const result = checkLedgerText(text);
  if (result.ok) {
    console.log(`OK: ${result.records} record(s) checked, no problem found. Nothing was sent or changed.`);
    return 0;
  }
  console.log(`${result.problems.length} problem(s) in ${result.records} record(s):`);
  for (const problem of result.problems) console.log(`- ${problem.id}: ${problem.problem}`);
  return 1;
}

// Compare real file URLs: the naive `file://${argv[1]}` form never matches a path with spaces or non-ASCII characters.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
