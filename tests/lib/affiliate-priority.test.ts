import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { getAffiliatePriority, getRankedApplicationCandidates, getAllPriorities } from "@/lib/revenue/affiliate-priority";
import { readAffiliatePipeline, type AffiliatePipelineEntry } from "@/lib/revenue/affiliate-pipeline";
import { getSoftware, getAllSoftware } from "@/data/software";
import { AFFILIATE_PROGRAMS } from "@/data/revenue/affiliate-programs";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";

function countPipelineFileReads(spy: ReturnType<typeof vi.spyOn>): number {
  return spy.mock.calls.filter((call: unknown[]) => String(call[0]).includes("affiliate-pipeline.json")).length;
}

describe("affiliate priority scoring", () => {
  it("produces a score within the documented 0-100 range for every product", async () => {
    for (const software of getAllSoftware()) {
      const breakdown = await getAffiliatePriority(software);
      expect(breakdown.totalScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.totalScore).toBeLessThanOrEqual(100);
    }
  });

  it("gives maximum application-availability credit only to a genuine fresh candidate", async () => {
    const ranked = await getRankedApplicationCandidates([]);
    expect(ranked.length).toBeGreaterThan(0);
    const candidate = ranked[0]!;
    expect(candidate.programExists).toBe("yes");
    expect(candidate.readyToApply).toBe(true);
    expect(candidate.affiliateAvailabilityScore).toBe(10);
  });

  it("does not turn ClickUp's public PartnerStack program into an application opportunity after Miloosh was rejected", async () => {
    const clickup = getSoftware("clickup")!;
    const breakdown = await getAffiliatePriority(clickup);
    expect(breakdown.programExists).toBe("yes");
    expect(breakdown.operationalStatus).toBe("REJECTED");
    expect(breakdown.readyToApply).toBe(false);
    expect(breakdown.affiliateAvailabilityScore).toBe(0);
    expect(breakdown.approvalFrictionScore).toBe(0);
    expect(breakdown.blockReason).toMatch(/rejected/i);
  });

  it("does not rank an already-active partner as a fresh application", async () => {
    const close = getSoftware("close")!;
    const breakdown = await getAffiliatePriority(close);
    expect(breakdown.operationalStatus).toBe("ACTIVE_REGISTRY");
    expect(breakdown.readyToApply).toBe(false);
    expect(breakdown.blockReason).toMatch(/active/i);
  });

  it("does not rank a current pending relationship as a duplicate application", async () => {
    const freshdesk = getSoftware("freshdesk")!;
    const breakdown = await getAffiliatePriority(freshdesk);
    expect(breakdown.operationalStatus).toBe("PENDING_REVIEW");
    expect(breakdown.readyToApply).toBe(false);
    expect(breakdown.blockReason).toMatch(/pending_review/i);
  });

  it("scores a product with no research entry as no_entry / zero application availability", async () => {
    const untouched = getAllSoftware().find((software) => !AFFILIATE_PROGRAMS.some((program) => program.slug === software.slug));
    expect(untouched).toBeDefined();
    const breakdown = await getAffiliatePriority(untouched!);
    expect(breakdown.programExists).toBe("no_entry");
    expect(breakdown.affiliateAvailabilityScore).toBe(0);
  });

  it("labels traffic score honestly as none when no real GSC cohort data exists", async () => {
    const zoom = getSoftware("zoom");
    if (zoom) {
      const breakdown = await getAffiliatePriority(zoom);
      if (breakdown.trafficOpportunityScore === 0) expect(breakdown.trafficDataSource).toBe("none");
    }
  });

  it("keeps an evidenced closed public program out of fresh candidates", async () => {
    const doodle = AFFILIATE_PROGRAMS.find((program) => program.slug === "doodle");
    expect(doodle?.programExists).toBe("no");
  });

  it("getRankedApplicationCandidates contains only current fresh ready-to-apply programs", async () => {
    const ranked = await getRankedApplicationCandidates([]);
    expect(ranked.length).toBeGreaterThan(0);
    const activeSlugs = new Set(ACTIVE_PARTNERS.map((partner) => partner.slug as string));
    const nonFreshSlugs = new Set(
      CURRENT_AFFILIATE_LEDGER
        .filter((relationship) => relationship.status !== "PROGRAM_NOT_VERIFIED")
        .flatMap((relationship) => relationship.productSlugs),
    );

    for (const row of ranked) {
      expect(row.programExists).toBe("yes");
      expect(row.readyToApply).toBe(true);
      expect(row.operationalStatus).toBe("NO_RELATIONSHIP");
      expect(activeSlugs.has(row.slug)).toBe(false);
      expect(nonFreshSlugs.has(row.slug)).toBe(false);
    }
  });

  it("getRankedApplicationCandidates is sorted highest score first", async () => {
    const ranked = await getRankedApplicationCandidates([]);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.totalScore).toBeGreaterThanOrEqual(ranked[i]!.totalScore);
    }
  });

  it("getAllPriorities covers every software product exactly once", async () => {
    const all = await getAllPriorities([]);
    expect(all).toHaveLength(getAllSoftware().length);
    const slugs = new Set(all.map((entry) => entry.slug));
    expect(slugs.size).toBe(all.length);
  });
});

