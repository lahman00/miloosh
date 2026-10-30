"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "../decision-room.module.css";
import { StatusChip } from "./StatusChip";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { buildBrief, briefToText } from "@/lib/decision-room/brief";
import { formatMoney } from "@/lib/decision-room/cost";
import { encodeShare } from "@/lib/decision-room/share";
import type { RoomState } from "@/lib/decision-room/state";
import type { RoomProduct } from "@/lib/decision-room/types";

type Props = { room: RoomState; products: RoomProduct[]; announce: (m: string) => void; generated: (source: "create" | "print" | "text" | "link") => void; onPrinting: (on: boolean) => void };

export function BriefSection({ room, products, announce, generated, onPrinting }: Props) {
  const [created, setCreated] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const brief = useMemo(() => buildBrief(room, products, today), [room, products, today]);
  const ready = products.length > 0;

  useEffect(() => {
    const done = () => onPrinting(false);
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, [onPrinting]);

  async function copy(text: string, ok: string) {
    try { await navigator.clipboard.writeText(text); announce(ok); } catch { announce("Copying is not available in this browser. Select the text and copy it manually."); }
  }

  return (
    <section id="brief" className={styles.section} aria-labelledby="brief-h">
      <h2 id="brief-h" className={styles.noPrint}>5. Create your decision brief</h2>
      <p className={`${styles.lead} ${styles.noPrint}`}>A working document for your team: your requirements, the evidence with sources and dates, open questions, cost assumptions and next steps. It is not a recommendation to buy.</p>
      <div className={`${styles.row} ${styles.noPrint}`} style={{ marginTop: 16 }}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={!ready} onClick={() => { setCreated(true); generated("create"); announce("Decision brief created below."); }}>Create decision brief</button>
        {created ? (<>
          <button type="button" className={styles.btn} onClick={() => { onPrinting(true); generated("print"); setTimeout(() => window.print(), 50); }}>Print or save as PDF</button>
          <button type="button" className={styles.btn} onClick={() => { generated("text"); void copy(briefToText(brief), "Brief copied as text."); }}>Copy as text</button>
          <button type="button" className={styles.btn} onClick={() => { generated("link"); void copy(`${window.location.origin}/decision-room?${encodeShare(room)}`, "Shareable link copied. It contains only product ids and the built-in requirements you chose."); }} disabled={room.saved.length === 0}>Copy share link</button>
        </>) : null}
      </div>
      {!ready ? <p className={styles.empty}>Save and compare at least one product to create a brief.</p> : null}
      {created && ready ? (
        <article className={`${styles.card} ${styles.brief}`} aria-labelledby="brief-title">
          <h2 id="brief-title" style={{ fontSize: "1.5rem", fontWeight: 650 }}>Miloosh decision brief</h2>
          <p className={styles.hint}>Prepared {brief.generatedOn}. A research aid, not a vendor quote and not a recommendation to buy.</p>
          <h3>Your requirements</h3>
          <ul>
            <li>Team size: {brief.requirements.team ?? "not entered"}; currency: {brief.requirements.currency}</li>
            {brief.requirements.labels.map((l) => <li key={l}>{l}</li>)}
            {brief.requirements.custom.map((c) => <li key={c.label}>{c.label} <span className={styles.itemMeta}>(your {c.kind === "integration" ? "integration" : "capability"} requirement)</span></li>)}
            {brief.requirements.labels.length + brief.requirements.custom.length === 0 ? <li>No requirements selected yet. Go back to step 2.</li> : null}
          </ul>
          {brief.requirements.note ? <p><strong>Your note:</strong> {brief.requirements.note}</p> : null}
          <h3>Options</h3>
          {brief.options.map((o) => (
            <div key={o.slug} style={{ marginTop: 16 }}>
              <h4 style={{ fontWeight: 650 }}><Link href={`/software/${o.slug}`}>{o.name}</Link></h4>
              <p className={styles.counts}>{o.counts.verifiedYes} verified yes · {o.counts.documentedYes} documented · {o.counts.verifiedNo} verified no · {o.counts.unknown} unknown of {o.counts.total}</p>
              <ul>{o.evidence.map((e) => (<li key={e.criterionId}><strong>{e.label}</strong> <StatusChip evidence={e} /> {e.detail}{e.toVerify ? <> <em>To verify: {e.toVerify}</em></> : null}</li>))}</ul>
              {o.strengths.length ? <p><strong>Documented strengths</strong> (vendor and editorial material read {o.accessedAt}): {o.strengths.join("; ")}</p> : null}
              {o.limitations.length ? <p><strong>Documented limitations:</strong> {o.limitations.join("; ")}</p> : null}
              <p><strong>First-year cost, known parts only:</strong> {o.cost.knownTotal === null ? "Unknown" : formatMoney(o.cost.knownTotal, o.cost.currency)}{o.cost.complete ? "" : " (incomplete)"}</p>
              <ul>{o.cost.lines.map((l) => <li key={l.id}>{l.label}: {l.amount === null ? "Unknown" : formatMoney(l.amount, o.cost.currency)} <span className={styles.formula}>[{l.formula}]</span></li>)}</ul>
              {products.find((p) => p.slug === o.slug) ? (() => { const p = products.find((x) => x.slug === o.slug)!; return (
                <div className={styles.noPrint}>
                  <TrackedCtaLink slug={p.slug} href={p.cta.href} rel={p.cta.rel} target="_blank" variant="secondary" ctaLocation="decision-room-brief">Visit {p.name} official site <ExternalLink className="h-4 w-4" aria-hidden="true" /></TrackedCtaLink>
                  {p.cta.disclosure ? <p className={styles.disclosure}>This is an affiliate link. See our <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>. It does not change the evidence above.</p> : null}
                </div>); })() : null}
            </div>
          ))}
          <h3>Or: keep your current tool, or do not buy yet</h3>
          <p>{brief.keepCurrent.name}: {brief.keepCurrent.yearlyCost === null ? "yearly cost unknown" : formatMoney(brief.keepCurrent.yearlyCost, room.currency)} <span className={styles.formula}>[{brief.keepCurrent.formula}]</span>. Staying put is a valid outcome if the open questions below matter to you.</p>
          <h3>Open questions</h3>
          <ul>{brief.unresolved.length ? brief.unresolved.map((u) => <li key={u}>{u}</li>) : <li>None recorded for the selected requirements. Still confirm plan and price with each vendor.</li>}</ul>
          <h3>Sources</h3>
          <ul>{brief.sources.map((s) => <li key={`${s.product}${s.url}`}>{s.product}: <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>{s.checkedAt ? ` (checked ${s.checkedAt})` : ""}</li>)}</ul>
          <h3>Next steps</h3>
          <ol>{brief.nextSteps.map((n) => <li key={n}>{n}</li>)}</ol>
          <p className={styles.hint}>Miloosh is independent. Some vendor links on miloosh.com are affiliate links, disclosed where they appear, and they never change this brief.</p>
        </article>
      ) : null}
    </section>
  );
}
