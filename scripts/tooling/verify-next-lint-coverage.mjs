import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reference = process.argv[2] === "--reference" ? process.argv[3] : null;
const target = reference ?? repository;
const capture = process.argv.includes("--capture");
const expectedFile = path.join(repository, "tests/fixtures/next-lint-coverage-expected.json");
const require = createRequire(path.join(target, "package.json"));
const { ESLint } = require("eslint");
const lint = new ESLint({ cwd: target });
const paths = ["app/page.tsx", "lib/affiliate.ts", "eslint.config.mjs", "scripts/probe.js", "components/Footer.tsx", "app/api/cron/social-publish/route.ts"];
const configs = {};
for (const file of paths) {
  const config = await lint.calculateConfigForFile(path.join(target, file));
  configs[file] = {
    rules: config.rules,
    settings: config.settings,
    sourceType: config.languageOptions.sourceType,
    ecmaVersion: config.languageOptions.ecmaVersion,
    parser: config.languageOptions.parser?.meta,
    globals: config.languageOptions.globals,
  };
}
const snippets = [
  { name: "internal-anchor", code: 'export default function Page() { return <a href="/contact">Contact</a>; }' },
  { name: "async-client", code: '"use client"; export default async function Page() { return <div />; }' },
  { name: "unoptimized-unlabelled-image", code: 'export default function Page() { return <img src="/logo-icon.png" />; }' },
];
const negativeProbes = [];
for (const probe of snippets) {
  const [result] = await lint.lintText(probe.code, { filePath: path.join(target, "app/page.tsx") });
  negativeProbes.push({ name: probe.name, messages: result.messages.map(({ ruleId, severity, message, line, column }) => ({ ruleId, severity, message, line, column })) });
}
const pluginRoot = path.dirname(require.resolve("@next/eslint-plugin-next/package.json"));
const ruleDirectory = path.join(pluginRoot, "dist/rules");
const ruleHashes = Object.fromEntries(fs.readdirSync(ruleDirectory).filter((file) => file.endsWith(".js")).sort().map((file) => [file, createHash("sha256").update(fs.readFileSync(path.join(ruleDirectory, file))).digest("hex")]));
// Normalise the checkout root (including absolute resolver keys) without
// relaxing any rule, parser, setting, diagnostic or plugin-source comparison.
function normalizeCheckoutRoot(value, root) {
  return JSON.parse(JSON.stringify(value).replaceAll(root, "__CHECKOUT_ROOT__"));
}
const result = normalizeCheckoutRoot({ configs, negativeProbes, ruleHashes }, target);
if (capture) {
  if (!reference || fs.existsSync(expectedFile)) throw new Error("Capture requires an original tree and a new evidence file.");
  fs.writeFileSync(expectedFile, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ captured: paths.length, ruleFiles: Object.keys(ruleHashes).length, negativeProbes }));
} else {
  const expected = JSON.parse(fs.readFileSync(expectedFile, "utf8"));
  const mismatches = [];
  for (const [key, value] of Object.entries(result)) if (JSON.stringify(value) !== JSON.stringify(expected[key])) mismatches.push(key);
  const activeNextRules = Object.entries(configs["app/page.tsx"].rules).filter(([name, config]) => name.startsWith("@next/next/") && config[0] !== 0).length;
  if (negativeProbes.some((probe) => probe.messages.length === 0)) mismatches.push("negative probe unexpectedly passed");
  console.log(JSON.stringify({ checkedFileKinds: paths.length, activeNextRules, unchangedRuleFiles: Object.keys(ruleHashes).length, negativeProbes, mismatches }, null, 2));
  if (mismatches.length) process.exitCode = 1;
}
