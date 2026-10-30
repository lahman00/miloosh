import { DESK_KEY, ROOM_KEY } from "@/lib/decision-room/state";
import { LAB_KEY } from "@/lib/decision-room/switching-lab";

/**
 * Browser storage as an external store for useSyncExternalStore, the same pattern as the Decision Room's roomStore: hydration-safe and
 * free of effect-driven state. Only the lab's own key is ever written. The Decision Room and BuyerDesk keys are read, never written.
 * If storage is blocked or full the lab keeps working from memory and the snapshot says so.
 */
const listeners = new Set<() => void>();
let memoryLab: string | null = null;
let broken = false;

export const SERVER_SNAPSHOT = "server";

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => { listeners.delete(callback); window.removeEventListener("storage", callback); };
}

export function getSnapshot(): string {
  let lab: string | null = memoryLab;
  let room: string | null = null;
  let desk: string | null = null;
  try {
    if (memoryLab === null) lab = localStorage.getItem(LAB_KEY);
    room = localStorage.getItem(ROOM_KEY);
    desk = localStorage.getItem(DESK_KEY);
  } catch { broken = true; }
  return JSON.stringify([lab, room, desk, broken]);
}

/** Writes only `miloosh-switching-lab-v1`. Returns false when the browser refused, so the page can warn. */
export function writeLab(json: string): boolean {
  let ok = true;
  try { localStorage.setItem(LAB_KEY, json); memoryLab = null; broken = false; } catch { memoryLab = json; broken = true; ok = false; }
  listeners.forEach((l) => l());
  return ok;
}
