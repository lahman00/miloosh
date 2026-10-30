import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getAllSoftware } from "@/data/software";
import { buildRoomIndex } from "@/lib/decision-room/products";
import { DESK_KEY, ROOM_KEY, emptyRoom, type RoomState } from "@/lib/decision-room/state";
import {
  LAB_KEY, LAB_MAX_CHECKS, LAB_MAX_ITEM_NOTE, LAB_MAX_LABEL, LAB_MAX_PRODUCTS, LAB_MAX_PRODUCT_NOTE, LAB_MAX_RAW, LAB_MAX_REQUIREMENTS, LAB_MAX_TASKS,
  PRESET_CHECKS, PRESET_TASKS, addItem, addRequirement, emptyLab, importRoomRequirements, labToText, nextSteps, parseLab, pruneProducts,
  removeItem, restorePresets, selectLabProducts, serializeLab, setCheckResult, setProductNote, setRequirementResult, setTaskResult, summarizeProduct,
  type LabState,
} from "@/lib/decision-room/switching-lab";
import { deriveLab } from "@/app/decision-room/switching-lab/_components/useLab";
import { SwitchingLab } from "@/app/decision-room/switching-lab/_components/SwitchingLab";
import { metadata } from "@/app/decision-room/switching-lab/page";

const all = getAllSoftware().map((s) => s.slug);
const slugSet = new Set(all);
const known = (s: string) => slugSet.has(s);
const [A, B, C, D, E] = all as [string, string, string, string, string];
const room = (patch: Partial<RoomState>): RoomState => ({ ...emptyRoom(), ...patch });
const read = (f: string) => readFileSync(f, "utf8");

describe("presets and keys", () => {
  it("uses its own key, distinct from the Decision Room and BuyerDesk", () => {
    expect(LAB_KEY).toBe("miloosh-switching-lab-v1");
    expect([ROOM_KEY, DESK_KEY]).not.toContain(LAB_KEY);
  });
  it("starts from the generic buyer-run presets with nothing recorded", () => {
    const s = emptyLab();
    expect(s.tasks.map((t) => t.id)).toEqual(PRESET_TASKS.map((t) => t.id));
    expect(s.checks.map((c) => c.id)).toEqual(["export", "restore", "permissions", "integrations", "termination", "rollback"]);
    expect(s.requirements).toEqual([]);
    expect(s.products).toEqual({});
    expect(JSON.stringify([PRESET_TASKS, PRESET_CHECKS])).not.toMatch(/miloosh (tested|verified)|we tested/i);
  });
});

