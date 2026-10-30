import { describe, expect, it } from "vitest";
import { getAllSoftware, getSoftware } from "@/data/software";
import { toRoomProduct, buildRoomIndex, getRoomProducts } from "@/lib/decision-room/products";
import { BUILTIN_CRITERIA, cleanCustom, evaluateCriterion, summarizeEvidence } from "@/lib/decision-room/criteria";
import { DESK_KEY, ROOM_MAX_COMPARE, ROOM_MAX_SAVED, addCustom, cleanRoom, emptyRoom, importFromDesk, loadRoom, parseRoom, setCost, toggleCompare, toggleCriterion, toggleSaved } from "@/lib/decision-room/state";
import { computeProductCost, keepCurrentCost, resolvePriceBasis } from "@/lib/decision-room/cost";
import { decodeShare, encodeShare } from "@/lib/decision-room/share";
import { buildBrief, briefToText } from "@/lib/decision-room/brief";
import type { RoomProduct } from "@/lib/decision-room/types";

const slugs = new Set(getAllSoftware().map((s) => s.slug));
const known = (s: string) => slugs.has(s);
const product = (slug: string): RoomProduct => toRoomProduct(getSoftware(slug)!);
const synthetic = (over: Partial<RoomProduct> = {}): RoomProduct => ({
  slug: "acme", name: "Acme", category: "crm", categoryName: "CRM", bestFor: "small teams", description: "Acme CRM with an API and SSO.", features: ["Contact import and export", "REST API"], pros: ["Simple"], cons: ["No offline mode"], platforms: ["Web", "iOS"], tags: [], faq: [], sources: ["https://acme.example/docs"], accessedAt: "2026-10-01", website: "https://acme.example",
  pricing: { status: "verified", model: "paid", startingPrice: "$12/user/month", freePlan: false, freeTrial: { available: true, days: 14 }, entryPaid: { amount: 12, currency: "USD", billingPeriod: "annual", perSeat: true, annualBillingRequired: false }, enterpriseContactSales: null, lastVerified: "2026-10-02", officialSource: "https://acme.example/pricing" },
  cta: { href: "https://acme.example", rel: "noopener noreferrer", disclosure: false }, ...over,
});

describe("dataset mapping", () => {
  it("indexes every product and keeps the CTA exactly as the rest of the site resolves it", () => {
    expect(buildRoomIndex()).toHaveLength(getAllSoftware().length);
    const callrail = product("callrail");
    expect(callrail.cta.rel).toContain("sponsored");
    expect(callrail.cta.disclosure).toBe(true);
    expect(product("ruler-analytics").cta.rel).not.toContain("sponsored");
  });
  it("ignores unknown or malformed slugs and caps the request", () => {
    expect(getRoomProducts(["callrail", "nope-not-real", "../etc", "callrail"]).map((p) => p.slug)).toEqual(["callrail"]);
    expect(getRoomProducts(Array.from({ length: 40 }, () => "callrail"))).toHaveLength(1);
  });
});

