import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBrowserSession, SESSION_IDLE_MS } from "@/lib/analytics/browser-session";
import { trackEvent } from "@/lib/analytics/track";
import { normalizeTrafficSource } from "@/lib/analytics/attribution";
import { sanitizeAcquisition } from "@/lib/analytics/acquisition";

function storage(initial: [string, string][] = []) {
  const map = new Map(initial);
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => map.set(key, value), map };
}
let sessionStore: ReturnType<typeof storage>;
function documentAt(path = "/software/airtable", search = "", referrer = "", navigation = "navigate") {
  vi.stubGlobal("window", { location: { pathname: path, search }, performance: { getEntriesByType: () => [{ type: navigation }] } });
  vi.stubGlobal("document", { referrer });
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime("2026-09-26T00:00:00Z");
  sessionStore = storage(); vi.stubGlobal("sessionStorage", sessionStore); vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("navigator", {}); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({}));
  documentAt();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("first-touch context and session boundaries", () => {
  it.each(["/best-no-code-database-for-operations", "/compare/airtable-vs-notion", "/software/airtable"])("preserves acquisition through %s -> money page -> click, even without stored landing event", landing => {
    documentAt(landing, "?utm_source=newsletter&utm_medium=email&utm_campaign=operations&utm_content=decision", "");
    trackEvent({ type: "page_view", path: landing });
    window.location.search = ""; window.location.pathname = "/software/airtable";
    trackEvent({ type: "cta_click", path: "/software/airtable", softwareSlug: "airtable" });
    const sent = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(init!.body as string));
    expect(sent[1].sessionId).toBe(sent[0].sessionId);
    expect(sent[1].acquisition).toEqual(sent[0].acquisition);
    expect(sent[1].acquisition).toMatchObject({ landingPath: landing, utmMedium: "email", trafficSource: "email", utmContent: "decision" });
    if (landing !== "/software/airtable") expect(sent[1].previousPath).toBe(landing);
  });
  it("expires an idle session without reusing its old URL UTM/referrer", () => {
    documentAt("/software/airtable", "?utm_source=linkedin&utm_medium=organic_social", "https://www.linkedin.com/feed");
    const first = getBrowserSession("/software/airtable")!;
    vi.advanceTimersByTime(SESSION_IDLE_MS);
    const next = getBrowserSession("/software/airtable")!;
    expect(next.sessionId).not.toBe(first.sessionId);
    expect(next.acquisition).toMatchObject({ trafficSource: "unknown", landingPath: "/software/airtable" });
    expect(next.acquisition.utmSource).toBeUndefined();
    expect(next.acquisition.referrerHost).toBeUndefined();
  });
  it("new direct document navigation cannot inherit an earlier campaign; visitor remains stable", () => {
    documentAt("/software/airtable", "?utm_source=linkedin&utm_medium=social");
    trackEvent({ type: "page_view", path: "/software/airtable" });
    documentAt();
    trackEvent({ type: "page_view", path: "/software/airtable" });
    const sent = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(init!.body as string));
    expect(sent[1].visitorId).toBe(sent[0].visitorId);
    expect(sent[1].sessionId).not.toBe(sent[0].sessionId);
    expect(sent[1].acquisition.trafficSource).toBe("direct");
    expect(sent[1].acquisition.utmSource).toBeUndefined();
  });
  it("a new tab with copied sessionStorage gets its own identity, without borrowing landing context", () => {
    documentAt("/guide", "?utm_source=facebook&utm_medium=social");
    const first = getBrowserSession("/guide")!;
    vi.stubGlobal("sessionStorage", storage([...sessionStore.map]));
    documentAt("/software/airtable");
    const tab = getBrowserSession("/software/airtable")!;
    expect(tab.sessionId).not.toBe(first.sessionId);
    expect(tab.acquisition.landingPath).toBe("/software/airtable");
    expect(tab.acquisition.utmSource).toBeUndefined();
  });
  it.each(["reload", "back_forward"])("explicit %s resumes only non-expired same-tab context", navigation => {
    documentAt("/guide", "", "https://www.bing.com/search?q=private");
    const first = getBrowserSession("/guide")!;
    documentAt("/software/airtable", "", "https://miloosh.com/guide", navigation);
    expect(getBrowserSession("/software/airtable")!.sessionId).toBe(first.sessionId);
    expect(getBrowserSession("/software/airtable")!.acquisition.referrerHost).toBe("www.bing.com");
    vi.advanceTimersByTime(SESSION_IDLE_MS);
    documentAt("/software/airtable", "", "https://miloosh.com/guide", navigation);
    expect(getBrowserSession("/software/airtable")!.sessionId).not.toBe(first.sessionId);
  });
  it("blocked storage retains one ephemeral identity and context for all events in the document", () => {
    const denied = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } };
    vi.stubGlobal("sessionStorage", denied); vi.stubGlobal("localStorage", denied);
    documentAt("/guide", "", "https://www.google.com/");
    trackEvent({ type: "page_view", path: "/guide" });
    trackEvent({ type: "cta_click", path: "/software/airtable", softwareSlug: "airtable" });
    const sent = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(init!.body as string));
    expect(sent).toHaveLength(2);
    expect(sent[1].visitorId).toBe(sent[0].visitorId); expect(sent[1].sessionId).toBe(sent[0].sessionId);
    expect(sent[1].acquisition.referrerHost).toBe("www.google.com");
  });
  it("server sanitizer removes private/arbitrary fields, fragments and cross-session snapshots", () => {
    const current = getBrowserSession("/software/airtable")!;
    expect(sanitizeAcquisition({ ...current.acquisition, landingPath: "https://evil.invalid/" }, current.sessionId)).toBeUndefined();
    expect(sanitizeAcquisition(current.acquisition, "s_other")).toBeUndefined();
    const safe = sanitizeAcquisition({ ...current.acquisition, landingPath: "/guide?email=secret#token", email: "secret", utmSource: "personal@email.invalid" }, current.sessionId)!;
    expect(safe.landingPath).toBe("/guide"); expect(safe.utmSource).toBeUndefined(); expect(safe).not.toHaveProperty("email");
  });
});

describe("source buckets do not relabel social/paid as Google organic", () => {
  it.each([ ["organic_social", "social"], ["paid_social", "social"], ["email", "email"], ["cpc", "paid"], ["not-organic", "unknown"], ["organic", "organic_search"] ])("%s -> %s", (utmMedium, expected) => {
    expect(normalizeTrafficSource({ utmMedium, utmSource: "google" })).toBe(expected);
  });
  it("missing source and internal referrer remain unknown rather than direct", () => {
    expect(normalizeTrafficSource({})).toBe("unknown");
    expect(normalizeTrafficSource({ referrerHost: "miloosh.com" })).toBe("unknown");
    expect(normalizeTrafficSource({ referrerObserved: true })).toBe("direct");
  });
});
