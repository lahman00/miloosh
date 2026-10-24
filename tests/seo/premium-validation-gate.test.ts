import fs from "node:fs";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { analyticsLocalPath } from "@/lib/analytics/local-store-path";
import { POST } from "@/app/api/analytics/event/route";
import { getAllFirstPartyEvents, type FirstPartyEvent } from "@/lib/analytics/events";
import { classifySessions } from "@/lib/analytics/human-classification";
import { COMPARISON_V2_WAVE } from "@/data/seo/comparison-waves";
import { PREMIUM_GATE_COMPARISONS, PREMIUM_GATE_CTA_LOCATION, isPremiumGateComparison } from "@/data/seo/premium-gate";

vi.mock("next/navigation", () => ({ usePathname: () => "/compare/krispcall-vs-dialpad" }));

import { PremiumValidationGate, buildPremiumIntentEvent } from "@/components/PremiumValidationGate";

describe("premium validation gate: scope", () => {
  it("is on exactly three live v2 comparison pages and no others", () => {
    expect(PREMIUM_GATE_COMPARISONS).toHaveLength(3);
    for (const slug of PREMIUM_GATE_COMPARISONS) {
      expect(COMPARISON_V2_WAVE).toContain(slug);
      expect(isPremiumGateComparison(slug)).toBe(true);
    }
    for (const other of ["close-vs-pipedrive", "notion-vs-clickup", "apollo-io-vs-cognism"]) expect(isPremiumGateComparison(other)).toBe(false);
  });

  it("renders after the vendor-link row, only through the allowlist, and never changes vendor links", () => {
    const page = fs.readFileSync("app/compare/[comparison]/page.tsx", "utf8");
    expect(page.indexOf("isPremiumGateComparison(comparison)")).toBeGreaterThan(page.indexOf('aria-label="Visit the vendors"'));
    const gate = fs.readFileSync("components/PremiumValidationGate.tsx", "utf8");
    expect(gate).not.toMatch(/sponsored|affiliate|href="https?:/i);
  });
});

describe("premium validation gate: honest copy and no collection", () => {
  const html = renderToStaticMarkup(createElement(PremiumValidationGate, { comparisonSlug: "krispcall-vs-dialpad" }));
  it("says the product does not exist, offers one button, and asks for nothing", () => {
    expect(html).toContain("not available yet");
    expect(html).toContain("nothing is for sale");
    expect(html).toContain("I would use this");
    expect(html).not.toMatch(/<input|<form|type="email"|checkout|\$\d|buy now|unlock|subscribe/i);
  });
  it("confirms honestly after the click and points back to the existing flow", () => {
    const source = fs.readFileSync("components/PremiumValidationGate.tsx", "utf8");
    expect(source).toContain("nothing was sent or charged");
    expect(source).toContain('href="#vendor-choice"');
    expect(source).toContain("if (clicked) return;");
  });
});

describe("premium_intent_clicked event", () => {
  it("has the payload the tracker sends", () => {
    expect(buildPremiumIntentEvent("/compare/krispcall-vs-dialpad", "krispcall-vs-dialpad")).toEqual({
      type: "premium_intent_clicked",
      path: "/compare/krispcall-vs-dialpad",
      comparisonSlug: "krispcall-vs-dialpad",
      ctaLocation: PREMIUM_GATE_CTA_LOCATION,
    });
  });

  const store = analyticsLocalPath("first-party-analytics.json");
  const clean = () => { try { if (fs.existsSync(store)) fs.unlinkSync(store); } catch { /* ignore */ } };
  beforeEach(clean);
  afterEach(clean);
  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
  const post = (body: unknown) => POST(new Request("https://miloosh.com/api/analytics/event", { method: "POST", headers: { "content-type": "application/json", "user-agent": UA }, body: JSON.stringify(body) }) as never);

  it("is accepted by the existing route and stored with its slug and location, nothing else from the client", async () => {
    const res = await post({ ...buildPremiumIntentEvent("/compare/krispcall-vs-dialpad", "krispcall-vs-dialpad"), visitorId: "v_1", sessionId: "s_1", email: "x@example.com" });
    expect(res.status).toBe(200);
    const [event] = (await getAllFirstPartyEvents()) as Array<FirstPartyEvent & { comparisonSlug?: string; ctaLocation?: string; email?: string }>;
    expect(event).toMatchObject({ type: "premium_intent_clicked", comparisonSlug: "krispcall-vs-dialpad", ctaLocation: "premium-gate-comparison" });
    expect(event.email).toBeUndefined();
  });

  it("does not by itself make a session look like a qualified human", () => {
    const e = { type: "premium_intent_clicked", timestamp: new Date().toISOString(), path: "/compare/krispcall-vs-dialpad", visitorId: "v_9", sessionId: "s_9", comparisonSlug: "krispcall-vs-dialpad" } as FirstPartyEvent;
    const [c] = classifySessions([e]);
    expect(["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE"]).not.toContain(c!.bucket);
  });
});
