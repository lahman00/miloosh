import type { Evidence, RoomProduct } from "./types";

/**
 * Evidence-driven criteria. Three honest statuses and nothing else:
 *  - verified: stated in the product's dated pricing record, with its official source and verification date.
 *  - documented_limited: found in the vendor material Miloosh recorded (read on the product's accessedAt date). Not tested hands-on.
 *  - unknown: not found in what Miloosh recorded. This is NOT "no": the buyer is told what to verify.
 * Missing information never becomes a negative. There is no score, no percentage and no ranking.
 */
export type BuiltinCriterion = { id: string; label: string; group: "Pricing" | "Platform" | "Capability" };

export const BUILTIN_CRITERIA: readonly BuiltinCriterion[] = [
  { id: "free_plan", label: "Has a free plan", group: "Pricing" },
  { id: "free_trial", label: "Offers a free trial", group: "Pricing" },
  { id: "public_pricing", label: "Publishes a price", group: "Pricing" },
  { id: "platform_web", label: "Works in a web browser", group: "Platform" },
  { id: "platform_ios", label: "Has an iOS app", group: "Platform" },
  { id: "platform_android", label: "Has an Android app", group: "Platform" },
  { id: "platform_desktop", label: "Has a desktop app", group: "Platform" },
  { id: "import_export", label: "Documents data import or export", group: "Capability" },
  { id: "api", label: "Documents an API", group: "Capability" },
  { id: "sso", label: "Documents single sign-on (SSO)", group: "Capability" },
];

export const BUILTIN_IDS: readonly string[] = BUILTIN_CRITERIA.map((c) => c.id);
export const isBuiltinCriterion = (id: unknown): id is string => typeof id === "string" && BUILTIN_IDS.includes(id);

export type CustomRequirement = { id: string; label: string; kind: "feature" | "integration" };
export const MAX_CUSTOM = 5;
export const MAX_CUSTOM_LABEL = 60;

export function cleanCustom(value: unknown): CustomRequirement[] {
  if (!Array.isArray(value)) return [];
  const out: CustomRequirement[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const label = typeof rec.label === "string" ? rec.label.replace(/\s+/g, " ").trim().slice(0, MAX_CUSTOM_LABEL) : "";
    const kind = rec.kind === "integration" ? "integration" : "feature";
    if (label.length < 2 || out.some((c) => c.label.toLowerCase() === label.toLowerCase())) continue;
    out.push({ id: `custom_${out.length + 1}`, label, kind });
    if (out.length >= MAX_CUSTOM) break;
  }
  return out;
}

const host = (url: string): string => { try { return new URL(url).host.replace(/^www\./, ""); } catch { return url.slice(0, 40); } };
const sourceList = (urls: Array<string | null | undefined>) => {
  const unique = [...new Set(urls.filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u)))].slice(0, 3);
  const hosts = unique.map(host);
  // Two sources on the same site would read as the same link twice; add the path to tell them apart.
  return unique.map((url, i) => {
    if (hosts.filter((h) => h === hosts[i]).length < 2) return { label: hosts[i]!, url };
    let path = ""; try { path = new URL(url).pathname.replace(/\/$/, ""); } catch { /* keep host only */ }
    return { label: `${hosts[i]}${path.length > 28 ? `${path.slice(0, 27)}…` : path}`, url };
  });
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function haystack(p: RoomProduct): string[] {
  return [...p.features, ...p.tags, p.description, p.bestFor, ...p.faq.flatMap((f) => [f.question, f.answer])].filter(Boolean);
}

function keywordEvidence(p: RoomProduct, id: string, label: string, pattern: RegExp, verifyHint: string): Evidence {
  const hit = haystack(p).find((text) => pattern.test(text));
  if (hit) {
    return {
      criterionId: id, label, status: "documented_limited", value: "yes",
      detail: `Mentioned in vendor material read on ${p.accessedAt}: "${hit.replace(/\s+/g, " ").slice(0, 140)}". Not tested hands-on.`,
      toVerify: `${verifyHint} Confirm which plan includes it and how it behaves in practice.`,
      sources: sourceList(p.sources), checkedAt: p.accessedAt,
    };
  }
  return {
    criterionId: id, label, status: "unknown", value: null,
    detail: "Not found in the material Miloosh recorded. That does not mean the product lacks it.",
    toVerify: verifyHint, sources: sourceList(p.sources), checkedAt: p.accessedAt,
  };
}

const PLATFORM_PATTERNS: Record<string, RegExp> = {
  platform_web: /\b(web|browser)\b/i,
  platform_ios: /\b(ios|iphone|ipad)\b/i,
  platform_android: /\bandroid\b/i,
  platform_desktop: /\b(desktop|windows|mac|macos|linux)\b/i,
};

