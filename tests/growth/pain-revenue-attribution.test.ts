import { describe, expect, it } from "vitest";
import {
  summarizePainRevenueAttribution,
  type PainRevenueEvent,
} from "@/lib/growth/pain-revenue-attribution";

function event(overrides: Partial<PainRevenueEvent> = {}): PainRevenueEvent {
  return {
    id: "network-event-1",
    painCandidateId: "pain-1",
    partnerSlug: "krispcall",
    sourcePage: "/software/krispcall",
    network: "partnerstack",
    conversionAt: "2026-08-26T10:00:00.000Z",
    observedAt: "2026-08-26T10:05:00.000Z",
    status: "APPROVED",
    commission: { amount: 25, currency: "USD" },
    evidence: {
      source: "NETWORK_EXPORT",
      reference: "partnerstack-export-row-42",
      verifiedAt: "2026-08-26T10:06:00.000Z",
    },
    ...overrides,
  };
}

describe("Pain Radar revenue attribution", () => {
  it("distinguishes an absent integration from a connected zero-event result", () => {
    expect(summarizePainRevenueAttribution(undefined, "pain-1")).toMatchObject({
      integrationState: "NOT_CONNECTED",
      verifiedConversions: 0,
      approvedCommissionByCurrency: [],
    });

    expect(
      summarizePainRevenueAttribution(
        { integrationState: "CONNECTED_NO_EVENTS", events: [] },
        "pain-1",
      ),
    ).toMatchObject({
      integrationState: "CONNECTED_NO_EVENTS",
      verifiedConversions: 0,
      approvedCommissionByCurrency: [],
    });
  });

  it("counts only evidenced, candidate-matched events and deduplicates network ids", () => {
    const approved = event();
    const duplicate = event();
    const pending = event({
      id: "network-event-2",
      status: "PENDING",
      commission: { amount: 10, currency: "USD" },
    });
    const paidEur = event({
      id: "network-event-3",
      status: "PAID",
      commission: { amount: 12.5, currency: "EUR" },
    });
    const rejected = event({
      id: "network-event-4",
      status: "REJECTED",
      commission: { amount: 99, currency: "USD" },
    });
    const wrongCandidate = event({
      id: "network-event-5",
      painCandidateId: "another-pain",
    });

    const summary = summarizePainRevenueAttribution(
      {
        integrationState: "VERIFIED_EVENTS",
        events: [approved, duplicate, pending, paidEur, rejected, wrongCandidate],
      },
      "pain-1",
    );

    expect(summary.integrationState).toBe("VERIFIED_EVENTS");
    expect(summary.validEventCount).toBe(4);
    expect(summary.verifiedConversions).toBe(3);
    expect(summary.pendingCommissionEvents).toBe(1);
    expect(summary.rejectedEvents).toBe(1);
    expect(summary.approvedCommissionByCurrency).toEqual([
      { currency: "EUR", amount: 12.5 },
      { currency: "USD", amount: 25 },
    ]);
  });

  it("never reports events while the integration is explicitly not connected", () => {
    const summary = summarizePainRevenueAttribution(
      { integrationState: "NOT_CONNECTED", events: [event()] },
      "pain-1",
    );

    expect(summary).toMatchObject({
      integrationState: "NOT_CONNECTED",
      verifiedConversions: 0,
      approvedCommissionByCurrency: [],
      validEventCount: 0,
    });
  });

  it("fails closed when an event lacks verifiable evidence or a valid commission", () => {
    const invalidEvidence = event({
      id: "bad-evidence",
      evidence: {
        source: "NETWORK_EXPORT",
        reference: "",
        verifiedAt: "2026-08-26T10:06:00.000Z",
      },
    });
    const invalidCommission = event({
      id: "bad-commission",
      commission: { amount: 25, currency: "usd" },
    });

    const summary = summarizePainRevenueAttribution(
      {
        integrationState: "VERIFIED_EVENTS",
        events: [invalidEvidence, invalidCommission],
      },
      "pain-1",
    );

    expect(summary.integrationState).toBe("CONNECTED_NO_EVENTS");
    expect(summary.validEventCount).toBe(0);
    expect(summary.approvedCommissionByCurrency).toEqual([]);
  });
});
