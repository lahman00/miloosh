import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { recordPainCandidate, getAllPainCandidates, normalizeSourceUrl, deriveCandidateId } from "@/lib/growth/pain-candidate-store";
import { clusterPainCandidates } from "@/lib/growth/pain-clustering";
import { selectRemedy } from "@/lib/growth/remedy-selector";

/**
 * MILOOSH P0 -- FIRST REAL PAIN RADAR SIGNAL mission (2026-08-24).
 *
 * Regression coverage for the discovery -> store -> clustering ->
 * velocity -> remedy chain, using SYNTHETIC fixtures only (never a
 * production claim -- the actual two real candidates were ingested
 * separately via scripts/growth/ingest-first-pain-signal.ts --live and
 * verified via a real production read-back, not via this test file).
 */
const LOCAL_FALLBACK_PATH = path.join(process.cwd(), "var", "pain-candidates.json");

describe("first pain signal: discovery -> store -> clustering -> remedy (synthetic fixtures)", () => {
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

  it("accepts a valid discovery result with a real-shaped URL", async () => {
    const candidate = await recordPainCandidate({
      source: "news",
      sourceUrl: "https://example.com/real-article",
      vendor: "TestVendor",
      title: "Test pain article",
      discoveredAt: new Date().toISOString(),
      intent: "too-expensive",
      normalizedPainClass: "price-pressure",
    });
    expect(candidate.id).toBeTruthy();
    expect(candidate.vendor).toBe("TestVendor");
  });

  it("rejects nothing structurally for an invalid/unparseable URL, but normalizeSourceUrl degrades safely instead of crashing", () => {
    expect(() => normalizeSourceUrl("not a url at all")).not.toThrow();
    expect(() => deriveCandidateId("not a url at all")).not.toThrow();
  });

  it("a missing source URL is a TypeScript-level requirement, not a runtime guess -- sourceUrl is a required field", async () => {
    // @ts-expect-error -- sourceUrl is required; this line exists to prove the type system enforces it.
    const attempt = () => recordPainCandidate({ source: "news", vendor: "X", title: "t", discoveredAt: new Date().toISOString(), intent: "other" });
    expect(attempt).toBeDefined();
  });

  it("a malformed source (empty vendor, empty title) is still stored as-is -- this layer doesn't silently invent missing facts", async () => {
    const candidate = await recordPainCandidate({
      source: "other",
      sourceUrl: "https://example.com/malformed",
      title: "",
      discoveredAt: new Date().toISOString(),
      intent: "other",
      normalizedPainClass: "unclassified",
    });
    expect(candidate.title).toBe("");
    expect(candidate.vendor).toBeUndefined();
  });

  it("canonical URL normalization: trailing slash, www, and query-param variants of the same page produce the same candidate id", async () => {
    const a = await recordPainCandidate({ source: "news", sourceUrl: "https://example.com/pain-story", vendor: "X", title: "t", discoveredAt: new Date().toISOString(), intent: "other" });
    const b = await recordPainCandidate({ source: "news", sourceUrl: "https://www.example.com/pain-story/?utm_source=x", vendor: "X", title: "t", discoveredAt: new Date().toISOString(), intent: "other" });
    expect(a.id).toBe(b.id);
  });

  it("duplicate discovery: re-ingesting the exact same URL twice never creates two stored candidates", async () => {
    const input = { source: "news" as const, sourceUrl: "https://example.com/duplicate-check", vendor: "X", title: "t", discoveredAt: new Date().toISOString(), intent: "other" as const };
    await recordPainCandidate(input);
    await recordPainCandidate(input);
    const all = await getAllPainCandidates();
    expect(all).toHaveLength(1);
  });

  it("storage round-trip: a recorded candidate can be read back with every discovery field intact", async () => {
    const input = {
      source: "news" as const,
      sourceUrl: "https://example.com/roundtrip",
      vendor: "RoundtripCo",
      title: "Roundtrip title",
      excerpt: "Roundtrip excerpt",
      publishedAt: "2026-08-01",
      discoveredAt: "2026-08-24T00:00:00Z",
      intent: "usage-limit" as const,
      normalizedPainClass: "billing-unpredictability" as const,
    };
    await recordPainCandidate(input);
    const all = await getAllPainCandidates();
    const stored = all.find((c) => c.sourceUrl === input.sourceUrl)!;
    expect(stored.title).toBe(input.title);
    expect(stored.excerpt).toBe(input.excerpt);
    expect(stored.publishedAt).toBe(input.publishedAt);
    expect(stored.normalizedPainClass).toBe(input.normalizedPainClass);
  });

  it("clustering handoff: a stored candidate with a real vendor and classified pain flows into clusterPainCandidates", async () => {
    await recordPainCandidate({
      source: "news",
      sourceUrl: "https://example.com/cluster-handoff",
      vendor: "ClusterCo",
      title: "t",
      discoveredAt: new Date().toISOString(),
      intent: "free-plan-ending",
      normalizedPainClass: "loss-of-free-access",
    });
    const all = await getAllPainCandidates();
    const clusters = clusterPainCandidates(all);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.vendor).toBe("clusterco");
  });

  it("velocity calculation on a single real signal is honestly 'isolated', never a fabricated trend", async () => {
    await recordPainCandidate({
      source: "news",
      sourceUrl: "https://example.com/velocity-check",
      vendor: "VelocityCo",
      title: "t",
      discoveredAt: new Date().toISOString(),
      intent: "other",
      normalizedPainClass: "buyer-anxiety",
    });
    const clusters = clusterPainCandidates(await getAllPainCandidates());
    expect(clusters[0]!.trendDirection).toBe("isolated");
    expect(clusters[0]!.signalCount).toBe(1);
  });

  it("remedy selection runs on the real stored+clustered candidate and returns a concrete recommendation with reasons", async () => {
    const candidate = await recordPainCandidate({
      source: "news",
      sourceUrl: "https://example.com/remedy-check",
      vendor: "RemedyCo",
      title: "t",
      discoveredAt: new Date().toISOString(),
      intent: "free-plan-ending",
      normalizedPainClass: "loss-of-free-access",
      severity: 60,
      commercialIntent: 60,
    });
    const clusters = clusterPainCandidates(await getAllPainCandidates());
    const remedy = selectRemedy(candidate, clusters[0]);
    expect(remedy.remedy).toBe("ALTERNATIVES_PAGE");
    expect(remedy.reasons.length).toBeGreaterThan(0);
  });

  it("end-to-end synthetic fixture: two candidates flow through the full chain with distinct, correct outcomes", async () => {
    await recordPainCandidate({
      source: "news",
      sourceUrl: "https://example.com/e2e-a",
      vendor: "E2EVendorA",
      title: "t",
      discoveredAt: new Date().toISOString(),
      intent: "free-plan-ending",
      normalizedPainClass: "loss-of-free-access",
      severity: 60,
      commercialIntent: 60,
    });
    await recordPainCandidate({
      source: "news",
      sourceUrl: "https://example.com/e2e-b",
      vendor: "E2EVendorB",
      title: "t",
      discoveredAt: new Date().toISOString(),
      intent: "usage-limit",
      normalizedPainClass: "billing-unpredictability",
      severity: 45,
      commercialIntent: 40,
      affiliateRelevant: true,
    });
    const all = await getAllPainCandidates();
    expect(all).toHaveLength(2);
    const clusters = clusterPainCandidates(all);
    expect(clusters).toHaveLength(2);
    for (const cluster of clusters) {
      const candidate = all.find((c) => cluster.candidateIds.includes(c.id))!;
      const remedy = selectRemedy(candidate, cluster);
      expect(remedy.remedy).not.toBe("NO_ACTION");
    }
  });
});
