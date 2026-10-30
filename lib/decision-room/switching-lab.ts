import { BUILTIN_CRITERIA } from "./criteria";
import { ROOM_MAX_COMPARE, type RoomState, type SlugCheck } from "./state";

/**
 * Switching Lab (2026-10-30): the hands-on stage after the Decision Room. The buyer plans a short trial, records what THEY observed for
 * each product and checks the migration risks. Nothing here is a Miloosh test or a vendor verification: every outcome is what the buyer
 * reported, and untested stays untested. No score, no percentage and no ranking.
 *
 * Lives only in this browser under its own key. The Decision Room key is read (never written) to know which products to test.
 */
export const LAB_KEY = "miloosh-switching-lab-v1";
/** Larger than the biggest lab the bounds below allow, even if every note is made of characters JSON escapes (tested), so a full lab is never discarded on reload. */
export const LAB_MAX_RAW = 200_000;
export const LAB_MAX_TASKS = 10;
export const LAB_MAX_CHECKS = 10;
export const LAB_MAX_REQUIREMENTS = 8;
/** Results are kept for a few more products than are tested at once, so taking a product out of the comparison does not erase its notes. */
export const LAB_MAX_PRODUCTS = 8;
export const LAB_MAX_LABEL = 128;
export const LAB_MAX_ITEM_NOTE = 240;
export const LAB_MAX_PRODUCT_NOTE = 600;

export type TrialOutcome = "NOT_TESTED" | "WORKED" | "FAILED";
export type MigrationStatus = "NOT_CHECKED" | "READY" | "BLOCKER";
export type RequirementOutcome = "NOT_TESTED" | "VERIFIED_BY_BUYER" | "BLOCKER";
export const TRIAL_OUTCOMES: readonly TrialOutcome[] = ["NOT_TESTED", "WORKED", "FAILED"];
export const MIGRATION_STATUSES: readonly MigrationStatus[] = ["NOT_CHECKED", "READY", "BLOCKER"];
export const REQUIREMENT_OUTCOMES: readonly RequirementOutcome[] = ["NOT_TESTED", "VERIFIED_BY_BUYER", "BLOCKER"];

export type LabItem = { id: string; label: string };
export type RequirementKind = "must_have" | "deal_breaker";
export type LabRequirement = LabItem & { kind: RequirementKind };

export type Result<S extends string> = { status: S; note: string };
export type ProductResults = {
  tasks: Record<string, Result<TrialOutcome>>;
  checks: Record<string, Result<MigrationStatus>>;
  requirements: Record<string, Result<RequirementOutcome>>;
  /** Private to this browser. Never put in a link, a share URL or an event. */
  note: string;
};

export type LabState = {
  version: 1;
  tasks: LabItem[];
  checks: LabItem[];
  requirements: LabRequirement[];
  products: Record<string, ProductResults>;
};

/** Generic trial tasks the BUYER runs in a free trial or demo account. Editable: remove any, restore them, add your own. */
export const PRESET_TASKS: readonly LabItem[] = [
  { id: "import_sample", label: "Import a small sample from your current tool and check that fields and dates survived" },
  { id: "recreate_workflow", label: "Recreate one everyday workflow end to end" },
  { id: "role_access", label: "Invite a second user with a limited role and confirm what they can and cannot see" },
  { id: "integration", label: "Connect one integration you rely on and pass one real record through it" },
  { id: "export_sample", label: "Export that sample again and open the file, so you know you can leave" },
];

/** Migration risks the BUYER checks before switching. Editable the same way. */
export const PRESET_CHECKS: readonly LabItem[] = [
  { id: "export", label: "Export: your current tool exports everything you need (records, files, history) in a usable format" },
  { id: "restore", label: "Restore: a test import restores that data without retyping" },
  { id: "permissions", label: "Permissions: roles and access for your team can be rebuilt" },
  { id: "integrations", label: "Integrations: every integration you depend on has a replacement or a plan" },
  { id: "termination", label: "Termination: you know the current contract's notice period, renewal date and cancellation terms" },
  { id: "rollback", label: "Rollback: you can return to the old tool if the switch fails, and know until when" },
];

