import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isBotUserAgent, isInternalOrSyntheticTraffic } from "@/lib/analytics/bot-filter";
import { recordFirstPartyEvent, getAllFirstPartyEvents, type FirstPartyEvent } from "@/lib/analytics/events";
import { computePeriodMetrics, isSyntheticOrTestEvent, computeRecommendDomainBreakdown, computeCtaExposure, computeAcquisitionSourceBreakdown, computeAcquisitionMilestones } from "@/scripts/analytics/report";
import { LEGACY_CONTAMINATED_SESSIONS, isLegacyContaminatedSession } from "@/lib/analytics/legacy-contaminated-sessions";
import fs from "node:fs";
import path from "node:path";

describe("First-Party Analytics, Bot Defense & Funnel Suite", () => {
  const localStorePath = path.join(process.cwd(), "var", "first-party-analytics.json");

  beforeEach(() => {
    try {
      if (fs.existsSync(localStorePath)) fs.unlinkSync(localStorePath);
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    try {
      if (fs.existsSync(localStorePath)) fs.unlinkSync(localStorePath);
    } catch {
      // ignore
    }
  });

  describe("Phase 2: Adversarial Bot & Synthetic Traffic Defense", () => {
    it("filters search engine bots, scrapers, and preview bots", () => {
      expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
      expect(isBotUserAgent("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)")).toBe(true);
      expect(isBotUserAgent("Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)")).toBe(true);
      expect(isBotUserAgent("Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)")).toBe(true);
      expect(isBotUserAgent("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true);
      expect(isBotUserAgent("LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)")).toBe(true);
      expect(isBotUserAgent("Twitterbot/1.0")).toBe(true);
      expect(isBotUserAgent("Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)")).toBe(true);
      expect(isBotUserAgent("Mozilla/5.0 (compatible; Pinterestbot/1.0; +http://www.pinterest.com/bot.html)")).toBe(true);
    });

    it("filters headless browsers and automated test runners", () => {
      expect(isBotUserAgent("HeadlessChrome/118.0.5993.88")).toBe(true);
      expect(isBotUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/128.0.0.0 Safari/537.36")).toBe(true);
      expect(isBotUserAgent("Playwright/1.46.0 (darwin-arm64)")).toBe(true);
      expect(isBotUserAgent("PuppeteerExtra/1.0")).toBe(true);
      expect(isBotUserAgent("Cypress/13.0.0")).toBe(true);
      expect(isBotUserAgent("k6/0.45.0 (https://k6.io/)")).toBe(true);
    });

    it("filters HTTP libraries, scrapers, and uptime checkers", () => {
      expect(isBotUserAgent("node-fetch/1.0")).toBe(true);
      expect(isBotUserAgent("axios/1.7.2")).toBe(true);
      expect(isBotUserAgent("curl/7.88.1")).toBe(true);
      expect(isBotUserAgent("Wget/1.21.3")).toBe(true);
      expect(isBotUserAgent("python-requests/2.31.0")).toBe(true);
      expect(isBotUserAgent("Go-http-client/1.1")).toBe(true);
      expect(isBotUserAgent("Better Uptime Bot 1.0")).toBe(true);
      expect(isBotUserAgent("UptimeRobot/2.0")).toBe(true);
      expect(isBotUserAgent("")).toBe(true);
      expect(isBotUserAgent("   ")).toBe(true);
      expect(isBotUserAgent(null)).toBe(true);
      expect(isBotUserAgent(undefined)).toBe(true);
    });

    it("preserves real human desktop, mobile, and privacy browsers", () => {
      const chromeMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
      const safariIPhone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1";
      const safariMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
      const firefoxWin = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0";
      const edgeWin = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0";
      const samsungAndroid = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.6167.143 Mobile Safari/537.36";

      expect(isBotUserAgent(chromeMac)).toBe(false);
      expect(isBotUserAgent(safariIPhone)).toBe(false);
      expect(isBotUserAgent(safariMac)).toBe(false);
      expect(isBotUserAgent(firefoxWin)).toBe(false);
      expect(isBotUserAgent(edgeWin)).toBe(false);
      expect(isBotUserAgent(samsungAndroid)).toBe(false);
    });

    it("filters cron and Next.js prefetch request headers, but no longer treats explicit QA traffic as a bot", () => {
      const humanUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36";

      // Analytics Zero-Drop Production Proof Mega Mission (2026-08-21) Phase 4:
      // x-synthetic-qa must NOT be treated as bot-equivalent anymore — explicit
      // Miloosh QA traffic is marked via the request BODY's isTest field (see
      // lib/analytics/synthetic.ts) and must reach storage, not be silently
      // dropped here alongside real bots.
      const syntheticHeader = new Headers({ "user-agent": humanUA, "x-synthetic-qa": "true" });
      expect(isInternalOrSyntheticTraffic(syntheticHeader)).toBe(false);

      // Root cause of the 2026-08-21 zero-events incident: this header is
      // injected by Vercel's own platform on ordinary requests — proven via
      // a real production log line from a genuine curl+real-UA request — so
      // its mere presence must NOT be treated as a bot/infra signal anymore.
      const vercelHeader = new Headers({ "user-agent": humanUA, "x-vercel-sc-headers": "1" });
      expect(isInternalOrSyntheticTraffic(vercelHeader)).toBe(false);

      const cronHeader = new Headers({ "user-agent": humanUA, "x-vercel-cron": "1" });
      expect(isInternalOrSyntheticTraffic(cronHeader)).toBe(true);

      const prefetchHeader = new Headers({ "user-agent": humanUA, "purpose": "prefetch" });
      expect(isInternalOrSyntheticTraffic(prefetchHeader)).toBe(true);

      const secPrefetch = new Headers({ "user-agent": humanUA, "sec-purpose": "prefetch" });
      expect(isInternalOrSyntheticTraffic(secPrefetch)).toBe(true);

      const nextPrefetch = new Headers({ "user-agent": humanUA, "x-nextjs-prefetch": "1" });
      expect(isInternalOrSyntheticTraffic(nextPrefetch)).toBe(true);

      const realHumanRequest = new Headers({ "user-agent": humanUA, "accept": "text/html" });
      expect(isInternalOrSyntheticTraffic(realHumanRequest)).toBe(false);
    });
  });

  describe("Phase 1: Event Recording, Attribution & Funnel Metrics", () => {
    it("records and reads back all specialized first-party event types", async () => {
      const now = new Date().toISOString();
      const events: FirstPartyEvent[] = [
        { type: "page_view", path: "/", visitorId: "v_h1", sessionId: "s_1", timestamp: now },
        { type: "software_view", path: "/software/notion", softwareSlug: "notion", visitorId: "v_h1", sessionId: "s_1", timestamp: now },
        { type: "comparison_view", path: "/compare/notion-vs-coda", comparisonSlug: "notion-vs-coda", visitorId: "v_h1", sessionId: "s_1", timestamp: now },
        { type: "category_view", path: "/categories/project-management", categorySlug: "project-management", visitorId: "v_h1", sessionId: "s_1", timestamp: now },
        { type: "guide_view", path: "/guides/best-crm-for-startups", guideSlug: "best-crm-for-startups", visitorId: "v_h1", sessionId: "s_1", timestamp: now },
        { type: "recommend_use", path: "/recommend/results", visitorId: "v_h1", sessionId: "s_1", timestamp: now },
        { type: "outbound_click", path: "/software/pipedrive", softwareSlug: "pipedrive", destination: "affiliate", url: "https://aff.trypipedrive.com/xyz", ctaLocation: "software-cta", visitorId: "v_h1", sessionId: "s_1", timestamp: now },
      ];

      for (const ev of events) {
        await recordFirstPartyEvent(ev);
      }

      const stored = await getAllFirstPartyEvents();
      expect(stored.length).toBe(7);
      expect(stored.find(e => e.type === "software_view")).toBeDefined();
      expect(stored.find(e => e.type === "comparison_view")).toBeDefined();
      expect(stored.find(e => e.type === "category_view")).toBeDefined();
      expect(stored.find(e => e.type === "guide_view")).toBeDefined();
      expect(stored.find(e => e.type === "recommend_use")).toBeDefined();
      expect(stored.find(e => e.type === "outbound_click")).toBeDefined();
    });

    it("correctly calculates unique visitors, sessions, new vs returning, and navigation metrics", () => {
      const now = new Date().toISOString();
      const past = new Date(Date.now() - 3600000).toISOString();

      const events: FirstPartyEvent[] = [
        // Visitor 1: Session 1 (Landing on home, goes to software)
        { type: "page_view", path: "/", visitorId: "v_1", sessionId: "s_1", timestamp: past },
        { type: "page_view", path: "/software/monday", visitorId: "v_1", sessionId: "s_1", timestamp: now },
        { type: "engaged_view", path: "/software/monday", durationSeconds: 10, visitorId: "v_1", sessionId: "s_1", timestamp: now },
        // Visitor 1: Session 2 (Returning visitor)
        { type: "page_view", path: "/compare/monday-vs-asana", visitorId: "v_1", sessionId: "s_2", timestamp: now },
        { type: "comparison_view", path: "/compare/monday-vs-asana", comparisonSlug: "monday-vs-asana", visitorId: "v_1", sessionId: "s_2", timestamp: now },
        { type: "outbound_click", path: "/compare/monday-vs-asana", softwareSlug: "monday", destination: "affiliate", url: "https://monday.com/aff", visitorId: "v_1", sessionId: "s_2", timestamp: now },

        // Visitor 2: Single-session, single-page visitor (Bounce)
        { type: "page_view", path: "/guides/startup-tools", visitorId: "v_2", sessionId: "s_3", timestamp: now },

        // Test/Synthetic event: Must be completely excluded from metrics
        { type: "page_view", path: "/", visitorId: "v_test_99", sessionId: "s_test_99", timestamp: now, isTest: true },
        { type: "outbound_click", path: "/", softwareSlug: "wix", destination: "affiliate", url: "https://wix.com", visitorId: "v_synthetic_88", sessionId: "s_synthetic_88", timestamp: now },
      ];

      const summary = computePeriodMetrics("TEST_PERIOD", events, events);

      expect(summary.uniqueVisitors).toBe(2);
      expect(summary.newVisitors).toBe(1); // v_2 has 1 session
      expect(summary.returningVisitors).toBe(1); // v_1 has 2 sessions
      expect(summary.sessions).toBe(3); // s_1, s_2, s_3
      expect(summary.engagedVisitors).toBe(1); // v_1 dwelled >10s and viewed multi-page
      expect(summary.multiPageVisitors).toBe(1); // v_1
      expect(summary.totalPageViews).toBe(4); // 2 + 1 + 1 (excluding test)
      expect(summary.outboundClickers).toBe(1); // v_1
      expect(summary.affiliateClickers).toBe(1); // v_1

      // Verify Landing Pages
      expect(summary.topLandingPages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "/", visits: 1 }),
          expect.objectContaining({ path: "/compare/monday-vs-asana", visits: 1 }),
          expect.objectContaining({ path: "/guides/startup-tools", visits: 1 }),
        ])
      );

      // Verify Exit Pages
      expect(summary.topExitPages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "/software/monday", exits: 1 }),
          expect.objectContaining({ path: "/compare/monday-vs-asana", exits: 1 }),
          expect.objectContaining({ path: "/guides/startup-tools", exits: 1 }),
        ])
      );
    });

    it("rigorously filters test and synthetic events", () => {
      expect(isSyntheticOrTestEvent({ type: "page_view", path: "/", visitorId: "v_test_1", sessionId: "s_1", timestamp: "" })).toBe(true);
      expect(isSyntheticOrTestEvent({ type: "page_view", path: "/", visitorId: "v_synthetic_2", sessionId: "s_1", timestamp: "" })).toBe(true);
      expect(isSyntheticOrTestEvent({ type: "page_view", path: "/", visitorId: "v_1", sessionId: "s_test_2", timestamp: "" })).toBe(true);
      expect(isSyntheticOrTestEvent({ type: "page_view", path: "/", visitorId: "v_1", sessionId: "s_1", timestamp: "", isTest: true })).toBe(true);
      expect(isSyntheticOrTestEvent({ type: "page_view", path: "/", visitorId: "v_real_human_123", sessionId: "s_real_session_456", timestamp: "" })).toBe(false);
    });
  });

  describe("Recommend Engine Integrity Patch (2026-08-21): synthetic QA exclusion & Recommend funnel", () => {
    it("a QA browser session marked isTest:true is excluded from real-user metrics", () => {
      const now = new Date().toISOString();
      const events: FirstPartyEvent[] = [
        { type: "page_view", path: "/recommend", visitorId: "v_qa_operator", sessionId: "s_qa_operator", timestamp: now, isTest: true },
        { type: "recommend_started", path: "/recommend", visitorId: "v_qa_operator", sessionId: "s_qa_operator", timestamp: now, isTest: true } as FirstPartyEvent,
      ];
      const summary = computePeriodMetrics("TEST", events, events);
      expect(summary.uniqueVisitors).toBe(0);
      expect(summary.recommendFunnel.visitors.people).toBe(0);
      expect(summary.recommendFunnel.starters.people).toBe(0);
    });

    it("an organic session (no isTest marker, not a legacy-contaminated session) is NOT excluded", () => {
      const now = new Date().toISOString();
      const events: FirstPartyEvent[] = [
        { type: "page_view", path: "/recommend", visitorId: "v_real_organic", sessionId: "s_real_organic", timestamp: now },
        { type: "recommend_started", path: "/recommend", visitorId: "v_real_organic", sessionId: "s_real_organic", timestamp: now } as FirstPartyEvent,
      ];
      const summary = computePeriodMetrics("TEST", events, events);
      expect(summary.uniqueVisitors).toBe(1);
      expect(summary.recommendFunnel.visitors.people).toBe(1);
      expect(summary.recommendFunnel.starters.people).toBe(1);
    });

    it("a known legacy-contaminated session is excluded from real metrics by default, without deleting its events", () => {
      expect(LEGACY_CONTAMINATED_SESSIONS.length).toBeGreaterThan(0);
      const legacySession = LEGACY_CONTAMINATED_SESSIONS[0];
      expect(isLegacyContaminatedSession(legacySession.sessionId)).toBe(true);
      expect(legacySession.classification).toBe("UNKNOWN_POSSIBLE_OPERATOR_QA");

      const now = new Date().toISOString();
      const events: FirstPartyEvent[] = [
        { type: "page_view", path: "/recommend", visitorId: legacySession.visitorId, sessionId: legacySession.sessionId, timestamp: now },
      ];
      // Excluded from the real-metrics path...
      expect(isSyntheticOrTestEvent(events[0])).toBe(true);
      const summary = computePeriodMetrics("TEST", events, events);
      expect(summary.uniqueVisitors).toBe(0);
      // ...but --include-synthetic can still see it, proving nothing was deleted.
      expect(isSyntheticOrTestEvent(events[0], true)).toBe(false);
      const debugSummary = computePeriodMetrics("TEST", events, events, [], true);
      expect(debugSummary.uniqueVisitors).toBe(1);
    });

    it("Recommend funnel counts starters, completers, result viewers, product/comparison openers as distinct people/sessions/events", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "recommend_started", path: "/recommend", visitorId: "v_a", sessionId: "s_a", timestamp: t(0) } as FirstPartyEvent,
        { type: "recommend_need_selected", path: "/recommend", domain: "crm", visitorId: "v_a", sessionId: "s_a", timestamp: t(1000) } as FirstPartyEvent,
        { type: "recommend_completed", path: "/recommend", domain: "crm", visitorId: "v_a", sessionId: "s_a", timestamp: t(2000) } as FirstPartyEvent,
        { type: "recommend_result_viewed", path: "/recommend/results", domain: "crm", confidence: "high", resultCount: 3, visitorId: "v_a", sessionId: "s_a", timestamp: t(3000) } as FirstPartyEvent,
        { type: "recommend_product_open", path: "/recommend/results", softwareSlug: "hubspot", rank: 1, visitorId: "v_a", sessionId: "s_a", timestamp: t(4000) } as FirstPartyEvent,
        { type: "recommend_comparison_open", path: "/recommend/results", comparisonSlug: "hubspot-vs-pipedrive", visitorId: "v_a", sessionId: "s_a", timestamp: t(5000) } as FirstPartyEvent,
        // Visitor B starts but never completes.
        { type: "recommend_started", path: "/recommend", visitorId: "v_b", sessionId: "s_b", timestamp: t(0) } as FirstPartyEvent,
      ];

      const summary = computePeriodMetrics("TEST", events, events);
      const rf = summary.recommendFunnel;
      expect(rf.visitors.people).toBe(2);
      expect(rf.starters.people).toBe(2);
      expect(rf.completers.people).toBe(1);
      expect(rf.completionRate).toBe("50.0%");
      expect(rf.resultViewers.people).toBe(1);
      expect(rf.productOpeners.people).toBe(1);
      expect(rf.comparisonOpeners.people).toBe(1);
    });

    it("outbound/affiliate clicks are only counted 'after Recommend' when they chronologically follow a real Recommend touch", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        // Visitor A: touches Recommend, then clicks outbound afterward -> counts.
        { type: "recommend_started", path: "/recommend", visitorId: "v_a", sessionId: "s_a", timestamp: t(0) } as FirstPartyEvent,
        { type: "outbound_click", path: "/software/hubspot", softwareSlug: "hubspot", destination: "affiliate", url: "https://hubspot.com/aff", visitorId: "v_a", sessionId: "s_a", timestamp: t(1000) },
        // Visitor C: clicks outbound with NO prior Recommend touch at all -> does not count toward "after Recommend".
        { type: "outbound_click", path: "/software/slack", softwareSlug: "slack", destination: "official", url: "https://slack.com", visitorId: "v_c", sessionId: "s_c", timestamp: t(0) },
      ];

      const summary = computePeriodMetrics("TEST", events, events);
      const rf = summary.recommendFunnel;
      expect(rf.outboundClickersAfter.people).toBe(1);
      expect(rf.affiliateClickersAfter.people).toBe(1);
      // Overall outboundClickers (unrelated to Recommend) still counts both.
      expect(summary.outboundClickers).toBe(2);
    });
  });

  describe("Flippa Activation + Recommend Expansion Super-Mission (2026-08-21) Phase 26: domain breakdown", () => {
    it("attributes completers, result viewers, product opens, and comparison opens to the right domain", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "recommend_completed", path: "/recommend", domain: "crm", visitorId: "v_a", sessionId: "s_a", timestamp: t(0) } as FirstPartyEvent,
        { type: "recommend_result_viewed", path: "/recommend/results", domain: "crm", confidence: "high", resultCount: 3, visitorId: "v_a", sessionId: "s_a", timestamp: t(1000) } as FirstPartyEvent,
        { type: "recommend_product_open", path: "/recommend/results", softwareSlug: "hubspot", rank: 1, domain: "crm", visitorId: "v_a", sessionId: "s_a", timestamp: t(2000) } as FirstPartyEvent,
        { type: "recommend_comparison_open", path: "/recommend/results", comparisonSlug: "hubspot-vs-pipedrive", domain: "crm", visitorId: "v_a", sessionId: "s_a", timestamp: t(3000) } as FirstPartyEvent,
        { type: "recommend_completed", path: "/recommend", domain: "field_service", visitorId: "v_b", sessionId: "s_b", timestamp: t(0) } as FirstPartyEvent,
      ];

      const breakdown = computeRecommendDomainBreakdown(events);
      const crmRow = breakdown.find((r) => r.domain === "crm");
      const fieldServiceRow = breakdown.find((r) => r.domain === "field_service");
      expect(crmRow).toEqual({ domain: "crm", completers: 1, resultViewers: 1, productOpeners: 1, comparisonOpeners: 1, outboundClickersAfter: 0 });
      expect(fieldServiceRow).toEqual({ domain: "field_service", completers: 1, resultViewers: 0, productOpeners: 0, comparisonOpeners: 0, outboundClickersAfter: 0 });
    });

    it("attributes an outbound click to the visitor's most recent recommend-domain touch", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "recommend_completed", path: "/recommend", domain: "seo_platform", visitorId: "v_a", sessionId: "s_a", timestamp: t(0) } as FirstPartyEvent,
        { type: "outbound_click", path: "/software/ahrefs", softwareSlug: "ahrefs", destination: "affiliate", url: "https://ahrefs.com/aff", visitorId: "v_a", sessionId: "s_a", timestamp: t(1000) },
      ];
      const breakdown = computeRecommendDomainBreakdown(events);
      expect(breakdown.find((r) => r.domain === "seo_platform")?.outboundClickersAfter).toBe(1);
    });

    it("excludes synthetic and legacy-contaminated events from the domain breakdown by default", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "recommend_completed", path: "/recommend", domain: "call_tracking", visitorId: "v_qa", sessionId: "s_qa", timestamp: t(0), isTest: true } as FirstPartyEvent,
      ];
      expect(computeRecommendDomainBreakdown(events)).toEqual([]);
      expect(computeRecommendDomainBreakdown(events, true).find((r) => r.domain === "call_tracking")?.completers).toBe(1);
    });
  });

  describe("WAR MODE mission (2026-08-22) Phase 21: CTA exposure vs. click", () => {
    it("counts a click only when the same visitor who saw the impression also clicked", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "cta_impression", path: "/software/notion", softwareSlug: "notion", ctaLocation: "software-page-cta", visitorId: "v_a", sessionId: "s_a", timestamp: t(0) } as FirstPartyEvent,
        { type: "outbound_click", path: "/software/notion", softwareSlug: "notion", ctaLocation: "software-page-cta", destination: "official", url: "https://notion.so", visitorId: "v_a", sessionId: "s_a", timestamp: t(1000) },
        // Visitor B saw a different CTA on the same page (never saw this one) but still clicked it — must NOT count as converted-from-impression.
        { type: "outbound_click", path: "/software/notion", softwareSlug: "notion", ctaLocation: "software-page-cta", destination: "official", url: "https://notion.so", visitorId: "v_b", sessionId: "s_b", timestamp: t(2000) },
      ];
      const rows = computeCtaExposure(events);
      const row = rows.find((r) => r.softwareSlug === "notion" && r.ctaLocation === "software-page-cta");
      expect(row).toEqual({ softwareSlug: "notion", ctaLocation: "software-page-cta", impressions: 1, clicks: 1 });
    });

    it("keeps separate CTA locations for the same software distinct", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "cta_impression", path: "/software/notion", softwareSlug: "notion", ctaLocation: "software-page-cta", visitorId: "v_a", sessionId: "s_a", timestamp: t(0) } as FirstPartyEvent,
        { type: "cta_impression", path: "/compare/notion-vs-coda", softwareSlug: "notion", ctaLocation: "compare-page-choose-card", visitorId: "v_a", sessionId: "s_a", timestamp: t(1000) } as FirstPartyEvent,
      ];
      const rows = computeCtaExposure(events);
      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.ctaLocation === "software-page-cta")?.impressions).toBe(1);
      expect(rows.find((r) => r.ctaLocation === "compare-page-choose-card")?.impressions).toBe(1);
    });

    it("excludes synthetic QA impressions and clicks by default", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "cta_impression", path: "/software/notion", softwareSlug: "notion", ctaLocation: "software-page-cta", visitorId: "v_qa", sessionId: "s_qa", timestamp: t(0), isTest: true } as FirstPartyEvent,
      ];
      expect(computeCtaExposure(events)).toEqual([]);
      expect(computeCtaExposure(events, true).find((r) => r.softwareSlug === "notion")?.impressions).toBe(1);
    });
  });

  describe("TRAFFIC ACQUISITION WAR MODE mission (2026-08-22) Phase 2: acquisition source funnel", () => {
    it("attributes a visitor to the TrafficSource on their earliest page_view, not their latest", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "page_view", path: "/", trafficSource: "organic_search", visitorId: "v_a", sessionId: "s_a", timestamp: t(0) } as FirstPartyEvent,
        { type: "page_view", path: "/software/notion", trafficSource: "direct", visitorId: "v_a", sessionId: "s_a", timestamp: t(1000) } as FirstPartyEvent,
        { type: "outbound_click", path: "/software/notion", softwareSlug: "notion", destination: "official", url: "https://notion.so", visitorId: "v_a", sessionId: "s_a", timestamp: t(2000) },
      ];
      const rows = computeAcquisitionSourceBreakdown(events);
      const organicRow = rows.find((r) => r.source === "organic_search");
      expect(organicRow).toBeTruthy();
      expect(organicRow?.visitors).toBe(1);
      expect(organicRow?.outboundClickers).toBe(1);
      expect(rows.find((r) => r.source === "direct")).toBeUndefined();
    });

    it("counts multi-page and engaged, and separates CTA-seen from CTA-clicked, per source", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "page_view", path: "/", trafficSource: "social", visitorId: "v_b", sessionId: "s_b", timestamp: t(0) } as FirstPartyEvent,
        { type: "page_view", path: "/software/slack", trafficSource: "social", visitorId: "v_b", sessionId: "s_b", timestamp: t(1000) } as FirstPartyEvent,
        { type: "cta_impression", path: "/software/slack", softwareSlug: "slack", ctaLocation: "software-page-cta", visitorId: "v_b", sessionId: "s_b", timestamp: t(2000) } as FirstPartyEvent,
      ];
      const rows = computeAcquisitionSourceBreakdown(events);
      const socialRow = rows.find((r) => r.source === "social");
      expect(socialRow).toMatchObject({ visitors: 1, engaged: 1, multiPage: 1, ctaImpressions: 1, ctaClickers: 0, outboundClickers: 0 });
    });

    it("excludes synthetic QA visitors by default", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "page_view", path: "/", trafficSource: "referral", visitorId: "v_qa", sessionId: "s_qa", timestamp: t(0), isTest: true } as FirstPartyEvent,
      ];
      expect(computeAcquisitionSourceBreakdown(events)).toEqual([]);
      expect(computeAcquisitionSourceBreakdown(events, true).find((r) => r.source === "referral")?.visitors).toBe(1);
    });
  });

  describe("ROAD TO THE FIRST 1,000 REAL HUMANS mission (2026-08-22) Phase 0: acquisition milestone scoreboard", () => {
    it("counts cumulative distinct real visitors and reports 0/4 milestones reached below 100", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = Array.from({ length: 5 }, (_, i) => ({
        type: "page_view", path: "/", visitorId: `v_${i}`, sessionId: `s_${i}`, timestamp: t(i * 1000),
      })) as FirstPartyEvent[];
      const { cumulativeRealVisitors, milestones } = computeAcquisitionMilestones(events);
      expect(cumulativeRealVisitors).toBe(5);
      expect(milestones.every((m) => !m.reached)).toBe(true);
      expect(milestones.find((m) => m.name === "A")?.visitorsRemaining).toBe(95);
    });

    it("marks milestone A reached with the exact timestamp of the 100th distinct real visitor, never interpolated", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = Array.from({ length: 100 }, (_, i) => ({
        type: "page_view", path: "/", visitorId: `v_${i}`, sessionId: `s_${i}`, timestamp: t(i * 1000),
      })) as FirstPartyEvent[];
      const hundredthTimestamp = events[99]!.timestamp;
      const { milestones } = computeAcquisitionMilestones(events);
      const a = milestones.find((m) => m.name === "A");
      expect(a?.reached).toBe(true);
      expect(a?.reachedAt).toBe(hundredthTimestamp);
      expect(milestones.find((m) => m.name === "B")?.reached).toBe(false);
    });

    it("does not count a repeat visitor twice toward the cumulative total", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "page_view", path: "/", visitorId: "v_a", sessionId: "s_a1", timestamp: t(0) } as FirstPartyEvent,
        { type: "page_view", path: "/software/notion", visitorId: "v_a", sessionId: "s_a1", timestamp: t(1000) } as FirstPartyEvent,
        { type: "page_view", path: "/", visitorId: "v_a", sessionId: "s_a2", timestamp: t(2000) } as FirstPartyEvent, // same visitor, a later session
      ];
      expect(computeAcquisitionMilestones(events).cumulativeRealVisitors).toBe(1);
    });

    it("excludes synthetic QA and legacy-contaminated visitors from the cumulative count", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [
        { type: "page_view", path: "/", visitorId: "v_real", sessionId: "s_real", timestamp: t(0) } as FirstPartyEvent,
        { type: "page_view", path: "/", visitorId: "v_qa", sessionId: "s_qa", timestamp: t(1000), isTest: true } as FirstPartyEvent,
      ];
      expect(computeAcquisitionMilestones(events).cumulativeRealVisitors).toBe(1);
    });

    it("MILOOSH ANALYTICS TRUTH & HUMAN TRAFFIC MISSION (2026-08-23) Phase 7 -- a raw jump in cumulativeRealVisitors must NEVER be reported as milestone-reached human growth on its own; the classified track requires real CONFIRMED_CLEAN/STRONG_HUMAN_EVIDENCE sessions, not just distinct visitor IDs", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      // 100 distinct visitors, each a single bare page_view with no UTM, no
      // engagement depth, no burst pattern -- exactly the shape that DOES
      // cross the raw milestone (see the earlier "marks milestone A reached"
      // test) but must NOT cross the classified one, since none of these
      // sessions carry any real evidence of humanity beyond "produced one
      // JS event" -- the mission's own non-negotiable rule.
      const events: FirstPartyEvent[] = Array.from({ length: 100 }, (_, i) => ({
        type: "page_view", path: "/", visitorId: `v_${i}`, sessionId: `s_${i}`, timestamp: t(i * 1000),
      })) as FirstPartyEvent[];

      const result = computeAcquisitionMilestones(events);
      // The raw number DOES jump to 100 (this is what a naive report would misuse) --
      expect(result.cumulativeRealVisitors).toBe(100);
      expect(result.milestones.find((m) => m.name === "A")?.reached).toBe(true);
      // -- but the classified, defensible count must not follow it automatically.
      expect(result.cumulativeConfirmedOrStrongVisitors).toBe(0);
      expect(result.milestonesConfirmedOrStrong.find((m) => m.name === "A")?.reached).toBe(false);
    });

    it("a real jump IS reflected in the classified track once sessions actually carry strong evidence (real UTM + progressive engagement)", () => {
      const t = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
      const events: FirstPartyEvent[] = [];
      for (let i = 0; i < 3; i++) {
        const sid = `s_strong_${i}`;
        events.push({ type: "page_view", path: "/software/x", visitorId: `v_strong_${i}`, sessionId: sid, timestamp: t(i * 100000), utmContent: "real-campaign" } as FirstPartyEvent);
        events.push({ type: "software_view", path: "/software/x", visitorId: `v_strong_${i}`, sessionId: sid, timestamp: t(i * 100000 + 2000) } as FirstPartyEvent);
        events.push({ type: "engaged_view", path: "/software/x", visitorId: `v_strong_${i}`, sessionId: sid, timestamp: t(i * 100000 + 15000) } as FirstPartyEvent);
      }
      const result = computeAcquisitionMilestones(events);
      expect(result.cumulativeConfirmedOrStrongVisitors).toBe(3);
    });
  });

  describe("Phase 3: Privacy & Zero-PII Audit", () => {
    it("verifies first-party event records contain no PII, emails, names, or IP addresses", async () => {
      const event: FirstPartyEvent = {
        type: "outbound_click",
        path: "/software/airtable",
        softwareSlug: "airtable",
        destination: "affiliate",
        url: "https://airtable.com/invite/r/xyz",
        ctaLocation: "software-cta",
        visitorId: "v_anon_abc123",
        sessionId: "s_anon_def456",
        timestamp: new Date().toISOString(),
      };

      await recordFirstPartyEvent(event);
      const stored = await getAllFirstPartyEvents();
      const raw = JSON.stringify(stored[0]);

      expect(raw).not.toMatch(/@/); // No email
      expect(raw).not.toMatch(/ipAddress/i);
      expect(raw).not.toMatch(/client_ip/i);
      expect(raw).not.toMatch(/fingerprint/i);
      expect(raw).not.toMatch(/authorization/i);
    });
  });
});
