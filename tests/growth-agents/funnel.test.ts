import { describe, expect, it } from "vitest";
import type { FirstPartyEvent } from "@/lib/analytics/events";
import { measured } from "@/lib/growth-agents/evidence";
import { NO_NETWORK_OUTCOMES, funnelFromEvents, summarizeFunnel, unavailableFunnel } from "@/lib/growth-agents/funnel";
import { PROV } from "./fixtures";

/**
 * Sessions are spaced ten minutes apart so the repository's burst detector (three or more untagged
 * sessions starting within 15 seconds, or on one path within five minutes) never fires by accident.
 */
let clock = 0;
function at(offsetSeconds = 0): string {
  return new Date(Date.parse("2026-09-20T10:00:00Z") + clock * 600_000 + offsetSeconds * 1000).toISOString();
}

type Base = { sessionId: string; visitorId: string; path?: string; isTest?: boolean };

const pageView = (b: Base, offset = 0): FirstPartyEvent => ({ type: "page_view", sessionId: b.sessionId, visitorId: b.visitorId, timestamp: at(offset), path: b.path ?? "/software/alpha", ...(b.isTest === undefined ? {} : { isTest: b.isTest }) });
const softwareView = (b: Base, offset = 1): FirstPartyEvent => ({ type: "software_view", softwareSlug: "alpha", sessionId: b.sessionId, visitorId: b.visitorId, timestamp: at(offset), path: b.path ?? "/software/alpha", ...(b.isTest === undefined ? {} : { isTest: b.isTest }) });
const click = (b: Base, destination: "affiliate" | "official", offset = 8): FirstPartyEvent => ({ type: "outbound_click", softwareSlug: "alpha", destination, url: "https://partner.example/r/abc", sessionId: b.sessionId, visitorId: b.visitorId, timestamp: at(offset), path: b.path ?? "/software/alpha", ...(b.isTest === undefined ? {} : { isTest: b.isTest }) });

const prov = { source: "test", locator: "fixture", capturedAt: "2026-09-21T00:00:00Z" };
const summarize = (events: FirstPartyEvent[], window: { start: string; end: string } | null = null) => summarizeFunnel(events, prov, window);

function newSession(label: string, isTest?: boolean): Base {
  clock += 1;
  return { sessionId: `s_${label}`, visitorId: `v_${label}`, ...(isTest === undefined ? {} : { isTest }) };
}

describe("a partner click is human-qualified only with evidence", () => {
  it("counts a real visitor who viewed the product and then clicked the partner link", () => {
    const s = newSession("real1", false);
    const summary = summarize([pageView(s), softwareView(s), click(s, "affiliate")]);
    expect(summary.outbound.partnerClicksHumanQualified).toBe(1);
    expect(summary.sessions.humanQualified).toBe(1);
    expect(summary.engagedDecisionSessions).toBe(1);
  });

  it("does not count a click that has no earlier funnel event (a bare POST to the public endpoint proves nothing)", () => {
    const s = newSession("bare1", false);
    const summary = summarize([click(s, "affiliate")]);
    expect(summary.outbound.partnerClicksHumanQualified).toBe(0);
    expect(summary.outbound.partnerClicksNotQualified).toBe(1);
  });

  it("keeps clicks whose test marker is absent out of the qualified count", () => {
    const s = newSession("nomark1");
    const summary = summarize([pageView(s), softwareView(s), click(s, "affiliate")]);
    expect(summary.outbound.partnerClicksHumanQualified).toBe(0);
    expect(summary.outbound.partnerClicksUnclassifiedMarker).toBe(1);
  });

  it("reports test clicks separately and never as visits", () => {
    const s = newSession("qa1", true);
    const summary = summarize([pageView(s), softwareView(s), click(s, "affiliate")]);
    expect(summary.outbound.partnerClicksTest).toBe(1);
    expect(summary.outbound.partnerClicksHumanQualified).toBe(0);
    expect(summary.sessions.knownQa).toBe(1);
    expect(summary.sessions.humanQualified).toBe(0);
    expect(summary.engagedDecisionSessions).toBe(0);
  });

  it("treats synthetic identifiers as QA even when the test marker is missing", () => {
    const s: Base = { sessionId: "s_test_probe", visitorId: "v_test_probe" };
    clock += 1;
    const summary = summarize([pageView(s), softwareView(s), click(s, "affiliate")]);
    expect(summary.sessions.knownQa).toBe(1);
    expect(summary.outbound.partnerClicksHumanQualified).toBe(0);
    expect(summary.outbound.partnerClicksNotQualified).toBe(1);
  });

  it("does not let one synthetic event in a session qualify its other events", () => {
    const s = newSession("mixed1", false);
    const summary = summarize([pageView(s), { ...softwareView(s), isTest: true }, click(s, "affiliate")]);
    expect(summary.sessions.knownQa).toBe(1);
    expect(summary.outbound.partnerClicksHumanQualified).toBe(0);
  });

  it("excludes a burst of identical single-page sessions (synthetic traffic shape) from the qualified count", () => {
    const events: FirstPartyEvent[] = [];
    for (let i = 0; i < 4; i += 1) {
      const s: Base = { sessionId: `s_burst${i}`, visitorId: `v_burst${i}`, isTest: false };
      events.push(pageView(s, i * 20), click(s, "affiliate", i * 20 + 5));
    }
    const summary = summarize(events);
    expect(summary.outbound.partnerClicksHumanQualified).toBe(0);
    expect(summary.outbound.partnerClicksNotQualified).toBe(4);
    expect(summary.sessions.automationOrSuspicious).toBe(4);
  });

  it("counts official-site clicks on their own line", () => {
    const s = newSession("off1", false);
    const summary = summarize([pageView(s), softwareView(s), click(s, "official")]);
    expect(summary.outbound.officialSiteClicks).toBe(1);
    expect(summary.outbound.partnerClicksHumanQualified).toBe(0);
  });

  it("limits the count to the requested window", () => {
    const inside = newSession("in1", false);
    const events = [pageView(inside), softwareView(inside), click(inside, "affiliate")];
    const day = events[0]!.timestamp.slice(0, 10);
    expect(summarize(events, { start: day, end: day }).outbound.partnerClicksHumanQualified).toBe(1);
    expect(summarize(events, { start: "2026-09-21", end: "2026-09-22" }).outbound.partnerClicksHumanQualified).toBe(0);
    expect(summarize(events, { start: "2026-09-21", end: "2026-09-22" }).sessions.total).toBe(0);
  });
});

