import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

vi.unmock("@/lib/deployment/mutation-policy");
const storage = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), del: vi.fn(), list: vi.fn() }));
vi.mock("@vercel/blob", () => storage);
import { ACTIVE_DEPLOYMENT_PATH, getMutationPolicy, ReadOnlyDeploymentError } from "@/lib/deployment/mutation-policy";
import { recordFirstPartyEvent } from "@/lib/analytics/events";
import { recordOutboundEvent } from "@/lib/revenue/events";
import { recordRecommendationEvent } from "@/lib/recommend/events";
import { recordInboundSocialEvent } from "@/lib/social/attribution";
import { recordNewsletterLead, unsubscribeByToken } from "@/lib/newsletter/leads";
import { writeQueue } from "@/lib/social/queue";
import { claimLinkedInDelivery, recordLinkedInDelivery, releaseLinkedInDelivery } from "@/lib/social/linkedin-delivery-claims";
import * as seo from "@/lib/seo-factory/store";
import { ADAPTERS } from "@/lib/social/channels/registry";
import { runPublishCycle } from "@/lib/social/publish";
import { runScheduleCycle } from "@/lib/social/schedule";
import UnsubscribePage from "@/app/newsletter/unsubscribe/page";
import { GET as runtimeMode } from "@/app/api/runtime-mode/route";

const control = { schemaVersion: 1, activeDeploymentId: "dpl_active" };
const variant = { text: "Miro or Lucidchart?", link: "https://miloosh.com/compare/miro-vs-lucidchart", imageUrl: null, altText: null, hashtags: [], publishResult: null };
const event = { type: "page_view" as const, path: "/", visitorId: "v_fixture", sessionId: "s_fixture", timestamp: "2026-10-13T00:00:00Z" };
function result(value: unknown) { return { statusCode: 200, stream: new Response(JSON.stringify(value)).body }; }

beforeEach(() => {
  vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("VERCEL_DEPLOYMENT_ID", "dpl_candidate");
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "fake-test-token"); vi.stubEnv("NEXT_PUBLIC_REVENUE_TRACKING_ENABLED", "true");
  vi.stubEnv("CRON_SECRET", "fake-secret"); vi.stubEnv("SOCIAL_MANUAL_PUBLISH_SECRET", "fake-secret");
  vi.stubEnv("MAKE_LINKEDIN_WEBHOOK_SECRET", "fake-secret");
  storage.get.mockReset().mockImplementation(async pathname => pathname === ACTIVE_DEPLOYMENT_PATH ? result(control) : null);
  storage.put.mockReset().mockResolvedValue({}); storage.del.mockReset(); storage.list.mockReset();
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected external request in isolated test"));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function noSideEffects() { expect(storage.put).not.toHaveBeenCalled(); expect(storage.del).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); }

import * as route0 from "@/app/api/analytics/event/route";
import * as route1 from "@/app/api/outbound-click/route";
import * as route2 from "@/app/api/recommendation-click/route";
import * as route3 from "@/app/api/social/landing/route";
import * as route4 from "@/app/api/newsletter/subscribe/route";
import * as route5 from "@/app/api/cron/social-schedule/route";
import * as route6 from "@/app/api/cron/social-publish/route";
import * as route7 from "@/app/api/cron/seo-factory/route";
import * as route8 from "@/app/api/social/publish-entry/route";
import * as route9 from "@/app/api/social/make/linkedin-result/route";
const handlers = { "analytics/event": route0, "outbound-click": route1, "recommendation-click": route2, "social/landing": route3, "newsletter/subscribe": route4, "cron/social-schedule": route5, "cron/social-publish": route6, "cron/seo-factory": route7, "social/publish-entry": route8, "social/make/linkedin-result": route9 };

const routes = [
  ["analytics/event", "POST"], ["outbound-click", "POST"], ["recommendation-click", "POST"],
  ["social/landing", "POST"], ["newsletter/subscribe", "POST"], ["cron/social-schedule", "GET"],
  ["cron/social-publish", "GET"], ["cron/seo-factory", "GET"], ["social/publish-entry", "GET"],
  ["social/publish-entry", "POST"], ["social/make/linkedin-result", "POST"],
] as const;

describe.each(["preview", "production"])("%s candidate isolation", environment => {
  it.each(routes)("blocks %s %s even with authorization, qa=1 and live parameters", async (route, method) => {
    vi.stubEnv("VERCEL_ENV", environment);
    const handler = handlers[route] as { GET?: (request: NextRequest) => Promise<Response>; POST?: (request: NextRequest) => Promise<Response> };
    const response = await handler[method]!(new NextRequest(`https://miloosh.com/api/${route}?qa=1&dryRun=false&entryId=fixture`, { method, headers: { authorization: "Bearer fake-secret", "x-forwarded-host": "miloosh.com" }, ...(method === "POST" ? { body: "{}" } : {}) }));
    expect(response.status).toBe(409); expect((await response.json()).readOnly).toBe(true); noSideEffects();
  });
});

it("does not write through direct telemetry sinks", async () => {
  expect(await recordFirstPartyEvent(event)).toBe(false);
  await recordOutboundEvent({} as never, "/");
  await recordRecommendationEvent({ type: "recommendation_generated", answersSummary: "fixture" });
  await recordInboundSocialEvent({ channel: "linkedin", campaign: null, contentId: null, landingPath: "/" });
  noSideEffects();
});

it("guards storage mutations, including claims and deletes, before reading business records", async () => {
  const mutations = [
    () => recordNewsletterLead({} as never), () => unsubscribeByToken("fixture"), () => writeQueue([]),
    () => claimLinkedInDelivery("linkedin:fixture"), () => recordLinkedInDelivery("linkedin:fixture", {}), () => releaseLinkedInDelivery("linkedin:fixture"),
    () => seo.writeSeoFactoryRun({} as never), () => seo.writeSeoExperiments([]), () => seo.recordSeoExperiment({} as never),
    () => seo.recordSeoExperimentBatch([]), () => seo.recordSeoExperimentBaselines([]), () => seo.claimSeoFactoryRun("2026-10-13"), () => seo.releaseSeoFactoryRunClaim("2026-10-13"),
    () => runPublishCycle({ dryRun: false }), () => runScheduleCycle({ dryRun: false }),
  ];
  for (const mutate of mutations) await expect(mutate()).rejects.toBeInstanceOf(ReadOnlyDeploymentError);
  expect(storage.get.mock.calls.every(([path]) => path === ACTIVE_DEPLOYMENT_PATH)).toBe(true); noSideEffects();
});

it.each(["linkedin", "facebook", "bluesky", "mastodon", "threads", "x"] as const)("blocks the direct %s adapter before a provider request", async channel => {
  await expect(ADAPTERS[channel].publish(variant, { dryRun: false, entryId: "fixture" })).rejects.toBeInstanceOf(ReadOnlyDeploymentError);
  noSideEffects();
});

it("GET unsubscribe explains that no preference changed", async () => {
  const html = renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({ token: "fixture" }) }));
  expect(html).toContain("No preference was changed"); expect(html).not.toContain("You're unsubscribed"); noSideEffects();
});

