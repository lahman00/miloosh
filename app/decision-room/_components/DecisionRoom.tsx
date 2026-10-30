"use client";

import { useState } from "react";
import styles from "../decision-room.module.css";
import { BriefSection } from "./BriefSection";
import { CompareSection } from "./CompareSection";
import { CostSection } from "./CostSection";
import { RequirementsSection } from "./RequirementsSection";
import { ShortlistSection } from "./ShortlistSection";
import { useRoom } from "./useRoom";
import type { RoomIndexEntry } from "@/lib/decision-room/types";

const STEPS = [["shortlist", "Shortlist"], ["requirements", "Requirements"], ["compare", "Compare"], ["cost", "Cost"], ["brief", "Brief"]] as const;

export function DecisionRoom({ index }: { index: RoomIndexEntry[] }) {
  const r = useRoom(index);
  const [printing, setPrinting] = useState(false);
  const products = r.activeSlugs.map((s) => r.details[s]).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className={`${styles.room} ${printing ? styles.printing : ""}`}>
      <div className={styles.wrap}>
        <header className={styles.printHide}>
          <p className={styles.eyebrow}>Decision Room</p>
          <h1 className={styles.title}>Decide with evidence, not hype</h1>
          <p className={styles.intro}>Save the software you are considering, say what matters to you, see what is verified and what is still unknown, estimate the cost, and leave with a sourced brief you can share with your team.</p>
          <p className={styles.privacy}><span aria-hidden="true">🔒</span><span>No account and no email. Your shortlist and notes stay in this browser. Miloosh does not rank products here and affiliate status never changes the evidence.</span></p>
          <nav aria-label="Decision Room steps"><ol className={styles.steps}>{STEPS.map(([id, label], i) => (<li key={id}><a href={`#${id}`}><span className={styles.stepNum} aria-hidden="true">{i + 1}</span>{label}</a></li>))}</ol></nav>
        </header>

        <div className={styles.live} role="status" aria-live="polite">{r.notice}</div>
        {r.storageProblem ? <div className={styles.error} role="alert">This browser is not letting Miloosh save your research (private mode or full storage). The room still works, but your shortlist will be lost when you close the tab.</div> : null}
        {r.banner ? (
          <div className={`${styles.banner} ${styles.printHide}`} role="region" aria-label="Notice">
            <span>{r.banner.kind === "imported" ? `We imported ${r.banner.count} product${r.banner.count === 1 ? "" : "s"} from your BuyerDesk shortlist. Your BuyerDesk was not changed.` : r.pendingShared.length > 0 ? `This link shares ${r.banner.count} product${r.banner.count === 1 ? "" : "s"}. ${r.pendingShared.length} not in your shortlist yet.` : "Shared shortlist loaded. It contains only product ids and requirements the sender chose."}</span>
            <span className={styles.row}>
              {r.banner.kind === "shared" && r.pendingShared.length > 0 ? <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={r.acceptShared}>Add to my shortlist</button> : null}
              <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={r.dismissBanner}>Dismiss</button>
            </span>
          </div>
        ) : null}

        {!r.ready ? <p className={styles.empty} role="status">Loading your saved research…</p> : (
          <>
            <div className={styles.printHide}><ShortlistSection index={index} room={r.room} update={r.update} known={r.known} save={r.save} announce={r.setNotice} /></div>
            <div className={styles.printHide}><RequirementsSection room={r.room} update={r.update} announce={r.setNotice} /></div>
            <CompareSection room={r.room} products={products} status={r.detailsStatus} retry={r.retryDetails} />
            <CostSection room={r.room} products={products} update={r.update} />
            <BriefSection room={r.room} products={products} announce={r.setNotice} generated={r.briefGenerated} onPrinting={setPrinting} />
          </>
        )}
      </div>
    </div>
  );
}
