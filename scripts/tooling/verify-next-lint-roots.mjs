import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = JSON.parse(fs.readFileSync(path.join(repository, "tests/fixtures/next-lint-glob-contract.json"), "utf8"));
const expectedFile = path.join(repository, "tests/fixtures/next-lint-glob-expected.json");
const reference = process.argv[2] === "--reference" ? process.argv[3] : null;
const bare = process.argv.includes("--bare");
const capture = process.argv.includes("--capture");
const require = createRequire(path.join(reference ?? repository, "package.json"));
if (!reference && !bare) await import(pathToFileURL(path.join(repository, "eslint.config.mjs")).href);
const pluginRequire = createRequire(require.resolve("@next/eslint-plugin-next"));
const { getRootDirs } = pluginRequire("./utils/get-root-dirs.js");
const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "miloosh-lint-roots-")));
const previousCwd = process.cwd();
const results = [];

function materialize(value) {
  if (typeof value === "string") return value.replaceAll("__ROOT__", temporary);
  if (Array.isArray(value)) return value.map(materialize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, materialize(item)]));
  return value;
}

try {
  for (const directory of fixture.directories) fs.mkdirSync(path.join(temporary, directory), { recursive: true });
  for (const file of fixture.files) fs.writeFileSync(path.join(temporary, file), "export default function Page() { return null; }\n");
  for (const link of fixture.symlinks) fs.symlinkSync(path.join(temporary, link.target), path.join(temporary, link.name), "dir");
  process.chdir(temporary);
  for (const testCase of fixture.cases) {
    try {
      const roots = getRootDirs({ cwd: temporary, settings: materialize(testCase.settings) });
      const normalized = roots.map((root) => path.resolve(temporary, root).replace(temporary, "__ROOT__")).sort();
      results.push({ id: testCase.id, kind: "roots", roots: normalized });
    } catch (error) {
      results.push({ id: testCase.id, kind: "error", name: error.name, message: error.message });
    }
  }
} finally {
  process.chdir(previousCwd);
  fs.rmSync(temporary, { recursive: true, force: true });
}

if (capture) {
  if (!reference) throw new Error("Golden results must come from the original dependency tree, not the candidate.");
  if (fs.existsSync(expectedFile)) throw new Error("Refusing to overwrite the existing reference fixture.");
  fs.writeFileSync(expectedFile, JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify({ captured: results.length, reference }, null, 2));
} else {
  const expected = JSON.parse(fs.readFileSync(expectedFile, "utf8"));
  const mismatches = results.flatMap((actual, index) => JSON.stringify(actual) === JSON.stringify(expected[index]) ? [] : [{ input: fixture.cases[index], expected: expected[index], actual }]);
  console.log(JSON.stringify({ cases: results.length, passed: results.length - mismatches.length, bare, mismatches }, null, 2));
  if (mismatches.length) process.exitCode = 1;
}
