"use client";

import { useState } from "react";
import room from "../../decision-room.module.css";
import styles from "../switching-lab.module.css";
import type { LabProduct } from "./useLab";
import {
  LAB_MAX_ITEM_NOTE, LAB_MAX_PRODUCT_NOTE, MIGRATION_STATUSES, REQUIREMENT_OUTCOMES, TRIAL_OUTCOMES,
  emptyResults, setCheckResult, setProductNote, setRequirementResult, setTaskResult,
  type LabItem, type LabState, type Result,
} from "@/lib/decision-room/switching-lab";

type Update = (fn: (s: LabState, active: string[]) => LabState) => void;
type Props = { lab: LabState; products: LabProduct[]; update: Update; announce: (m: string) => void };

/** Status is always words plus a mark, never colour alone. */
export const OUTCOME_WORDS: Record<string, string> = {
  NOT_TESTED: "? Not tested", WORKED: "✓ Worked", FAILED: "✕ Failed",
  NOT_CHECKED: "? Not checked", READY: "✓ Ready", BLOCKER: "✕ Blocker",
  VERIFIED_BY_BUYER: "✓ I verified it",
};

function Entry<S extends string>({ name, label, prefix, options, result, onStatus, onNote, after }: {
  name: string; label: string; prefix?: string; options: readonly S[]; result: Result<S>;
  onStatus: (s: S) => void; onNote: (note: string) => void; after?: React.ReactNode;
}) {
  return (
    <fieldset className={styles.entry}>
      <legend>{prefix ? <span className={room.itemMeta}>{prefix} </span> : null}{label}</legend>
      <div className={styles.options}>
        {options.map((o) => (
          <label key={o} className={styles.option}>
            <input type="radio" name={name} value={o} checked={result.status === o} onChange={() => onStatus(o)} />
            {OUTCOME_WORDS[o]}
          </label>
        ))}
      </div>
      {after}
      <div className={`${room.field} ${styles.noteField}`}>
        <label htmlFor={`${name}-note`} className={room.hint}>Your evidence note (optional, stays in this browser)</label>
        <input id={`${name}-note`} className={room.input} value={result.note} maxLength={LAB_MAX_ITEM_NOTE} onChange={(e) => onNote(e.target.value)} autoComplete="off" />
      </div>
    </fieldset>
  );
}

export function ResultsSection({ lab, products, update, announce }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const current = products.find((p) => p.slug === chosen) ?? products[0];
  if (!current) return null;
  const slug = current.slug;
  const r = lab.products[slug] ?? emptyResults();
  const get = <S extends string>(map: Record<string, Result<S>>, item: LabItem, first: S): Result<S> => map[item.id] ?? { status: first, note: "" };

  return (
    <section id="results" className={room.section} aria-labelledby="results-h">
      <h2 id="results-h">2. Record what you saw</h2>
      <p className={room.lead}>Pick a product, then record each result as you test it. Leave anything you have not tried as not tested: an empty result is unknown, not a pass.</p>
      <div className={styles.switch} role="group" aria-label="Product you are recording">
        {products.map((p) => (
          <button key={p.slug} type="button" aria-pressed={p.slug === slug} onClick={() => { setChosen(p.slug); setPending(null); announce(`Recording results for ${p.name}.`); }}>{p.name}</button>
        ))}
      </div>

      <div className={room.card}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 650 }}>{current.name}</h3>
        <div className={styles.group}>
          <h3>Trial tasks</h3>
          {lab.tasks.length === 0 ? <p className={room.empty}>No trial tasks in your plan.</p> : null}
          {lab.tasks.map((t) => (
            <Entry key={t.id} name={`${slug}-task-${t.id}`} label={t.label} options={TRIAL_OUTCOMES} result={get(r.tasks, t, "NOT_TESTED")}
              onStatus={(status) => update((s, active) => setTaskResult(s, slug, active, t.id, { status }))}
              onNote={(note) => update((s, active) => setTaskResult(s, slug, active, t.id, { note }))} />
          ))}
        </div>
        <div className={styles.group}>
          <h3>Migration checks</h3>
          {lab.checks.length === 0 ? <p className={room.empty}>No migration checks in your plan.</p> : null}
          {lab.checks.map((c) => (
            <Entry key={c.id} name={`${slug}-check-${c.id}`} label={c.label} options={MIGRATION_STATUSES} result={get(r.checks, c, "NOT_CHECKED")}
              onStatus={(status) => update((s, active) => setCheckResult(s, slug, active, c.id, { status }))}
              onNote={(note) => update((s, active) => setCheckResult(s, slug, active, c.id, { note }))} />
          ))}
        </div>
        <div className={styles.group}>
          <h3>Must-haves and deal breakers</h3>
          {lab.requirements.length === 0 ? <p className={room.empty}>No requirements yet. Add them in step 1.</p> : null}
          {lab.requirements.map((q) => {
            const key = `${slug}:${q.id}`;
            const name = `${slug}-req-${q.id}`;
            return (
              <Entry key={q.id} name={name} label={q.label} prefix={q.kind === "deal_breaker" ? "Deal breaker:" : "Must-have:"} options={REQUIREMENT_OUTCOMES} result={get(r.requirements, q, "NOT_TESTED")}
                onStatus={(status) => {
                  // Marking something as verified by the buyer is a claim they make, so it needs an explicit second step.
                  if (status === "VERIFIED_BY_BUYER") { setPending(key); return; }
                  setPending(null);
                  update((s, active) => setRequirementResult(s, slug, active, q.id, { status }));
                }}
                onNote={(note) => update((s, active) => setRequirementResult(s, slug, active, q.id, { note }))}
                after={pending === key ? (
                  <div className={styles.confirm} role="group" aria-labelledby={`${name}-confirm`}>
                    <p id={`${name}-confirm`}>Confirm you checked this yourself in {current.name}: <strong>{q.label}</strong>. Miloosh and the vendor have not verified it.</p>
                    <div className={room.row} style={{ marginTop: 12 }}>
                      <button type="button" className={`${room.btn} ${room.btnPrimary}`} onClick={() => {
                        update((s, active) => setRequirementResult(s, slug, active, q.id, { status: "VERIFIED_BY_BUYER" }, true));
                        setPending(null);
                        announce(`Marked as verified by you: ${q.label}.`);
                      }}>Yes, I verified it myself</button>
                      <button type="button" className={`${room.btn} ${room.btnQuiet}`} onClick={() => { setPending(null); announce("Not marked as verified."); }}>Cancel</button>
                    </div>
                  </div>
                ) : null} />
            );
          })}
        </div>
        <div className={`${room.field} ${styles.group}`}>
          <label htmlFor={`${slug}-product-note`}>Your notes on {current.name}</label>
          <span className={room.hint} id={`${slug}-product-note-hint`}>Private to this browser. Never added to a link, an event or a server. Up to {LAB_MAX_PRODUCT_NOTE} characters.</span>
          <textarea id={`${slug}-product-note`} aria-describedby={`${slug}-product-note-hint`} className={room.textarea} value={r.note} maxLength={LAB_MAX_PRODUCT_NOTE} onChange={(e) => { const note = e.target.value; update((s, active) => setProductNote(s, slug, active, note)); }} />
        </div>
      </div>
    </section>
  );
}
