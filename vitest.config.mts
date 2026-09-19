import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Minimal vitest config — no test runner existed in this repo before the
 * growth/QA agent system (see docs/agents-architecture.md "Testing the
 * agents themselves"). Scoped to tests/ only; nothing here runs against
 * live network calls or the live dataset in a way that could flake CI —
 * see tests/ for how each suite avoids that.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/analytics-store-setup.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
