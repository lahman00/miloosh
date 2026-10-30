"use client";

import styles from "../decision-room.module.css";
import { StatusChip } from "./StatusChip";
import { BUILTIN_CRITERIA, evaluateCriterion, summarizeEvidence } from "@/lib/decision-room/criteria";
import type { RoomState } from "@/lib/decision-room/state";
import type { Evidence, RoomProduct } from "@/lib/decision-room/types";
import type { DetailsStatus } from "./useRoom";

function useCriteria(room: RoomState) {
  return [
    ...BUILTIN_CRITERIA.filter((c) => room.criteria.includes(c.id)).map((c) => ({ id: c.id, label: c.label })),
    ...room.custom.map((c) => ({ id: c.id, label: c.label, kind: c.kind })),
  ];
}

function EvidenceBody({ e }: { e: Evidence }) {
  return (
    <>
      <StatusChip evidence={e} />
      <p className={styles.cellDetail}>{e.detail}</p>
      {e.toVerify ? <p className={styles.cellVerify}><strong>To verify:</strong> {e.toVerify}</p> : null}
      {e.sources.length > 0 ? (
        <p className={styles.src}>Source: {e.sources.map((s, i) => (<span key={s.url}>{i > 0 ? ", " : ""}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></span>))}{e.checkedAt ? `, checked ${e.checkedAt}` : ""}</p>
      ) : null}
    </>
  );
}

export function CompareSection({ room, products, status, retry }: { room: RoomState; products: RoomProduct[]; status: DetailsStatus; retry: () => void }) {
  const criteria = useCriteria(room);
  const evals = products.map((p) => ({ p, ev: criteria.map((c) => evaluateCriterion(p, c)) }));

  return (
    <section id="compare" className={`${styles.section} ${styles.printHide}`} aria-labelledby="compare-h">
      <h2 id="compare-h">3. Compare the evidence</h2>
      <p className={styles.lead}>Each cell says whether the fact is <strong>verified</strong> (stated in a dated vendor pricing record), <strong>documented, limited</strong> (found in recorded vendor material, not tested by Miloosh) or <strong>unknown</strong> (not recorded; it does not mean unsupported). There is no score and no ranking.</p>
      {status === "error" ? (
        <div className={styles.error} role="alert">Product details could not be loaded. Your shortlist is safe. <button type="button" className={styles.btn} onClick={retry}>Try again</button></div>
      ) : null}
      {room.saved.length < 2 ? (
        <p className={styles.empty}>Save at least two products to compare them side by side.</p>
      ) : products.length < 2 ? (
        <p className={styles.empty} role="status">{status === "loading" ? "Loading product evidence…" : "Choose at least two products from your shortlist to compare."}</p>
      ) : criteria.length === 0 ? (
        <p className={styles.empty}>Choose at least one requirement above to see the evidence for each product.</p>
      ) : (
        <>
          <div className={styles.tableWrap} role="region" aria-label="Evidence comparison table, scrolls sideways when wide" tabIndex={0}>
            <table className={styles.table}>
              <caption className={styles.live}>Evidence for each requirement and product</caption>
              <thead><tr><th scope="col">Requirement</th>{evals.map(({ p }) => <th key={p.slug} scope="col">{p.name}</th>)}</tr></thead>
              <tbody>
                {criteria.map((c, i) => (
                  <tr key={c.id}><th scope="row">{c.label}</th>{evals.map(({ p, ev }) => <td key={p.slug}><EvidenceBody e={ev[i]!} /></td>)}</tr>
                ))}
                <tr><th scope="row">Summary</th>{evals.map(({ p, ev }) => { const n = summarizeEvidence(ev); return <td key={p.slug}><span className={styles.counts}>{n.verifiedYes} verified yes · {n.documentedYes} documented · {n.verifiedNo} verified no · {n.unknown} unknown</span></td>; })}</tr>
              </tbody>
            </table>
          </div>
          <div className={styles.cards}>
            {evals.map(({ p, ev }) => { const n = summarizeEvidence(ev); return (
              <article key={p.slug} className={styles.evCard} aria-labelledby={`ev-${p.slug}`}>
                <h3 id={`ev-${p.slug}`}>{p.name}</h3>
                <p className={styles.counts}>{n.verifiedYes} verified yes · {n.documentedYes} documented · {n.verifiedNo} verified no · {n.unknown} unknown</p>
                <dl>{criteria.map((c, i) => (<div key={c.id}><dt>{c.label}</dt><dd><EvidenceBody e={ev[i]!} /></dd></div>))}</dl>
              </article>
            ); })}
          </div>
        </>
      )}
      <div className={styles.keep}>
        <h3 style={{ fontWeight: 650 }}>Or: keep your current tool, or wait</h3>
        <p className={styles.lead} style={{ marginTop: 8 }}>Not buying is a real outcome. If the unknowns above matter to you, staying with {room.currentTool.name || "what you use today"} until you have verified them is a sound decision.</p>
      </div>
    </section>
  );
}
