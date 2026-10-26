import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isReplacedTool, startingPoints } from "@/lib/buyer-desk";
import type { DeskContext, DeskProduct } from "@/lib/buyer-desk";

const product = (slug: string, name: string): DeskProduct => ({ slug, name, category: "crm", description: "", bestFor: "", features: [], limitation: "", checkedAt: "2026-10-01" });
const pipedrive = product("pipedrive", "Pipedrive");
const close = product("close", "Close");
const nutshell = product("nutshell", "Nutshell");
const all = [pipedrive, close, nutshell];
const switching = (current: string): DeskContext => ({ intent: "switch", team: "", current, concern: "", note: "" });

describe("isReplacedTool", () => {
  it.each(["Pipedrive", "pipedrive", "  PIPEDRIVE crm ", "our old Pipedrive account"])("matches %j by whole word", (current) => {
    expect(isReplacedTool(switching(current), pipedrive)).toBe(true);
  });
  it("matches a name written with a domain suffix", () => {
    expect(isReplacedTool(switching("Close.io"), close)).toBe(true);
  });
  it("does not match a different word that merely contains the name", () => {
    expect(isReplacedTool(switching("closed spreadsheets"), close)).toBe(false);
    expect(isReplacedTool(switching("Pipedriver"), pipedrive)).toBe(false);
  });
  it("only applies to the replacing intent", () => {
    expect(isReplacedTool({ ...switching("Pipedrive"), intent: "new" }, pipedrive)).toBe(false);
    expect(isReplacedTool(undefined, pipedrive)).toBe(false);
    expect(isReplacedTool(switching(""), pipedrive)).toBe(false);
  });
});

describe("startingPoints", () => {
  it("lists every product when the buyer is not replacing one of them", () => {
    expect(startingPoints(all, "crm", undefined)).toEqual({ shown: all, hidden: [] });
    expect(startingPoints(all, "crm", switching("Salesforce"))).toEqual({ shown: all, hidden: [] });
  });
  it("hides the tool the buyer is replacing and reports it", () => {
    const result = startingPoints(all, "crm", switching("Pipedrive"));
    expect(result.shown.map((p) => p.slug)).toEqual(["close", "nutshell"]);
    expect(result.hidden.map((p) => p.slug)).toEqual(["pipedrive"]);
  });
  it("only considers the selected category", () => {
    const other = { ...product("todoist", "Todoist"), category: "work" as const };
    expect(startingPoints([...all, other], "crm", switching("Todoist")).shown).toHaveLength(3);
  });
});

describe("guided form", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components", "BuyerDesk.tsx"), "utf-8");
  it("does not remount the whole form when the category changes (that wiped the typed tool, concern and note)", () => {
    expect(source).toMatch(/<form key=\{intent\}/);
    expect(source).not.toMatch(/<form key=\{`\$\{intent\}-\$\{formCategory\}`\}/);
  });
  it("re-keys only the compare selects, so their defaults follow the category", () => {
    expect(source).toMatch(/<select key=\{formCategory\} name="first"/);
    expect(source).toMatch(/<select key=\{formCategory\} name="second"/);
  });
  it("derives the starting-point count instead of hardcoding 3", () => {
    expect(source).not.toContain("3 starting points");
  });
});
