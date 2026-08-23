import { describe, it, expect } from "vitest";
import { classifySessions, summarizeBuckets } from "@/lib/analytics/human-classification";
import type { FirstPartyEvent } from "@/lib/analytics/events";

/**
 * MILOOSH ANALYTICS TRUTH & HUMAN TRAFFIC MISSION (2026-08-23) regression
 * suite. Uses synthetic event fixtures shaped like the REAL patterns found
 * in production (CircleCI/Facebook cluster, homepage burst, Aug 22
 * 5-visitor/5-page cluster, a real prior outbound click) without hard-
 * coding those exact session IDs into the classifier itself -- the
 * classifier is rule-based and must generalize to any future session
 * shaped the same way, which these tests exist to prove.
 */

function ev(overrides: Partial<FirstPartyEvent> & Pick<FirstPartyEvent, "type" | "sessionId" | "timestamp" | "path">): FirstPartyEvent {
  return {
    visitorId: `v_${overrides.sessionId}`,
    ...overrides,
  } as FirstPartyEvent;
}

describe("classifySessions", () => {
  it("classifies isTest events as KNOWN_QA_TEST regardless of engagement depth", () => {
    const events: FirstPartyEvent[] = [
      ev({ type: "page_view", sessionId: "s_qa", timestamp: "2026-01-01T00:00:00.000Z", path: "/", isTest: true }),
      ev({ type: "engaged_view", sessionId: "s_qa", timestamp: "2026-01-01T00:00:10.000Z", path: "/", isTest: true }),
    ];
    const [c] = classifySessions(events);
    expect(c!.bucket).toBe("KNOWN_QA_TEST");
    expect(c!.reasonCode).toBe("QA_EVENT");
  });

  it("classifies a real-UTM session with a progressive engagement funnel as STRONG_HUMAN_EVIDENCE, not merely because it produced JS events", () => {
    const events: FirstPartyEvent[] = [
      ev({ type: "page_view", sessionId: "s_campaign", timestamp: "2026-01-01T09:00:00.000Z", path: "/software/circleci", utmContent: "queue-entry-abc" } as never),
      ev({ type: "software_view", sessionId: "s_campaign", timestamp: "2026-01-01T09:00:02.000Z", path: "/software/circleci" }),
      ev({ type: "engaged_view", sessionId: "s_campaign", timestamp: "2026-01-01T09:00:15.000Z", path: "/software/circleci" }),
      ev({ type: "cta_impression", sessionId: "s_campaign", timestamp: "2026-01-01T09:00:25.000Z", path: "/software/circleci" }),
    ];
    const [c] = classifySessions(events);
    expect(c!.bucket).toBe("STRONG_HUMAN_EVIDENCE");
    expect(c!.reasonCode).toBe("REAL_UTM_ENGAGEMENT");
  });

  it("a single flat page_view alone is UNRESOLVED, never promoted to human evidence just for existing", () => {
    const events: FirstPartyEvent[] = [ev({ type: "page_view", sessionId: "s_lone", timestamp: "2026-01-01T00:00:00.000Z", path: "/software/notion" })];
    const [c] = classifySessions(events);
    expect(c!.bucket).toBe("UNRESOLVED");
  });

  it("detects a same-path cadence burst: several shallow, non-UTM sessions hitting one URL within the burst window", () => {
    const events: FirstPartyEvent[] = [];
    for (let i = 0; i < 5; i++) {
      const sid = `s_burst_${i}`;
      events.push(ev({ type: "page_view", sessionId: sid, timestamp: `2026-01-01T09:0${i}:00.000Z`, path: "/" }));
      events.push(ev({ type: "engaged_view", sessionId: sid, timestamp: `2026-01-01T09:0${i}:10.000Z`, path: "/" }));
    }
    const classifications = classifySessions(events);
    // Adjacent same-path sessions ~1 minute apart, well within BURST_WINDOW_MS (5 min).
    expect(classifications.every((c) => c.bucket === "SUSPICIOUS" && c.reasonCode === "SUSPICIOUS_CADENCE")).toBe(true);
  });

  it("detects a simultaneous multi-visitor burst across DIFFERENT pages within a tight window (the real Aug 22 5-visitor/5-page shape)", () => {
    const paths = ["/", "/recommend", "/cookies", "/compare/a-vs-b", "/software/x"];
    const events: FirstPartyEvent[] = paths.map((path, i) => ev({ type: "page_view", sessionId: `s_sim_${i}`, timestamp: `2026-01-01T16:53:3${i}.000Z`, path }));
    const classifications = classifySessions(events);
    expect(classifications.every((c) => c.bucket === "SUSPICIOUS" && c.reasonCode === "SUSPICIOUS_CADENCE")).toBe(true);
  });

  it("does NOT flag isolated sessions spread naturally over time as a burst", () => {
    const events: FirstPartyEvent[] = [
      ev({ type: "page_view", sessionId: "s_a", timestamp: "2026-01-01T01:00:00.000Z", path: "/" }),
      ev({ type: "page_view", sessionId: "s_b", timestamp: "2026-01-01T05:00:00.000Z", path: "/software/notion" }),
      ev({ type: "page_view", sessionId: "s_c", timestamp: "2026-01-01T11:00:00.000Z", path: "/compare/a-vs-b" }),
    ];
    const classifications = classifySessions(events);
    expect(classifications.every((c) => c.bucket !== "SUSPICIOUS")).toBe(true);
  });

  it("a real UTM-carrying session is never swept into a burst even if timed near a genuine burst", () => {
    const events: FirstPartyEvent[] = [
      ev({ type: "page_view", sessionId: "s_utm", timestamp: "2026-01-01T09:00:00.000Z", path: "/software/circleci", utmContent: "real-entry" } as never),
      ev({ type: "software_view", sessionId: "s_utm", timestamp: "2026-01-01T09:00:02.000Z", path: "/software/circleci" }),
      ev({ type: "engaged_view", sessionId: "s_utm", timestamp: "2026-01-01T09:00:12.000Z", path: "/software/circleci" }),
      // 3 unrelated shallow, non-UTM sessions arriving within the same 15s window on different pages.
      ev({ type: "page_view", sessionId: "s_other1", timestamp: "2026-01-01T09:00:03.000Z", path: "/" }),
      ev({ type: "page_view", sessionId: "s_other2", timestamp: "2026-01-01T09:00:05.000Z", path: "/recommend" }),
      ev({ type: "page_view", sessionId: "s_other3", timestamp: "2026-01-01T09:00:07.000Z", path: "/compare/a-vs-b" }),
    ];
    const classifications = classifySessions(events);
    const utmSession = classifications.find((c) => c.sessionId === "s_utm")!;
    expect(utmSession.bucket).toBe("STRONG_HUMAN_EVIDENCE");
    expect(utmSession.isPartOfBurst).toBe(false);
  });

  it("classifies a real outbound click with no burst signal as CONFIRMED_CLEAN", () => {
    const events: FirstPartyEvent[] = [
      ev({ type: "page_view", sessionId: "s_convert", timestamp: "2026-01-01T14:00:00.000Z", path: "/software/x" }),
      ev({ type: "engaged_view", sessionId: "s_convert", timestamp: "2026-01-01T14:00:20.000Z", path: "/software/x" }),
      ev({ type: "outbound_click", sessionId: "s_convert", timestamp: "2026-01-01T14:00:40.000Z", path: "/software/x" }),
    ];
    const [c] = classifySessions(events);
    expect(c!.bucket).toBe("CONFIRMED_CLEAN");
    expect(c!.reasonCode).toBe("OUTBOUND_OR_AFFILIATE_CLICK");
  });

  it("isolated session with real multi-page navigation (no burst) is PROBABLE_HUMAN, a step below STRONG evidence", () => {
    const events: FirstPartyEvent[] = [
      ev({ type: "page_view", sessionId: "s_probable", timestamp: "2026-01-01T03:00:00.000Z", path: "/" }),
      ev({ type: "page_view", sessionId: "s_probable", timestamp: "2026-01-01T03:00:30.000Z", path: "/category/crm" }),
    ];
    const [c] = classifySessions(events);
    expect(c!.bucket).toBe("PROBABLE_HUMAN");
  });

  it("summarizeBuckets counts add up to the total session count", () => {
    const events: FirstPartyEvent[] = [
      ev({ type: "page_view", sessionId: "s_1", timestamp: "2026-01-01T00:00:00.000Z", path: "/", isTest: true }),
      ev({ type: "page_view", sessionId: "s_2", timestamp: "2026-01-01T05:00:00.000Z", path: "/software/x" }),
    ];
    const classifications = classifySessions(events);
    const summary = summarizeBuckets(classifications);
    expect(summary.reduce((sum, s) => sum + s.sessions, 0)).toBe(classifications.length);
  });

  it("never crashes or produces a session on an empty event list", () => {
    expect(classifySessions([])).toEqual([]);
  });

  it("MILOOSH CTA CONVERSION OPTIMIZATION MISSION (2026-08-23) Phase 18: a QA session carrying CTA-experiment fields is still KNOWN_QA_TEST, never counted as human growth just because it has experimentId/variant attached", () => {
    const events: FirstPartyEvent[] = [
      ev({ type: "page_view", sessionId: "s_exp_qa", timestamp: "2026-01-01T00:00:00.000Z", path: "/software/x", isTest: true }),
      ev({ type: "cta_impression", sessionId: "s_exp_qa", timestamp: "2026-01-01T00:00:05.000Z", path: "/software/x", experimentId: "software-cta-copy-v1", variant: "treatment", isTest: true } as never),
      ev({ type: "outbound_click", sessionId: "s_exp_qa", timestamp: "2026-01-01T00:00:10.000Z", path: "/software/x", experimentId: "software-cta-copy-v1", variant: "treatment", isTest: true } as never),
    ];
    const [c] = classifySessions(events);
    expect(c!.bucket).toBe("KNOWN_QA_TEST");
  });

  it("a real (non-QA) experiment-tagged session with a genuine outbound click still classifies as CONFIRMED_CLEAN -- the experiment doesn't weaken or bypass the existing evidence rules", () => {
    const events: FirstPartyEvent[] = [
      ev({ type: "page_view", sessionId: "s_exp_real", timestamp: "2026-01-01T09:00:00.000Z", path: "/software/x" }),
      ev({ type: "engaged_view", sessionId: "s_exp_real", timestamp: "2026-01-01T09:00:12.000Z", path: "/software/x" }),
      ev({ type: "cta_impression", sessionId: "s_exp_real", timestamp: "2026-01-01T09:00:20.000Z", path: "/software/x", experimentId: "software-cta-copy-v1", variant: "treatment" } as never),
      ev({ type: "outbound_click", sessionId: "s_exp_real", timestamp: "2026-01-01T09:00:25.000Z", path: "/software/x", experimentId: "software-cta-copy-v1", variant: "treatment" } as never),
    ];
    const [c] = classifySessions(events);
    expect(c!.bucket).toBe("CONFIRMED_CLEAN");
    expect(c!.isPartOfBurst).toBe(false);
  });
});
