import { describe, expect, it } from "vitest";
import { getCurrentOwnerBlockers } from "@/scripts/growth/owner-blocker-analysis";

const ALLOWED = new Set([
  "OWNER_ACTION_REQUIRED",
  "BLOCKED_FORM_DEFECT",
  "APPROVED_NEEDS_LINK",
  "APPROVED_NEEDS_EDITORIAL_CONTENT",
  "HOLD",
]);

describe("current owner blocker analysis", () => {
  it("only exposes relationships that actually require owner action now", () => {
    const rows = getCurrentOwnerBlockers();
    expect(rows.every((row) => ALLOWED.has(row.status))).toBe(true);
  });

  it("never resurrects the closed ShareASale portfolio", () => {
    const rows = getCurrentOwnerBlockers();
    expect(rows.some((row) => row.programId === "shareasale-portfolio")).toBe(false);
    expect(rows.some((row) => row.network.toLowerCase().includes("shareasale"))).toBe(false);
  });

  it("does not surface ended/no-program products such as Calendly or Coda as owner work", () => {
    const products = new Set(getCurrentOwnerBlockers().flatMap((row) => row.products));
    expect(products.has("calendly")).toBe(false);
    expect(products.has("coda")).toBe(false);
  });

  it("does not use the obsolete blanket CJ account-creation instruction", () => {
    const text = getCurrentOwnerBlockers().map((row) => row.blocker).join(" ").toLowerCase();
    expect(text).not.toContain("publisher account creation");
    expect(text).not.toContain("create a shareasale");
  });
});
