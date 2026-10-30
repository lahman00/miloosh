import { BUILTIN_CRITERIA, evaluateCriterion, summarizeEvidence, type FitCounts } from "./criteria";
import { computeProductCost, formatMoney, keepCurrentCost, type CostResult, type KeepCurrent } from "./cost";
import type { RoomState } from "./state";
import type { Evidence, RoomProduct } from "./types";

/**
 * Buyer decision brief: a working document for a business buyer, not a brochure. It restates the buyer's own requirements, shows what is
 * verified, what is documented with limits and what is unknown, lists the open questions, the cost assumptions and the sources with
 * dates, and always includes "keep the current tool / do not buy yet" as a real outcome. No ranking, no score, no recommendation to buy.
 */
export type BriefOption = {
  slug: string; name: string; website: string;
  counts: FitCounts; evidence: Evidence[];
  strengths: string[]; limitations: string[];
  cost: CostResult; accessedAt: string;
};

export type Brief = {
  generatedOn: string;
  requirements: { labels: string[]; custom: Array<{ label: string; kind: string }>; team: number | null; currency: string; note: string };
  options: BriefOption[];
  keepCurrent: KeepCurrent;
  unresolved: string[];
  sources: Array<{ product: string; label: string; url: string; checkedAt: string | null }>;
  nextSteps: string[];
};

export function buildBrief(state: RoomState, products: readonly RoomProduct[], generatedOn: string): Brief {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const chosen = (state.compare.length > 0 ? state.compare : state.saved.slice(0, 4)).map((s) => bySlug.get(s)).filter((p): p is RoomProduct => Boolean(p));
  const criteria = [
    ...BUILTIN_CRITERIA.filter((c) => state.criteria.includes(c.id)).map((c) => ({ id: c.id, label: c.label })),
    ...state.custom.map((c) => ({ id: c.id, label: c.label, kind: c.kind })),
  ];
  const options: BriefOption[] = chosen.map((p) => {
    const evidence = criteria.map((c) => evaluateCriterion(p, c));
    return { slug: p.slug, name: p.name, website: p.website, counts: summarizeEvidence(evidence), evidence, strengths: p.pros.slice(0, 3), limitations: p.cons.slice(0, 3), cost: computeProductCost(p, state), accessedAt: p.accessedAt };
  });

  const unresolved: string[] = [];
  for (const o of options) {
    for (const e of o.evidence) if (e.status !== "verified" && e.toVerify) unresolved.push(`${o.name}, ${e.label}: ${e.toVerify}`);
    for (const m of o.cost.missing) unresolved.push(`${o.name}, cost: ${m}`);
  }

  const sources: Brief["sources"] = [];
  const seen = new Set<string>();
  for (const p of chosen) {
    for (const url of [p.pricing.officialSource, ...p.sources]) {
      if (!url || !/^https?:\/\//.test(url) || seen.has(`${p.slug}|${url}`)) continue;
      seen.add(`${p.slug}|${url}`);
      let label = url; try { label = new URL(url).host.replace(/^www\./, ""); } catch { /* keep url */ }
      sources.push({ product: p.name, label, url, checkedAt: url === p.pricing.officialSource ? p.pricing.lastVerified : p.accessedAt });
    }
  }

  return {
    generatedOn,
    requirements: { labels: criteria.filter((c) => !c.id.startsWith("custom_")).map((c) => c.label), custom: state.custom.map((c) => ({ label: c.label, kind: c.kind })), team: state.team, currency: state.currency, note: state.note },
    options, keepCurrent: keepCurrentCost(state), unresolved: [...new Set(unresolved)], sources,
    nextSteps: [
      "Confirm the exact plan you need, its price, billing period and any minimum term with each vendor.",
      "Test one real workflow of yours with every option you are still considering.",
      "Check import, export, cancellation terms and who owns your data.",
      "Ask each vendor about the open questions above; unknown does not mean unsupported.",
      "Decide whether staying with your current tool, or waiting, is better than switching now.",
    ],
  };
}

const statusWord: Record<Evidence["status"], string> = { verified: "VERIFIED", documented_limited: "DOCUMENTED, LIMITED", unknown: "UNKNOWN" };

export function briefToText(b: Brief): string {
  const L: string[] = [];
  L.push("MILOOSH DECISION BRIEF", `Prepared ${b.generatedOn}. A research aid, not a vendor quote and not a recommendation to buy.`, "");
  L.push("YOUR REQUIREMENTS");
  L.push(`Team size: ${b.requirements.team ?? "Not entered"}`, `Currency: ${b.requirements.currency}`);
  L.push(...(b.requirements.labels.length ? b.requirements.labels.map((x) => `- ${x}`) : ["- No built-in criteria selected"]));
  for (const c of b.requirements.custom) L.push(`- ${c.label} (${c.kind === "integration" ? "integration" : "capability"}, your own requirement)`);
  if (b.requirements.note) L.push(`Your note: ${b.requirements.note}`);
  L.push("", "OPTIONS");
  for (const o of b.options) {
    L.push(`${o.name}`, `  Official site: ${o.website}`);
    L.push(`  Evidence: ${o.counts.verifiedYes} verified yes, ${o.counts.documentedYes} documented (limited), ${o.counts.verifiedNo} verified no, ${o.counts.unknown} unknown of ${o.counts.total}`);
    for (const e of o.evidence) L.push(`  - ${e.label}: ${statusWord[e.status]}${e.value ? ` (${e.value})` : ""}. ${e.detail}${e.checkedAt ? ` Checked ${e.checkedAt}.` : ""}`);
    if (o.strengths.length) L.push(`  Documented strengths (vendor and editorial material read ${o.accessedAt}): ${o.strengths.join("; ")}`);
    if (o.limitations.length) L.push(`  Documented limitations: ${o.limitations.join("; ")}`);
    L.push(`  Year-one cost (${o.cost.currency}), known parts only: ${o.cost.knownTotal === null ? "Unknown" : formatMoney(o.cost.knownTotal, o.cost.currency)}${o.cost.complete ? "" : " (INCOMPLETE)"}`);
    for (const line of o.cost.lines) L.push(`    ${line.label}: ${line.amount === null ? "Unknown" : formatMoney(line.amount, o.cost.currency)} [${line.formula}]`);
    for (const a of o.cost.assumptions) L.push(`    Assumption: ${a}`);
    L.push("");
  }
  L.push("OR: KEEP YOUR CURRENT TOOL / DO NOT BUY YET", `${b.keepCurrent.name}: ${b.keepCurrent.yearlyCost === null ? "yearly cost unknown" : formatMoney(b.keepCurrent.yearlyCost, b.requirements.currency as never)} [${b.keepCurrent.formula}]`, "Staying put is a valid outcome if the open questions below matter to you.", "");
  L.push("OPEN QUESTIONS TO RESOLVE", ...(b.unresolved.length ? b.unresolved.map((x) => `- ${x}`) : ["- None recorded for the selected criteria. Still confirm plan and price with each vendor."]), "");
  L.push("SOURCES");
  for (const s of b.sources) L.push(`- ${s.product}: ${s.url}${s.checkedAt ? ` (checked ${s.checkedAt})` : ""}`);
  L.push("", "NEXT STEPS", ...b.nextSteps.map((x, i) => `${i + 1}. ${x}`), "", "Miloosh is independent. Some vendor links on miloosh.com are affiliate links, disclosed where they appear, and they never change this brief.");
  return L.join("\n");
}