describe("parsing persisted state", () => {
  it("gives the presets for missing, broken, oversized or other-version storage", () => {
    for (const raw of [null, "", "{", "[]", "42", '"x"', "null", JSON.stringify({ version: 2, tasks: [] }), JSON.stringify({ version: "1" }), "x".repeat(LAB_MAX_RAW + 1)]) {
      expect(parseLab(raw, known)).toEqual(emptyLab());
    }
  });
  it("round-trips a recorded lab across a reload", () => {
    let s = addRequirement(emptyLab(), "Works with our accounting tool", "deal_breaker");
    s = setTaskResult(s, A, [A, B], "import_sample", { status: "WORKED", note: "Dates kept\nall 40 rows" });
    s = setCheckResult(s, B, [A, B], "termination", { status: "BLOCKER", note: "12-month notice" });
    s = setRequirementResult(s, A, [A, B], "req_1", { status: "VERIFIED_BY_BUYER" }, true);
    s = setProductNote(s, B, [A, B], "Sales call on Friday ");
    const back = parseLab(serializeLab(s), known);
    expect(back).toEqual(s);
    expect(back.products[B]!.note).toBe("Sales call on Friday ");
  });
  it("drops unknown or malformed products, statuses, items and results field by field", () => {
    const raw = {
      version: 1,
      tasks: [{ id: "import_sample", label: "Import" }, { id: "import_sample", label: "Dup id" }, { id: "x2", label: "import" }, { id: "BAD ID", label: "Nope" }, { id: "ok_2", label: "a" }, "str", null],
      checks: "not an array",
      requirements: [{ id: "req_1", label: "SSO", kind: "deal_breaker" }, { id: "req_2", label: "API", kind: "weird" }],
      products: {
        [A]: { tasks: { import_sample: { status: "WORKED", note: 5 }, ghost: { status: "WORKED" }, x2: { status: "PASSED" } }, checks: { export: { status: "READY" } }, requirements: { req_1: { status: "VERIFIED_BY_BUYER", note: "seen" }, req_2: "x" }, note: ["x"] },
        "not-a-real-product-zzz": { note: "keep?" },
        "../etc/passwd": {},
        [B]: "not an object",
      },
    };
    const s = parseLab(JSON.stringify(raw), known);
    expect(s.tasks).toEqual([{ id: "import_sample", label: "Import" }]);
    expect(s.checks).toEqual([]);
    expect(s.requirements).toEqual([{ id: "req_1", label: "SSO", kind: "deal_breaker" }, { id: "req_2", label: "API", kind: "must_have" }]);
    expect(Object.keys(s.products)).toEqual([A]);
    expect(s.products[A]).toEqual({ tasks: { import_sample: { status: "WORKED", note: "" } }, checks: {}, requirements: { req_1: { status: "VERIFIED_BY_BUYER", note: "seen" } }, note: "" });
  });
  it("bounds the number of items, products and the length of every string", () => {
    const many = (n: number, p: string) => Array.from({ length: n }, (_, i) => ({ id: `${p}_${i}`, label: `${p} item ${i} ${"y".repeat(200)}` }));
    const products = Object.fromEntries(all.slice(0, 20).map((slug) => [slug, { tasks: {}, checks: {}, requirements: {}, note: "n".repeat(5000) }]));
    const s = parseLab(JSON.stringify({ version: 1, tasks: many(30, "t"), checks: many(30, "c"), requirements: many(30, "r"), products }), known);
    expect(s.tasks).toHaveLength(LAB_MAX_TASKS);
    expect(s.checks).toHaveLength(LAB_MAX_CHECKS);
    expect(s.requirements).toHaveLength(LAB_MAX_REQUIREMENTS);
    expect(Object.keys(s.products)).toHaveLength(LAB_MAX_PRODUCTS);
    expect(Math.max(...s.tasks.map((t) => t.label.length))).toBeLessThanOrEqual(LAB_MAX_LABEL);
    expect(s.products[all[0]!]!.note).toHaveLength(LAB_MAX_PRODUCT_NOTE);
  });
  it("never writes a lab larger than it can read back, even when every note is made of JSON-escaped characters", () => {
    let s: LabState = emptyLab();
    for (let i = s.tasks.length; i < LAB_MAX_TASKS; i++) s = addItem(s, "tasks", `Task ${i} ${'"'.repeat(70)}`);
    for (let i = s.checks.length; i < LAB_MAX_CHECKS; i++) s = addItem(s, "checks", `Check ${i} ${"\\".repeat(70)}`);
    for (let i = 0; i < LAB_MAX_REQUIREMENTS; i++) s = addRequirement(s, `Req ${i} ${'"'.repeat(70)}`, "must_have");
    const slugs = all.slice(0, LAB_MAX_PRODUCTS);
    const note = '"\\\n'.repeat(LAB_MAX_ITEM_NOTE);
    for (const slug of slugs) {
      for (const t of s.tasks) s = setTaskResult(s, slug, slugs, t.id, { status: "FAILED", note });
      for (const c of s.checks) s = setCheckResult(s, slug, slugs, c.id, { status: "BLOCKER", note });
      for (const q of s.requirements) s = setRequirementResult(s, slug, slugs, q.id, { status: "BLOCKER", note });
      s = setProductNote(s, slug, slugs, '"'.repeat(LAB_MAX_PRODUCT_NOTE * 2));
    }
    const json = serializeLab(s);
    expect(json).not.toBeNull();
    expect(json!.length).toBeLessThanOrEqual(LAB_MAX_RAW);
    expect(parseLab(json, known)).toEqual(s);
  });
});

describe("which products to test (read from the Decision Room, never written)", () => {
  it("uses the comparison first, else the shortlist, at most four", () => {
    expect(selectLabProducts(room({ saved: [A, B, C, D, E], compare: [C, A] }))).toEqual({ slugs: [C, A], source: "compare" });
    expect(selectLabProducts(room({ saved: [A, B, C, D, E], compare: [] }))).toEqual({ slugs: [A, B, C, D], source: "saved" });
    expect(selectLabProducts(room({}))).toEqual({ slugs: [], source: "none" });
    expect(selectLabProducts(null)).toEqual({ slugs: [], source: "none" });
  });
  const index = new Map(buildRoomIndex().map((e) => [e.slug, { slug: e.slug, name: e.name, categoryName: e.categoryName }]));
  const snap = (lab: unknown, rm: unknown, desk: unknown = null, broken = false) => JSON.stringify([lab === null ? null : JSON.stringify(lab), rm === null ? null : JSON.stringify(rm), desk === null ? null : JSON.stringify(desk), broken]);
  it("derives names from the real index, drops unknown and duplicate slugs, and keeps the Decision Room's order", () => {
    const d = deriveLab(snap(null, { ...emptyRoom(), saved: [B, A, "fake-product-x", A], compare: [B, A, "fake-product-x"] }), index);
    expect(d.products.map((p) => p.slug)).toEqual([B, A]);
    expect(d.products[0]!.name).toBe(index.get(B)!.name);
    expect(d.source).toBe("compare");
    expect(d.lab).toEqual(emptyLab());
  });
  it("shows the same products the Decision Room shows from a one-time BuyerDesk import", () => {
    expect(deriveLab(snap(null, null, { saved: [A, B] }), index).products.map((p) => p.slug)).toEqual([A, B]);
  });
  it("has an empty state when nothing is chosen, and reports blocked storage", () => {
    const d = deriveLab(snap(null, null, null, true), index);
    expect(d.products).toEqual([]);
    expect(d.source).toBe("none");
    expect(d.storageProblem).toBe(true);
  });
});