describe("affiliate priority — pipeline read efficiency", () => {
  it("catalog is large enough that an N+1 regression would be caught", () => {
    expect(getAllSoftware().length).toBeGreaterThan(50);
  });

  it("getRankedApplicationCandidates reads the pipeline file at most once when no entries are passed", async () => {
    const readSpy = vi.spyOn(fs, "readFileSync");
    await getRankedApplicationCandidates();
    const pipelineReads = countPipelineFileReads(readSpy);
    readSpy.mockRestore();
    expect(pipelineReads).toBeLessThanOrEqual(1);
  });

  it("getAllPriorities reads the pipeline file at most once when no entries are passed", async () => {
    const readSpy = vi.spyOn(fs, "readFileSync");
    await getAllPriorities();
    const pipelineReads = countPipelineFileReads(readSpy);
    readSpy.mockRestore();
    expect(pipelineReads).toBeLessThanOrEqual(1);
  });

  it("passing a pre-fetched entries array makes zero additional pipeline reads", async () => {
    const entries = await readAffiliatePipeline();
    const readSpy = vi.spyOn(fs, "readFileSync");
    await getRankedApplicationCandidates(entries);
    await getAllPriorities(entries);
    const pipelineReads = countPipelineFileReads(readSpy);
    readSpy.mockRestore();
    expect(pipelineReads).toBe(0);
  });

  it("a single ranking call never scales pipeline reads with catalog size", async () => {
    const catalogSize = getAllSoftware().length;
    const readSpy = vi.spyOn(fs, "readFileSync");
    await getRankedApplicationCandidates();
    const pipelineReads = countPipelineFileReads(readSpy);
    readSpy.mockRestore();
    expect(pipelineReads).toBeLessThan(catalogSize);
  });

  it("uses a caller-supplied ready_to_apply pipeline entry for an otherwise fresh candidate", async () => {
    const baseline = await getRankedApplicationCandidates([]);
    expect(baseline.length).toBeGreaterThan(0);
    const target = baseline[0]!;
    const fakeEntries: AffiliatePipelineEntry[] = [
      {
        slug: target.slug,
        status: "ready_to_apply",
        ownerActionRequired: null,
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        affiliateUrl: null,
        trackingId: null,
        notes: "regression-test fixture",
        history: [],
      },
    ];
    const ranked = await getRankedApplicationCandidates(fakeEntries);
    const entry = ranked.find((row) => row.slug === target.slug);
    expect(entry?.pipelineStatus).toBe("ready_to_apply");
    expect(entry?.readyToApply).toBe(true);
  });

  it("excludes a caller-supplied approved pipeline entry from fresh application ranking", async () => {
    const baseline = await getRankedApplicationCandidates([]);
    const target = baseline[0]!;
    const fakeEntries: AffiliatePipelineEntry[] = [
      {
        slug: target.slug,
        status: "approved",
        ownerActionRequired: null,
        submittedAt: null,
        approvedAt: "2026-01-01T00:00:00.000Z",
        rejectedAt: null,
        affiliateUrl: "https://example.com/ref/fake",
        trackingId: null,
        notes: "regression-test fixture",
        history: [],
      },
    ];
    const ranked = await getRankedApplicationCandidates(fakeEntries);
    expect(ranked.some((row) => row.slug === target.slug)).toBe(false);
  });
});
