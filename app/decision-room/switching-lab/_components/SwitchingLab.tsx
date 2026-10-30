"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import room from "../../decision-room.module.css";
import styles from "../switching-lab.module.css";
import { PlanSection } from "./PlanSection";
import { OUTCOME_WORDS, ResultsSection } from "./ResultsSection";
import { useLab, type LabIndexEntry, type LabProduct, type SaveState } from "./useLab";
import { VERDICT_WORDS, emptyResults, labToText, nextSteps, summarizeProduct, type LabState, type ProductSummary, type SummaryLine } from "@/lib/decision-room/switching-lab";

const STEPS = [["plan", "Plan"], ["results", "Record"], ["summary", "Summary"], ["appendix", "Appendix"]] as const;
const VERDICT_CLASS = { BLOCKED: styles.verdictBlocked, ALL_REPORTED_CLEAR: styles.verdictClear, IN_PROGRESS: styles.verdictOpen, NOT_STARTED: styles.verdictOpen } as const;
const VERDICT_MARK = { BLOCKED: "✕", ALL_REPORTED_CLEAR: "✓", IN_PROGRESS: "◐", NOT_STARTED: "?" } as const;

const SAVE_TEXT: Record<SaveState, string> = {
  saved: "Saved automatically in this browser only.",
  memory: "This browser is blocking storage (private mode or full storage). The lab works, but your results will be lost when you close the tab. Download the appendix to keep them.",
  too_large: "That change was not saved: the lab is full. Shorten a note or remove an item, then try again.",
};

function Lines({ title, lines, empty }: { title: string; lines: SummaryLine[]; empty: string }) {
  return (
    <>
      <h4>{title} ({lines.length})</h4>
      {lines.length === 0 ? <p className={room.hint}>{empty}</p> : (
        <ul>{lines.map((l) => <li key={`${l.area}${l.label}`}><span className={room.itemMeta}>{l.area}:</span> {l.label}{l.note ? <> <em>Your note: {l.note}</em></> : null}</li>)}</ul>
      )}
    </>
  );
}

function SummaryCard({ p }: { p: ProductSummary }) {
  return (
    <article className={styles.summaryCard} aria-labelledby={`sum-${p.slug}`}>
      <h3 id={`sum-${p.slug}`}>{p.name}</h3>
      <p className={`${styles.verdict} ${VERDICT_CLASS[p.verdict]}`}><span aria-hidden="true">{VERDICT_MARK[p.verdict]}</span>{VERDICT_WORDS[p.verdict]}</p>
      <Lines title="You reported it worked" lines={p.succeeded} empty="Nothing reported as working yet." />
      <Lines title="Blocked" lines={p.blocked} empty="No failures or blockers recorded." />
      <Lines title="Untested or unknown" lines={p.untested} empty="Nothing left untested." />
      {p.note ? <p style={{ marginTop: 12 }}><strong>Your notes:</strong> {p.note}</p> : null}
    </article>
  );
}

/** Print-only version of the appendix, rendered as real headings and lists from the same data as the text file. */
function PrintAppendix({ lab, products, summaries, today }: { lab: LabState; products: LabProduct[]; summaries: ProductSummary[]; today: string }) {
  return (
    <article className={`${styles.printOnly} ${styles.appendix}`}>
      <h2>Miloosh Switching Lab: buyer trial appendix</h2>
      <p>Prepared {today}. Every result was recorded by the buyer. Miloosh did not run these tests and no vendor has verified them. This appendix does not replace the sourced Decision Room brief.</p>
      {products.map((p) => {
        const r = lab.products[p.slug] ?? emptyResults();
        const s = summaries.find((x) => x.slug === p.slug)!;
        return (
          <section key={p.slug}>
            <h3>{p.name}: {VERDICT_WORDS[s.verdict]}</h3>
            <ul>
              {lab.tasks.map((t) => <li key={t.id}>[{OUTCOME_WORDS[r.tasks[t.id]?.status ?? "NOT_TESTED"]}] Trial task: {t.label}{r.tasks[t.id]?.note.trim() ? ` (your note: ${r.tasks[t.id]!.note.trim()})` : ""}</li>)}
              {lab.checks.map((c) => <li key={c.id}>[{OUTCOME_WORDS[r.checks[c.id]?.status ?? "NOT_CHECKED"]}] Migration check: {c.label}{r.checks[c.id]?.note.trim() ? ` (your note: ${r.checks[c.id]!.note.trim()})` : ""}</li>)}
              {lab.requirements.map((q) => <li key={q.id}>[{OUTCOME_WORDS[r.requirements[q.id]?.status ?? "NOT_TESTED"]}] {q.kind === "deal_breaker" ? "Deal breaker" : "Must-have"}: {q.label}{r.requirements[q.id]?.note.trim() ? ` (your note: ${r.requirements[q.id]!.note.trim()})` : ""}</li>)}
            </ul>
            {r.note.trim() ? <p>Your notes: {r.note.trim()}</p> : null}
          </section>
        );
      })}
      <h3>Next steps</h3>
      <ol>{nextSteps(summaries).map((n) => <li key={n}>{n}</li>)}</ol>
    </article>
  );
}

