"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "../decision-room.module.css";
import { ROOM_MAX_COMPARE, ROOM_MAX_SAVED, toggleCompare, toggleSaved, type RoomState } from "@/lib/decision-room/state";
import type { RoomIndexEntry } from "@/lib/decision-room/types";

type Props = {
  index: RoomIndexEntry[];
  room: RoomState;
  update: (fn: (s: RoomState) => RoomState) => void;
  known: (slug: string) => boolean;
  save: (slug: string) => void;
  announce: (message: string) => void;
};

export function ShortlistSection({ index, room, update, known, save, announce }: Props) {
  const [query, setQuery] = useState("");
  const bySlug = useMemo(() => new Map(index.map((i) => [i.slug, i])), [index]);
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (q.length < 2) return [];
    return index.filter((i) => i.name.toLowerCase().includes(q) || i.categoryName.toLowerCase().includes(q) || i.slug.includes(q)).slice(0, 8);
  }, [index, q]);
  const full = room.saved.length >= ROOM_MAX_SAVED;

  return (
    <section id="shortlist" className={styles.section} aria-labelledby="shortlist-h">
      <h2 id="shortlist-h">1. Build your shortlist</h2>
      <p className={styles.lead}>Search the verified Miloosh catalog and save the options you are seriously considering. Save up to {ROOM_MAX_SAVED}, then pick up to {ROOM_MAX_COMPARE} to compare.</p>
      <div className={styles.card}>
        <div className={styles.field}>
          <label htmlFor="room-search">Find software by name or category</label>
          <input id="room-search" type="search" className={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" aria-describedby="room-search-hint" />
          <p id="room-search-hint" className={styles.hint}>Type at least two letters, for example a product name or &quot;CRM&quot;.</p>
        </div>
        {q.length >= 2 ? (
          results.length > 0 ? (
            <ul className={styles.list} aria-label={`Search results for ${query.trim()}`}>
              {results.map((r) => {
                const saved = room.saved.includes(r.slug);
                return (
                  <li key={r.slug} className={styles.item}>
                    <div><span className={styles.itemName}>{r.name}</span><div className={styles.itemMeta}>{r.categoryName}</div></div>
                    <button type="button" className={`${styles.btn} ${saved ? "" : styles.btnPrimary}`} disabled={saved || full} aria-label={saved ? `${r.name} is already saved` : `Save ${r.name} to shortlist`}
                      onClick={() => { save(r.slug); announce(`Saved ${r.name} to your shortlist.`); }}>
                      {saved ? "Saved" : full ? "Shortlist full" : "Save"}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <p className={styles.empty}>No catalog match for &quot;{query.trim()}&quot;. Try a product name or a broader category.</p>
        ) : null}
      </div>

      <div className={styles.card}>
        <h3 style={{ fontWeight: 650 }}>Your shortlist <span className={styles.counts}>({room.saved.length} of {ROOM_MAX_SAVED} saved, {room.compare.length} of {ROOM_MAX_COMPARE} in the comparison)</span></h3>
        {room.saved.length === 0 ? (
          <p className={styles.empty}>Nothing saved yet. Search above and save a few options. Your shortlist stays in this browser; there is no account and no email.</p>
        ) : (
          <ul className={styles.list}>
            {room.saved.map((slug) => {
              const item = bySlug.get(slug); if (!item) return null;
              const inCompare = room.compare.includes(slug);
              return (
                <li key={slug} className={styles.item}>
                  <div><Link href={`/software/${slug}`} className={styles.itemName}>{item.name}</Link><div className={styles.itemMeta}>{item.categoryName}</div></div>
                  <div className={styles.row}>
                    <button type="button" className={styles.btn} aria-pressed={inCompare} disabled={!inCompare && room.compare.length >= ROOM_MAX_COMPARE}
                      aria-label={`${inCompare ? "Remove" : "Add"} ${item.name} ${inCompare ? "from" : "to"} the comparison`}
                      onClick={() => update((s) => toggleCompare(s, slug))}>{inCompare ? "In comparison" : "Compare"}</button>
                    <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} aria-label={`Remove ${item.name} from shortlist`}
                      onClick={() => { update((s) => toggleSaved(s, slug, known)); announce(`Removed ${item.name} from your shortlist.`); }}>Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
