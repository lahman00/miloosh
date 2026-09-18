import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { normalizeTrafficSource, extractReferrerHost } from "@/lib/analytics/attribution";

/**
 * Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) — Phase
 * 12 (session integrity) and Phase 16 regression coverage for the
 * client-side identity/marker primitives (lib/analytics/track.ts,
 * lib/analytics/synthetic.ts) and the attribution normalizer. The test
 * environment is Node (no jsdom — see vitest.config.ts), so window/
 * localStorage/sessionStorage are stubbed with minimal in-memory mocks
 * rather than pulling in a full browser DOM dependency for this alone.
 */

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  clear(): void {
    this.store.clear();
  }
}

describe("Client-side visitor/session identity — Phase 12 session integrity", () => {
  let localStore: MemoryStorage;
  let sessionStore: MemoryStorage;

  beforeEach(() => {
    localStore = new MemoryStorage();
    sessionStore = new MemoryStorage();
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = localStore;
    (globalThis as unknown as { sessionStorage: MemoryStorage }).sessionStorage = sessionStore;
  });

  afterEach(() => {
    delete (globalThis as unknown as { localStorage?: MemoryStorage }).localStorage;
    delete (globalThis as unknown as { sessionStorage?: MemoryStorage }).sessionStorage;
  });

  it("getOrCreateVisitorId is stable across repeated calls within the same localStorage (same tab, many navigations)", async () => {
    const { getOrCreateVisitorId } = await import("@/lib/analytics/track");
    const first = getOrCreateVisitorId();
    const second = getOrCreateVisitorId();
    expect(second).toBe(first);
  });

  it("getOrCreateSessionId is stable within the same sessionStorage (same tab)", async () => {
    const { getOrCreateSessionId } = await import("@/lib/analytics/track");
    const first = getOrCreateSessionId();
    const second = getOrCreateSessionId();
    expect(second).toBe(first);
  });

  it("stored visitor/session identity reads fail closed when browser storage throws", async () => {
    const throwingStorage = { getItem: () => { throw new Error("storage blocked"); } };
    (globalThis as unknown as { localStorage: typeof throwingStorage }).localStorage = throwingStorage;
    (globalThis as unknown as { sessionStorage: typeof throwingStorage }).sessionStorage = throwingStorage;

    const { getStoredVisitorId, getStoredSessionId } = await import("@/lib/analytics/track");
    expect(getStoredVisitorId()).toBeUndefined();
    expect(getStoredSessionId()).toBeUndefined();
  });

  it("TrackedCtaLink uses fail-closed identity readers instead of direct storage access", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync("components/TrackedCtaLink.tsx", "utf8");
    expect(source).toContain("getStoredVisitorId()");
    expect(source).toContain("getStoredSessionId()");
    expect(source).not.toMatch(/localStorage\.getItem\(/);
    expect(source).not.toMatch(/sessionStorage\.getItem\(/);
  });

  it("TrackedCtaLink records middle-button outbound activations without treating right-clicks as clicks", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync("components/TrackedCtaLink.tsx", "utf8");
    expect(source).toContain("onAuxClick={(event) =>");
    expect(source).toContain("onAuxClick?.(event)");
    expect(source).toContain("if (event.button === 1) reportOutboundClick();");
    expect(source).not.toContain("if (event.button === 2) reportOutboundClick();");
  });

  it("a fresh sessionStorage (simulating a new tab/session) produces a new sessionId, while visitorId (localStorage) persists", async () => {
    const { getOrCreateVisitorId, getOrCreateSessionId } = await import("@/lib/analytics/track");
    const visitorBefore = getOrCreateVisitorId();
    const sessionBefore = getOrCreateSessionId();

    // Simulate a new tab: fresh sessionStorage, SAME localStorage.
    sessionStore.clear();

    const visitorAfter = getOrCreateVisitorId();
    const sessionAfter = getOrCreateSessionId();

    expect(visitorAfter).toBe(visitorBefore); // visitor identity persists across tabs
    expect(sessionAfter).not.toBe(sessionBefore); // session identity does not
  });
});

