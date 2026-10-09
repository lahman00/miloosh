import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Script entry-point guards must compare real file URLs.
 *
 * import.meta.url is a percent-encoded file URL, but process.argv[1] is a plain
 * path. Comparing them through a hand-built "file://" string, or through
 * new URL(import.meta.url).pathname, is false for any checkout path that has a
 * space or a non-ASCII character, so the script silently does nothing and exits
 * 0 there, including fail-closed checks that should exit 1. CI checks out into
 * a plain path, so only a source scan can catch this. Use:
 *
 *   import { pathToFileURL } from "node:url";
 *   if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { ... }
 */

const SCAN_DIRS = ["scripts", "lib", "app"];
const SOURCE_FILE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const SKIPPED_DIRS = new Set(["node_modules", ".next"]);

const NAIVE_ENTRY_GUARDS = [
  { name: "import.meta.url compared with a template-literal file:// string", pattern: /import\.meta\.url\s*[!=]==?\s*`file:\/\// },
  { name: 'import.meta.url compared with "file://" + ...', pattern: /import\.meta\.url\s*[!=]==?\s*["']file:\/\/["']\s*\+/ },
  {
    name: "new URL(import.meta.url).pathname compared with process.argv",
    pattern: /new URL\(import\.meta\.url\)\.pathname.*process\.argv|process\.argv.*new URL\(import\.meta\.url\)\.pathname/,
  },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : sourceFiles(path);
    return SOURCE_FILE.test(entry.name) ? [path] : [];
  });
}

function naiveGuards(source: string): string[] {
  return source
    .split("\n")
    .flatMap((line, index) => NAIVE_ENTRY_GUARDS.filter(({ pattern }) => pattern.test(line)).map(({ name }) => `line ${index + 1}: ${name}`));
}

describe("script entry-point guards", () => {
  it("no source file decides it is the entry point with a hand-built file:// comparison", () => {
    const root = process.cwd();
    const offenders = SCAN_DIRS.flatMap((dir) => sourceFiles(join(root, dir))).flatMap((file) =>
      naiveGuards(readFileSync(file, "utf8")).map((hit) => `${relative(root, file)} ${hit}`),
    );
    expect(offenders).toEqual([]);
  });

  it("the scan recognises each naive shape and accepts the real-URL form", () => {
    // Guards the scan itself: a typo in a pattern must not turn the test above into a no-op.
    expect(naiveGuards("if (import.meta.url === `file://${process.argv[1]}`) {")).toHaveLength(1);
    expect(naiveGuards('if (import.meta.url === "file://" + process.argv[1]) {')).toHaveLength(1);
    expect(naiveGuards("if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {")).toHaveLength(1);
    expect(naiveGuards("if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {")).toEqual([]);
  });
});