/** Pure and deterministic: the same product and criterion always give the same evidence. */
export function evaluateCriterion(p: RoomProduct, criterion: { id: string; label: string; kind?: "feature" | "integration" }): Evidence {
  const { id, label } = criterion;
  const pr = p.pricing;
  const pricingSources = sourceList([pr.officialSource]);
  const pricingVerified = pr.status === "verified" && Boolean(pr.lastVerified);

  if (id === "free_plan") {
    if (pricingVerified && typeof pr.freePlan === "boolean") {
      return { criterionId: id, label, status: "verified", value: pr.freePlan ? "yes" : "no", detail: pr.freePlan ? "A free plan is listed on the vendor's pricing page." : "No free plan is listed on the vendor's pricing page.", toVerify: null, sources: pricingSources, checkedAt: pr.lastVerified };
    }
    return unknown(id, label, "Check the vendor's pricing page for a free plan and its limits.", p);
  }
  if (id === "free_trial") {
    if (pricingVerified && pr.freeTrial) {
      return { criterionId: id, label, status: "verified", value: pr.freeTrial.available ? "yes" : "no", detail: pr.freeTrial.available ? `A free trial is listed${pr.freeTrial.days ? ` (${pr.freeTrial.days} days)` : ""}.` : "No free trial is listed on the vendor's pricing page.", toVerify: null, sources: pricingSources, checkedAt: pr.lastVerified };
    }
    return unknown(id, label, "Check the vendor's pricing page for a trial and what it includes.", p);
  }
  if (id === "public_pricing") {
    if (pricingVerified && pr.entryPaid) {
      return { criterionId: id, label, status: "verified", value: "yes", detail: `A paid price is listed (${pr.startingPrice ?? "see the vendor's page"}).`, toVerify: null, sources: pricingSources, checkedAt: pr.lastVerified };
    }
    if (pr.status === "contact_sales" && pr.lastVerified) {
      return { criterionId: id, label, status: "verified", value: "no", detail: "The vendor does not publish a price; pricing is by quote.", toVerify: null, sources: pricingSources, checkedAt: pr.lastVerified };
    }
    return unknown(id, label, "Ask the vendor for current pricing for the plan you need.", p);
  }
  if (id in PLATFORM_PATTERNS) {
    if (p.platforms.some((x) => PLATFORM_PATTERNS[id]!.test(x))) {
      return { criterionId: id, label, status: "documented_limited", value: "yes", detail: `Listed among the platforms in vendor material read on ${p.accessedAt}.`, toVerify: "Confirm the platform and its feature parity before committing.", sources: sourceList(p.sources), checkedAt: p.accessedAt };
    }
    return unknown(id, label, "Confirm platform support with the vendor; it is not in Miloosh's recorded list.", p);
  }
  if (id === "import_export") return keywordEvidence(p, id, label, /\b(import|export|migrat)/i, "Ask what formats can be imported or exported and whether export is included in your plan.");
  if (id === "api") return keywordEvidence(p, id, label, /\bAPIs?\b/i, "Check API limits, authentication and which plan includes it.");
  if (id === "sso") return keywordEvidence(p, id, label, /\b(SSO|single sign-on|SAML)\b/i, "Check which plan includes SSO and which identity providers are supported.");

  // Custom requirement typed by the buyer: a plain, case-insensitive whole-word match on the recorded material.
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(label)}([^a-z0-9]|$)`, "i");
  const hint = criterion.kind === "integration" ? `Confirm that the ${label} integration exists, what it syncs and which plan includes it.` : `Confirm that ${label} is supported and which plan includes it.`;
  return keywordEvidence(p, id, label, pattern, hint);
}

function unknown(id: string, label: string, toVerify: string, p: RoomProduct): Evidence {
  return { criterionId: id, label, status: "unknown", value: null, detail: "Not stated in the verified record Miloosh holds for this product.", toVerify, sources: sourceList([p.pricing.officialSource, ...p.sources]), checkedAt: p.pricing.lastVerified ?? p.accessedAt };
}

export type FitCounts = { verifiedYes: number; documentedYes: number; verifiedNo: number; unknown: number; total: number };

/** Counts only. No weighting, no score, no order: the buyer reads the facts. */
export function summarizeEvidence(items: readonly Evidence[]): FitCounts {
  const counts: FitCounts = { verifiedYes: 0, documentedYes: 0, verifiedNo: 0, unknown: 0, total: items.length };
  for (const e of items) {
    if (e.status === "unknown") counts.unknown += 1;
    else if (e.value === "no") counts.verifiedNo += 1;
    else if (e.status === "verified") counts.verifiedYes += 1;
    else counts.documentedYes += 1;
  }
  return counts;
}
