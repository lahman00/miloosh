import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/decision-room/products/route";
import { POST } from "@/app/api/analytics/event/route";
import { analyticsLocalPath } from "@/lib/analytics/local-store-path";
import { getAllFirstPartyEvents } from "@/lib/analytics/events";
import { classifySessions } from "@/lib/analytics/human-classification";
import { derive } from "@/app/decision-room/_components/useRoom";
import { DecisionRoom } from "@/app/decision-room/_components/DecisionRoom";
import { buildRoomIndex } from "@/lib/decision-room/products";
import { emptyRoom } from "@/lib/decision-room/state";
import { getAllSoftware } from "@/data/software";

const slugs = new Set(getAllSoftware().map((s) => s.slug));
const known = (s: string) => slugs.has(s);
const snap = (room: unknown, desk: unknown, search = "", broken = false) => JSON.stringify([room === null ? null : JSON.stringify(room), desk === null ? null : JSON.stringify(desk), search, broken]);

describe("derive (the room as storage presents it)", () => {
  it("is empty with nothing stored", () => {
    expect(derive(snap(null, null), known).room.saved).toEqual([]);
  });
  it("prefers the room's own key over a BuyerDesk import", () => {
    const d = derive(snap({ ...emptyRoom(), saved: ["callrail"] }, { saved: ["pipedrive"], category: "crm", contexts: {} }), known);
    expect(d.room.saved).toEqual(["callrail"]);
    expect(d.room.importedFromDesk).toBe(false);
  });
  it("imports BuyerDesk when the room has nothing, and flags it for the banner", () => {
    const d = derive(snap(null, { saved: ["pipedrive", "close"], category: "crm", contexts: {} }), known);
    expect(d.room.saved).toEqual(["pipedrive", "close"]);
    expect(d.room.importedFromDesk).toBe(true);
  });
  it("a shared link fills an empty room, but only offers to add to a room that has content", () => {
    const empty = derive(snap(null, null, "?p=callrail.ruler-analytics&c=api"), known);
    expect(empty.room.saved).toEqual(["callrail", "ruler-analytics"]);
    expect(empty.room.criteria).toEqual(["api"]);
    const own = derive(snap({ ...emptyRoom(), saved: ["callrail"] }, null, "?p=callrail.ruler-analytics"), known);
    expect(own.room.saved).toEqual(["callrail"]);
    expect(own.pendingShared).toEqual(["ruler-analytics"]);
  });
  it("ignores hostile link and storage contents", () => {
    const d = derive(snap({ saved: ["../../etc/passwd", { a: 1 }] }, { saved: "x" }, "?p=<script>.nope&c=%00"), known);
    expect(d.room.saved).toEqual([]);
  });
  it("reports a storage problem", () => {
    expect(derive(snap(null, null, "", true), known).storageProblem).toBe(true);
  });
});

describe("GET /api/decision-room/products", () => {
  const get = (q: string) => GET(new NextRequest(`https://miloosh.com/api/decision-room/products${q}`));
  it("returns details for known slugs only", async () => {
    const res = await get("?slugs=callrail,not-real,../x");
    expect(res.status).toBe(200);
    const body = await res.json() as { products: Array<{ slug: string; cta: { rel: string } }> };
    expect(body.products.map((p) => p.slug)).toEqual(["callrail"]);
    expect(body.products[0]!.cta.rel).toContain("sponsored");
  });
  it("rejects absurd input and returns an empty list for nothing", async () => {
    expect((await get(`?slugs=${"a,".repeat(2000)}`)).status).toBe(400);
    expect(await (await get("")).json()).toEqual({ products: [] });
  });
});

describe("analytics events for the room", () => {
  const store = analyticsLocalPath("first-party-analytics.json");
  const clean = () => { try { if (fs.existsSync(store)) fs.unlinkSync(store); } catch { /* ignore */ } };
  beforeEach(clean); afterEach(clean);
  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
  const post = (body: unknown) => POST(new Request("https://miloosh.com/api/analytics/event", { method: "POST", headers: { "content-type": "application/json", "user-agent": UA }, body: JSON.stringify(body) }) as never);
  it("stores the three events with only their public fields and no private data", async () => {
    const base = { path: "/decision-room", visitorId: "v_1", sessionId: "s_1" };
    for (const e of [
      { type: "decision_room_product_saved", softwareSlug: "callrail", ctaLocation: "decision-room-search", note: "secret", email: "a@b.c" },
      { type: "decision_room_compare_configured", resultCount: 3, rank: 4, costs: { x: 1 } },
      { type: "decision_room_brief_generated", resultCount: 3, source: "print", currentTool: "BigCo" },
    ]) expect((await post({ ...base, ...e })).status).toBe(200);
    const events = (await getAllFirstPartyEvents()) as unknown as Array<Record<string, unknown>>;
    expect(events).toHaveLength(3);
    const text = JSON.stringify(events);
    for (const secret of ["secret", "a@b.c", "BigCo", "costs"]) expect(text).not.toContain(secret);
    expect(events.find((e) => e.type === "decision_room_compare_configured")).toMatchObject({ resultCount: 3, rank: 4 });
  });
  it("a lone interaction event does not make a session look like a qualified human", () => {
    const e = { type: "decision_room_product_saved", timestamp: new Date().toISOString(), path: "/decision-room", visitorId: "v_9", sessionId: "s_9", softwareSlug: "callrail" } as never;
    expect(["CONFIRMED_CLEAN", "STRONG_HUMAN_EVIDENCE"]).not.toContain(classifySessions([e])[0]!.bucket);
  });
});

describe("server render", () => {
  const html = renderToStaticMarkup(createElement(DecisionRoom, { index: buildRoomIndex().slice(0, 5) }));
  it("has one h1, the step navigation, the privacy promise and a loading state instead of reading storage on the server", () => {
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-label="Decision Room steps"');
    expect(html).toContain("No account and no email");
    expect(html).toContain("Loading your saved research");
    expect(html).not.toMatch(/undefined|NaN|\[object/);
  });
  it("makes no ranking or purchase claims", () => {
    expect(html).not.toMatch(/\b(best|top pick|winner|we recommend)\b/i);
  });
});
