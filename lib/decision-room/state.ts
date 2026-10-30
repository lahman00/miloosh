import { BUILTIN_IDS, cleanCustom, isBuiltinCriterion, type CustomRequirement } from "./criteria";
import { ROOM_CURRENCIES, type RoomCurrency } from "./types";

/**
 * Decision Room state. Lives only in this browser (localStorage), no account, no server copy.
 * It is a NEW key: the older BuyerDesk key (`miloosh-buyer-desk-v1`) accepts only nine curated products and would silently drop the rest,
 * so the room reads it once to import and never writes to it, never clears it.
 */
export const ROOM_KEY = "miloosh-decision-room-v1";
export const DESK_KEY = "miloosh-buyer-desk-v1";
export const ROOM_MAX_SAVED = 12;
export const ROOM_MAX_COMPARE = 4;
const MAX_RAW = 20_000;

/** perSeat says how the buyer's own unit price scales: true = multiplied by seats, false = flat per account, null = not chosen yet (the price is then Unknown). */
export type CostInput = { unitPrice: number | null; perSeat: boolean | null; seats: number | null; setup: number | null; training: number | null; migration: number | null; other: number | null };
export const emptyCost = (): CostInput => ({ unitPrice: null, perSeat: null, seats: null, setup: null, training: null, migration: null, other: null });

export type RoomState = {
  version: 1;
  saved: string[];
  compare: string[];
  criteria: string[];
  custom: CustomRequirement[];
  team: number | null;
  currency: RoomCurrency;
  costs: Record<string, CostInput>;
  currentTool: { name: string; monthlyCost: number | null };
  /** Private to this browser. Never put in a link, a share URL or an event. */
  note: string;
  importedFromDesk: boolean;
};

export const emptyRoom = (): RoomState => ({
  version: 1, saved: [], compare: [], criteria: [], custom: [], team: null, currency: "USD", costs: {},
  currentTool: { name: "", monthlyCost: null }, note: "", importedFromDesk: false,
});

export const hasRoomContent = (s: RoomState) => s.saved.length > 0 || s.criteria.length > 0 || s.custom.length > 0;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const money = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10_000_000 ? Math.round(v * 100) / 100 : null);
const count = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 100_000 ? v : null);

export type SlugCheck = (slug: string) => boolean;

export function cleanSlugs(value: unknown, isKnown: SlugCheck, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) if (typeof v === "string" && /^[a-z0-9-]{1,80}$/.test(v) && isKnown(v) && !out.includes(v)) out.push(v);
  return out.slice(0, max);
}

export function cleanCost(input: unknown): CostInput {
  const r = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return { unitPrice: money(r.unitPrice), perSeat: typeof r.perSeat === "boolean" ? r.perSeat : null, seats: count(r.seats), setup: money(r.setup), training: money(r.training), migration: money(r.migration), other: money(r.other) };
}

/** Defensive: anything that is not exactly what we write is dropped field by field. A corrupted value never crashes the room. */
export function cleanRoom(input: unknown, isKnown: SlugCheck): RoomState {
  const r = (input && typeof input === "object" && !Array.isArray(input) ? input : {}) as Record<string, unknown>;
  const saved = cleanSlugs(r.saved, isKnown, ROOM_MAX_SAVED);
  const compare = cleanSlugs(r.compare, (s) => saved.includes(s), ROOM_MAX_COMPARE);
  const costs: Record<string, CostInput> = {};
  if (r.costs && typeof r.costs === "object" && !Array.isArray(r.costs)) {
    for (const slug of saved) { const c = (r.costs as Record<string, unknown>)[slug]; if (c) costs[slug] = cleanCost(c); }
  }
  const ct = (r.currentTool && typeof r.currentTool === "object" ? r.currentTool : {}) as Record<string, unknown>;
  return {
    version: 1, saved, compare,
    criteria: Array.isArray(r.criteria) ? [...new Set(r.criteria.filter(isBuiltinCriterion))].slice(0, BUILTIN_IDS.length) : [],
    custom: cleanCustom(r.custom),
    team: count(r.team),
    currency: ROOM_CURRENCIES.includes(r.currency as RoomCurrency) ? (r.currency as RoomCurrency) : "USD",
    costs,
    currentTool: { name: text(ct.name, 80), monthlyCost: money(ct.monthlyCost) },
    note: text(r.note, 500),
    importedFromDesk: r.importedFromDesk === true,
  };
}