describe("evidence: three honest statuses, never a negative from silence", () => {
  const p = synthetic();
  it("verified from the dated pricing record", () => {
    const free = evaluateCriterion(p, { id: "free_plan", label: "Has a free plan" });
    expect(free).toMatchObject({ status: "verified", value: "no", checkedAt: "2026-10-02" });
    expect(free.sources[0]!.url).toBe("https://acme.example/pricing");
    expect(evaluateCriterion(p, { id: "free_trial", label: "t" })).toMatchObject({ status: "verified", value: "yes" });
  });
  it("documented but limited from recorded vendor material", () => {
    const api = evaluateCriterion(p, { id: "api", label: "Documents an API" });
    expect(api.status).toBe("documented_limited");
    expect(api.detail).toContain("Not tested hands-on");
    expect(api.toVerify).toBeTruthy();
    expect(evaluateCriterion(p, { id: "platform_ios", label: "iOS" }).status).toBe("documented_limited");
  });
  it("unknown, not no, when the record is silent, and says what to verify", () => {
    const android = evaluateCriterion(p, { id: "platform_android", label: "Android" });
    expect(android).toMatchObject({ status: "unknown", value: null });
    expect(android.toVerify).toBeTruthy();
    const unverified = synthetic({ pricing: { ...p.pricing, status: "unknown", lastVerified: null } });
    expect(evaluateCriterion(unverified, { id: "free_plan", label: "x" }).status).toBe("unknown");
  });
  it("custom requirements use a whole-word match and never invent support", () => {
    expect(evaluateCriterion(p, { id: "custom_1", label: "SSO", kind: "feature" }).status).toBe("documented_limited");
    expect(evaluateCriterion(p, { id: "custom_1", label: "SS", kind: "feature" }).status).toBe("unknown");
    expect(evaluateCriterion(p, { id: "custom_1", label: "Slack", kind: "integration" })).toMatchObject({ status: "unknown", value: null });
    expect(() => evaluateCriterion(p, { id: "custom_1", label: "(a+)+$[", kind: "feature" })).not.toThrow();
  });
  it("summaries are counts only and unknown stays out of the negative column", () => {
    const items = BUILTIN_CRITERIA.map((c) => evaluateCriterion(p, c));
    const counts = summarizeEvidence(items);
    expect(counts.verifiedYes + counts.documentedYes + counts.verifiedNo + counts.unknown).toBe(counts.total);
    expect(counts.verifiedNo).toBe(1);
  });
  it("is deterministic and independent of affiliate status", () => {
    const a = evaluateCriterion(synthetic({ cta: { href: "https://aff.example", rel: "sponsored", disclosure: true } }), { id: "api", label: "x" });
    const b = evaluateCriterion(synthetic(), { id: "api", label: "x" });
    expect(a).toEqual(b);
  });
  it("cleans custom requirements", () => {
    const c = cleanCustom([{ label: "  Zapier  ", kind: "integration" }, { label: "zapier", kind: "feature" }, { label: "x" }, null, { label: "A".repeat(200) }]);
    expect(c.map((x) => x.label)).toEqual(["Zapier", "A".repeat(60)]);
    expect(cleanCustom(Array.from({ length: 20 }, (_, i) => ({ label: `req ${i}` }))).length).toBe(5);
  });
});

describe("state", () => {
  it("keeps saved within the caps and compare within the saved set", () => {
    let s = emptyRoom();
    const all = [...slugs].slice(0, 20);
    for (const slug of all) s = toggleSaved(s, slug, known);
    expect(s.saved).toHaveLength(ROOM_MAX_SAVED);
    expect(s.compare).toHaveLength(ROOM_MAX_COMPARE);
    const extra = s.saved.find((x) => !s.compare.includes(x))!;
    expect(toggleCompare(s, extra).compare).toEqual(s.compare);
    const removed = toggleSaved(s, s.compare[0]!, known);
    expect(removed.compare).not.toContain(s.compare[0]);
  });
  it("rejects unknown slugs and survives corrupted storage", () => {
    expect(toggleSaved(emptyRoom(), "not-a-product", known).saved).toEqual([]);
    for (const raw of ["", "{", "null", "[]", '{"saved":"x"}', '{"saved":[1,2,{"a":1}]}', "A".repeat(30000)]) {
      const r = parseRoom(raw, known);
      expect(r === null || r.saved.length === 0).toBe(true);
    }
    expect(cleanRoom({ saved: ["callrail", "zzz"], costs: { callrail: { unitPrice: -5, seats: 1.5, setup: "9" } }, currency: "JPY", team: 0 }, known)).toMatchObject({ saved: ["callrail"], currency: "USD", team: null, costs: { callrail: { unitPrice: null, seats: null, setup: null } } });
  });
  it("migrates the BuyerDesk key without ever writing to it", () => {
    const desk = JSON.stringify({ saved: ["pipedrive", "close", "bogus"], category: "crm", contexts: { crm: { intent: "switch", team: "", current: "HubSpot", concern: "price", note: "must export contacts" } } });
    const room = importFromDesk(desk, known);
    expect(room).toMatchObject({ saved: ["pipedrive", "close"], importedFromDesk: true, currentTool: { name: "HubSpot" }, note: "must export contacts" });
    expect(loadRoom(null, desk, known).saved).toEqual(["pipedrive", "close"]);
    // the room's own state wins once it exists
    const own = JSON.stringify({ ...emptyRoom(), saved: ["callrail"] });
    expect(loadRoom(own, desk, known).saved).toEqual(["callrail"]);
    expect(DESK_KEY).toBe("miloosh-buyer-desk-v1");
    expect(importFromDesk('{"saved":[]}', known)).toBeNull();
  });
  it("transitions are pure", () => {
    const a = toggleSaved(emptyRoom(), "callrail", known);
    const before = JSON.stringify(a);
    toggleCriterion(a, "api"); addCustom(a, "Zapier", "integration"); setCost(a, "callrail", { setup: 100 });
    expect(JSON.stringify(a)).toBe(before);
    expect(toggleCriterion(a, "not-builtin")).toBe(a);
  });
});

