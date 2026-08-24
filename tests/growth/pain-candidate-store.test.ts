import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  recordPainCandidate,
  getPainCandidate,
  getAllPainCandidates,
  updatePainCandidateState,
  deriveCandidateId,
  normalizeSourceUrl,
} from "@/lib/growth/pain-candidate-store";

/**
 * MILOOSH OVERNIGHT MONSTER mission (2026-08-24) — Pain Radar persistent
 * storage regression suite. Same real-local-fallback backup/restore
 * convention as tests/lib/newsletter-leads.test.ts.
 */
const LOCAL_FALLBACK_PATH = path.join(process.cwd(), "var", "pain-candidates.json");

function baseInput(overrides: Partial<Parameters<typeof recordPainCandidate>[0]> = {}) {
  return {
    source: "reddit" as const,
    sourceUrl: "https://reddit.com/r/sysadmin/comments/abc123",
    discoveredAt: "2026-08-24T00:00:00Z",
    title: "Freshdesk free plan ending",
    intent: "free-plan-ending" as const,
    vendor: "Freshdesk",
    ...overrides,
  };
}

describe("pain candidate store", () => {
  let backup: string | null = null;

  beforeEach(() => {
    backup = fs.existsSync(LOCAL_FALLBACK_PATH) ? fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8") : null;
    fs.rmSync(LOCAL_FALLBACK_PATH, { force: true });
  });

  afterEach(() => {
    if (backup !== null) {
      fs.mkdirSync(path.dirname(LOCAL_FALLBACK_PATH), { recursive: true });
      fs.writeFileSync(LOCAL_FALLBACK_PATH, backup);
    } else {
      fs.rmSync(LOCAL_FALLBACK_PATH, { force: true });
    }
  });

  it("deriveCandidateId is deterministic and case/whitespace-insensitive on the URL", () => {
    const a = deriveCandidateId("https://reddit.com/r/x/comments/1");
    const b = deriveCandidateId("  HTTPS://reddit.com/r/x/comments/1  ");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("normalizeSourceUrl collapses a trailing slash", () => {
    expect(normalizeSourceUrl("https://example.com/blog/post")).toBe(normalizeSourceUrl("https://example.com/blog/post/"));
  });

  it("normalizeSourceUrl collapses insignificant tracking query parameters", () => {
    expect(normalizeSourceUrl("https://example.com/blog/post")).toBe(
      normalizeSourceUrl("https://example.com/blog/post?utm_source=facebook&utm_medium=social"),
    );
  });

  it("normalizeSourceUrl collapses a www. prefix", () => {
    expect(normalizeSourceUrl("https://example.com/blog/post")).toBe(normalizeSourceUrl("https://www.example.com/blog/post"));
  });

  it("normalizeSourceUrl treats two discovery runs of the identical page (case + trailing slash + query) as the same source", () => {
    const a = normalizeSourceUrl("https://Example.com/Blog/Post/");
    const b = normalizeSourceUrl("https://example.com/Blog/Post?ref=share");
    expect(a).toBe(b);
  });

  it("normalizeSourceUrl still returns a deterministic value for a URL that fails to parse, without crashing", () => {
    const a = normalizeSourceUrl("not a real url");
    const b = normalizeSourceUrl("NOT A REAL URL");
    expect(a).toBe(b);
  });

  it("re-discovering the same real page via a www/trailing-slash/query-param variant merges onto the same stored candidate", async () => {
    const first = await recordPainCandidate(baseInput({ sourceUrl: "https://example.com/pain/thread" }));
    const second = await recordPainCandidate(baseInput({ sourceUrl: "https://www.example.com/pain/thread/?utm_source=x" }));
    expect(second.id).toBe(first.id);
    const all = await getAllPainCandidates();
    expect(all.filter((c) => c.id === first.id)).toHaveLength(1);
  });

  it("records a candidate and initializes lifecycle state to the safe defaults", async () => {
    const candidate = await recordPainCandidate(baseInput());
    expect(candidate.verificationState).toBe("UNVERIFIED");
    expect(candidate.remedyState).toBe("NONE_SELECTED");
    expect(candidate.distributionState).toBe("NOT_DISTRIBUTED");
    expect(candidate.normalizedPainClass).toBe("unclassified");
    expect(candidate.createdAt).toBe(candidate.updatedAt);
  });

  it("re-discovering the same source URL merges onto the same record instead of duplicating it", async () => {
    const first = await recordPainCandidate(baseInput());
    const second = await recordPainCandidate(baseInput({ engagement: 80 }));
    expect(second.id).toBe(first.id);
    const all = await getAllPainCandidates();
    expect(all.filter((c) => c.id === first.id)).toHaveLength(1);
    expect(all[0]!.engagement).toBe(80);
  });

  it("re-discovery preserves lifecycle state that already progressed, not resetting it", async () => {
    const candidate = await recordPainCandidate(baseInput());
    await updatePainCandidateState(candidate.id, { verificationState: "VERIFIED_TRUE", remedyState: "BUILT" });
    const rediscovered = await recordPainCandidate(baseInput({ engagement: 90 }));
    expect(rediscovered.verificationState).toBe("VERIFIED_TRUE");
    expect(rediscovered.remedyState).toBe("BUILT");
  });

  it("getPainCandidate returns null for an id that was never recorded", async () => {
    expect(await getPainCandidate("does-not-exist")).toBeNull();
  });

  it("updatePainCandidateState returns null and writes nothing for an unknown id", async () => {
    const result = await updatePainCandidateState("does-not-exist", { verificationState: "VERIFIED_TRUE" });
    expect(result).toBeNull();
    expect(await getAllPainCandidates()).toEqual([]);
  });

  it("updatePainCandidateState never touches discovery/scoring fields", async () => {
    const candidate = await recordPainCandidate(baseInput({ severity: 70 }));
    const updated = await updatePainCandidateState(candidate.id, { distributionState: "DISTRIBUTED" });
    expect(updated?.severity).toBe(70);
    expect(updated?.title).toBe("Freshdesk free plan ending");
    expect(updated?.distributionState).toBe("DISTRIBUTED");
  });

  it("getAllPainCandidates returns an empty array, not a crash, when nothing has ever been recorded", async () => {
    expect(await getAllPainCandidates()).toEqual([]);
  });
});