describe("clicks, conversions, commissions and payouts are separate facts", () => {
  it("reports every click as a click and leaves the network stages NOT_MEASURED", () => {
    const s = newSession("sep1", false);
    const summary = summarize([pageView(s), softwareView(s), click(s, "affiliate")]);
    expect(summary.outbound.partnerClicksHumanQualified).toBe(1);
    expect(summary.outcomes).toEqual(NO_NETWORK_OUTCOMES);
    expect(summary.outcomes.conversions.state).toBe("NOT_MEASURED");
    expect(summary.outcomes.approvedCommissions.state).toBe("NOT_MEASURED");
    expect(summary.outcomes.payoutsReceived.state).toBe("NOT_MEASURED");
    expect(summary.notes.join(" ")).toMatch(/A partner click is not a conversion/);
  });

  it("does not derive a conversion count from clicks, or clicks from a conversion count", () => {
    const outcomes = {
      conversions: measured(3, prov),
      approvedCommissions: measured([{ currency: "USD", amount: 41.5 }, { currency: "EUR", amount: 10 }], prov),
      payoutsReceived: measured([{ currency: "USD", amount: 0 }], prov),
    };
    const none = summarizeFunnel([], prov, null, outcomes);
    expect(none.outbound.partnerClicksHumanQualified).toBe(0);
    expect(none.outcomes.conversions).toMatchObject({ state: "MEASURED", value: 3 });
    // Currencies stay separate; a payout of zero is a measured zero, not a missing value.
    expect(none.outcomes.approvedCommissions).toMatchObject({ value: [{ currency: "USD", amount: 41.5 }, { currency: "EUR", amount: 10 }] });
    expect(none.outcomes.payoutsReceived).toMatchObject({ state: "MEASURED", value: [{ currency: "USD", amount: 0 }] });

    const s = newSession("sep2", false);
    const withClicks = summarizeFunnel([pageView(s), softwareView(s), click(s, "affiliate")], prov, null);
    expect(withClicks.outcomes.conversions.state).toBe("NOT_MEASURED");
  });

  it("has no field for search impressions or search clicks: they come from a different system", () => {
    const keys = (value: unknown): string[] =>
      value && typeof value === "object" ? Object.entries(value).flatMap(([key, inner]) => [key, ...keys(inner)]) : [];
    const summary = summarize([]);
    expect(keys(summary).filter((key) => /impression|searchClick|ctr|position/i.test(key))).toEqual([]);
    expect(summary.notes.join(" ")).toMatch(/different system/);
  });
});

describe("funnel evidence wrappers", () => {
  it("is UNAVAILABLE, with a reason and no numbers, when no event export was read", () => {
    const funnel = unavailableFunnel("no export");
    expect(funnel).toEqual({ state: "UNAVAILABLE", reason: "no export" });
    expect("value" in funnel).toBe(false);
  });

  it("is MEASURED, carrying its provenance, when events were read", () => {
    const funnel = funnelFromEvents([], PROV, null);
    expect(funnel.state).toBe("MEASURED");
    expect(funnel.state === "MEASURED" && funnel.provenance).toEqual(PROV);
    expect(funnel.state === "MEASURED" && funnel.value.sessions.total).toBe(0);
  });
});
