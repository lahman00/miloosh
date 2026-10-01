import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  setPipelineStatus,
  getPipelineEntry,
  readAffiliatePipeline,
  isValidTransition,
  countByPipelineStatus,
  fastTrackToSubmitted,
  fastTrackToApproved,
  buildPipelineMap,
} from "@/lib/revenue/affiliate-pipeline";

const PIPELINE_PATH = path.join(process.cwd(), "var", "agents", "affiliate-pipeline.json");

// Same backup/restore discipline as tests/agents/experiment-tracker.test.ts —
// this file holds the real, already-submitted Pipedrive application record
// and must never be permanently wiped by a test run.
let realBackup: string | null = null;
// Force the local-file fallback path regardless of what's in the shell env
// (e.g. a developer who ran `vercel env pull`) — these tests verify the
// state-machine logic, not real network calls to the Blob store.
let realBlobToken: string | undefined;

beforeAll(() => {
  realBackup = fs.existsSync(PIPELINE_PATH) ? fs.readFileSync(PIPELINE_PATH, "utf-8") : null;
  realBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

beforeEach(() => {
  fs.rmSync(PIPELINE_PATH, { force: true });
});

afterAll(() => {
  if (realBackup !== null) {
    fs.mkdirSync(path.dirname(PIPELINE_PATH), { recursive: true });
    fs.writeFileSync(PIPELINE_PATH, realBackup);
  } else {
    fs.rmSync(PIPELINE_PATH, { force: true });
  }
  if (realBlobToken !== undefined) process.env.BLOB_READ_WRITE_TOKEN = realBlobToken;
});

describe("affiliate pipeline state transitions", () => {
  it("starts unresearched for a slug with no entry", async () => {
    expect(await getPipelineEntry("clickup")).toBeUndefined();
  });

  it("allows the documented lifecycle path", async () => {
    await setPipelineStatus("clickup", "program_found");
    await setPipelineStatus("clickup", "verified");
    await setPipelineStatus("clickup", "ready_to_apply");
    await setPipelineStatus("clickup", "application_in_progress");
    await setPipelineStatus("clickup", "submitted");
    const updated = await setPipelineStatus("clickup", "pending_review");
    expect(updated.status).toBe("pending_review");
    expect(updated.submittedAt).not.toBeNull();
  });

  it("rejects an invalid transition (skipping states)", async () => {
    await expect(setPipelineStatus("notion", "pending_review")).rejects.toThrow(/Invalid affiliate pipeline transition/);
  });

  it("rejects going backward from a terminal-ish state without an allowed edge", async () => {
    await setPipelineStatus("figma", "program_found");
    await setPipelineStatus("figma", "verified");
    await setPipelineStatus("figma", "ready_to_apply");
    await setPipelineStatus("figma", "application_in_progress");
    await setPipelineStatus("figma", "submitted");
    await setPipelineStatus("figma", "pending_review");
    await setPipelineStatus("figma", "approved");
    await setPipelineStatus("figma", "affiliate_link_received", { affiliateUrl: "https://example.com/ref/abc" });
    await setPipelineStatus("figma", "activated");
    await setPipelineStatus("figma", "earning");
    await expect(setPipelineStatus("figma", "submitted")).rejects.toThrow();
  });

  it("re-recording the same status is always allowed (idempotent)", async () => {
    await setPipelineStatus("canva", "program_found");
    await expect(setPipelineStatus("canva", "program_found", { note: "still found" })).resolves.not.toThrow();
  });

  it("isValidTransition matches setPipelineStatus's own enforcement", () => {
    expect(isValidTransition("unresearched", "program_found")).toBe(true);
    expect(isValidTransition("unresearched", "approved")).toBe(false);
    expect(isValidTransition("earning", "earning")).toBe(true);
    expect(isValidTransition("earning", "unresearched")).toBe(false);
  });

  it("does not create duplicate entries for the same slug", async () => {
    await setPipelineStatus("miro", "program_found");
    await setPipelineStatus("miro", "verified");
    const all = (await readAffiliatePipeline()).filter((e) => e.slug === "miro");
    expect(all).toHaveLength(1);
  });

  it("appends every transition to history without rewriting prior entries", async () => {
    await setPipelineStatus("asana", "program_found", { note: "first" });
    await setPipelineStatus("asana", "verified", { note: "second" });
    const entry = (await getPipelineEntry("asana"))!;
    expect(entry.history).toHaveLength(2);
    expect(entry.history[0].note).toBe("first");
    expect(entry.history[1].note).toBe("second");
  });

  it("rejected can move back to needs_more_research or ready_to_apply (reapply path)", async () => {
    await setPipelineStatus("todoist", "program_found");
    await setPipelineStatus("todoist", "verified");
    await setPipelineStatus("todoist", "ready_to_apply");
    await setPipelineStatus("todoist", "application_in_progress");
    await setPipelineStatus("todoist", "submitted");
    await setPipelineStatus("todoist", "pending_review");
    const rejected = await setPipelineStatus("todoist", "rejected");
    expect(rejected.rejectedAt).not.toBeNull();
    await expect(setPipelineStatus("todoist", "ready_to_apply")).resolves.not.toThrow();
  });

  it("countByPipelineStatus tallies real entries and zero-initializes every status", async () => {
    await setPipelineStatus("slack", "program_found");
    const counts = await countByPipelineStatus();
    expect(counts.program_found).toBeGreaterThanOrEqual(1);
    expect(counts.earning).toBe(0);
  });

  it("fastTrackToSubmitted chains a fresh slug all the way to submitted in one call", async () => {
    const result = await fastTrackToSubmitted("hubspot");
    expect(result.status).toBe("submitted");
    const entry = (await getPipelineEntry("hubspot"))!;
    expect(entry.history.map((h) => h.status)).toEqual([
      "program_found",
      "verified",
      "ready_to_apply",
      "application_in_progress",
      "submitted",
    ]);
  });

  it("fastTrackToSubmitted resumes from wherever the slug already is, without redoing earlier states", async () => {
    await setPipelineStatus("monday", "program_found");
    await setPipelineStatus("monday", "verified");
    await fastTrackToSubmitted("monday");
    const entry = (await getPipelineEntry("monday"))!;
    expect(entry.status).toBe("submitted");
    expect(entry.history.map((h) => h.status)).toEqual([
      "program_found",
      "verified",
      "ready_to_apply",
      "application_in_progress",
      "submitted",
    ]);
  });

  it("fastTrackToApproved chains a fresh slug all the way to approved with the affiliate URL recorded", async () => {
    const result = await fastTrackToApproved("segment", { affiliateUrl: "https://example.com/ref/segment-abc" });
    expect(result.status).toBe("approved");
    expect(result.affiliateUrl).toBe("https://example.com/ref/segment-abc");
    expect(result.approvedAt).not.toBeNull();
    const entry = (await getPipelineEntry("segment"))!;
    expect(entry.history.map((h) => h.status)).toEqual([
      "program_found",
      "verified",
      "ready_to_apply",
      "application_in_progress",
      "submitted",
      "pending_review",
      "approved",
    ]);
  });

  it("fastTrackToApproved resumes from wherever the slug already is (e.g. ready_to_apply), without redoing earlier states", async () => {
    await setPipelineStatus("amplitude", "program_found");
    await setPipelineStatus("amplitude", "verified");
    await setPipelineStatus("amplitude", "ready_to_apply");
    const result = await fastTrackToApproved("amplitude", {
      affiliateUrl: "https://example.com/ref/amplitude-xyz",
      note: "Owner-confirmed approval that happened outside the tracked flow.",
    });
    expect(result.status).toBe("approved");
    expect(result.affiliateUrl).toBe("https://example.com/ref/amplitude-xyz");
    const entry = (await getPipelineEntry("amplitude"))!;
    expect(entry.history.map((h) => h.status)).toEqual([
      "program_found",
      "verified",
      "ready_to_apply",
      "application_in_progress",
      "submitted",
      "pending_review",
      "approved",
    ]);
    expect(entry.notes).toBe("Owner-confirmed approval that happened outside the tracked flow.");
  });

  it("a program stuck behind a network approval can move to waiting_on_network from needs_owner_action or verified", async () => {
    await setPipelineStatus("miro", "program_found");
    await setPipelineStatus("miro", "verified");
    await setPipelineStatus("miro", "needs_owner_action", { ownerActionRequired: "Needs a PartnerStack account." });
    const updated = await setPipelineStatus("miro", "waiting_on_network", {
      note: "PartnerStack Network Profile submitted; owner action complete.",
    });
    expect(updated.status).toBe("waiting_on_network");
    expect(updated.ownerActionRequired).toBeNull(); // cleared — nothing left for the owner to do on this program specifically
  });

  it("clears a resolved owner-action reason when the program moves forward to approval", async () => {
    await setPipelineStatus("trainual", "program_found");
    await setPipelineStatus("trainual", "verified");
    await setPipelineStatus("trainual", "needs_owner_action", {
      ownerActionRequired: "Owner must accept the network invitation.",
    });
    const approved = await setPipelineStatus("trainual", "approved", {
      affiliateUrl: "https://example.com/ref/trainual",
      note: "First-party approval and tracking asset received.",
    });
    expect(approved.status).toBe("approved");
    expect(approved.ownerActionRequired).toBeNull();
    expect(approved.affiliateUrl).toBe("https://example.com/ref/trainual");
  });

  it("waiting_on_network resolves forward once the network responds", async () => {
    await setPipelineStatus("airtable", "program_found");
    await setPipelineStatus("airtable", "verified");
    await setPipelineStatus("airtable", "waiting_on_network");
    await expect(setPipelineStatus("airtable", "ready_to_apply")).resolves.not.toThrow();
  });

  it("waiting_on_network cannot jump straight to submitted", async () => {
    await setPipelineStatus("zendesk", "program_found");
    await setPipelineStatus("zendesk", "verified");
    await setPipelineStatus("zendesk", "waiting_on_network");
    await expect(setPipelineStatus("zendesk", "submitted")).rejects.toThrow(/Invalid affiliate pipeline transition/);
  });

  it("buildPipelineMap indexes entries by slug for O(1) lookup", async () => {
    await setPipelineStatus("clickup", "program_found");
    const entries = await readAffiliatePipeline();
    const map = buildPipelineMap(entries);
    expect(map.get("clickup")?.status).toBe("program_found");
    expect(map.get("nonexistent-slug")).toBeUndefined();
  });

  /**
   * Regression coverage for the 2026-08-15 Blob operations incident: the
   * dashboard used to call countByPipelineStatus() with no arguments even
   * though it had already fetched the pipeline moments earlier for
   * getRankedApplicationCandidates() — a second full read for data it
   * already had. Passing the same array through should cost nothing.
   */
  it("countByPipelineStatus makes zero pipeline reads when passed a pre-fetched entries array", async () => {
    await setPipelineStatus("clickup", "program_found");
    const entries = await readAffiliatePipeline();
    const readSpy = vi.spyOn(fs, "readFileSync");
    await countByPipelineStatus(entries);
    const pipelineReads = readSpy.mock.calls.filter(([p]) => String(p).includes("affiliate-pipeline.json")).length;
    readSpy.mockRestore();
    expect(pipelineReads).toBe(0);
  });

  it("countByPipelineStatus still works standalone (no entries passed) for CLI/other callers", async () => {
    await setPipelineStatus("clickup", "program_found");
    const counts = await countByPipelineStatus();
    expect(counts.program_found).toBeGreaterThanOrEqual(1);
  });
});
