import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ omit: "" }));
vi.mock("@/app/sitemap", async original => {
  const actual = await original<typeof import("@/app/sitemap")>();
  return { default: () => actual.default().filter(entry => !state.omit || !entry.url.endsWith(state.omit)) };
});
import { auditSeo } from "@/scripts/maintenance/seo";
afterEach(() => { state.omit = ""; });
describe("maintenance shares the existing sitemap submission policy", () => {
  it("does not demand intentionally suppressed comparison URLs", async () => {
    const report = await auditSeo();
    expect(report.issues.filter(issue => issue.id.startsWith("seo-sitemap-missing-"))).toEqual([]);
  });
  it.each(["/software/airtable", "/compare/monday-vs-airtable"])("still rejects an accidentally missing priority route: %s", async route => {
    state.omit = route;
    const report = await auditSeo();
    const missing = report.issues.filter(issue => issue.id.startsWith("seo-sitemap-missing-"));
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({ severity: "critical", location: expect.stringContaining(route) });
  });
});
