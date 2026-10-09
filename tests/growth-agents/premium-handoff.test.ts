import { describe, expect, it } from "vitest";
import { buildPageUpgradeHandoff, pageUpgradeHandoffSchema } from "@/lib/growth-agents/premium-handoff";
import { partnerExposureFor } from "@/lib/growth-agents/affiliate-revenue-agent";
import { SHA, U, fullExtras, makeGuardian, makeIndexation, makeWorld, signal } from "./fixtures";

const NONE = { own: [], viaOtherCtas: [] };

const URLS = [U("/software/alpha"), U("/software/beta"), U("/software/gamma"), U("/compare/alpha-vs-beta"), U("/compare/beta-vs-gamma")];
const eligibleWorld = () => makeWorld({ google: { extras: new Map(URLS.map((u) => [u, fullExtras(u)])), indexation: makeIndexation(URLS) } });

describe("page upgrader handoff", () => {
  it("is built only for a page whose every gate passed, and parses against its schema", () => {
    const world = eligibleWorld();
    const page = world.google.candidates.find((c) => c.url === U("/software/alpha"))!;
    expect(page.eligible).toBe(true);
    const exposure = partnerExposureFor(page, new Map(world.affiliate.partners.map((p) => [p.slug, p])));
    const result = buildPageUpgradeHandoff(page, exposure, makeGuardian(), SHA);
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(pageUpgradeHandoffSchema.safeParse(result.handoff).success).toBe(true);
    expect(result.handoff.protection).toMatchObject({ pageVerdict: "EDITABLE", derivedAllEditable: true });
    expect(result.handoff.baseline.historicalImpressions).toBe(240);
    expect(result.handoff.mustPreserve.join(" ")).toMatch(/affiliate disclosure/);
    expect(result.handoff.measurement.clockStart).toMatch(/first observed Google recrawl after release, not the deployment date/);
    expect(result.handoff.releaseDependency).toMatch(/Release Guardian verdict: RELEASE_ALLOWED/);
    expect(result.handoff.hypothesis).toMatch(/not a ranking promise/);
  });

  it("refuses an editable page whose evidence gates are still unknown, naming each gate", () => {
    const world = makeWorld();
    const page = world.google.candidates.find((c) => c.url === U("/software/alpha"))!;
    expect(page.protection.verdict).toBe("EDITABLE");
    expect(page.derived.blocking).toEqual([]);
    const result = buildPageUpgradeHandoff(page, NONE, null, SHA);
    expect(result.status).toBe("NOT_READY");
    if (result.status === "NOT_READY") expect(result.reasons.join(" ")).toMatch(/Not every gate passed for \/software\/alpha: .*LIVE_TECHNICAL=UNKNOWN/);
  });

  it("refuses a protected page and explains why", () => {
    const world = makeWorld({ signals: [signal({ urls: [U("/software/alpha")] })] });
    const page = world.google.candidates.find((c) => c.url === U("/software/alpha"))!;
    const result = buildPageUpgradeHandoff(page, NONE, null, SHA);
    expect(result.status).toBe("NOT_READY");
    if (result.status === "NOT_READY") expect(result.reasons.join(" ")).toMatch(/PROTECTED/);
  });

  it("refuses a page whose shared data would also change protected pages", () => {
    const world = makeWorld({ signals: [signal({ urls: [U("/software/alpha")] })], google: { extras: new Map(URLS.map((u) => [u, fullExtras(u)])), indexation: makeIndexation(URLS) } });
    const comparison = world.google.candidates.find((c) => c.url === U("/compare/alpha-vs-beta"))!;
    const result = buildPageUpgradeHandoff(comparison, NONE, null, SHA);
    expect(result.status).toBe("NOT_READY");
    if (result.status === "NOT_READY") expect(result.reasons.join(" ")).toMatch(/derived page\(s\) are not editable/);
  });

  it("refuses a page when demand is not measured on both sides", () => {
    const world = makeWorld();
    const page = { ...world.google.candidates[0]!, recent: { ...world.google.candidates[0]!.recent, impressions: null } };
    const result = buildPageUpgradeHandoff(page, NONE, null, SHA);
    expect(result.status).toBe("NOT_READY");
    if (result.status === "NOT_READY") expect(result.reasons.join(" ")).toMatch(/Demand is not measured on both sides/);
  });

  it("records that the Guardian was not run rather than implying a pass", () => {
    const world = eligibleWorld();
    const page = world.google.candidates.find((c) => c.url === U("/software/alpha"))!;
    const result = buildPageUpgradeHandoff(page, NONE, null, SHA);
    if (result.status === "READY") expect(result.handoff.releaseDependency).toBe("Release Guardian not run");
    else throw new Error("expected READY");
  });
});
