"use client";

import Link from "next/link";
import styles from "../decision-room.module.css";
import { computeProductCost, formatMoney, keepCurrentCost } from "@/lib/decision-room/cost";
import { emptyCost, setCost, type CostInput, type RoomState } from "@/lib/decision-room/state";
import type { RoomProduct } from "@/lib/decision-room/types";

type NumericCostKey = Exclude<keyof CostInput, "perSeat">;
const FIELDS: Array<{ key: NumericCostKey; label: string; hint: string; integer?: boolean }> = [
  { key: "unitPrice", label: "Your price per month", hint: "Overrides the verified price. Per seat if the vendor prices per seat." },
  { key: "seats", label: "Seats for this product", hint: "Leave blank to use your team size." , integer: true },
  { key: "setup", label: "Setup (one-time)", hint: "Consultant, configuration, data cleanup." },
  { key: "training", label: "Training (one-time)", hint: "Hours or fees." },
  { key: "migration", label: "Migration (one-time)", hint: "Moving data and rebuilding workflows." },
  { key: "other", label: "Other one-time costs", hint: "Anything else you know about." },
];

export function CostSection({ room, products, update }: { room: RoomState; products: RoomProduct[]; update: (fn: (s: RoomState) => RoomState) => void }) {
  const keep = keepCurrentCost(room);
  return (
    <section id="cost" className={`${styles.section} ${styles.printHide}`} aria-labelledby="cost-h">
      <h2 id="cost-h">4. Estimate the first-year cost</h2>
      <p className={styles.lead}>A planning estimate, never a vendor quote. Verified prices are used only when the currency and billing basis match; everything else is your own entry or Unknown. A blank field is Unknown, not zero. For a whole stack of tools, use the <Link href="/tools/saas-cost-calculator">SaaS stack cost calculator</Link>.</p>
      {products.length === 0 ? <p className={styles.empty}>Choose products to compare to estimate their cost.</p> : products.map((p) => {
        const r = computeProductCost(p, room);
        const input = room.costs[p.slug] ?? emptyCost();
        return (
          <article key={p.slug} className={styles.card} aria-labelledby={`cost-${p.slug}`}>
            <h3 id={`cost-${p.slug}`} style={{ fontWeight: 650 }}>{p.name}</h3>
            <p className={styles.hint}>{r.basis.kind === "unknown" ? r.basis.reason : r.basis.kind === "verified" ? `Verified entry price: ${r.basis.amount} ${r.basis.currency}${r.basis.perSeat ? " per seat" : ""} per month${r.basis.verifiedOn ? `, checked ${r.basis.verifiedOn}` : ""}.` : "Using your own price."}</p>
            <div className={styles.costGrid}>
              {FIELDS.map((f) => (
                <div key={f.key} className={styles.field}>
                  <label htmlFor={`${p.slug}-${f.key}`}>{f.label} ({f.key === "seats" ? "seats" : room.currency})</label>
                  <input id={`${p.slug}-${f.key}`} type="number" min={f.integer ? 1 : 0} step={f.integer ? 1 : "0.01"} inputMode={f.integer ? "numeric" : "decimal"} className={styles.input}
                    value={input[f.key] ?? ""} aria-describedby={`${p.slug}-${f.key}-h`}
                    onChange={(e) => { const raw = e.target.value; const n = raw.trim() === "" ? null : Number(raw); update((s) => setCost(s, p.slug, { [f.key]: n !== null && Number.isFinite(n) ? n : null } as Partial<CostInput>)); }} />
                  <span id={`${p.slug}-${f.key}-h`} className={styles.hint}>{f.hint}</span>
                </div>
              ))}
            </div>
            <fieldset className={styles.fieldset} style={{ marginTop: 16 }}>
              <legend className={styles.legend}>How does your own price scale?</legend>
              <label className={styles.check}><input type="radio" name={`${p.slug}-scale`} checked={input.perSeat === true} onChange={() => update((s) => setCost(s, p.slug, { perSeat: true }))} />Per seat (multiplied by seats)</label>
              <label className={styles.check}><input type="radio" name={`${p.slug}-scale`} checked={input.perSeat === false} onChange={() => update((s) => setCost(s, p.slug, { perSeat: false }))} />Flat amount per account</label>
              <p className={styles.hint}>Needed only when you enter your own price above.</p>
            </fieldset>
            <ul className={styles.list} aria-label={`Cost lines for ${p.name}`}>
              {r.lines.map((l) => (<li key={l.id} className={styles.item}><span>{l.label}</span><span><strong>{l.amount === null ? "Unknown" : formatMoney(l.amount, r.currency)}</strong> <span className={styles.formula}>{l.formula}</span></span></li>))}
            </ul>
            <p className={styles.total}>{r.knownTotal === null ? "Unknown" : formatMoney(r.knownTotal, r.currency)} <span className={styles.counts}>{r.knownTotal === null ? "nothing known yet" : r.complete ? "first-year total" : "known parts only"}</span></p>
            {!r.complete ? <ul className={styles.warn}>{r.missing.map((m) => <li key={m}>{m}</li>)}</ul> : null}
            <details><summary>Assumptions and exclusions</summary><ul>{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></details>
          </article>
        );
      })}
      <div className={styles.keep}>
        <h3 style={{ fontWeight: 650 }}>Keeping {keep.name}</h3>
        <p className={styles.total}>{keep.yearlyCost === null ? "Unknown" : formatMoney(keep.yearlyCost, room.currency)} <span className={styles.counts}>per year</span></p>
        <p className={styles.formula}>{keep.formula}</p>
      </div>
    </section>
  );
}
