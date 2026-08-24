import { describe, it, expect } from "vitest";
import { summarizeOutboundEventsByProduct, type StoredOutboundEvent } from "@/lib/revenue/events";

/**
 * MILOOSH REVENUE WAR MISSION (2026-08-24) — regression suite for the
 * real gap fixed in summarizeOutboundEventsByProduct: it previously
 * counted isTest QA-verification clicks identically to real human
 * clicks in the one internal report meant to answer "did a real click
 * happen." A real first conversion could have gone unnoticed inside
 * routine ?qa=1 verification noise.
 */
function event(overrides: Partial<StoredOutboundEvent> = {}): StoredOutboundEvent {
  return {
    type: "affiliate_link_click",
    softwareSlug: "pipedrive",
    destination: "affiliate",
    url: "https://example.com",
    sourcePage: "/software/pipedrive",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("summarizeOutboundEventsByProduct", () => {
  it("excludes isTest events from officialClicks/affiliateClicks/vendorLinkClicks/totalClicks", () => {
    const [row] = summarizeOutboundEventsByProduct([event({ isTest: true })]);
    expect(row!.affiliateClicks).toBe(0);
    expect(row!.totalClicks).toBe(0);
  });

  it("reports isTest events transparently in testClicks rather than discarding them", () => {
    const [row] = summarizeOutboundEventsByProduct([event({ isTest: true }), event({ isTest: true })]);
    expect(row!.testClicks).toBe(2);
  });

  it("counts a real, non-test event into the real totals", () => {
    const [row] = summarizeOutboundEventsByProduct([event({ isTest: false })]);
    expect(row!.affiliateClicks).toBe(1);
    expect(row!.totalClicks).toBe(1);
    expect(row!.testClicks).toBe(0);
  });

  it("correctly separates real and test clicks within the same product", () => {
    const [row] = summarizeOutboundEventsByProduct([
      event({ isTest: false }),
      event({ isTest: true }),
      event({ isTest: true }),
    ]);
    expect(row!.totalClicks).toBe(1);
    expect(row!.testClicks).toBe(2);
  });

  it("classifies official_site_click and vendor_link_click types correctly when real", () => {
    const rows = summarizeOutboundEventsByProduct([
      event({ type: "official_site_click", isTest: false }),
      event({ type: "vendor_link_click", isTest: false }),
    ]);
    const row = rows[0]!;
    expect(row.officialClicks).toBe(1);
    expect(row.vendorLinkClicks).toBe(1);
    expect(row.affiliateClicks).toBe(0);
  });

  it("groups by softwareSlug and sorts by descending real totalClicks", () => {
    const rows = summarizeOutboundEventsByProduct([
      event({ softwareSlug: "airtable", isTest: false }),
      event({ softwareSlug: "pipedrive", isTest: false }),
      event({ softwareSlug: "pipedrive", isTest: false }),
    ]);
    expect(rows[0]!.softwareSlug).toBe("pipedrive");
    expect(rows[0]!.totalClicks).toBe(2);
    expect(rows[1]!.softwareSlug).toBe("airtable");
    expect(rows[1]!.totalClicks).toBe(1);
  });

  it("returns an empty array for an empty event list, never a crash", () => {
    expect(summarizeOutboundEventsByProduct([])).toEqual([]);
  });
});