export const emptyLab = (): LabState => ({ version: 1, tasks: PRESET_TASKS.map((t) => ({ ...t })), checks: PRESET_CHECKS.map((c) => ({ ...c })), requirements: [], products: {} });
export const emptyResults = (): ProductResults => ({ tasks: {}, checks: {}, requirements: {}, note: "" });

/** Keys that must never be copied from stored JSON into an object, even when they look like valid ids. */
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor", "hasOwnProperty", "toString", "valueOf"]);
export const isSafeKey = (k: string) => !FORBIDDEN_KEYS.has(k);
const ID = /^[a-z0-9_]{1,40}$/;
const SLUG = /^[a-z0-9-]{1,80}$/;

// Control characters and bidirectional overrides could disguise text in a downloaded file; ordinary line breaks are kept in notes.
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;
/** Notes are cleaned but not trimmed, so typing a space or a new line in a field that saves on every keystroke is never eaten. */
export const cleanNote = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(UNSAFE_CHARS, "").replace(/\r\n?/g, "\n").slice(0, max) : "");
export const cleanLabel = (v: unknown): string => (typeof v === "string" ? v.replace(UNSAFE_CHARS, "").replace(/\s+/g, " ").trim().slice(0, LAB_MAX_LABEL) : "");

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const ownKeys = (v: Record<string, unknown>) => Object.keys(v).filter(isSafeKey);

function cleanItems(value: unknown, max: number): LabItem[] {
  if (!Array.isArray(value)) return [];
  const out: LabItem[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const id = typeof raw.id === "string" && ID.test(raw.id) && isSafeKey(raw.id) ? raw.id : null;
    const label = cleanLabel(raw.label);
    if (!id || label.length < 2 || out.some((i) => i.id === id || i.label.toLowerCase() === label.toLowerCase())) continue;
    out.push({ id, label });
    if (out.length >= max) break;
  }
  return out;
}

function cleanRequirements(value: unknown): LabRequirement[] {
  const items = cleanItems(value, LAB_MAX_REQUIREMENTS);
  const kinds = new Map<string, RequirementKind>();
  if (Array.isArray(value)) for (const raw of value) if (isRecord(raw) && typeof raw.id === "string" && !kinds.has(raw.id)) kinds.set(raw.id, raw.kind === "deal_breaker" ? "deal_breaker" : "must_have");
  return items.map((i) => ({ ...i, kind: kinds.get(i.id) ?? "must_have" }));
}

function cleanResultMap<S extends string>(value: unknown, ids: readonly LabItem[], allowed: readonly S[]): Record<string, Result<S>> {
  const out: Record<string, Result<S>> = {};
  if (!isRecord(value)) return out;
  for (const key of ownKeys(value)) {
    if (!ids.some((i) => i.id === key)) continue;
    const r = value[key];
    if (!isRecord(r)) continue;
    const status = allowed.includes(r.status as S) ? (r.status as S) : allowed[0]!;
    const note = cleanNote(r.note, LAB_MAX_ITEM_NOTE);
    if (status !== allowed[0] || note) out[key] = { status, note };
  }
  return out;
}

/** Defensive: anything that is not exactly what we write is dropped field by field. A corrupted value never crashes the lab. */
export function cleanLab(input: unknown, isKnown: SlugCheck): LabState {
  const r = isRecord(input) ? input : {};
  // An older or newer format is not guessed at: start from the presets rather than misread someone's results.
  if (r.version !== 1) return emptyLab();
  const tasks = cleanItems(r.tasks, LAB_MAX_TASKS);
  const checks = cleanItems(r.checks, LAB_MAX_CHECKS);
  const requirements = cleanRequirements(r.requirements);
  const products: Record<string, ProductResults> = {};
  if (isRecord(r.products)) {
    for (const slug of ownKeys(r.products)) {
      if (!SLUG.test(slug) || !isKnown(slug)) continue;
      const p = r.products[slug];
      if (!isRecord(p)) continue;
      products[slug] = {
        tasks: cleanResultMap(p.tasks, tasks, TRIAL_OUTCOMES),
        checks: cleanResultMap(p.checks, checks, MIGRATION_STATUSES),
        requirements: cleanResultMap(p.requirements, requirements, REQUIREMENT_OUTCOMES),
        note: cleanNote(p.note, LAB_MAX_PRODUCT_NOTE),
      };
      if (Object.keys(products).length >= LAB_MAX_PRODUCTS) break;
    }
  }
  return { version: 1, tasks, checks, requirements, products };
}

