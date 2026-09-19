import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
import { analyticsLocalPath } from "@/lib/analytics/local-store-path";
import fs from "node:fs";
import path from "node:path";
import { trackSoftwareCtaClick, trackVendorLinkClick } from "@/lib/revenue/click-tracker";
import { getOutboundEvents } from "@/lib/revenue/events";
import { getSoftware } from "@/data/software";
import { WIX_FUNNELS } from "@/lib/wix-funnels";

/**
 * 2026-08-17 — coverage for the multi-dimension click tracking
 * (affiliateProgram/affiliateFunnel/campaignId/network/ctaLocation)
 * added for Wix's four Impact.com funnels.
 *
 * 2026-08-19 (Phase 11 Blob migration) — this test process never sets
 * BLOB_READ_WRITE_TOKEN (vitest.config.mts doesn't load .env.local), so
 * every call here exercises the local-file fallback path in
 * lib/revenue/events.ts, never the real production Blob store. Same
 * isolation discipline as before: force the tracking flag on, point at a
 * throwaway log file, clean up after.
 */

const LOG_FILE = analyticsLocalPath("outbound-clicks.json");

let realBackup: string | null = null;
let realFlag: string | undefined;

beforeAll(() => {
  realBackup = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf-8") : null;
  realFlag = process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
  process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = "true";
});

beforeEach(() => {
  fs.rmSync(LOG_FILE, { force: true });
});

