import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import config from "@/next.config";

describe("release response hardening", () => {
  it("adds explicit security headers without restricting script or network destinations", async () => {
    const entries = await config.headers?.();
    const all = entries?.find((entry) => entry.source === "/:path*");
    const headers = Object.fromEntries((all?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]));
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["content-security-policy"]).toBe("base-uri 'self'; object-src 'none'; frame-ancestors 'self'");
    expect(headers["content-security-policy"]).not.toMatch(/script-src|connect-src|default-src/);
  });

  it("validates the scoped lint adapter and audit in the Linux deployment build", () => {
    const deployment = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(deployment.installCommand).toBe("npm ci");
    expect(deployment.buildCommand).toBe("node scripts/tooling/verify-next-lint-roots.mjs && node scripts/tooling/verify-next-lint-coverage.mjs && npm run lint && npm audit --audit-level=moderate && npm run build");
    expect(deployment.crons).toEqual([
      { path: "/api/cron/social-schedule", schedule: "0 8 * * *" },
      { path: "/api/cron/social-publish", schedule: "0 17,18 * * *" },
      { path: "/api/cron/seo-factory", schedule: "0 22 * * *" },
    ]);
  });
});