/** What is written to storage. Null when it would not be read back (over the cap), so the caller can warn instead of losing data later. */
export function serializeLab(s: LabState): string | null {
  const json = JSON.stringify(s);
  return json.length > LAB_MAX_RAW ? null : json;
}

/** Missing, unreadable or oversized storage gives the presets, never an exception. */
export function parseLab(raw: string | null, isKnown: SlugCheck): LabState {
  if (!raw || raw.length > LAB_MAX_RAW) return emptyLab();
  try { return cleanLab(JSON.parse(raw), isKnown); } catch { return emptyLab(); }
}

export type LabSource = "compare" | "saved" | "none";

/** Which products to test: the Decision Room's comparison first, else its first saved products, at most four. Read-only. */
export function selectLabProducts(room: RoomState | null): { slugs: string[]; source: LabSource } {
  if (room && room.compare.length > 0) return { slugs: room.compare.slice(0, ROOM_MAX_COMPARE), source: "compare" };
  if (room && room.saved.length > 0) return { slugs: room.saved.slice(0, ROOM_MAX_COMPARE), source: "saved" };
  return { slugs: [], source: "none" };
}

/** Keeps results for the products being tested plus the most recent others, up to the cap. */
export function pruneProducts(s: LabState, active: readonly string[]): LabState {
  const keys = Object.keys(s.products);
  if (keys.length <= LAB_MAX_PRODUCTS) return s;
  const keep = [...active.filter((k) => keys.includes(k)), ...keys.filter((k) => !active.includes(k)).reverse()].slice(0, LAB_MAX_PRODUCTS);
  const products: Record<string, ProductResults> = {};
  for (const k of keys) if (keep.includes(k)) products[k] = s.products[k]!;
  return { ...s, products };
}

// ---- Editing the plan --------------------------------------------------------------------------------------------------------------

const nextId = (prefix: string, items: readonly LabItem[]) => {
  let n = 1;
  while (items.some((i) => i.id === `${prefix}_${n}`)) n += 1;
  return `${prefix}_${n}`;
};

type ListKey = "tasks" | "checks";
const LIST_MAX: Record<ListKey, number> = { tasks: LAB_MAX_TASKS, checks: LAB_MAX_CHECKS };
const PRESETS: Record<ListKey, readonly LabItem[]> = { tasks: PRESET_TASKS, checks: PRESET_CHECKS };

export function addItem(s: LabState, list: ListKey, label: string): LabState {
  const clean = cleanLabel(label);
  const items = s[list];
  if (clean.length < 2 || items.length >= LIST_MAX[list] || items.some((i) => i.label.toLowerCase() === clean.toLowerCase())) return s;
  return { ...s, [list]: [...items, { id: nextId(list === "tasks" ? "own_task" : "own_check", items), label: clean }] };
}

/** Removing an item also removes its recorded results, so a later item can never inherit them. */
export function removeItem(s: LabState, list: ListKey | "requirements", id: string): LabState {
  const field = list === "tasks" ? "tasks" : list === "checks" ? "checks" : "requirements";
  const products: Record<string, ProductResults> = {};
  for (const [slug, p] of Object.entries(s.products)) {
    const map = { ...p[field] } as Record<string, unknown>;
    delete map[id];
    products[slug] = { ...p, [field]: map };
  }
  return { ...s, [field]: (s[field] as LabItem[]).filter((i) => i.id !== id), products } as LabState;
}

