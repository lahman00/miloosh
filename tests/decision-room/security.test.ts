import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSoftware } from "@/data/software";
import { toRoomProduct } from "@/lib/decision-room/products";
import { emptyRoom, cleanRoom, addCustom, type RoomState } from "@/lib/decision-room/state";
import { buildBrief, briefToText } from "@/lib/decision-room/brief";
import { encodeShare, decodeShare } from "@/lib/decision-room/share";

vi.mock("next/navigation", () => ({ usePathname: () => "/decision-room" }));
import { CompareSection } from "@/app/decision-room/_components/CompareSection";
import { CostSection } from "@/app/decision-room/_components/CostSection";

const known = (s: string) => ["callrail", "krispcall"].includes(s);
const HOSTILE = `<img src=x onerror=alert(1)><script>alert(2)</script>`;
const products = ["callrail", "krispcall"].map((s) => toRoomProduct(getSoftware(s)!));

function hostileRoom(): RoomState {
  const r = addCustom({ ...emptyRoom(), saved: ["callrail", "krispcall"], compare: ["callrail", "krispcall"], criteria: ["api"] }, HOSTILE, "feature");
  return { ...r, currentTool: { name: HOSTILE, monthlyCost: 1 }, note: HOSTILE };
}

describe("hostile text typed by a buyer", () => {
  it("is escaped by every renderer and never becomes markup", () => {
    const room = hostileRoom();
    const html = renderToStaticMarkup(createElement(CompareSection, { room, products, status: "idle", retry: () => {} })) + renderToStaticMarkup(createElement(CostSection, { room, products, update: () => {} }));
    expect(html).not.toContain("<script>");
    expect(html).not.toMatch(/<img[^>]*onerror/i);
    expect(html).toContain("&lt;img");
  });
  it("stays plain text in the brief export and never reaches a share link", () => {
    const room = hostileRoom();
    const text = briefToText(buildBrief(room, products, "2026-10-30"));
    expect(text).toContain("onerror");
    expect(encodeShare(room)).not.toMatch(/onerror|script|img/i);
  });
  it("is length-capped and stripped of control characters on the way in", () => {
    const r = cleanRoom({ saved: ["callrail"], note: `${"x".repeat(5000)}\u0000\n\n`, currentTool: { name: "y".repeat(500), monthlyCost: 5 }, custom: [{ label: "z".repeat(500), kind: "feature" }] }, known);
    expect(r.note.length).toBe(500);
    expect(r.currentTool.name.length).toBe(80);
    expect(r.custom[0]!.label.length).toBe(60);
  });
  it("share decoding rejects traversal, prototype pollution keys and oversized input", () => {
    for (const q of ["p=__proto__&c=constructor", "p=../../etc/passwd", "p=callrail.callrail.callrail&c=api.api", `p=${"callrail.".repeat(500)}`]) {
      const r = decodeShare(q, known);
      expect(r === null || (r.saved.every((s) => known(s)) && new Set(r.saved).size === r.saved.length)).toBe(true);
    }
    expect(decodeShare("p=callrail.callrail&c=api.api", known)!.criteria).toEqual(["api"]);
  });
});
