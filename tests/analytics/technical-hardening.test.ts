import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sequentialFunnel } from "@/lib/analytics/sequential-funnel";
import { classifySessions } from "@/lib/analytics/human-classification";
import type { FirstPartyEvent } from "@/lib/analytics/events";

function journey(): FirstPartyEvent[] {
  const base = { visitorId: "v_reader", sessionId: "s_reader", isTest: false };
  return [
    { type: "page_view", path: "/compare" },
    { type: "engaged_view", path: "/compare", durationSeconds: 11 },
    { type: "page_view", path: "/software/wix" },
    { type: "software_view", path: "/software/wix", softwareSlug: "wix" },
    { type: "outbound_click", path: "/software/wix", softwareSlug: "wix", destination: "affiliate", url: "https://example.invalid" },
  ].map((event, index) => ({ ...base, ...event, timestamp: new Date(Date.UTC(2026, 8, 19, 0, 0, index * 12)).toISOString() }) as FirstPartyEvent);
}

describe("human-estimate funnel chronology and provenance", () => {
  it("accepts chronological progression and stays monotone", () => {
    const events = journey();
    expect(sequentialFunnel(events, events).map(s => s.uniquePeople)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });
  it("does not retroactively count an outbound made before evaluation", () => {
    const events = journey();
    events[4].timestamp = "2026-09-18T23:59:59.000Z";
    expect(sequentialFunnel(events, events).map(s => s.uniquePeople)).toEqual([1, 1, 1, 1, 0, 0, 0]);
  });
  it("does not join different sessions into one journey", () => {
    const events = journey();
    events[4].sessionId = "s_other";
    expect(sequentialFunnel(events, events)[6].uniquePeople).toBe(0);
  });
  it("excludes QA even when marker lies outside the reporting window", () => {
    const events = journey();
    const history = [...events, { ...events[0], isTest: true, timestamp: "2026-09-20T00:00:00Z" }];
    expect(sequentialFunnel(events, history).every(s => s.uniquePeople === 0)).toBe(true);
  });
  it("excludes shallow unknown and anonymous fallback sessions", () => {
    const shallow = journey().slice(0, 1);
    expect(sequentialFunnel(shallow, shallow)[0].uniquePeople).toBe(0);
    const anonymous = journey().map(e => ({ ...e, visitorId: "v_anon", sessionId: "s_anon" }));
    expect(classifySessions(anonymous)[0].bucket).toBe("UNRESOLVED");
    expect(sequentialFunnel(anonymous, anonymous)[0].uniquePeople).toBe(0);
  });
  it("reloads of one URL do not qualify as multiple pages", () => {
    const events = journey().map(e => ({ ...e, path: "/software/wix" }));
    expect(sequentialFunnel(events, events)[2].uniquePeople).toBe(0);
  });
  it("does not describe an 8-second accepted dwell as ten seconds", () => {
    const events = journey().slice(0, 2);
    events[1] = { ...events[1], type: "engaged_view", durationSeconds: 8 };
    expect(sequentialFunnel(events, events, true).map(s => s.uniquePeople)).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });
});

describe("client delivery without storage or beacon capacity", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("window", { location: { search: "?qa=1&qaRun=local-hardening" } });
    const blocked = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } };
    vi.stubGlobal("sessionStorage", blocked);
    vi.stubGlobal("localStorage", blocked);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({}));
  });
  afterEach(() => vi.unstubAllGlobals());
  it("keeps explicit QA across client navigation when storage throws", async () => {
    const { markAndCheckSyntheticQa, getSyntheticQaRun } = await import("@/lib/analytics/synthetic");
    expect(markAndCheckSyntheticQa()).toBe(true);
    window.location.search = "";
    expect(markAndCheckSyntheticQa()).toBe(true);
    expect(getSyntheticQaRun()).toBe("local-hardening");
    vi.stubGlobal("window", { location: { search: "" } });
    expect(markAndCheckSyntheticQa()).toBe(false);
  });
  it.each(["false", "throw", "true"])("beacon %s: only rejected queueing uses one fallback", async mode => {
    const beacon = vi.fn(() => { if (mode === "throw") throw Error("blocked"); return mode === "true"; });
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    const { trackEvent } = await import("@/lib/analytics/track");
    expect(() => trackEvent({ type: "page_view", path: "/" })).not.toThrow();
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(mode === "true" ? 0 : 1);
    if (mode !== "true") {
      const init = vi.mocked(fetch).mock.calls[0][1]!;
      expect(init.keepalive).toBe(true);
      expect(JSON.parse(init.body as string)).toMatchObject({ isTest: true, qaRun: "local-hardening" });
    }
  });
});