export function restorePresets(s: LabState, list: ListKey): LabState {
  const items = [...s[list]];
  for (const p of PRESETS[list]) if (items.length < LIST_MAX[list] && !items.some((i) => i.id === p.id || i.label.toLowerCase() === p.label.toLowerCase())) items.push({ ...p });
  return { ...s, [list]: items };
}

export function addRequirement(s: LabState, label: string, kind: RequirementKind): LabState {
  const clean = cleanLabel(label);
  if (clean.length < 2 || s.requirements.length >= LAB_MAX_REQUIREMENTS || s.requirements.some((r) => r.label.toLowerCase() === clean.toLowerCase())) return s;
  return { ...s, requirements: [...s.requirements, { id: nextId("req", s.requirements), label: clean, kind: kind === "deal_breaker" ? "deal_breaker" : "must_have" }] };
}

/** Carries the Decision Room's requirements over as must-haves to test. The room itself is not changed. */
export function importRoomRequirements(s: LabState, room: RoomState | null): LabState {
  if (!room) return s;
  const labels = [...BUILTIN_CRITERIA.filter((c) => room.criteria.includes(c.id)).map((c) => c.label), ...room.custom.map((c) => c.label)];
  return labels.reduce((acc, l) => addRequirement(acc, l, "must_have"), s);
}

// ---- Recording results -------------------------------------------------------------------------------------------------------------

const knownSlug = (s: LabState, slug: string, active: readonly string[]) => SLUG.test(slug) && isSafeKey(slug) && (active.includes(slug) || Object.hasOwn(s.products, slug));

function patchResult<S extends string>(s: LabState, slug: string, active: readonly string[], field: "tasks" | "checks" | "requirements", id: string, allowed: readonly S[], patch: Partial<Result<S>>): LabState {
  if (!knownSlug(s, slug, active) || !isSafeKey(id) || !(s[field] as LabItem[]).some((i) => i.id === id)) return s;
  if (patch.status !== undefined && !allowed.includes(patch.status)) return s;
  const p = s.products[slug] ?? emptyResults();
  const prev = (p[field] as Record<string, Result<S>>)[id] ?? { status: allowed[0]!, note: "" };
  const next = { status: patch.status ?? prev.status, note: patch.note === undefined ? prev.note : cleanNote(patch.note, LAB_MAX_ITEM_NOTE) };
  return { ...s, products: { ...s.products, [slug]: { ...p, [field]: { ...p[field], [id]: next } } } };
}

export const setTaskResult = (s: LabState, slug: string, active: readonly string[], id: string, patch: Partial<Result<TrialOutcome>>) => patchResult(s, slug, active, "tasks", id, TRIAL_OUTCOMES, patch);
export const setCheckResult = (s: LabState, slug: string, active: readonly string[], id: string, patch: Partial<Result<MigrationStatus>>) => patchResult(s, slug, active, "checks", id, MIGRATION_STATUSES, patch);

/**
 * VERIFIED_BY_BUYER is a claim the buyer makes about their own check, so it is only accepted with an explicit confirmation. Nothing in
 * Miloosh ever sets it on the buyer's behalf.
 */
export function setRequirementResult(s: LabState, slug: string, active: readonly string[], id: string, patch: Partial<Result<RequirementOutcome>>, confirmed = false): LabState {
  if (patch.status === "VERIFIED_BY_BUYER" && confirmed !== true) return s;
  return patchResult(s, slug, active, "requirements", id, REQUIREMENT_OUTCOMES, patch);
}

export function setProductNote(s: LabState, slug: string, active: readonly string[], note: string): LabState {
  if (!knownSlug(s, slug, active)) return s;
  const p = s.products[slug] ?? emptyResults();
  return { ...s, products: { ...s.products, [slug]: { ...p, note: cleanNote(note, LAB_MAX_PRODUCT_NOTE) } } };
}