it("does not enable browser analytics for a candidate or when control is unavailable", async () => {
  expect(await (await runtimeMode()).json()).toEqual({ analyticsEnabled: false });
  storage.get.mockRejectedValueOnce(new Error("unavailable"));
  expect(await (await runtimeMode()).json()).toEqual({ analyticsEnabled: false }); noSideEffects();
});

it("preserves active writes and stops them immediately after ownership changes", async () => {
  vi.stubEnv("VERCEL_DEPLOYMENT_ID", "dpl_active");
  expect((await getMutationPolicy()).allowed).toBe(true);
  expect(await recordFirstPartyEvent(event)).toBe(true); expect(storage.put).toHaveBeenCalledTimes(1);
  expect(await (await runtimeMode()).json()).toEqual({ analyticsEnabled: true });
  storage.get.mockImplementation(async () => result({ ...control, activeDeploymentId: "dpl_next" }));
  expect(await recordFirstPartyEvent(event)).toBe(false); expect(storage.put).toHaveBeenCalledTimes(1);
});

it("preserves active Buffer durable deduplication across simultaneous attempts", async () => {
  vi.stubEnv("VERCEL_DEPLOYMENT_ID", "dpl_active"); vi.stubEnv("LINKEDIN_TRANSPORT", "buffer");
  vi.stubEnv("SOCIAL_LINKEDIN_BUFFER_API_KEY", "fake-buffer"); vi.stubEnv("SOCIAL_LINKEDIN_BUFFER_CHANNEL_ID", "fake-channel");
  const claimed = new Set<string>();
  storage.put.mockImplementation(async (pathname, _body, options) => {
    if (claimed.has(pathname) && options.allowOverwrite !== true) throw new Error("Already claimed");
    claimed.add(pathname); return {};
  });
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: { createPost: { post: { id: "fixture-buffer-post", status: "queued" } } } }), { status: 200 }));
  expect(await getMutationPolicy()).toEqual({ allowed: true, reason: "active" });
  const results = await Promise.all([1, 2].map(() => ADAPTERS.linkedin.publish(variant, { dryRun: false, entryId: "same-entry" })));
  expect(results.map(r => r.status).sort()).toEqual(["DUPLICATE_SKIPPED", "PENDING_CONFIRMATION"]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("does not create or delete a control record, or fall back locally, when control read fails", async () => {
  storage.get.mockRejectedValue(new Error("unavailable"));
  expect(await recordFirstPartyEvent(event)).toBe(false);
  await expect(writeQueue([])).rejects.toBeInstanceOf(ReadOnlyDeploymentError); noSideEffects();
});