describe("editing the plan", () => {
  it("adds custom tasks within bounds, rejects duplicates and blanks, and restores presets", () => {
    let s = addItem(emptyLab(), "tasks", "  Run payroll   for one week ");
    expect(s.tasks.at(-1)).toEqual({ id: "own_task_1", label: "Run payroll for one week" });
    expect(addItem(s, "tasks", "run payroll for one week")).toBe(s);
    expect(addItem(s, "tasks", " ")).toBe(s);
    for (let i = 0; i < 20; i++) s = addItem(s, "tasks", `Extra ${i}`);
    expect(s.tasks).toHaveLength(LAB_MAX_TASKS);
    s = removeItem(removeItem(emptyLab(), "checks", "export"), "checks", "rollback");
    expect(s.checks.map((c) => c.id)).not.toContain("export");
    expect(restorePresets(s, "checks").checks.map((c) => c.id)).toEqual(expect.arrayContaining(["export", "rollback"]));
  });
  it("removing an item deletes its results so a later item never inherits them", () => {
    let s = addItem(emptyLab(), "tasks", "Own one");
    s = setTaskResult(s, A, [A], "own_task_1", { status: "FAILED", note: "broke" });
    s = removeItem(s, "tasks", "own_task_1");
    expect(s.products[A]!.tasks).toEqual({});
    s = addItem(s, "tasks", "Own two");
    expect(summarizeProduct(s, A, "A").tasks.failed).toBe(0);
  });
  it("carries Decision Room requirements over as must-haves without changing the room", () => {
    const rm = room({ criteria: ["sso", "api"], custom: [{ id: "c1", label: "Shopify sync", kind: "integration" }] });
    const before = JSON.stringify(rm);
    const s = importRoomRequirements(emptyLab(), rm);
    expect(s.requirements.map((r) => [r.label, r.kind])).toEqual([["Documents an API", "must_have"], ["Documents single sign-on (SSO)", "must_have"], ["Shopify sync", "must_have"]]);
    expect(JSON.stringify(rm)).toBe(before);
    expect(importRoomRequirements(s, rm)).toEqual(s);
  });
});

describe("recording results", () => {
  it("only records for products being tested (or already holding results) and for items in the plan", () => {
    const s = emptyLab();
    expect(setTaskResult(s, C, [A], "import_sample", { status: "WORKED" })).toBe(s);
    expect(setTaskResult(s, A, [A], "no_such_task", { status: "WORKED" })).toBe(s);
    expect(setTaskResult(s, A, [A], "import_sample", { status: "SUPERB" as never })).toBe(s);
  });
  it("never marks a requirement as verified by the buyer without an explicit confirmation", () => {
    const s = addRequirement(emptyLab(), "SSO with Okta", "must_have");
    expect(setRequirementResult(s, A, [A], "req_1", { status: "VERIFIED_BY_BUYER" })).toBe(s);
    expect(setRequirementResult(s, A, [A], "req_1", { status: "VERIFIED_BY_BUYER" }, true).products[A]!.requirements.req_1!.status).toBe("VERIFIED_BY_BUYER");
    expect(setRequirementResult(s, A, [A], "req_1", { status: "BLOCKER" }).products[A]!.requirements.req_1!.status).toBe("BLOCKER");
  });
  it("keeps results for products taken out of the comparison, up to the cap, active ones first", () => {
    let s = emptyLab();
    const slugs = all.slice(0, LAB_MAX_PRODUCTS + 3);
    for (const slug of slugs) s = setProductNote(s, slug, [slug], "n");
    expect(Object.keys(s.products)).toHaveLength(slugs.length);
    const pruned = pruneProducts(s, [slugs[0]!]);
    expect(Object.keys(pruned.products)).toHaveLength(LAB_MAX_PRODUCTS);
    expect(Object.keys(pruned.products)).toContain(slugs[0]);
    expect(Object.keys(pruned.products)).toContain(slugs.at(-1));
  });
});