export function parseRoom(raw: string | null, isKnown: SlugCheck): RoomState | null {
  if (!raw || raw.length > MAX_RAW) return null;
  try { return cleanRoom(JSON.parse(raw), isKnown); } catch { return null; }
}

/**
 * Read the BuyerDesk key without touching it. Imports only what is certain: the saved slugs that exist in the dataset, the current-tool
 * name and the buyer's own note for the desk's selected category. Nothing is written back to the desk key.
 */
export function importFromDesk(deskRaw: string | null, isKnown: SlugCheck): RoomState | null {
  if (!deskRaw || deskRaw.length > 8192) return null;
  try {
    const desk = JSON.parse(deskRaw) as { saved?: unknown; category?: unknown; contexts?: Record<string, { current?: unknown; note?: unknown }> };
    const saved = cleanSlugs(desk.saved, isKnown, ROOM_MAX_SAVED);
    if (saved.length === 0) return null;
    const ctx = typeof desk.category === "string" ? desk.contexts?.[desk.category] : undefined;
    const room = emptyRoom();
    room.saved = saved;
    room.compare = saved.slice(0, ROOM_MAX_COMPARE);
    room.currentTool = { name: text(ctx?.current, 80), monthlyCost: null };
    room.note = text(ctx?.note, 500);
    room.importedFromDesk = true;
    return room;
  } catch { return null; }
}

/** The room's own state wins when it exists; otherwise a one-time import from the desk; otherwise empty. */
export function loadRoom(roomRaw: string | null, deskRaw: string | null, isKnown: SlugCheck): RoomState {
  return parseRoom(roomRaw, isKnown) ?? importFromDesk(deskRaw, isKnown) ?? emptyRoom();
}

export function toggleSaved(s: RoomState, slug: string, isKnown: SlugCheck): RoomState {
  if (s.saved.includes(slug)) {
    const costs = { ...s.costs }; delete costs[slug];
    return { ...s, saved: s.saved.filter((x) => x !== slug), compare: s.compare.filter((x) => x !== slug), costs };
  }
  if (!isKnown(slug) || s.saved.length >= ROOM_MAX_SAVED) return s;
  const saved = [...s.saved, slug];
  const compare = s.compare.length < ROOM_MAX_COMPARE ? [...s.compare, slug] : s.compare;
  return { ...s, saved, compare };
}

export function toggleCompare(s: RoomState, slug: string): RoomState {
  if (!s.saved.includes(slug)) return s;
  if (s.compare.includes(slug)) return { ...s, compare: s.compare.filter((x) => x !== slug) };
  if (s.compare.length >= ROOM_MAX_COMPARE) return s;
  return { ...s, compare: [...s.compare, slug] };
}

export function toggleCriterion(s: RoomState, id: string): RoomState {
  if (!isBuiltinCriterion(id)) return s;
  return { ...s, criteria: s.criteria.includes(id) ? s.criteria.filter((x) => x !== id) : [...s.criteria, id] };
}

export function addCustom(s: RoomState, label: string, kind: "feature" | "integration"): RoomState {
  return { ...s, custom: cleanCustom([...s.custom, { label, kind }]) };
}
export const removeCustom = (s: RoomState, id: string): RoomState => ({ ...s, custom: cleanCustom(s.custom.filter((c) => c.id !== id)) });
export const setCost = (s: RoomState, slug: string, patch: Partial<CostInput>): RoomState => (s.saved.includes(slug) ? { ...s, costs: { ...s.costs, [slug]: cleanCost({ ...(s.costs[slug] ?? emptyCost()), ...patch }) } } : s);
