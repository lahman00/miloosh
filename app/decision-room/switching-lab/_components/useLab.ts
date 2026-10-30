"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { loadRoom, type RoomState } from "@/lib/decision-room/state";
import { emptyLab, parseLab, pruneProducts, selectLabProducts, serializeLab, type LabSource, type LabState } from "@/lib/decision-room/switching-lab";
import { SERVER_SNAPSHOT, getSnapshot, subscribe, writeLab } from "./labStore";

export type LabIndexEntry = { slug: string; name: string; categoryName: string };
export type LabProduct = { slug: string; name: string; categoryName: string };
export type SaveState = "saved" | "memory" | "too_large";

type Derived = { lab: LabState; room: RoomState; products: LabProduct[]; source: LabSource; storageProblem: boolean };

/**
 * Pure: the products are the ones the Decision Room shows (its own key, else its one-time BuyerDesk view), compare list first, else saved,
 * at most four, and only slugs that exist in the real software index. A shared link is not read here: the lab follows the buyer's own room.
 */
export function deriveLab(snapshot: string, index: ReadonlyMap<string, LabIndexEntry>): Derived {
  const [labRaw, roomRaw, deskRaw, broken] = JSON.parse(snapshot) as [string | null, string | null, string | null, boolean];
  const known = (slug: string) => index.has(slug);
  const room = loadRoom(roomRaw, deskRaw, known);
  const { slugs, source } = selectLabProducts(room);
  const products = slugs.map((s) => index.get(s)).filter((p): p is LabIndexEntry => Boolean(p)).map((p) => ({ slug: p.slug, name: p.name, categoryName: p.categoryName }));
  return { lab: parseLab(labRaw, known), room, products, source: products.length ? source : "none", storageProblem: broken };
}

export function useLab(entries: LabIndexEntry[]) {
  const index = useMemo(() => new Map(entries.map((e) => [e.slug, e])), [entries]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const ready = snapshot !== SERVER_SNAPSHOT;
  const derived = useMemo<Derived | null>(() => (ready ? deriveLab(snapshot, index) : null), [ready, snapshot, index]);
  const [tooLarge, setTooLarge] = useState(false);

  const update = useCallback((fn: (s: LabState, active: string[]) => LabState) => {
    const current = deriveLab(getSnapshot(), index);
    const active = current.products.map((p) => p.slug);
    const json = serializeLab(pruneProducts(fn(current.lab, active), active));
    // Refuse rather than write something that would be thrown away on the next load.
    if (json === null) { setTooLarge(true); return; }
    setTooLarge(false);
    writeLab(json);
  }, [index]);

  const lab = derived?.lab ?? emptyLab();
  const saveState: SaveState = tooLarge ? "too_large" : derived?.storageProblem ? "memory" : "saved";
  return { ready, lab, room: derived?.room ?? null, products: derived?.products ?? [], source: derived?.source ?? "none", update, saveState };
}
