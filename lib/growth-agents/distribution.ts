import { z } from "zod";

/**
 * Authority & Distribution: contracts and rules for earning editorial attention
 * outside Google, without ever sending anything.
 *
 * Nothing here contacts a publisher. The module defines what an outreach record
 * may claim, which state changes are legal, how a publisher is judged from the
 * evidence supplied, and how a source-backed draft is assembled. A placement
 * exists only when a live URL on the publisher's own domain has been verified;
 * a friendly reply is not a placement, and a draft is never "sent".
 */

export const OUTREACH_STATUSES = ["DRAFTED", "OWNER_APPROVED", "SENT", "REPLIED", "DECLINED", "NO_RESPONSE", "PLACED"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const outreachRecordSchema = z.object({
  id: z.string().min(1),
  publisher: z.object({ name: z.string().min(1), domain: z.string().min(3), kind: z.enum(["PUBLICATION", "NEWSLETTER", "COMMUNITY", "DIRECTORY", "PARTNER_RESOURCE_PAGE"]) }),
  /** The Miloosh page or original research the outreach offers. */
  assetUrl: z.string().url(),
  angle: z.string().min(10),
  status: z.enum(OUTREACH_STATUSES),
  /** Where the owner's approval to send is recorded (message id, date). Required for every state at or beyond SENT. */
  ownerApprovalRef: z.string().min(1).optional(),
  sentOn: isoDate.optional(),
  declinedOn: isoDate.optional(),
  placement: z.object({ url: z.string().url(), verifiedOn: isoDate, rel: z.enum(["followed", "nofollow", "sponsored", "ugc", "unknown"]) }).optional(),
  evidence: z.array(z.string().min(1)).min(1),
});

export type OutreachRecord = z.infer<typeof outreachRecordSchema>;

const ORDER: Record<OutreachStatus, number> = { DRAFTED: 0, OWNER_APPROVED: 1, SENT: 2, REPLIED: 3, NO_RESPONSE: 3, DECLINED: 3, PLACED: 4 };

const LEGAL_TRANSITIONS: Record<OutreachStatus, readonly OutreachStatus[]> = {
  DRAFTED: ["OWNER_APPROVED"],
  OWNER_APPROVED: ["SENT", "DRAFTED"],
  SENT: ["REPLIED", "NO_RESPONSE", "DECLINED"],
  REPLIED: ["PLACED", "DECLINED", "NO_RESPONSE"],
  NO_RESPONSE: ["REPLIED"],
  DECLINED: [],
  PLACED: [],
};

export function canTransition(from: OutreachStatus, to: OutreachStatus): boolean {
  return LEGAL_TRANSITIONS[from].includes(to);
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export type LedgerProblem = { id: string; problem: string };

/** Checks every record against the invariants. An empty array means the ledger is internally honest. */
export function validateOutreachLedger(records: readonly OutreachRecord[]): LedgerProblem[] {
  const problems: LedgerProblem[] = [];
  const seenPublishers = new Map<string, OutreachRecord>();
  for (const record of records) {
    const parsed = outreachRecordSchema.safeParse(record);
    if (!parsed.success) {
      const id = typeof (record as { id?: unknown } | null)?.id === "string" ? (record as { id: string }).id : "(no id)";
      problems.push({ id, problem: `invalid record: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` });
      continue;
    }
    if (ORDER[record.status] >= ORDER.SENT && !record.ownerApprovalRef) problems.push({ id: record.id, problem: `status ${record.status} requires an owner approval reference; nothing is sent without one` });
    if (record.status === "SENT" && !record.sentOn) problems.push({ id: record.id, problem: "SENT requires the send date" });
    if (record.status === "DECLINED" && !record.declinedOn) problems.push({ id: record.id, problem: "DECLINED requires the decline date" });
    if (record.status === "PLACED") {
      if (!record.placement) problems.push({ id: record.id, problem: "PLACED requires a verified placement URL and verification date" });
      else if (hostOf(record.placement.url) !== record.publisher.domain.replace(/^www\./, "").toLowerCase()) problems.push({ id: record.id, problem: "the placement URL is not on the publisher's own domain, so it is not a placement" });
    }
    if (record.status !== "PLACED" && record.placement) problems.push({ id: record.id, problem: "a placement is recorded on a record that is not PLACED" });
    const key = record.publisher.domain.toLowerCase();
    const earlier = seenPublishers.get(key);
    if (earlier && earlier.status === "DECLINED" && record.status !== "DECLINED") problems.push({ id: record.id, problem: "this publisher already declined; do not keep asking for promotion after an explicit decline" });
    seenPublishers.set(key, record);
  }
  return problems;
}

/**
 * Validates a ledger file's text. A file that is not a JSON array is itself a problem, never an empty (and therefore clean) ledger.
 */
export function checkLedgerText(text: string): { ok: boolean; records: number; problems: LedgerProblem[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, records: 0, problems: [{ id: "(file)", problem: `not valid JSON: ${error instanceof Error ? error.message : String(error)}` }] };
  }
  if (!Array.isArray(parsed)) return { ok: false, records: 0, problems: [{ id: "(file)", problem: "the ledger must be a JSON array of records" }] };
  const problems = validateOutreachLedger(parsed as OutreachRecord[]);
  return { ok: problems.length === 0, records: parsed.length, problems };
}

export type PublisherEvidence = {
  name: string;
  domain: string;
  /** Topics the publisher demonstrably covers, taken from its own recent pages. */
  coveredTopics: readonly string[];
  /** Topics of the Miloosh asset being offered. */
  assetTopics: readonly string[];
  /** The publisher states that it accepts unsolicited editorial pitches or contributions. */
  acceptsEditorialPitches: boolean | null;
  /** Links on the publisher's pages are sold, or placements require payment. */
  paidPlacement: boolean | null;
  /** Evidence that the site is a link-exchange or private blog network (reciprocal-only links, network footprint). */
  linkExchangeOrNetworkSignals: boolean | null;
  /** The publisher has published a policy on sponsored content or link attributes. */
  publishesSponsoredPolicy: boolean | null;
  /** The publisher explicitly told Miloosh it does not want such promotion. */
  explicitlyDeclined: boolean;
};

export type PublisherVerdict = { verdict: "ELIGIBLE" | "NEEDS_REVIEW" | "REJECT"; reasons: string[]; unknowns: string[] };

export function evaluatePublisher(e: PublisherEvidence): PublisherVerdict {
  const reasons: string[] = [];
  const unknowns: string[] = [];
  if (e.explicitlyDeclined) return { verdict: "REJECT", reasons: ["The publisher explicitly declined this kind of promotion."], unknowns };
  if (e.paidPlacement === true) reasons.push("Placement is paid or sold: a paid link scheme, not editorial earning.");
  if (e.linkExchangeOrNetworkSignals === true) reasons.push("The site shows link-exchange or network signals.");
  if (reasons.length > 0) return { verdict: "REJECT", reasons, unknowns };

  const overlap = e.assetTopics.filter((t) => e.coveredTopics.some((c) => c.toLowerCase() === t.toLowerCase()));
  if (overlap.length === 0) reasons.push("No demonstrated topic overlap between the publisher's recent coverage and the asset.");
  if (e.paidPlacement === null) unknowns.push("Whether placements are paid is not verified.");
  if (e.linkExchangeOrNetworkSignals === null) unknowns.push("Link-exchange or network signals were not checked.");
  if (e.acceptsEditorialPitches === null) unknowns.push("Whether the publisher accepts unsolicited pitches is not verified.");
  if (e.acceptsEditorialPitches === false) reasons.push("The publisher states it does not accept unsolicited pitches.");
  if (reasons.length > 0) return { verdict: "REJECT", reasons, unknowns };
  return unknowns.length > 0 ? { verdict: "NEEDS_REVIEW", reasons: [`Topic overlap: ${overlap.join(", ")}.`], unknowns } : { verdict: "ELIGIBLE", reasons: [`Topic overlap: ${overlap.join(", ")}; no paid or network signal; accepts pitches.`], unknowns };
}

export type DraftFact = { statement: string; source: string };

export type OutreachDraft = {
  subject: string;
  body: string;
  wordCount: number;
  /** Always false: a draft is never sent by an agent. */
  sent: false;
  requiresOwnerApproval: true;
  problems: string[];
};

const MAX_WORDS = 150;

/** Assembles a short, source-backed pitch from supplied facts only. Flags problems instead of padding or inventing. */
export function draftOutreach(input: { publisherName: string; assetTitle: string; assetUrl: string; facts: readonly DraftFact[]; ask: string; senderName: string }): OutreachDraft {
  const problems: string[] = [];
  if (input.facts.length === 0) problems.push("No sourced fact was supplied; a pitch with no sourced finding is not sent.");
  for (const fact of input.facts) if (!/^https?:\/\//.test(fact.source)) problems.push(`Fact has no public source URL: "${fact.statement.slice(0, 60)}"`);
  const facts = input.facts.slice(0, 3).map((f) => `- ${f.statement} (${f.source})`).join("\n");
  const body = [`Hello ${input.publisherName} team,`, "", `We published "${input.assetTitle}" (${input.assetUrl}). Findings your readers may find useful:`, facts, "", input.ask, "", `${input.senderName}`].join("\n");
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount > MAX_WORDS) problems.push(`Draft is ${wordCount} words; the quality bar is ${MAX_WORDS}.`);
  return { subject: `Source-backed data: ${input.assetTitle}`.slice(0, 90), body, wordCount, sent: false, requiresOwnerApproval: true, problems };
}