describe("decision summary", () => {
  let s = addRequirement(addRequirement(emptyLab(), "SSO", "must_have"), "Data stays in EU", "deal_breaker");
  it("is not started with nothing recorded, and counts everything as untested", () => {
    const p = summarizeProduct(s, A, "Alpha");
    expect(p.verdict).toBe("NOT_STARTED");
    expect(p.untested).toHaveLength(PRESET_TASKS.length + PRESET_CHECKS.length + 2);
    expect(p.tasks).toEqual({ worked: 0, failed: 0, notTested: 5, total: 5 });
  });
  it("separates worked, blocked and untested, and any blocker wins", () => {
    s = setTaskResult(s, A, [A], "import_sample", { status: "WORKED", note: "fine " });
    expect(summarizeProduct(s, A, "Alpha").verdict).toBe("IN_PROGRESS");
    s = setRequirementResult(s, A, [A], "req_2", { status: "BLOCKER" });
    const p = summarizeProduct(s, A, "Alpha");
    expect(p.verdict).toBe("BLOCKED");
    expect(p.succeeded).toEqual([{ area: "Trial task", label: PRESET_TASKS[0]!.label, note: "fine" }]);
    expect(p.blocked).toEqual([{ area: "Deal breaker", label: "Data stays in EU", note: "" }]);
    expect(p.requirements).toEqual({ verified: 0, blocker: 1, notTested: 1, total: 2 });
  });
  it("calls a fully clear product only what the buyer reported, never a Miloosh result", () => {
    let t = addRequirement(emptyLab(), "SSO", "must_have");
    for (const x of t.tasks) t = setTaskResult(t, B, [B], x.id, { status: "WORKED" });
    for (const x of t.checks) t = setCheckResult(t, B, [B], x.id, { status: "READY" });
    t = setRequirementResult(t, B, [B], "req_1", { status: "VERIFIED_BY_BUYER" }, true);
    const p = summarizeProduct(t, B, "Beta");
    expect(p.verdict).toBe("ALL_REPORTED_CLEAR");
    expect(p.untested).toEqual([]);
    expect(nextSteps([p]).join(" ")).toMatch(/Decision Room brief/);
  });
});

describe("plain-text trial appendix", () => {
  it("holds names, statuses, migration risks, buyer notes, next steps and the not-a-substitute notice", () => {
    let s = setCheckResult(emptyLab(), A, [A, B], "termination", { status: "BLOCKER", note: "Renews 1 March" });
    s = setTaskResult(s, B, [A, B], "role_access", { status: "WORKED" });
    s = setProductNote(s, A, [A, B], "Ask about\nexit fees");
    const txt = labToText(s, [{ slug: A, name: "Alpha CRM" }, { slug: B, name: "Beta CRM" }], "2026-10-30");
    expect(txt).toContain("BUYER TRIAL APPENDIX");
    expect(txt).toContain("Miloosh did not run these tests and no vendor has verified them");
    expect(txt).toContain("does not replace the sourced Decision Room brief");
    expect(txt).toContain("== Alpha CRM ==");
    expect(txt).toMatch(/\[BLOCKER \(you reported\)\] Termination: .*\n {4}Your note: Renews 1 March/);
    expect(txt).toContain("[WORKED (you reported)] Invite a second user");
    expect(txt).toContain("Your notes on Alpha CRM: Ask about exit fees");
    expect(txt).toContain("Alpha CRM: resolve or rule out 1 blocked item");
    expect(txt).not.toMatch(/undefined|NaN|\[object|score|rank/i);
  });
  it("explains the empty case", () => {
    expect(labToText(emptyLab(), [], "2026-10-30")).toContain("No products selected. Choose products in the Decision Room first.");
  });
});

describe("route and entry link", () => {
  it("is noindex, follow with its own canonical", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe("/decision-room/switching-lab");
    expect(metadata.title).toBe("Switching Lab");
  });
  it("server-renders a loading state, one h1 and a way back, without reading storage", () => {
    const html = renderToStaticMarkup(createElement(SwitchingLab, { index: [{ slug: A, name: "Alpha", categoryName: "CRM" }] }));
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/decision-room"');
    expect(html).toContain("Loading your saved trial");
    expect(html).toContain('aria-label="Switching Lab steps"');
    expect(html).not.toMatch(/undefined|NaN|\[object/);
    expect(html).not.toMatch(/\b(best|top pick|winner|we recommend)\b/i);
  });
  it("is linked from the isolated Decision Room component only, with no sitemap or shared-template change", () => {
    expect(read("app/decision-room/_components/DecisionRoom.tsx")).toContain('href="/decision-room/switching-lab"');
    for (const f of ["app/sitemap.ts", "app/layout.tsx", "app/page.tsx", "app/software/[slug]/page.tsx", "app/compare/[comparison]/page.tsx", "app/category/[slug]/page.tsx", "app/robots.ts"]) {
      let code = ""; try { code = read(f); } catch { continue; }
      expect(code, f).not.toContain("switching-lab");
    }
  });
});
