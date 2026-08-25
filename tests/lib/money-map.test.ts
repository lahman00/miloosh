import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildMoneyMap, summarizeMoneyMapOutboundEvents } from "@/lib/revenue/money-map";
import type { StoredOutboundEvent } from "@/lib/revenue/events";

/**
 * Phase 12 — tests run without BLOB_READ_WRITE_TOKEN or
 * GOOGLE_SEARCH_CONSOLE_* set (vitest.config.mts doesn't load .env.local),
 * so every run here exercises the real "GSC unavailable" / local-fallback
 * click-log path — never a live network call.
 */

const LOG_FILE = path.join(process.cwd(), "var", "outbound-clicks.json");
let realBackup: string | null = null;
let realFlag: string | undefined;

beforeAll(() => {
  realBackup = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf-8") : null;
  realFlag = process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
  fs.rmSync(LOG_FILE, { force: true });
});

afterAll(() => {
  if (realBackup !== null) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(LOG_FILE, realBackup);
  } else {
    fs.rmSync(LOG_FILE, { force: true });
  }
  if (realFlag !== undefined) process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = realFlag;
  else delete process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
});

function outbound(overrides: Partial<StoredOutboundEvent> = {}): StoredOutboundEvent {
  return {
    type: "affiliate_link_click",
    softwareSlug: "pipedrive",
    destination: "affiliate",
    url: "https://example.test/pipedrive",
    sourcePage: "/software/pipedrive",
    timestamp: "2026-08-25T08:00:00.000Z",
    ...overrides,
  };
}

describe("Money Map outbound-log truth", () => {
  it("excludes QA/test events from all page click metrics while preserving an excluded count", () => {
    const summary = summarizeMoneyMapOutboundEvents([
      outbound(),
      outbound({ isTest: true, timestamp: "2026-08-25T08:00:01.000Z" }),
      outbound({ type: "official_site_click", destination: "official", sourcePage: "/software/pipedrive", timestamp: "2026-08-25T08:00:02.000Z" }),
    ]);

    expect(summary.nonTestEvents).toBe(2);
    expect(summary.excludedTestEvents).toBe(1);
    expect(summary.clicksBySourcePage.get("/software/pipedrive")).toEqual({
      affiliateClicks: 1,
      officialClicks: 1,
      totalClicks: 2,
    });
  });

  it("never lets a test-only page appear to have outbound evidence", () => {
    const summary = summarizeMoneyMapOutboundEvents([
      outbound({ isTest: true, sourcePage: "/compare/pipedrive-vs-hubspot" }),
    ]);
    expect(summary.nonTestEvents).toBe(0);
    expect(summary.excludedTestEvents).toBe(1);
    expect(summary.clicksBySourcePage.has("/compare/pipedrive-vs-hubspot")).toBe(false);
  });
});

describe("buildMoneyMap", () => {
  it("analyzes every software and published comparison page exactly once", async () => {
    const data = await buildMoneyMap();
    expect(data.totalPagesAnalyzed).toBeGreaterThan(1000);
    const urls = data.pages.map((p) => p.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("marks Search Console as unavailable in this environment, never fakes a neutral score", async () => {
    const data = await buildMoneyMap();
    expect(data.gscFetchAvailability).toBe("unavailable");
    for (const page of data.pages) {
      const searchVisibility = page.scoreComponents.find((c) => c.label === "Search visibility (impressions)")!;
      expect(searchVisibility.value).toBeNull();
      expect(searchVisibility.availability).toBe("unavailable");
    }
  });

  it("never lets an unavailable component silently become a neutral score value", async () => {
    const data = await buildMoneyMap();
    for (const page of data.pages) {
      for (const component of page.scoreComponents) {
        if (component.availability === "unavailable") {
          expect(component.value).toBeNull();
        }
      }
    }
  });

  it("Brevo's software page shows no active affiliate coverage", async () => {
    const data = await buildMoneyMap();
    const brevo = data.pages.find((p) => p.url === "/software/brevo");
    expect(brevo).toBeDefined();
    expect(brevo!.monetizationCoverage).toBe("none");
    expect(brevo!.products[0]!.affiliateStatus).toBe("not-active");
  });

  it("Miro's software page shows no active affiliate coverage", async () => {
    const data = await buildMoneyMap();
    const miro = data.pages.find((p) => p.url === "/software/miro");
    expect(miro).toBeDefined();
    expect(miro!.monetizationCoverage).toBe("none");
    expect(miro!.products[0]!.affiliateStatus).toBe("not-active");
  });

  it("a comparison with one active partner and one non-partner is classified 'one' coverage and bucket D", async () => {
    const data = await buildMoneyMap();
    const page = data.pages.find((p) => p.url === "/compare/hubspot-vs-pipedrive");
    expect(page).toBeDefined();
    expect(page!.monetizationCoverage).toBe("one");
    expect(page!.bucket).toBe("D");
  });

  it("a software page for an active partner is always monetized", async () => {
    const data = await buildMoneyMap();
    const todoist = data.pages.find((p) => p.url === "/software/todoist");
    expect(todoist).toBeDefined();
    expect(todoist!.monetizationCoverage).toBe("both");
    expect(todoist!.products[0]!.affiliateStatus).toBe("active");
  });

  it("outbound-log evidence reflects the isolated store, not a fabricated count", async () => {
    const data = await buildMoneyMap();
    for (const page of data.pages) {
      expect(page.clicks.totalClicks).toBe(0);
    }
    expect(data.totalOutboundEventsSitewide).toBe(0);
    expect(data.totalTestOutboundEventsSitewide).toBe(0);
  });

  it("labels the score component as non-test outbound-log evidence rather than human evidence", async () => {
    const data = await buildMoneyMap();
    const component = data.pages[0]!.scoreComponents.find((c) => c.label === "Non-test outbound-log evidence");
    expect(component).toBeDefined();
    expect(component!.note.toLowerCase()).toContain("not human-qualified");
  });

  it("pages are sorted by Money Score, highest first", async () => {
    const data = await buildMoneyMap();
    for (let i = 1; i < data.pages.length; i++) {
      expect(data.pages[i - 1]!.moneyScore).toBeGreaterThanOrEqual(data.pages[i]!.moneyScore);
    }
  });

  it("a page with zero available score components scores 0, not a fabricated value", async () => {
    const data = await buildMoneyMap();
    const allUnavailable = data.pages.find((p) => p.componentsAvailable === 0);
    if (allUnavailable) {
      expect(allUnavailable.moneyScore).toBe(0);
    }
  });
});