describe("cost model", () => {
  const withState = (patch: Partial<ReturnType<typeof emptyRoom>> = {}) => ({ ...emptyRoom(), saved: ["acme"], compare: ["acme"], ...patch });
  it("uses a verified per-seat price only with matching currency and a known team size", () => {
    const p = synthetic();
    const noTeam = computeProductCost(p, withState());
    expect(noTeam.complete).toBe(false);
    expect(noTeam.lines[0]!.amount).toBeNull();
    expect(noTeam.missing.join(" ")).toContain("team size");
    const r = computeProductCost(p, withState({ team: 5 }));
    expect(r.lines[0]).toMatchObject({ amount: 720 });
    expect(r.lines[0]!.formula).toBe("12 USD per month x 5 seats x 12 months");
    expect(r.assumptions.join(" ")).toContain("annual term");
  });
  it("never converts currency and treats blanks as unknown, not zero", () => {
    const basis = resolvePriceBasis(synthetic(), { unitPrice: null, perSeat: null, seats: null, setup: null, training: null, migration: null, other: null }, "EUR");
    expect(basis.kind).toBe("unknown");
    const r = computeProductCost(synthetic(), withState({ team: 2 }));
    expect(r.knownTotal).toBe(288);
    expect(r.lines.filter((l) => l.amount === null)).toHaveLength(4);
    expect(r.missing).toHaveLength(4);
  });
  it("adds the buyer's own one-time costs and marks the total complete only when everything is known", () => {
    const s = withState({ team: 3, costs: { acme: { unitPrice: null, perSeat: null, seats: null, setup: 100, training: 50, migration: 25, other: 0 } } });
    const r = computeProductCost(synthetic(), s);
    expect(r.knownTotal).toBe(432 + 175);
    expect(r.complete).toBe(true);
  });
  it("a user figure overrides the verified one and is labelled as theirs", () => {
    const r = computeProductCost(synthetic(), withState({ team: 2, costs: { acme: { unitPrice: 20, perSeat: true, seats: 4, setup: null, training: null, migration: null, other: null } } }));
    expect(r.basis.kind).toBe("user");
    expect(r.lines[0]!.amount).toBe(960);
  });
  it("never treats a price whose per-seat basis is not recorded as flat", () => {
    const p = synthetic({ pricing: { ...synthetic().pricing, entryPaid: { ...synthetic().pricing.entryPaid!, perSeat: null } } });
    const r = computeProductCost(p, withState({ team: 5 }));
    expect(r.basis.kind).toBe("unknown");
    expect(r.lines[0]!.amount).toBeNull();
    expect(r.missing.join(" ")).toContain("per seat or per account");
    const own = computeProductCost(p, withState({ team: 5, costs: { acme: { unitPrice: 10, perSeat: null, seats: null, setup: null, training: null, migration: null, other: null } } }));
    expect(own.basis.kind).toBe("unknown");
    expect(computeProductCost(p, withState({ team: 5, costs: { acme: { unitPrice: 10, perSeat: false, seats: null, setup: null, training: null, migration: null, other: null } } })).lines[0]!.amount).toBe(120);
    expect(computeProductCost(p, withState({ team: 5, costs: { acme: { unitPrice: 10, perSeat: true, seats: null, setup: null, training: null, migration: null, other: null } } })).lines[0]!.amount).toBe(600);
  });
  it("shows Unknown, never a false zero, when no cost line is known", () => {
    const p = synthetic({ pricing: { ...synthetic().pricing, status: "unknown", entryPaid: null } });
    expect(computeProductCost(p, withState()).knownTotal).toBeNull();
    expect(briefToText(buildBrief({ ...withState(), criteria: ["api"] }, [p], "2026-10-30"))).toContain("known parts only: Unknown");
  });
  it("contact-sales products have no price unless the buyer enters one", () => {
    const p = synthetic({ pricing: { ...synthetic().pricing, status: "contact_sales", entryPaid: null } });
    expect(resolvePriceBasis(p, { unitPrice: null, perSeat: null, seats: null, setup: null, training: null, migration: null, other: null }, "USD")).toMatchObject({ kind: "unknown" });
  });
  it("keep-current cost comes only from the buyer's own monthly figure", () => {
    expect(keepCurrentCost(emptyRoom()).yearlyCost).toBeNull();
    expect(keepCurrentCost({ ...emptyRoom(), currentTool: { name: "Sheets", monthlyCost: 30 } }).yearlyCost).toBe(360);
  });
});

