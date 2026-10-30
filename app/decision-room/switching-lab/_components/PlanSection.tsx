"use client";

import { useState, type FormEvent } from "react";
import room from "../../decision-room.module.css";
import { BUILTIN_CRITERIA } from "@/lib/decision-room/criteria";
import type { RoomState } from "@/lib/decision-room/state";
import {
  LAB_MAX_CHECKS, LAB_MAX_LABEL, LAB_MAX_REQUIREMENTS, LAB_MAX_TASKS,
  addItem, addRequirement, importRoomRequirements, removeItem, restorePresets,
  type LabItem, type LabState, type RequirementKind,
} from "@/lib/decision-room/switching-lab";

type Update = (fn: (s: LabState, active: string[]) => LabState) => void;
type Props = { lab: LabState; roomState: RoomState | null; update: Update; announce: (m: string) => void };

/** True when any product has a recorded status or note for this item, so removing it needs a confirmation. */
function hasResults(lab: LabState, field: "tasks" | "checks" | "requirements", id: string) {
  return Object.values(lab.products).some((p) => Boolean(p[field][id]));
}

function AddForm({ id, label, onAdd, disabled, children }: { id: string; label: string; onAdd: (text: string) => boolean; disabled: boolean; children?: React.ReactNode }) {
  const [text, setText] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (onAdd(text)) setText("");
  }
  return (
    <form className={room.row} style={{ marginTop: 16, alignItems: "flex-end" }} onSubmit={submit}>
      <div className={room.field} style={{ flex: "1 1 260px" }}>
        <label htmlFor={id}>{label}</label>
        <input id={id} className={room.input} value={text} maxLength={LAB_MAX_LABEL} onChange={(e) => setText(e.target.value)} disabled={disabled} autoComplete="off" />
      </div>
      {children}
      <button type="submit" className={room.btn} disabled={disabled || text.trim().length < 2}>Add</button>
    </form>
  );
}

function ItemList({ items, field, lab, update, announce, kindLabel }: { items: readonly (LabItem & { kind?: RequirementKind })[]; field: "tasks" | "checks" | "requirements"; lab: LabState; update: Update; announce: (m: string) => void; kindLabel?: boolean }) {
  if (items.length === 0) return <p className={room.empty}>Nothing here yet. Add your own below.</p>;
  return (
    <ul className={room.list}>
      {items.map((item) => (
        <li key={item.id} className={room.item}>
          <span style={{ flex: "1 1 260px", lineHeight: 1.55 }}>
            {kindLabel ? <strong>{item.kind === "deal_breaker" ? "Deal breaker: " : "Must-have: "}</strong> : null}{item.label}
          </span>
          <button type="button" className={`${room.btn} ${room.btnQuiet}`} aria-label={`Remove: ${item.label}`} onClick={() => {
            if (hasResults(lab, field, item.id) && !window.confirm(`Remove "${item.label}"? The results and notes you recorded for it will be deleted.`)) return;
            update((s) => removeItem(s, field, item.id));
            announce(`Removed: ${item.label}`);
          }}>Remove</button>
        </li>
      ))}
    </ul>
  );
}

export function PlanSection({ lab, roomState, update, announce }: Props) {
  const [kind, setKind] = useState<RequirementKind>("must_have");
  const roomRequirementCount = roomState ? BUILTIN_CRITERIA.filter((c) => roomState.criteria.includes(c.id)).length + roomState.custom.length : 0;

  const add = (list: "tasks" | "checks", max: number) => (text: string) => {
    if (lab[list].length >= max) { announce(`You can keep up to ${max}. Remove one first.`); return false; }
    if (addItem(lab, list, text) === lab) { announce("That item is already in the list."); return false; }
    update((s) => addItem(s, list, text));
    announce(`Added: ${text.trim()}`);
    return true;
  };

  return (
    <section id="plan" className={room.section} aria-labelledby="plan-h">
      <h2 id="plan-h">1. Plan your trial</h2>
      <p className={room.lead}>A short, generic starting list of things to try yourself in a free trial or demo account. Every item is a check <strong>you</strong> run; Miloosh has not run them. Remove what does not apply, add what matters to you.</p>
      <div className={room.grid2}>
        <div className={room.card}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 650 }}>Trial tasks</h3>
          <p className={room.hint}>{lab.tasks.length} of {LAB_MAX_TASKS}</p>
          <ItemList items={lab.tasks} field="tasks" lab={lab} update={update} announce={announce} />
          <AddForm id="add-task" label="Add your own trial task" onAdd={add("tasks", LAB_MAX_TASKS)} disabled={lab.tasks.length >= LAB_MAX_TASKS} />
          <button type="button" className={`${room.btn} ${room.btnQuiet}`} style={{ marginTop: 12 }} onClick={() => { update((s) => restorePresets(s, "tasks")); announce("Suggested trial tasks restored."); }}>Restore suggested tasks</button>
        </div>
        <div className={room.card}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 650 }}>Migration checks</h3>
          <p className={room.hint}>{lab.checks.length} of {LAB_MAX_CHECKS}</p>
          <ItemList items={lab.checks} field="checks" lab={lab} update={update} announce={announce} />
          <AddForm id="add-check" label="Add your own migration check" onAdd={add("checks", LAB_MAX_CHECKS)} disabled={lab.checks.length >= LAB_MAX_CHECKS} />
          <button type="button" className={`${room.btn} ${room.btnQuiet}`} style={{ marginTop: 12 }} onClick={() => { update((s) => restorePresets(s, "checks")); announce("Suggested migration checks restored."); }}>Restore suggested checks</button>
        </div>
      </div>
      <div className={room.card}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 650 }}>Must-haves and deal breakers</h3>
        <p className={room.hint}>What a product must do for you, and what would rule it out. {lab.requirements.length} of {LAB_MAX_REQUIREMENTS}.</p>
        <ItemList items={lab.requirements} field="requirements" lab={lab} update={update} announce={announce} kindLabel />
        <AddForm id="add-req" label="Add a requirement" disabled={lab.requirements.length >= LAB_MAX_REQUIREMENTS} onAdd={(text) => {
          if (addRequirement(lab, text, kind) === lab) { announce("That requirement is already in the list."); return false; }
          update((s) => addRequirement(s, text, kind));
          announce(`Added ${kind === "deal_breaker" ? "deal breaker" : "must-have"}: ${text.trim()}`);
          return true;
        }}>
          <div className={room.field} style={{ flex: "0 1 200px" }}>
            <label htmlFor="add-req-kind">Type</label>
            <select id="add-req-kind" className={room.select} value={kind} onChange={(e) => setKind(e.target.value === "deal_breaker" ? "deal_breaker" : "must_have")}>
              <option value="must_have">Must-have</option>
              <option value="deal_breaker">Deal breaker</option>
            </select>
          </div>
        </AddForm>
        {roomRequirementCount > 0 ? (
          <button type="button" className={`${room.btn} ${room.btnQuiet}`} style={{ marginTop: 12 }} disabled={lab.requirements.length >= LAB_MAX_REQUIREMENTS} onClick={() => {
            update((s) => importRoomRequirements(s, roomState));
            announce("Requirements from your Decision Room added as must-haves. Your Decision Room was not changed.");
          }}>Add my {roomRequirementCount} Decision Room requirement{roomRequirementCount === 1 ? "" : "s"} as must-haves</button>
        ) : null}
        <p className={room.hint} style={{ marginTop: 12 }}>The Decision Room checks what is documented. Here you record what you saw yourself.</p>
      </div>
    </section>
  );
}
