"use client";

import { useState } from "react";
import styles from "../decision-room.module.css";
import { BUILTIN_CRITERIA, MAX_CUSTOM, MAX_CUSTOM_LABEL } from "@/lib/decision-room/criteria";
import { addCustom, removeCustom, toggleCriterion, type RoomState } from "@/lib/decision-room/state";
import { ROOM_CURRENCIES, type RoomCurrency } from "@/lib/decision-room/types";

export function RequirementsSection({ room, update, announce }: { room: RoomState; update: (fn: (s: RoomState) => RoomState) => void; announce: (m: string) => void }) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"feature" | "integration">("feature");
  const groups = ["Pricing", "Platform", "Capability"] as const;
  const num = (v: string) => { const n = Number(v); return v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null; };

  return (
    <section id="requirements" className={styles.section} aria-labelledby="req-h">
      <h2 id="req-h">2. Say what matters to you</h2>
      <p className={styles.lead}>Choose the requirements you care about. Miloosh then shows, product by product, what is verified, what is only documented and what is unknown. Unknown never counts against a product.</p>
      <div className={styles.grid2}>
        <div className={styles.card}>
          {groups.map((g) => (
            <fieldset key={g} className={styles.fieldset}>
              <legend className={styles.groupTitle}>{g}</legend>
              {BUILTIN_CRITERIA.filter((c) => c.group === g).map((c) => (
                <label key={c.id} className={styles.check}>
                  <input type="checkbox" checked={room.criteria.includes(c.id)} onChange={() => update((s) => toggleCriterion(s, c.id))} />
                  {c.label}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <div className={styles.card}>
          <form onSubmit={(e) => { e.preventDefault(); const clean = label.trim(); if (clean.length < 2) return; update((s) => addCustom(s, clean, kind)); announce(`Added requirement ${clean}.`); setLabel(""); }}>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Add your own requirement</legend>
              <div className={styles.field} style={{ marginTop: 12 }}>
                <label htmlFor="custom-label">A capability or an integration</label>
                <input id="custom-label" className={styles.input} value={label} maxLength={MAX_CUSTOM_LABEL} onChange={(e) => setLabel(e.target.value)} aria-describedby="custom-hint" />
                <p id="custom-hint" className={styles.hint}>Examples: &quot;audit log&quot;, &quot;Slack&quot;. Matched word for word against recorded vendor material. Up to {MAX_CUSTOM}. Kept in this browser only and never put in links.</p>
              </div>
              <div className={styles.field} style={{ marginTop: 12 }}>
                <label htmlFor="custom-kind">Type</label>
                <select id="custom-kind" className={styles.select} value={kind} onChange={(e) => setKind(e.target.value === "integration" ? "integration" : "feature")}>
                  <option value="feature">Capability</option>
                  <option value="integration">Integration</option>
                </select>
              </div>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: 12 }} disabled={label.trim().length < 2 || room.custom.length >= MAX_CUSTOM}>Add requirement</button>
            </fieldset>
          </form>
          {room.custom.length > 0 ? (
            <ul className={styles.list} aria-label="Your own requirements">
              {room.custom.map((c) => (
                <li key={c.id} className={styles.item}>
                  <span>{c.label} <span className={styles.itemMeta}>({c.kind === "integration" ? "integration" : "capability"})</span></span>
                  <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} aria-label={`Remove requirement ${c.label}`} onClick={() => { update((s) => removeCustom(s, c.id)); announce(`Removed requirement ${c.label}.`); }}>Remove</button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <div className={styles.card}>
        <h3 style={{ fontWeight: 650 }}>Your situation (private to this browser)</h3>
        <div className={styles.costGrid}>
          <div className={styles.field}><label htmlFor="team">Team size (seats)</label><input id="team" type="number" min={1} step={1} inputMode="numeric" className={styles.input} value={room.team ?? ""} onChange={(e) => { const n = num(e.target.value); update((s) => ({ ...s, team: n !== null && Number.isInteger(n) && n >= 1 ? n : null })); }} /></div>
          <div className={styles.field}><label htmlFor="currency">Currency for costs</label><select id="currency" className={styles.select} value={room.currency} onChange={(e) => update((s) => ({ ...s, currency: e.target.value as RoomCurrency }))}>{ROOM_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className={styles.field}><label htmlFor="current-name">Your current tool (optional)</label><input id="current-name" className={styles.input} maxLength={80} value={room.currentTool.name} onChange={(e) => update((s) => ({ ...s, currentTool: { ...s.currentTool, name: e.target.value } }))} /></div>
          <div className={styles.field}><label htmlFor="current-cost">What you pay it per month ({room.currency})</label><input id="current-cost" type="number" min={0} step="0.01" inputMode="decimal" className={styles.input} value={room.currentTool.monthlyCost ?? ""} onChange={(e) => { const n = num(e.target.value); update((s) => ({ ...s, currentTool: { ...s.currentTool, monthlyCost: n } })); }} /></div>
        </div>
        <div className={styles.field} style={{ marginTop: 16 }}>
          <label htmlFor="note">Private note (optional)</label>
          <textarea id="note" className={styles.textarea} maxLength={500} value={room.note} onChange={(e) => update((s) => ({ ...s, note: e.target.value.slice(0, 500) }))} aria-describedby="note-hint" />
          <p id="note-hint" className={styles.hint}>Stays in this browser. Included in your own brief and text export, never in a link.</p>
        </div>
      </div>
    </section>
  );
}
