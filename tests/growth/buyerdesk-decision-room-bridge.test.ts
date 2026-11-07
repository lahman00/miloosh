import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare } from "@/lib/decision-room/share";
import { emptyRoom } from "@/lib/decision-room/state";

const buyerDesk = readFileSync(new URL("../../components/BuyerDesk.tsx", import.meta.url), "utf8");

describe("BuyerDesk to Decision Room shortlist bridge", () => {
  it("puts only product ids into the decision link, never private research", () => {
    const room = emptyRoom();
    room.saved = ["airtable", "todoist"];
    room.note = "private buying concern";
    room.currentTool.name = "private incumbent tool";
    room.team = 17;
    const encoded = encodeShare(room);
    expect(encoded).toBe("p=airtable.todoist");
    expect(encoded).not.toContain("private");
    expect(encoded).not.toContain("17");
    expect(decodeShare(encoded, (slug) => ["airtable", "todoist"].includes(slug))?.saved).toEqual(["airtable", "todoist"]);
  });

  it("shows the transition only in the two-or-more saved tools branch and tracks the click", () => {
    const start = buyerDesk.indexOf("{picks.length < 2 ?");
    const end = buyerDesk.indexOf("{brief && picks.length >= 2", start);
    const branch = buyerDesk.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(branch).toContain("buyer-desk-shortlist-decision-room");
    expect(branch).toContain('targetPath="/decision-room"');
    expect(branch).toContain("href={roomHref}");
    expect(buyerDesk).toContain("saved: picks.map((p) => p.slug)");
    expect(branch).toContain("Existing Decision Room choices are not overwritten");
  });
});
