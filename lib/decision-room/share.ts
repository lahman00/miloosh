import { BUILTIN_IDS, isBuiltinCriterion } from "./criteria";
import { ROOM_MAX_COMPARE, ROOM_MAX_SAVED, cleanSlugs, emptyRoom, type RoomState, type SlugCheck } from "./state";

/**
 * Privacy-safe sharing. A link carries ONLY product identifiers and built-in criterion ids the buyer chose to share. It never carries the
 * private note, the current tool, prices, costs, team size, currency or free-text requirements (those can contain business details).
 * Decoding validates everything against the dataset and the built-in list; unknown values are dropped, never trusted.
 */
export function encodeShare(state: RoomState): string {
  const params = new URLSearchParams();
  const products = state.compare.length > 0 ? state.compare : state.saved;
  if (products.length > 0) params.set("p", products.join("."));
  const criteria = state.criteria.filter((id) => BUILTIN_IDS.includes(id));
  if (criteria.length > 0) params.set("c", criteria.join("."));
  return params.toString();
}

export function decodeShare(search: string | URLSearchParams, isKnown: SlugCheck): RoomState | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const p = params.get("p");
  if (!p || p.length > 600) return null;
  const saved = cleanSlugs(p.split("."), isKnown, ROOM_MAX_SAVED);
  if (saved.length === 0) return null;
  const c = (params.get("c") ?? "").slice(0, 400).split(".").filter(isBuiltinCriterion);
  const room = emptyRoom();
  room.saved = saved;
  room.compare = saved.slice(0, ROOM_MAX_COMPARE);
  room.criteria = [...new Set(c)];
  return room;
}

export const SHARE_FIELDS = ["p", "c"] as const;
