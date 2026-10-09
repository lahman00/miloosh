import { defineConfig, globalIgnores } from "eslint/config";
import { installNextLintGlobCompatibility } from "./scripts/tooling/next-lint-glob-compat.mjs";

// Preserve the published Next 16.4.0 lint rules while avoiding the unfixed
// vulnerable braces dependency. Fail closed if the reviewed plugin changes.
installNextLintGlobCompatibility();
const { default: nextVitals } = await import("eslint-config-next/core-web-vitals");
const { default: nextTs } = await import("eslint-config-next/typescript");

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