export function SwitchingLab({ index }: { index: LabIndexEntry[] }) {
  const l = useLab(index);
  const [notice, setNotice] = useState("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const summaries = useMemo(() => l.products.map((p) => summarizeProduct(l.lab, p.slug, p.name)), [l.lab, l.products]);
  const text = useMemo(() => labToText(l.lab, l.products, today), [l.lab, l.products, today]);

  function download() {
    // Built in the browser; nothing is uploaded. The object URL is released right after the click.
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `miloosh-switching-lab-${today}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Trial appendix downloaded as a text file.");
  }

  return (
    <div className={room.room}>
      <div className={room.wrap}>
        <header className={room.noPrint}>
          <Link href="/decision-room" className={styles.back}><span aria-hidden="true">←</span> Back to Decision Room</Link>
          <p className={room.eyebrow} style={{ marginTop: 16 }}><span className={styles.stage}>Decision Room · Stage 2</span></p>
          <h1 className={room.title}>Switching Lab</h1>
          <p className={room.intro}>Test your shortlisted software hands-on before you switch. Plan a short trial, record what you saw yourself, check the migration risks, and leave with a plain summary of what worked, what is blocked and what is still unknown.</p>
          <p className={room.privacy}><span aria-hidden="true">🔒</span><span>No account and no email. Your results and notes stay in this browser and are never put in a link or sent to Miloosh. Miloosh does not run these tests, score products or rank them here.</span></p>
          <nav aria-label="Switching Lab steps"><ol className={room.steps}>{STEPS.map(([id, label], i) => (<li key={id}><a href={`#${id}`}><span className={room.stepNum} aria-hidden="true">{i + 1}</span>{label}</a></li>))}</ol></nav>
        </header>

        <div className={room.live} role="status" aria-live="polite">{notice}</div>

        {!l.ready ? <p className={room.empty} role="status">Loading your saved trial…</p> : l.products.length === 0 ? (
          <section className={room.section} aria-labelledby="empty-h">
            <h2 id="empty-h">Choose products in the Decision Room first</h2>
            <div className={room.empty}>
              <p>The Switching Lab tests the products you shortlisted. Your Decision Room has none saved in this browser yet.</p>
              <p style={{ marginTop: 16 }}><Link href="/decision-room#shortlist" className={`${room.btn} ${room.btnPrimary}`}>Go to the Decision Room to choose products</Link></p>
            </div>
          </section>
        ) : (
          <>
            <p className={`${styles.saveLine} ${l.saveState === "saved" ? "" : styles.saveWarn} ${room.noPrint}`} role={l.saveState === "saved" ? undefined : "alert"}>
              <span aria-hidden="true">{l.saveState === "saved" ? "✓" : "!"}</span>{SAVE_TEXT[l.saveState]}
            </p>
            <section className={`${room.section} ${room.noPrint}`} style={{ marginTop: 24 }} aria-labelledby="testing-h">
              <h2 id="testing-h">Products you are testing</h2>
              <p className={room.lead}>{l.source === "compare" ? "From your Decision Room comparison." : "From your Decision Room shortlist."} To change them, <Link href="/decision-room#shortlist">edit your shortlist in the Decision Room</Link>. Results for a product you take out are kept here.</p>
              <ul className={styles.products}>{l.products.map((p) => <li key={p.slug}><span style={{ fontWeight: 650 }}>{p.name}</span><small>{p.categoryName}</small></li>)}</ul>
            </section>
            <div className={room.noPrint}><PlanSection lab={l.lab} roomState={l.room} update={l.update} announce={setNotice} /></div>
            <div className={room.noPrint}><ResultsSection lab={l.lab} products={l.products} update={l.update} announce={setNotice} /></div>
            <section id="summary" className={`${room.section} ${room.noPrint}`} aria-labelledby="summary-h">
              <h2 id="summary-h">3. Decision summary</h2>
              <p className={room.lead}>Only what you recorded. Products stay in your Decision Room order: there is no score and no ranking. Untested is not a pass.</p>
              <div className={styles.summaryGrid}>{summaries.map((p) => <SummaryCard key={p.slug} p={p} />)}</div>
            </section>
            <section id="appendix" className={room.section} aria-labelledby="appendix-h">
              <h2 id="appendix-h" className={room.noPrint}>4. Trial appendix</h2>
              <div className={room.noPrint}>
                <p className={room.lead}>Keep your own record or attach it to your team&apos;s decision. It holds your product names, task statuses, migration risks, notes and next steps. It does <strong>not</strong> replace the sourced <Link href="/decision-room#brief">Decision Room brief</Link>, which has the documented evidence, sources and first-year cost.</p>
                <div className={room.row} style={{ marginTop: 16 }}>
                  <button type="button" className={`${room.btn} ${room.btnPrimary}`} onClick={() => window.print()}>Print or save as PDF</button>
                  <button type="button" className={room.btn} onClick={download}>Download as text</button>
                </div>
                <p className={room.hint} style={{ marginTop: 8 }}>Both are created in your browser. Nothing is uploaded.</p>
                <details className={styles.preview}>
                  <summary>Preview the text appendix</summary>
                  <pre className={styles.pre}>{text}</pre>
                </details>
              </div>
              <PrintAppendix lab={l.lab} products={l.products} summaries={summaries} today={today} />
            </section>
          </>
        )}
        <p className={`${room.hint} ${room.noPrint}`} style={{ marginTop: 48 }}>Need the documented evidence instead? <Link href="/decision-room#compare">Compare sources in the Decision Room</Link>.</p>
      </div>
    </div>
  );
}
