import { describe, expect, it } from "vitest";
import { evaluateCriterion } from "@/lib/decision-room/criteria";
import { cleanRoom, emptyRoom } from "@/lib/decision-room/state";
import { keepCurrentCost } from "@/lib/decision-room/cost";
import { buildBrief } from "@/lib/decision-room/brief";
import type { RoomProduct } from "@/lib/decision-room/types";

const known = () => true;
const base = (over: Partial<RoomProduct> = {}): RoomProduct => ({
  slug: "acme", name: "Acme", category: "crm", categoryName: "CRM", bestFor: "small teams", description: "Acme CRM for small teams.", features: [], pros: [], cons: [], platforms: ["Web"], tags: [], faq: [], sources: ["https://acme.example/docs"], accessedAt: "2026-10-01", website: "https://acme.example",
  pricing: { status: "verified", model: "paid", startingPrice: "$12/user/month", freePlan: false, freeTrial: { available: false, days: null }, entryPaid: { amount: 12, currency: "USD", billingPeriod: "annual", perSeat: true, annualBillingRequired: false }, enterpriseContactSales: null, lastVerified: "2026-10-02", officialSource: "https://acme.example/pricing" },
  cta: { href: "https://acme.example", rel: "noopener noreferrer", disclosure: false }, ...over,
});

describe("typing into free-text fields is never undone", () => {
  it("keeps a trailing space and line breaks in the current-tool name and the note while the buyer is typing", () => {
    const room = cleanRoom({ ...emptyRoom(), currentTool: { name: "Sales ", monthlyCost: null }, note: "First line\nSecond line " }, known);
    expect(room.currentTool.name).toBe("Sales ");
    expect(room.note).toBe("First line\nSecond line ");
    const next = cleanRoom({ ...room, currentTool: { name: `${room.currentTool.name}force`, monthlyCost: null } }, known);
    expect(next.currentTool.name).toBe("Sales force");
  });
  it("still bounds length, collapses runs of spaces and strips control characters", () => {
    const room = cleanRoom({ ...emptyRoom(), currentTool: { name: `A   B\u0007${"x".repeat(200)}`, monthlyCost: null }, note: `a\n\n\n\n\nb${"y".repeat(900)}` }, known);
    expect(room.currentTool.name.startsWith("A B")).toBe(true);
    expect(room.currentTool.name).not.toContain("\u0007");
    expect(room.currentTool.name.length).toBeLessThanOrEqual(80);
    expect(room.note.startsWith("a\n\nb")).toBe(true);
    expect(room.note.length).toBeLessThanOrEqual(500);
  });
  it("trims where the value is used, so a stray space never reaches the brief or the cost label", () => {
    const state = cleanRoom({ ...emptyRoom(), saved: ["acme"], compare: ["acme"], currentTool: { name: "  Salesforce CRM  ", monthlyCost: 50 }, note: "  keep it simple  " }, known);
    expect(keepCurrentCost(state).name).toBe("Salesforce CRM");
    expect(buildBrief(state, [base()], "2026-10-31").requirements.note).toBe("keep it simple");
  });
});

describe("keyword evidence never turns a question or a negation into a documented yes", () => {
  it("ignores FAQ questions and reads answers only", () => {
    const p = base({ faq: [{ question: "Does it have an API?", answer: "No, only CSV files." }] });
    expect(evaluateCriterion(p, { id: "api", label: "Documents an API" }).status).toBe("unknown");
  });
  it("treats a nearby negation as unknown, not as documentation", () => {
    for (const text of ["No public API", "SSO is not supported on this plan", "Does not offer single sign-on", "Export unavailable"]) {
      const id = /sign-on|SSO/i.test(text) ? "sso" : /Export/i.test(text) ? "import_export" : "api";
      expect(evaluateCriterion(base({ features: [text] }), { id, label: id }).status, text).toBe("unknown");
    }
  });
  it("still documents a plain positive mention, and a negated mention does not hide a positive one elsewhere", () => {
    expect(evaluateCriterion(base({ features: ["REST API with webhooks"] }), { id: "api", label: "api" }).status).toBe("documented_limited");
    expect(evaluateCriterion(base({ features: ["No public API", "SAML single sign-on"] }), { id: "sso", label: "sso" }).status).toBe("documented_limited");
    expect(evaluateCriterion(base({ features: ["No public API", "GraphQL API for partners"] }), { id: "api", label: "api" }).status).toBe("documented_limited");
  });
  it("applies the same rule to a buyer's custom requirement", () => {
    expect(evaluateCriterion(base({ features: ["No Slack integration"] }), { id: "custom_1", label: "Slack", kind: "integration" }).status).toBe("unknown");
  });
});