describe("share link privacy", () => {
  it("carries only product ids and built-in criteria, never notes, costs, custom text or team", () => {
    const s = { ...emptyRoom(), saved: ["callrail", "ruler-analytics"], compare: ["callrail"], criteria: ["api", "sso"], custom: [{ id: "custom_1", label: "Our secret integration", kind: "integration" as const }], note: "ACME merger private", team: 40, currentTool: { name: "BigCo ERP", monthlyCost: 9000 }, costs: { callrail: { unitPrice: 1, perSeat: true, seats: 1, setup: 1, training: 1, migration: 1, other: 1 } } };
    const q = encodeShare(s);
    expect(q).toBe("p=callrail&c=api.sso");
    for (const secret of ["secret", "ACME", "BigCo", "9000", "40"]) expect(q).not.toContain(secret);
  });
  it("round-trips valid input and drops anything unknown or oversized", () => {
    const r = decodeShare("p=callrail.nope.ruler-analytics&c=api.evil.sso", known)!;
    expect(r.saved).toEqual(["callrail", "ruler-analytics"]);
    expect(r.criteria).toEqual(["api", "sso"]);
    expect(decodeShare("p=nope", known)).toBeNull();
    expect(decodeShare("c=api", known)).toBeNull();
    expect(decodeShare(`p=${"a".repeat(700)}`, known)).toBeNull();
  });
});

describe("decision brief", () => {
  const s = { ...emptyRoom(), saved: ["acme"], compare: ["acme"], criteria: ["api", "platform_android", "free_plan"], custom: [{ id: "custom_1", label: "Slack", kind: "integration" as const }], team: 3, note: "Needs export" };
  const brief = buildBrief(s, [synthetic()], "2026-10-30");
  const text = briefToText(brief);
  it("separates verified, documented and unknown and lists the open questions", () => {
    expect(text).toContain("VERIFIED (no)");
    expect(text).toContain("DOCUMENTED, LIMITED (yes)");
    expect(text).toContain("UNKNOWN");
    expect(brief.unresolved.some((u) => u.includes("Slack"))).toBe(true);
    expect(brief.unresolved.some((u) => u.includes("Android"))).toBe(true);
  });
  it("always offers the keep-current outcome, cost formulas, assumptions, dated sources and next steps", () => {
    expect(text).toContain("KEEP YOUR CURRENT TOOL / DO NOT BUY YET");
    expect(text).toContain("[12 USD per month x 3 seats x 12 months]");
    expect(text).toContain("Assumption:");
    expect(text).toContain("https://acme.example/pricing (checked 2026-10-02)");
    expect(text).toContain("NEXT STEPS");
    expect(text).toContain("not a vendor quote");
  });
  it("makes no recommendation, ranking or score", () => {
    expect(text).not.toMatch(/\b(best|winner|top pick|we recommend|score|rank(ed|ing)?)\b/i);
  });
});

describe("source labels", () => {
  it("tells two sources on the same site apart and never repeats a URL", () => {
    const p = synthetic({ sources: ["https://acme.example/docs", "https://acme.example/pricing", "https://acme.example/docs"] });
    const e = evaluateCriterion(p, { id: "api", label: "Documents an API" });
    expect(e.sources.map((s) => s.label)).toEqual(["acme.example/docs", "acme.example/pricing"]);
    expect(new Set(e.sources.map((s) => s.url)).size).toBe(e.sources.length);
  });
});
