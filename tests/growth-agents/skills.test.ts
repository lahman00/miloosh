import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The agent skills are documentation that people and agents act on. These tests keep them from drifting away from the
 * code: every file and command a skill names must exist, every option it documents must be a real option, and every
 * skill must keep the boundaries the owner set.
 */

const ROOT = process.cwd();
const SKILLS = ["miloosh-growth-director", "miloosh-google-recovery-agent", "miloosh-affiliate-revenue-agent", "miloosh-premium-page-agent", "miloosh-authority-distribution-agent", "miloosh-release-guardian"];
const skillDir = (name: string) => path.join(ROOT, ".agents/skills", name);
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");
/** Prose with emphasis markers removed and line breaks folded, so a phrase can be matched however the paragraph is wrapped. */
const prose = (text: string) => text.replace(/\*\*/g, "").replace(/\s+/g, " ");

function markdownFilesOf(name: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) out.push(full);
    }
  };
  walk(skillDir(name));
  return out;
}

function frontmatter(text: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const kv = /^([a-z]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]!] = kv[2]!;
  }
  return fields;
}

describe.each(SKILLS)("skill %s", (name) => {
  const skillText = read(".agents/skills", name, "SKILL.md");

  it("has valid frontmatter whose name matches its folder and a description that says when to use it", () => {
    const fm = frontmatter(skillText);
    expect(fm.name).toBe(name);
    expect(fm.description!.length).toBeGreaterThan(120);
    expect(fm.description!.length).toBeLessThanOrEqual(1024);
    expect(fm.description).toMatch(/\bUse (for|to|when|only|before|after)\b/);
    expect(skillText).toMatch(/\nmetadata:\n  author: miloosh\n  version: "1"\n/);
  });

  it("is discoverable: .claude/skills links to it with the repository's relative-symlink convention", () => {
    const link = path.join(ROOT, ".claude/skills", name);
    expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
    expect(fs.readlinkSync(link)).toBe(`../../.agents/skills/${name}`);
    expect(fs.existsSync(path.join(link, "SKILL.md"))).toBe(true);
  });

  it("links only to files that exist", () => {
    for (const file of markdownFilesOf(name)) {
      const text = fs.readFileSync(file, "utf8");
      for (const link of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
        const target = link[1]!;
        if (/^[a-z]+:/i.test(target)) continue;
        expect(fs.existsSync(path.resolve(path.dirname(file), target)), `${path.relative(ROOT, file)} -> ${target}`).toBe(true);
      }
    }
  });

  it("names only repository paths and npm scripts that exist", () => {
    const scripts = (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts;
    for (const file of markdownFilesOf(name)) {
      const text = fs.readFileSync(file, "utf8");
      for (const ref of text.matchAll(/`((?:lib\/growth-agents|scripts\/growth|tests\/growth-agents|docs\/growth|data\/affiliate)\/[A-Za-z0-9_./-]+)`/g)) {
        const target = ref[1]!.replace(/[.,;:]+$/, "");
        if (/[*<>]/.test(target) || /\/$/.test(target)) continue;
        expect(fs.existsSync(path.join(ROOT, target)), `${path.relative(ROOT, file)} names ${target}`).toBe(true);
      }
      for (const cmd of text.matchAll(/npm run (growth:[a-z-]+)/g)) {
        expect(scripts[cmd[1]!], `${path.relative(ROOT, file)} runs ${cmd[1]}`).toBeTruthy();
      }
    }
  });

  it("never instructs a deploy, push, merge, force or audit-fix inside a command block", () => {
    for (const file of markdownFilesOf(name)) {
      const text = fs.readFileSync(file, "utf8");
      for (const block of text.matchAll(/```(?:bash|sh|shell)?\n([\s\S]*?)```/g)) {
        expect(block[1], path.relative(ROOT, file)).not.toMatch(/vercel (deploy|--prod|promote)|git (push|commit|merge|rebase|reset|clean|stash)|npm audit fix|--force|--no-verify|rm -rf/);
      }
    }
  });

  it("states that it is read-only or draft-only and does not publish", () => {
    expect(skillText).toMatch(/[Rr]ead-only|[Dd]rafts only|[Rr]eports only|thin router|Pure function/);
    expect(skillText).toMatch(/never|Never|Nothing is sent|No new page engine/);
  });
});

describe("what each skill must keep saying", () => {
  const text = (name: string) => prose(read(".agents/skills", name, "SKILL.md"));

  it("the director keeps the owner's hard rules and routes to the existing skills", () => {
    const t = text("miloosh-growth-director");
    for (const phrase of [
      "Read-only by default",
      "Never invent visits, conversions, keyword volumes",
      "Never navigate a live affiliate URL",
      "Do not buy a subscription, connect an external data processor",
      "Never weaken, remove, skip or bypass a security check",
      "Preserve every other worktree",
      "Local commits only",
      "IMPLEMENTED",
      "NOT_VERIFIED",
    ]) {
      expect(t, phrase).toContain(phrase);
    }
    for (const skill of ["miloosh-revenue-recovery-finder", "miloosh-money-page-upgrader", "miloosh-comparison-opportunity-finder", "miloosh-google-recovery-director", "miloosh-project-manager"]) {
      expect(t, skill).toContain(skill);
    }
  });

  it("the Google agent routes to the recovery skills and forbids indexing requests and deletion on zero impressions", () => {
    const t = text("miloosh-google-recovery-agent");
    for (const phrase of ["miloosh-google-recovery-director", "miloosh-revenue-recovery-finder", "miloosh-money-page-upgrader", "miloosh-comparison-opportunity-finder", "No Request Indexing", "never by itself a reason to delete", "NOT_MEASURED", "indexed-version"]) {
      expect(t, phrase).toContain(phrase);
    }
  });

  it("the affiliate agent keeps clicks, conversions, commissions and payouts apart and forbids touching live affiliate links", () => {
    const t = text("miloosh-affiliate-revenue-agent");
    for (const phrase of ["Never navigate a live affiliate URL", "NOT_MEASURED", "NOT_RECORDED", "not permission", "A partner click is not a conversion", "recordOutboundEvent", "Never put an affiliate URL"]) {
      expect(t, phrase).toContain(phrase);
    }
  });

  it("the premium page agent adds no page engine and reuses the upgrader", () => {
    const t = text("miloosh-premium-page-agent");
    for (const phrase of ["There is no new page engine", "miloosh-money-page-upgrader", "One URL at a time", "first observed Google recrawl"]) {
      expect(t, phrase).toContain(phrase);
    }
  });

  it("the distribution agent never sends and keeps authority claims unverified without a source", () => {
    const t = text("miloosh-authority-distribution-agent");
    for (const phrase of ["Nothing is sent", "No link scheme", "`NOT_VERIFIED`", "owner approves and sends", "After a publisher explicitly declines, stop"]) {
      expect(t, phrase).toContain(phrase);
    }
  });

  it("the guardian never waives a gate and never authorises a deployment", () => {
    const t = text("miloosh-release-guardian");
    for (const phrase of ["Never weaken, remove, skip or bypass", "npm audit fix --force", "leave deployment disabled", "deploymentAllowedByGuardian: false", "Do not invent a gate name"]) {
      expect(t, phrase).toContain(phrase);
    }
  });

  it("the outside-library note warns about the look-alike publisher and says nothing was installed", () => {
    const t = prose(read(".agents/skills/miloosh-growth-director/references/marketingskills-provenance.md"));
    for (const phrase of ["github.com/marketingskills/seo", "github.com/coreyhaines31/marketingskills", "RefreshAgent", "curl | bash", "is vendored, installed or executed", "`authority-mark`", "NOT_VERIFIED"]) {
      expect(t, phrase).toContain(phrase);
    }
  });
});

describe("documentation matches the code", () => {
  const runBook = read(".agents/skills/miloosh-growth-director/references/run-book.md");
  const script = read("scripts/growth/growth-director.ts");
  const knownInCode = [...(/const known = new Set\(\[([^\]]+)\]\)/.exec(script)?.[1] ?? "").matchAll(/"([a-z-]+)"/g)].map((m) => m[1]!).sort();

  it("documents exactly the options the command accepts", () => {
    expect(knownInCode.length).toBeGreaterThan(10);
    const table = runBook.slice(runBook.indexOf("## Options"), runBook.indexOf("There is no option"));
    const documented = [...new Set([...table.matchAll(/`--([a-z-]+)/g)].map((m) => m[1]!))].sort();
    expect(documented).toEqual(knownInCode);
  });

  it("documents exactly the options the page check accepts", () => {
    const check = read("scripts/growth/page-live-check.ts");
    const known = [...(/\[("urls"[^\]]+)\]\.includes/.exec(check)?.[1] ?? "").matchAll(/"([a-z-]+)"/g)].map((m) => m[1]!).sort();
    expect(known).toEqual(["delay-ms", "now", "out", "urls", "urls-file"]);
    const section = runBook.slice(runBook.indexOf("npm run growth:page-check"), runBook.indexOf("## Exit codes"));
    const documented = [...new Set([...section.matchAll(/--([a-z]+(?:-[a-z]+)*)/g)].map((m) => m[1]!))].filter((o) => known.includes(o)).sort();
    expect(documented).toEqual(known);
  });

  it("documents the real exit codes", () => {
    expect(runBook).toMatch(/`0` ran/);
    expect(runBook).toMatch(/`2` invalid arguments/);
    expect(runBook).toMatch(/`3` `--strict`/);
    expect(script).toMatch(/return 2;/);
  });

  it("documents the gates the Guardian requires", () => {
    const guardian = read("lib/growth-agents/guardian.ts");
    const gates = [...(/REQUIRED_GATES: readonly GateName\[\] = \[([^\]]+)\]/.exec(guardian)?.[1] ?? "").matchAll(/"([a-z-]+)"/g)].map((m) => m[1]!);
    expect(gates).toHaveLength(6);
    for (const gate of gates) expect(runBook, gate).toContain(`\`${gate}\``);
  });

  it("lists every gate id the Google agent evaluates", () => {
    const code = read("lib/growth-agents/google-recovery-agent.ts");
    const ids = [...(/export type GateId =([\s\S]*?);/.exec(code)?.[1] ?? "").matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]!);
    expect(ids).toHaveLength(10);
    const rules = read(".agents/skills/miloosh-growth-director/references/evidence-rules.md");
    const agent = text("miloosh-google-recovery-agent");
    for (const id of ids) {
      expect(rules, id).toContain(id);
      expect(agent, id).toContain(id);
    }
  });

  function text(name: string): string {
    return prose(read(".agents/skills", name, "SKILL.md"));
  }

  it("states the operating thresholds the code uses", () => {
    const code = read("lib/growth-agents/google-recovery-agent.ts");
    const config = /DEFAULT_RECOVERY_CONFIG: RecoveryConfig = \{([^}]+)\}/.exec(code)![1]!;
    const value = (key: string) => Number(new RegExp(`${key}:\\s*(\\d+)`).exec(config)![1]);
    const rules = read(".agents/skills/miloosh-growth-director/references/evidence-rules.md");
    expect(rules).toMatch(new RegExp(`\\| Historical impressions to be a recovery candidate \\| ${value("minHistoricalImpressions")} \\|`));
    expect(rules).toMatch(new RegExp(`at least ${value("minImpressionsForRankedPage")} impressions at average position 20`));
    expect(rules).toMatch(new RegExp(`at least ${value("currentDemandFloor")} impressions in the finalised recent window`));
    expect(rules).toMatch(new RegExp(`\\| Shortlist size \\| ${value("shortlistSize")} \\|`));
    expect(rules).toMatch(new RegExp(`\\| Observation window after a change \\| ${value("observationDays")} days`));
  });
});