// ---- Summary -----------------------------------------------------------------------------------------------------------------------

export type SummaryLine = { area: "Trial task" | "Migration check" | "Must-have" | "Deal breaker"; label: string; note: string };
/** Plain statuses, never a score: any blocker wins; nothing recorded is "not started"; everything clear is only what the buyer reported. */
export type ProductVerdict = "BLOCKED" | "NOT_STARTED" | "IN_PROGRESS" | "ALL_REPORTED_CLEAR";

export type ProductSummary = {
  slug: string;
  name: string;
  verdict: ProductVerdict;
  tasks: { worked: number; failed: number; notTested: number; total: number };
  checks: { ready: number; blocker: number; notChecked: number; total: number };
  requirements: { verified: number; blocker: number; notTested: number; total: number };
  succeeded: SummaryLine[];
  blocked: SummaryLine[];
  untested: SummaryLine[];
  note: string;
};

export function summarizeProduct(s: LabState, slug: string, name: string): ProductSummary {
  const p = s.products[slug] ?? emptyResults();
  const succeeded: SummaryLine[] = []; const blocked: SummaryLine[] = []; const untested: SummaryLine[] = [];
  const tasks = { worked: 0, failed: 0, notTested: 0, total: s.tasks.length };
  for (const t of s.tasks) {
    const r = p.tasks[t.id] ?? { status: "NOT_TESTED", note: "" };
    const line = { area: "Trial task" as const, label: t.label, note: r.note.trim() };
    if (r.status === "WORKED") { tasks.worked += 1; succeeded.push(line); } else if (r.status === "FAILED") { tasks.failed += 1; blocked.push(line); } else { tasks.notTested += 1; untested.push(line); }
  }
  const checks = { ready: 0, blocker: 0, notChecked: 0, total: s.checks.length };
  for (const c of s.checks) {
    const r = p.checks[c.id] ?? { status: "NOT_CHECKED", note: "" };
    const line = { area: "Migration check" as const, label: c.label, note: r.note.trim() };
    if (r.status === "READY") { checks.ready += 1; succeeded.push(line); } else if (r.status === "BLOCKER") { checks.blocker += 1; blocked.push(line); } else { checks.notChecked += 1; untested.push(line); }
  }
  const requirements = { verified: 0, blocker: 0, notTested: 0, total: s.requirements.length };
  for (const q of s.requirements) {
    const r = p.requirements[q.id] ?? { status: "NOT_TESTED", note: "" };
    const line = { area: q.kind === "deal_breaker" ? "Deal breaker" as const : "Must-have" as const, label: q.label, note: r.note.trim() };
    if (r.status === "VERIFIED_BY_BUYER") { requirements.verified += 1; succeeded.push(line); } else if (r.status === "BLOCKER") { requirements.blocker += 1; blocked.push(line); } else { requirements.notTested += 1; untested.push(line); }
  }
  const total = tasks.total + checks.total + requirements.total;
  const verdict: ProductVerdict = blocked.length > 0 ? "BLOCKED" : succeeded.length === 0 ? "NOT_STARTED" : untested.length === 0 && total > 0 ? "ALL_REPORTED_CLEAR" : "IN_PROGRESS";
  return { slug, name, verdict, tasks, checks, requirements, succeeded, blocked, untested, note: p.note.trim() };
}

export const VERDICT_WORDS: Record<ProductVerdict, string> = {
  BLOCKED: "Blocked: at least one item you recorded failed or is a blocker",
  NOT_STARTED: "Not started: nothing recorded yet",
  IN_PROGRESS: "In progress: some items still untested",
  ALL_REPORTED_CLEAR: "Everything you recorded passed (your own report, not a Miloosh test)",
};

