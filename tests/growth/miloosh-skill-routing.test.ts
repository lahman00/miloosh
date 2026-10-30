import { existsSync, readFileSync, realpathSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const route = "docs/growth/SKILL_ROUTING_20261030.md";
const skill = ".agents/skills/miloosh-skill-integration/SKILL.md";
const claude = ".claude/skills/miloosh-skill-integration/SKILL.md";

describe("Miloosh non-duplicative growth/product skill routing", () => {
  it("is discoverable by both Claude Code and Codex with one canonical skill source", () => {
    expect(existsSync(skill)).toBe(true);
    expect(realpathSync(claude)).toBe(realpathSync(skill));
    const rules = read("AGENTS.md");
    expect(rules).toContain(skill);
    expect(read("CLAUDE.md")).toContain("@AGENTS.md");
  });

  it("preserves existing Growth Director, Release Guardian and Design Intelligence precedence", () => {
    const text = read(skill);
    for (const key of ["miloosh-growth-director", "miloosh-release-guardian", "growth-skill-router", "Design Intelligence", "one primary", "secondary"]) {
      expect(text).toContain(key);
    }
    expect(read(route)).toContain("protected software/comparison");
  });

  it("keeps the five new product validators synthetic only, not silently installed", () => {
    const text = `${read(route)}\n${read(skill)}`;
    for (const key of ["pri-funnel-intelligence", "pri-conversion-lab", "pri-buyer-journey-qa", "pri-performance-visual-qa", "pri-customer-research-pricing"]) {
      expect(text).toContain(key);
    }
    expect(text).toContain("SYNTHETIC_ONLY");
    expect(text).toContain("NOT_INSTALLED");
    expect(text).toContain("No live-site changes");
  });

  it("routes each of the seven work areas to one Miloosh-first primary and at most one secondary", () => {
    const section = read(route).split("## Routing matrix for the seven Miloosh work areas")[1]?.split("\n## ")[0] ?? "";
    const rows = section.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| Work area") && !line.startsWith("| ---"));
    const areas = ["Decision Room (", "Switching Lab (", "Google SEO & Indexing", "Conversion Optimization", "Buyer Journey QA", "Funnel & Revenue Intelligence", "Performance & Accessibility"];
    expect(rows).toHaveLength(areas.length);
    for (const area of areas) {
      const row = rows.find((line) => line.startsWith(`| ${area}`));
      expect(row, area).toBeDefined();
      const cells = row!.split("|").slice(1, -1).map((cell) => cell.trim());
      expect(cells).toHaveLength(4);
      // Primary names exactly one skill group; a Miloosh expert or the approved QA/design authority comes first.
      expect(cells[1]).toMatch(/miloosh-|verified-delivery|Design Intelligence/);
      // No synthetic validator may be the primary, and the secondary is a real skill, never a pri-* contract.
      expect(cells[1]).not.toContain("pri-");
      expect(cells[2]).not.toContain("pri-");
      expect(cells[3].length).toBeGreaterThan(10);
    }
    expect(section).toContain("miloosh-release-guardian");
    expect(section).toMatch(/never a primary and never run on live data/);
  });

  it("does not add an installable copy of the five synthetic pilots to the repository", () => {
    for (const dir of [".agents/skills", ".claude/skills"]) {
      for (const key of ["pri-funnel-intelligence", "pri-conversion-lab", "pri-buyer-journey-qa", "pri-performance-visual-qa", "pri-customer-research-pricing"]) {
        expect(existsSync(`${dir}/${key}`), `${dir}/${key}`).toBe(false);
      }
    }
  });

  it("requires actual source and release evidence, not manufactured metrics", () => {
    const text = `${read(route)}\n${read(skill)}`;
    for (const key of ["UNKNOWN", "NOT_RUN", "noindex", "Release Guardian", "currency", "affiliate", "no", "privacy"]) {
      expect(text.toLowerCase()).toContain(key.toLowerCase());
    }
    expect(read("docs/growth/MILOOSH_GROWTH_OS_2026.md")).toContain("Evidence before keywords");
  });
});
