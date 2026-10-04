import { defineConfig, globalIgnores } from "eslint/config";
import { installNextLintGlobCompatibility } from "./scripts/tooling/next-lint-glob-compat.mjs";

// Install the scoped compatibility boundary before Next loads its glob caller.
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
    ".next-miloosh-qa/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
