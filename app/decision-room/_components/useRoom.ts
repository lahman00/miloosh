"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { decodeShare } from "@/lib/decision-room/share";
import { emptyRoom, hasRoomContent, importFromDesk, parseRoom, toggleSaved, type RoomState } from "@/lib/decision-room/state";
import type { RoomIndexEntry, RoomProduct } from "@/lib/decision-room/types";
import { SERVER_SNAPSHOT, getSnapshot, subscribe, writeRoom } from "./roomStore";

export type DetailsStatus = "idle" | "loading" | "error";
type Derived = { room: RoomState; sharedSlugs: string[]; pendingShared: string[]; storageProblem: boolean };

/** Pure: the room is whatever storage holds (its own key, else a one-time view of the BuyerDesk import, else a shared link, else empty). */
export function derive(snapshot: string, known: (slug: string) => boolean): Derived {
  const [roomRaw, deskRaw, search, broken] = JSON.parse(snapshot) as [string | null, string | null, string, boolean];
  const base = parseRoom(roomRaw, known) ?? importFromDesk(deskRaw, known) ?? emptyRoom();
  const shared = decodeShare(search, known);
  if (shared && !hasRoomContent(base)) return { room: shared, sharedSlugs: shared.saved, pendingShared: [], storageProblem: broken };
  if (shared) return { room: base, sharedSlugs: shared.saved, pendingShared: shared.saved.filter((s) => !base.saved.includes(s)), storageProblem: broken };
  return { room: base, sharedSlugs: [], pendingShared: [], storageProblem: broken };
}

/**
 * All Decision Room behavior that touches the browser: storage, the one-time BuyerDesk import, shared-link loading, product details and
 * events. The pure rules live in lib/decision-room. Storage failures never break the room.
 */
export function useRoom(index: RoomIndexEntry[]) {
  const known = useMemo(() => { const set = new Set(index.map((i) => i.slug)); return (slug: string) => set.has(slug); }, [index]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const ready = snapshot !== SERVER_SNAPSHOT;
  const derived = useMemo<Derived>(() => (ready ? derive(snapshot, known) : { room: emptyRoom(), sharedSlugs: [], pendingShared: [], storageProblem: false }), [snapshot, ready, known]);
  const room = derived.room;

  const [notice, setNotice] = useState("");
  const [sharedDismissed, setSharedDismissed] = useState(false);
  const [details, setDetails] = useState<Record<string, RoomProduct>>({});
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [interacted, setInteracted] = useState(false);

  const update = useCallback((fn: (s: RoomState) => RoomState) => {
    const current = derive(getSnapshot(), known).room;
    writeRoom(JSON.stringify(fn(current)));
    setInteracted(true);
  }, [known]);

  const activeSlugs = useMemo(() => (room.compare.length > 0 ? room.compare : room.saved.slice(0, 4)), [room.compare, room.saved]);
  const missing = useMemo(() => activeSlugs.filter((s) => !details[s]), [activeSlugs, details]);
  const missingKey = missing.join(",");

  useEffect(() => {
    if (!missingKey) return;
    const controller = new AbortController();
    fetch(`/api/decision-room/products?slugs=${encodeURIComponent(missingKey)}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<{ products: RoomProduct[] }>; })
      .then((data) => setDetails((prev) => ({ ...prev, ...Object.fromEntries(data.products.map((p) => [p.slug, p])) })))
      .catch((e) => { if (e?.name !== "AbortError") setFailedKey(missingKey); });
    return () => controller.abort();
  }, [missingKey, retry]);

  const detailsStatus: DetailsStatus = missing.length === 0 ? "idle" : failedKey === missingKey ? "error" : "loading";
  const retryDetails = useCallback(() => { setFailedKey(null); setRetry((n) => n + 1); }, []);

  const path = () => (typeof window === "undefined" ? "/decision-room" : window.location.pathname);

  const save = useCallback((slug: string) => {
    update((s) => toggleSaved(s, slug, known));
    trackEvent({ type: "decision_room_product_saved", path: path(), softwareSlug: slug, ctaLocation: "decision-room-search" });
  }, [known, update]);

  // Fires once per distinct configuration (2 or more products, at least one criterion), only after the buyer changed something.
  const criteriaCount = room.criteria.length + room.custom.length;
  const signature = `${[...room.compare].sort().join(".")}|${room.criteria.length}|${room.custom.length}`;
  useEffect(() => {
    if (!ready || !interacted || room.compare.length < 2 || criteriaCount === 0) return;
    const timer = setTimeout(() => trackEvent({ type: "decision_room_compare_configured", path: path(), resultCount: room.compare.length, rank: criteriaCount }), 800);
    return () => clearTimeout(timer);
  }, [signature, ready, interacted, room.compare.length, criteriaCount]);

  const briefGenerated = useCallback((source: "create" | "print" | "text" | "link") => {
    trackEvent({ type: "decision_room_brief_generated", path: path(), resultCount: activeSlugs.length, source });
  }, [activeSlugs.length]);

  const acceptShared = useCallback(() => {
    update((s) => { let next = s; for (const slug of derived.pendingShared) next = toggleSaved(next, slug, known); return next; });
    setNotice("Shared products added to your shortlist.");
  }, [derived.pendingShared, known, update]);

  const banner: { kind: "imported" | "shared"; count: number } | null =
    derived.sharedSlugs.length > 0 && !sharedDismissed ? { kind: "shared", count: derived.sharedSlugs.length }
    : room.importedFromDesk ? { kind: "imported", count: room.saved.length } : null;
  const dismissBanner = useCallback(() => { if (derived.sharedSlugs.length > 0) setSharedDismissed(true); else update((s) => ({ ...s, importedFromDesk: false })); }, [derived.sharedSlugs.length, update]);

  return { room, update, ready, known, banner, dismissBanner, pendingShared: derived.pendingShared, acceptShared, notice, setNotice, storageProblem: derived.storageProblem, details, detailsStatus, retryDetails, activeSlugs, save, briefGenerated };
}
