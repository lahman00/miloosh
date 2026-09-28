import fs from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as analytics } from "@/app/api/analytics/event/route";
import { POST as outbound } from "@/app/api/outbound-click/route";
import { analyticsLocalPath } from "@/lib/analytics/local-store-path";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { getOutboundEvents } from "@/lib/revenue/events";
import { getSoftware } from "@/data/software";
import { getSoftwareCtaUrl } from "@/lib/affiliate";

// The shared test setup removes the Blob credential and provides a disposable
// per-file store. These requests invoke real handlers, not network endpoints.
const originalFlag = process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
beforeEach(() => {
  expect(process.env.BLOB_READ_WRITE_TOKEN).toBeUndefined();
  expect(process.env.MILOOSH_ANALYTICS_TEST_DIR).toBeTruthy();
  process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = "true";
  for (const name of ["first-party-analytics.json", "outbound-clicks.json"] as const) {
    fs.rmSync(analyticsLocalPath(name), { force: true });
  }
});
afterAll(() => {
  if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED;
  else process.env.NEXT_PUBLIC_REVENUE_TRACKING_ENABLED = originalFlag;
});

const slugs = ["airtable", "todoist", "close", "setmore", "elevenlabs"];
const placements = ["money-page-sticky-cta", "money-page-decision-card", "software-page-cta", "pricing-section-cta"];
function request(endpoint: string, page: string, body: unknown) {
  return new NextRequest(`http://localhost:3352/api/${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json", origin: "http://localhost:3352",
      referer: `http://localhost:3352${page}?qa=1`,
      "user-agent": "Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(body),
  });
}

describe("five-page page → exposure → activation → durable handoff contract", () => {
  it.each(slugs.flatMap(slug => placements.map(ctaLocation => ({ slug, ctaLocation }))))(
    "$slug / $ctaLocation preserves attribution in BOTH stores without merchant navigation",
    async ({ slug, ctaLocation }) => {
      const page = `/software/${slug}`;
      const acquisition = {
        sessionId: "s_local_journey", landingPath: page, capturedAt: new Date().toISOString(),
        trafficSource: "organic_search", referrerHost: "www.google.com",
        utmSource: "google", utmMedium: "organic", utmCampaign: "local_contract_only",
      };
      const identity = { visitorId: "v_local_journey", sessionId: acquisition.sessionId, acquisition, isTest: true };
      const clickId = `click_${slug}_${ctaLocation}`;
      for (const type of ["page_view", "cta_impression", "cta_click"]) {
        const eventId = type === "cta_click" ? clickId : `${type}_${slug}_${ctaLocation}`;
        const response = await analytics(request("analytics/event", page, {
          ...identity, type, eventId, path: page, softwareSlug: slug, ctaLocation,
        }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ recorded: true, classification: "SYNTHETIC_QA" });
      }
      const body = { ...identity, slug, kind: "cta", eventId: clickId, ctaLocation, sourcePage: page };
      // Simultaneous delivery replay must not create a second handoff in either
      // sink. cta_click and outbound_click remain separate funnel stages.
      const responses = await Promise.all([1, 2].map(() => outbound(request("outbound-click", page, body))));
      for (const response of responses) {
        expect(response.status).toBe(202);
        expect(await response.json()).toMatchObject({ recorded: true, sinks: { firstParty: "RECORDED", legacy: "RECORDED" } });
      }
      const firstParty = await getAllFirstPartyEvents();
      expect(firstParty.map(event => event.type).sort()).toEqual(["cta_click", "cta_impression", "outbound_click", "page_view"]);
      for (const event of firstParty) expect(event).toMatchObject({ ...identity, path: page, ctaLocation });
      const destination = getSoftwareCtaUrl(getSoftware(slug)!, ctaLocation === "software-page-cta" ? undefined : "pricing");
      expect(firstParty.find(event => event.type === "outbound_click")).toMatchObject({
        eventId: clickId, url: destination, destination: "affiliate", softwareSlug: slug,
      });
      const legacy = await getOutboundEvents();
      expect(legacy).toHaveLength(1);
      expect(legacy[0]).toMatchObject({
        ...identity, eventId: clickId, sourcePage: page, ctaLocation,
        softwareSlug: slug, url: destination, destination: "affiliate",
      });
    },
  );
});
