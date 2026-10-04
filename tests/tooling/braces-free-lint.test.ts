import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function node(args: string[]) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: "utf8", timeout: 20_000 });
  expect(result.error).toBeUndefined();
  return result;
}

describe("braces-free lint dependency boundary", () => {
  it("preserves the original Next directory root sets for all reference cases", () => {
    const result = node(["scripts/tooling/verify-next-lint-roots.mjs"]);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ cases: 75, passed: 75, mismatches: [] });
  }, 25_000);

  it("rejects a bare alias that has not restored the consumer's directory semantics", () => {
    const result = node(["scripts/tooling/verify-next-lint-roots.mjs", "--bare"]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).mismatches.length).toBeGreaterThan(0);
  }, 25_000);

  it("preserves rule code, effective configuration and real negative diagnostics", () => {
    const result = node(["scripts/tooling/verify-next-lint-coverage.mjs"]);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ checkedFileKinds: 6, activeNextRules: 22, unchangedRuleFiles: 22, mismatches: [] });
  }, 25_000);

  it("removes vulnerable packages without weakening the release audit or upgrading the framework", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    expect(manifest.dependencies.next).toBe("16.3.8");
    expect(manifest.devDependencies["eslint-config-next"]).toBe("16.3.8");
    expect(manifest.overrides).toEqual({ "@next/eslint-plugin-next@16.3.8": { "fast-glob": "npm:glob@13.0.6" } });
    expect(manifest.scripts["release:check"]).toBe("npm test && npm run test:static-gate && npm run validate:data && npm run lint && tsc --noEmit && npm audit --audit-level=high && npm run build && npm run verify:static");
    expect(Object.keys(lock.packages).some((key) => /node_modules\/(braces|micromatch)$/.test(key))).toBe(false);
    const alias = lock.packages["node_modules/@next/eslint-plugin-next/node_modules/fast-glob"];
    expect(alias.name).toBe("glob");
    expect(alias.version).toBe("13.0.6");
    expect(alias.resolved).toBe("https://registry.npmjs.org/glob/-/glob-13.0.6.tgz");
  });

  it("fails closed on an unsupported glob API call", () => {
    const script = `
      import { createRequire } from 'node:module';
      await import('./eslint.config.mjs');
      const localRequire = createRequire(process.cwd() + '/package.json');
      const pluginRequire = createRequire(localRequire.resolve('@next/eslint-plugin-next'));
      pluginRequire('fast-glob').globSync('app', { onlyFiles: true });
    `;
    const result = node(["--input-type=module", "-e", script]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unreviewed Next glob call");
  });

  it("refuses an already-loaded plugin rather than silently leaving an unadapted caller", () => {
    const script = `
      import { createRequire } from 'node:module';
      const localRequire = createRequire(process.cwd() + '/package.json');
      localRequire('@next/eslint-plugin-next');
      await import('./eslint.config.mjs');
    `;
    const result = node(["--input-type=module", "-e", script]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Install the lint glob adapter before importing");
  });
});
