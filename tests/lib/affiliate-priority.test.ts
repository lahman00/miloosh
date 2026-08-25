import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import {
  getAffiliatePriority,
  getRankedApplicationCandidates,
  getFreshApplicationCandidates,
  getAllPriorities,
} from "@/lib/revenue/affiliate-priority";
import { readAffiliatePipeline, type AffiliatePipelineEntry } from "@/lib/revenue/affiliate-pipeline";
import { getSoftware, getAllSoftware } from "@/data/software";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";

function pipelineReads(spy: ReturnType<typeof vi.spyOn>): number {
  return spy.mock.calls.filter((call: unknown[]) => String(call[0]).includes("affiliate-pipeline.json")).length;
}

describe("affiliate priority current truth", () => {
  it("scores every product inside 0-100", async () => {
    for (const software of getAllSoftware()) {
      const row = await getAffiliatePriority(software);
      expect(row.totalScore).toBeGreaterThanOrEqual(0);
      expect(row.totalScore).toBeLessThanOrEqual(100);
    }
  });

  it("keeps ClickUp rejected despite a public program", async () => {
    const row = await getAffiliatePriority(getSoftware("clickup")!);
    expect(row.programExists).toBe("yes");
    expect(row.operationalStatus).toBe("REJECTED");
    expect(row.readyToApply).toBe(false);
    expect(row.affiliateAvailabilityScore).toBe(0);
  });

  it("keeps active and pending relationships out of fresh applications", async () => {
    expect((await getAffiliatePriority(getSoftware("close")!)).readyToApply).toBe(false);
    expect((await getAffiliatePriority(getSoftware("freshdesk")!)).readyToApply).toBe(false);
  });

  it("program rows preserve history while fresh candidates are submit-now only", async () => {
    const programRows = await getRankedApplicationCandidates([]);
    expect(programRows.find((row) => row.slug === "clickup")?.readyToApply).toBe(false);

    const fresh = await getFreshApplicationCandidates([]);
    expect(fresh.length).toBeGreaterThan(0);
    const activeSlugs = new Set(ACTIVE_PARTNERS.map((partner) => partner.slug as string));
    const nonFreshSlugs = new Set(
      CURRENT_AFFILIATE_LEDGER
        .filter((relationship) => relationship.status !== "PROGRAM_NOT_VERIFIED")
        .flatMap((relationship) => relationship.productSlugs),
    );
    for (const row of fresh) {
      expect(row.programExists).toBe("yes");
      expect(row.readyToApply).toBe(true);
      expect(row.operationalStatus).toBe("NO_RELATIONSHIP");
      expect(activeSlugs.has(row.slug)).toBe(false);
      expect(nonFreshSlugs.has(row.slug)).toBe(false);
    }
  });

  it("fresh candidates are sorted highest score first", async () => {
    const rows = await getFreshApplicationCandidates([]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.totalScore).toBeGreaterThanOrEqual(rows[i]!.totalScore);
    }
  });

  it("all priorities covers every product exactly once", async () => {
    const rows = await getAllPriorities([]);
    expect(rows).toHaveLength(getAllSoftware().length);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(rows.length);
  });
});

describe("affiliate priority pipeline reads", () => {
  it("does not regress to N+1 Blob/file reads", async () => {
    const spy = vi.spyOn(fs, "readFileSync");
    await getRankedApplicationCandidates();
    expect(pipelineReads(spy)).toBeLessThanOrEqual(1);
    spy.mockClear();
    await getFreshApplicationCandidates();
    expect(pipelineReads(spy)).toBeLessThanOrEqual(1);
    spy.mockClear();
    await getAllPriorities();
    expect(pipelineReads(spy)).toBeLessThanOrEqual(1);
    spy.mockRestore();
  });

  it("uses caller-supplied pipeline state and excludes an approved row from fresh candidates", async () => {
    const target = (await getFreshApplicationCandidates([]))[0]!;
    const fakeEntries: AffiliatePipelineEntry[] = [{
      slug: target.slug,
      status: "approved",
      ownerActionRequired: null,
      submittedAt: null,
      approvedAt: "2026-01-01T00:00:00.000Z",
      rejectedAt: null,
      affiliateUrl: null,
      trackingId: null,
      notes: "test fixture",
      history: [],
    }];
    expect((await getFreshApplicationCandidates(fakeEntries)).some((row) => row.slug === target.slug)).toBe(false);
    expect((await getRankedApplicationCandidates(fakeEntries)).find((row) => row.slug === target.slug)?.pipelineStatus).toBe("approved");
  });

  it("reuses pre-fetched entries without extra pipeline reads", async () => {
    const entries = await readAffiliatePipeline();
    const spy = vi.spyOn(fs, "readFileSync");
    await getRankedApplicationCandidates(entries);
    await getFreshApplicationCandidates(entries);
    await getAllPriorities(entries);
    expect(pipelineReads(spy)).toBe(0);
    spy.mockRestore();
  });
});
