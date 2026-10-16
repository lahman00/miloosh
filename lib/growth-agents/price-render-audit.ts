import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import hold from "@/data/seo/price-label-hold.json";
import { OWNER_PRICE_LABEL_FACTUAL_RELEASES } from "@/data/seo/price-label-factual-releases";
import { normalizeRenderedHtml } from "./rendered-diff";
import { protectionFor, type ProtectionSnapshot } from "./protection";

export type PricingRenderAudit = {
  kind: "PRICE_ONLY_FULL_STATIC_BUILD_AUDIT";
  ok: boolean;
  baseSha: string;
  headSha: string;
  pagesCompared: number;
  protectedSoftwareUnchanged: number;
  changedPages: number;
  approvedChanged: string[];
  errors: string[];
};

function sha(root: string): string | null {
  try {
    const value = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^[a-f0-9]{40}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

function treeClean(root: string): boolean {
  try {
    return execFileSync("git", ["-C", root, "status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" }).trim() === "";
  } catch {
    return false;
  }
}

/** The caller must supply .next/server/app paths in two clean, exact-commit checkouts. */
export function auditPricingRenderedBuilds(input: {
  baseDir: string;
  candidateDir: string;
  baseSha: string;
  headSha: string;
  protection: ProtectionSnapshot;
}): PricingRenderAudit {
  const errors: string[] = [];
  const approved = new Set(Object.keys(OWNER_PRICE_LABEL_FACTUAL_RELEASES));
  const held = new Set(hold.heldSoftware);
  const baseRoot = path.resolve(input.baseDir, "../../..");
  const candidateRoot = path.resolve(input.candidateDir, "../../..");
  const files = (root: string) => {
    const result = new Map<string, string>();
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".html")) result.set(path.relative(root, full).split(path.sep).join("/"), fs.readFileSync(full, "utf8"));
      }
    };
    walk(root);
    return result;
  };
  let before = new Map<string, string>();
  let after = new Map<string, string>();
  try {
    before = files(input.baseDir);
    after = files(input.candidateDir);
  } catch (error) {
    errors.push("Could not read both complete prerendered HTML directories: " + String(error));
  }
  if (sha(baseRoot) !== input.baseSha || sha(candidateRoot) !== input.headSha) errors.push("Build checkout SHA does not match the Guardian base and current HEAD.");
  if (!treeClean(baseRoot) || !treeClean(candidateRoot)) errors.push("A build checkout has uncommitted source changes.");
  if (input.protection.checkoutSha !== input.headSha) errors.push("The protection snapshot is not for the current checkout.");
  if (hold.baseSha !== input.baseSha) errors.push("The hold list was generated against a different production commit.");
  if (hold.heldSoftware.length < 130) errors.push("The expected protected profile inventory is incomplete.");
  for (const slug of approved) {
    if (held.has(slug)) errors.push("Owner-approved price label correction is still held: " + slug);
  }
  if (before.size < 1700 || after.size !== before.size || [...before.keys()].some((p) => !after.has(p))) errors.push("The full static page inventory differs or is too small.");

  let protectedSoftwareUnchanged = 0;
  let changedPages = 0;
  const approvedChanged: string[] = [];
  for (const [route, old] of before) {
    const next = after.get(route);
    if (next === undefined) continue;
    const match = /^software\/([a-z0-9-]+)\.html$/.exec(route);
    const slug = match?.[1];
    if (slug && held.has(slug)) {
      if (normalizeRenderedHtml(old) !== normalizeRenderedHtml(next)) errors.push("HELD_PROFILE_CHANGED: " + route);
      else protectedSoftwareUnchanged += 1;
    }
    if (normalizeRenderedHtml(old) === normalizeRenderedHtml(next)) continue;
    changedPages++;
    if (!slug) {
      errors.push("NON_PROFILE_RENDERED_CHANGE: " + route);
      continue;
    }
    if (held.has(slug)) errors.push("HELD_PROFILE_CHANGED: " + route);
    const verdict = protectionFor("https://miloosh.com/software/" + slug, input.protection).verdict;
    if (!approved.has(slug) && verdict !== "EDITABLE") errors.push("UNAUTHORIZED_PROTECTED_PROFILE_CHANGE: " + slug + " (" + verdict + ")");
    if (approved.has(slug)) approvedChanged.push(slug);
    // Trust only a price-label change, never pricing facts, link destinations, SEO headers or disclosures.
    const head = (body: string) => normalizeRenderedHtml(/<head\b[^>]*>[\s\S]*?<\/head>/i.exec(body)?.[0] ?? "");
    const links = (body: string) => [...body.matchAll(/<a\b[^>]*>/gi)].map((m) => m[0].replace(/\s+/g, " "));
    const buttons = (body: string) => [...body.matchAll(/<button\b[^>]*>/gi)].map((m) => m[0].replace(/\s+/g, " "));
    if (head(old) !== head(next)) errors.push("SEO_HEADER_CHANGED: " + route);
    if (JSON.stringify(links(old)) !== JSON.stringify(links(next))) errors.push("LINK_OR_AFFILIATE_ATTRIBUTES_CHANGED: " + route);
    if (JSON.stringify(buttons(old)) !== JSON.stringify(buttons(next))) errors.push("BUTTON_ATTRIBUTES_CHANGED: " + route);
  }
  for (const slug of approved) if (!approvedChanged.includes(slug)) errors.push("APPROVED_FACTUAL_PAGE_MISSING_CORRECTION: " + slug);
  if (protectedSoftwareUnchanged < 130) errors.push("Too few held software pages were directly compared.");
  if (changedPages < approved.size || changedPages > 100) errors.push("Changed profile count exceeds reviewed pricing scope.");
  return {
    kind: "PRICE_ONLY_FULL_STATIC_BUILD_AUDIT",
    ok: errors.length === 0,
    baseSha: input.baseSha,
    headSha: input.headSha,
    pagesCompared: before.size,
    protectedSoftwareUnchanged,
    changedPages,
    approvedChanged: approvedChanged.sort(),
    errors,
  };
}
