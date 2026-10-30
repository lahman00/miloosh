import { DESK_KEY, ROOM_KEY } from "@/lib/decision-room/state";

/**
 * Browser storage as an external store for useSyncExternalStore: hydration-safe (the server snapshot is a marker) and free of
 * effect-driven state. If storage is unavailable or full the room keeps working from memory and the snapshot says so.
 */
const listeners = new Set<() => void>();
let memoryRoom: string | null = null;
let broken = false;

export const SERVER_SNAPSHOT = "server";

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => { listeners.delete(callback); window.removeEventListener("storage", callback); };
}

export function getSnapshot(): string {
  let room: string | null = memoryRoom;
  let desk: string | null = null;
  try { if (memoryRoom === null) room = localStorage.getItem(ROOM_KEY); desk = localStorage.getItem(DESK_KEY); } catch { broken = true; }
  return JSON.stringify([room, desk, window.location.search, broken]);
}

/** Writes only the room's own key. The BuyerDesk key is read, never written. */
export function writeRoom(json: string): boolean {
  let ok = true;
  try { localStorage.setItem(ROOM_KEY, json); memoryRoom = null; broken = false; } catch { memoryRoom = json; broken = true; ok = false; }
  listeners.forEach((l) => l());
  return ok;
}