afterEach(() => {
  vi.restoreAllMocks();
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

describe("trackSoftwareCtaClick — Wix funnel dimensions", () => {
  it("records affiliateProgram/affiliateFunnel/campaignId/network for a Website Builder click", async () => {
    const wix = getSoftware("wix")!;
    await trackSoftwareCtaClick(wix, WIX_FUNNELS["website-builder"].url, "/software/wix", "software-page-cta");
    const [event] = await getOutboundEvents();
    expect(event.affiliateProgram).toBe("wix");
    expect(event.affiliateFunnel).toBe("website-builder");
    expect(event.campaignId).toBe("2096727");
    expect(event.network).toBe("impact");
    expect(event.ctaLocation).toBe("software-page-cta");
  });

  it("records the Headless funnel's own campaign id when that's the resolved URL", async () => {
    const wix = getSoftware("wix")!;
    await trackSoftwareCtaClick(wix, WIX_FUNNELS.headless.url, "/compare/wix-vs-contentful", "compare-page-choose-card");
    const [event] = await getOutboundEvents();
    expect(event.affiliateFunnel).toBe("headless");
    expect(event.campaignId).toBe("3972832");
  });

  it("records the eCommerce and Domain funnels correctly too", async () => {
    const wix = getSoftware("wix")!;
    await trackSoftwareCtaClick(wix, WIX_FUNNELS.ecommerce.url, "/software/wix");
    await trackSoftwareCtaClick(wix, WIX_FUNNELS.domain.url, "/software/wix");
    const events = await getOutboundEvents();
    const funnels = events.map((e) => e.affiliateFunnel).sort();
    expect(funnels).toEqual(["domain", "ecommerce"]);
  });

  it("does not attach Wix-funnel dimensions to a non-Wix affiliate click", async () => {
    const elevenlabs = getSoftware("elevenlabs")!;
    await trackSoftwareCtaClick(elevenlabs, "https://try.elevenlabs.io/gkp73pehjgtl", "/software/elevenlabs", "software-page-cta");
    const [event] = await getOutboundEvents();
    expect(event.softwareSlug).toBe("elevenlabs");
    expect(event.affiliateProgram).toBeUndefined();
    expect(event.affiliateFunnel).toBeUndefined();
  });

  it("records KrispCall's canonical affiliate destination and CTA location", async () => {
    const krispcall = getSoftware("krispcall")!;
    const affiliateUrl = "https://try.krispcall.com/aikpbrrrl8k9";
    await trackSoftwareCtaClick(krispcall, affiliateUrl, "/software/krispcall", "software-page-cta");

    const [event] = await getOutboundEvents();
    expect(event).toMatchObject({
      type: "affiliate_link_click",
      softwareSlug: "krispcall",
      destination: "affiliate",
      url: affiliateUrl,
      sourcePage: "/software/krispcall",
      ctaLocation: "software-page-cta",
    });
  });

  it("a single affiliate CTA click emits exactly one event, never zero or duplicated", async () => {
    const todoist = getSoftware("todoist")!;
    await trackSoftwareCtaClick(todoist, "https://get.todoist.io/dobo71f2y038", "/software/todoist", "software-page-cta");
    expect(await getOutboundEvents()).toHaveLength(1);

    // A second, distinct click adds exactly one more — proves events
    // accumulate cleanly rather than the log being rewritten/deduped away.
    await trackSoftwareCtaClick(todoist, "https://get.todoist.io/dobo71f2y038", "/compare/todoist-vs-airtable", "compare-page-choose-card");
    expect(await getOutboundEvents()).toHaveLength(2);
  });

  it("one call to the tracking handler writes exactly once — no accidental double-persist per request", async () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync");
    const todoist = getSoftware("todoist")!;

    await trackSoftwareCtaClick(todoist, "https://get.todoist.io/dobo71f2y038", "/software/todoist", "software-page-cta");

    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(await getOutboundEvents()).toHaveLength(1);
  });

  it("never records secrets or unrelated personal data — only the documented dimensions", async () => {
    const wix = getSoftware("wix")!;
    await trackSoftwareCtaClick(wix, WIX_FUNNELS["website-builder"].url, "/software/wix", "software-page-cta");
    const [event] = await getOutboundEvents();
    const keys = Object.keys(event).sort();
    // "isTest" added by the Analytics Zero-Drop Production Proof Mega Mission
    // (2026-08-21) Phase 11 — a boolean synthetic-QA marker, not PII.
    expect(keys).toEqual(["affiliateFunnel", "affiliateProgram", "campaignId", "ctaLocation", "destination", "network", "softwareSlug", "sourcePage", "timestamp", "type", "url"]);
  });

  it("a plain official-site click (no affiliate link) carries no affiliate dimensions", async () => {
    const wordpress = getSoftware("wordpress")!;
    await trackSoftwareCtaClick(wordpress, wordpress.website, "/software/wordpress");
    const [event] = await getOutboundEvents();
    expect(event.destination).toBe("official");
    expect(event.affiliateProgram).toBeUndefined();
  });

  it("Brevo (rejected) tracks as an official-site click, never affiliate", async () => {
    const brevo = getSoftware("brevo")!;
    await trackSoftwareCtaClick(brevo, brevo.website, "/software/brevo", "software-page-cta");
    const [event] = await getOutboundEvents();
    expect(event.type).toBe("official_site_click");
    expect(event.destination).toBe("official");
    expect(event.url).toBe(brevo.website);
  });

  it("Miro (hold/unclear) tracks as an official-site click, never affiliate", async () => {
    const miro = getSoftware("miro")!;
    await trackSoftwareCtaClick(miro, miro.website, "/software/miro", "software-page-cta");
    const [event] = await getOutboundEvents();
    expect(event.type).toBe("official_site_click");
    expect(event.destination).toBe("official");
    expect(event.url).toBe(miro.website);
  });

  it("disabled tracking remains a true no-op — nothing persisted, no throw", async () => {
    const original = process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
    delete process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
    try {
      const todoist = getSoftware("todoist")!;
      await expect(
        trackSoftwareCtaClick(todoist, "https://get.todoist.io/dobo71f2y038", "/software/todoist", "software-page-cta")
      ).resolves.toBeUndefined();
      expect(await getOutboundEvents()).toHaveLength(0);
    } finally {
      if (original !== undefined) process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = original;
    }
  });

  it("a persistence failure (write throws) is swallowed — the request never sees it", async () => {
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => {
      throw new Error("simulated disk failure");
    });
    const todoist = getSoftware("todoist")!;

    await expect(
      trackSoftwareCtaClick(todoist, "https://get.todoist.io/dobo71f2y038", "/software/todoist", "software-page-cta")
    ).resolves.toBeUndefined();
  });
});

describe("trackVendorLinkClick — unaffected by the new dimensions", () => {
  it("still records a plain vendor-link event", async () => {
    const wix = getSoftware("wix")!;
    await trackVendorLinkClick(wix, wix.website, "/software/wix");
    const [event] = await getOutboundEvents();
    expect(event.type).toBe("vendor_link_click");
    expect(event.affiliateProgram).toBeUndefined();
  });
});