export function nextSteps(summaries: readonly ProductSummary[]): string[] {
  const out: string[] = [];
  for (const p of summaries) {
    if (p.blocked.length) out.push(`${p.name}: resolve or rule out ${p.blocked.length} blocked item${p.blocked.length === 1 ? "" : "s"} (ask the vendor in writing, or drop this option).`);
    if (p.untested.length) out.push(`${p.name}: test the ${p.untested.length} remaining item${p.untested.length === 1 ? "" : "s"} before the trial ends.`);
  }
  out.push("Confirm plan, price and contract terms with each vendor in writing before you commit.");
  out.push("Keep your current tool running until your rollback date has passed. Staying put or not buying yet is a valid outcome.");
  out.push("Use the Decision Room brief for the sourced evidence and first-year cost. This appendix only records your own trial.");
  return out;
}

// ---- Plain-text appendix -----------------------------------------------------------------------------------------------------------

const STATUS_TEXT: Record<string, string> = {
  WORKED: "WORKED (you reported)", FAILED: "FAILED (you reported)", NOT_TESTED: "NOT TESTED",
  READY: "READY (you reported)", BLOCKER: "BLOCKER (you reported)", NOT_CHECKED: "NOT CHECKED",
  VERIFIED_BY_BUYER: "VERIFIED BY YOU",
};
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

export function labToText(s: LabState, products: ReadonlyArray<{ slug: string; name: string }>, generatedOn: string): string {
  const L: string[] = [];
  L.push("MILOOSH SWITCHING LAB: BUYER TRIAL APPENDIX", `Prepared ${generatedOn}.`,
    "Every result below was recorded by the buyer. Miloosh did not run these tests and no vendor has verified them.",
    "This appendix does not replace the sourced Decision Room brief (https://miloosh.com/decision-room#brief).", "");
  const summaries = products.map((p) => summarizeProduct(s, p.slug, p.name));
  L.push("DECISION SUMMARY");
  for (const p of summaries) {
    L.push(`${flat(p.name)}: ${VERDICT_WORDS[p.verdict]}`,
      `  Trial tasks: ${p.tasks.worked} worked, ${p.tasks.failed} failed, ${p.tasks.notTested} not tested of ${p.tasks.total}`,
      `  Migration checks: ${p.checks.ready} ready, ${p.checks.blocker} blockers, ${p.checks.notChecked} not checked of ${p.checks.total}`,
      `  Requirements: ${p.requirements.verified} verified by you, ${p.requirements.blocker} blockers, ${p.requirements.notTested} not tested of ${p.requirements.total}`);
  }
  if (summaries.length === 0) L.push("No products selected. Choose products in the Decision Room first.");
  L.push("");
  for (const p of products) {
    const r = s.products[p.slug] ?? emptyResults();
    L.push(`== ${flat(p.name)} ==`, "TRIAL TASKS");
    for (const t of s.tasks) { const x = r.tasks[t.id]; L.push(`- [${STATUS_TEXT[x?.status ?? "NOT_TESTED"]}] ${t.label}${x?.note.trim() ? `\n    Your note: ${flat(x.note)}` : ""}`); }
    L.push("MIGRATION CHECKS");
    for (const c of s.checks) { const x = r.checks[c.id]; L.push(`- [${STATUS_TEXT[x?.status ?? "NOT_CHECKED"]}] ${c.label}${x?.note.trim() ? `\n    Your note: ${flat(x.note)}` : ""}`); }
    L.push("MUST-HAVES AND DEAL BREAKERS");
    if (s.requirements.length === 0) L.push("- None added.");
    for (const q of s.requirements) { const x = r.requirements[q.id]; L.push(`- [${STATUS_TEXT[x?.status ?? "NOT_TESTED"]}] ${q.kind === "deal_breaker" ? "Deal breaker" : "Must-have"}: ${q.label}${x?.note.trim() ? `\n    Your note: ${flat(x.note)}` : ""}`); }
    if (r.note.trim()) L.push(`Your notes on ${flat(p.name)}: ${flat(r.note)}`);
    L.push("");
  }
  L.push("NEXT STEPS", ...nextSteps(summaries).map((x, i) => `${i + 1}. ${x}`), "",
    "Created in your browser. Miloosh did not receive, store or send this text.");
  return L.join("\n");
}