describe("Synthetic QA marker — Phase 12 (persistence) and Phase 4 (never contaminates later normal sessions)", () => {
  let sessionStore: MemoryStorage;

  beforeEach(() => {
    sessionStore = new MemoryStorage();
    (globalThis as unknown as { sessionStorage: MemoryStorage }).sessionStorage = sessionStore;
  });

  afterEach(() => {
    delete (globalThis as unknown as { sessionStorage?: MemoryStorage }).sessionStorage;
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  function stubLocation(search: string) {
    (globalThis as unknown as { window: { location: { search: string } } }).window = { location: { search } };
  }

  it("?qa=1 marks the session, and the marker persists across subsequent navigations without repeating the param", async () => {
    const { markAndCheckSyntheticQa } = await import("@/lib/analytics/synthetic");
    stubLocation("?qa=1");
    expect(markAndCheckSyntheticQa()).toBe(true);

    // Next "navigation" has no ?qa=1 in its URL, but the tab session stays marked.
    stubLocation("");
    expect(markAndCheckSyntheticQa()).toBe(true);
  });

  it("without ?qa=1 ever appearing, a session is never marked synthetic", async () => {
    const { markAndCheckSyntheticQa } = await import("@/lib/analytics/synthetic");
    stubLocation("?utm_source=newsletter");
    expect(markAndCheckSyntheticQa()).toBe(false);
  });

  it("a fresh sessionStorage (new tab/session) is never contaminated by an earlier session's QA marker", async () => {
    const { markAndCheckSyntheticQa } = await import("@/lib/analytics/synthetic");
    stubLocation("?qa=1");
    expect(markAndCheckSyntheticQa()).toBe(true);

    // Simulate a brand-new tab: fresh sessionStorage, no ?qa=1 this time.
    sessionStore.clear();
    stubLocation("");
    expect(markAndCheckSyntheticQa()).toBe(false);
  });

  it("qaRun is captured and sanitized only when ?qa=1 is present", async () => {
    const { markAndCheckSyntheticQa, getSyntheticQaRun } = await import("@/lib/analytics/synthetic");
    stubLocation("?qa=1&qaRun=run-42_test!!!");
    markAndCheckSyntheticQa();
    expect(getSyntheticQaRun()).toBe("run-42_test");
  });

  it("qaRun is never captured without ?qa=1, even if qaRun alone is present", async () => {
    const { markAndCheckSyntheticQa, getSyntheticQaRun } = await import("@/lib/analytics/synthetic");
    stubLocation("?qaRun=should-be-ignored");
    markAndCheckSyntheticQa();
    expect(getSyntheticQaRun()).toBeUndefined();
  });
});

describe("Traffic source attribution — Phase 8", () => {
  it("classifies known search engines as organic_search", () => {
    expect(normalizeTrafficSource({ referrerHost: "www.google.com" })).toBe("organic_search");
    expect(normalizeTrafficSource({ referrerHost: "www.bing.com" })).toBe("organic_search");
    expect(normalizeTrafficSource({ referrerHost: "duckduckgo.com" })).toBe("organic_search");
  });

  it("classifies known social platforms as social", () => {
    expect(normalizeTrafficSource({ referrerHost: "www.linkedin.com" })).toBe("social");
    expect(normalizeTrafficSource({ referrerHost: "t.co" })).toBe("social");
    expect(normalizeTrafficSource({ referrerHost: "www.reddit.com" })).toBe("social");
  });

  it("classifies no referrer at all as direct", () => {
    expect(normalizeTrafficSource({})).toBe("direct");
  });

  it("classifies internal navigation (referrer is miloosh.com itself) as direct, not referral", () => {
    expect(normalizeTrafficSource({ referrerHost: "miloosh.com" })).toBe("direct");
    expect(normalizeTrafficSource({ referrerHost: "www.miloosh.com" })).toBe("direct");
  });

  it("classifies an unrecognized external host as referral", () => {
    expect(normalizeTrafficSource({ referrerHost: "some-random-blog.example.com" })).toBe("referral");
  });

  it("UTM medium/source take precedence over referrer host when both are present", () => {
    expect(normalizeTrafficSource({ referrerHost: "some-random-blog.example.com", utmMedium: "social" })).toBe("social");
    expect(normalizeTrafficSource({ referrerHost: "www.google.com", utmSource: "newsletter" })).toBe("referral");
  });

  it("is deterministic — same input always produces the same bucket", () => {
    const input = { referrerHost: "www.google.com" };
    expect(normalizeTrafficSource(input)).toBe(normalizeTrafficSource(input));
  });

  it("extractReferrerHost pulls only the hostname, never the full URL or query string", () => {
    expect(extractReferrerHost("https://www.google.com/search?q=miloosh+crm+comparison&secret_token=abc123")).toBe("www.google.com");
  });

  it("extractReferrerHost returns undefined for empty or unparseable input, never throws", () => {
    expect(extractReferrerHost("")).toBeUndefined();
    expect(extractReferrerHost(undefined)).toBeUndefined();
    expect(extractReferrerHost(null)).toBeUndefined();
    expect(extractReferrerHost("not a url at all")).toBeUndefined();
  });
});
