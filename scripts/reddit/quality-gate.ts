import type { ActionLogEntry } from "@/scripts/reddit/worker";

/**
 * MILOOSH Reddit quality hardening (2026-08-31), following a real r/SaaS
 * AutoModerator removal ("Low-Effort/AI content is auto-removed") on one
 * published reply. This is a pre-submit gate, not evasion: it fails a
 * draft closed on genuine quality problems (fabricated personal
 * experience, template-shaped openings, internal repetition, link-heavy
 * pattern vs. real history) rather than trying to slip past a moderation
 * filter. A draft that fails here should be rewritten to genuinely be
 * better, not reworded to dodge detection.
 *
 * Real constraint this module works within: actions.jsonl deliberately
 * never stores the exact text of a prior reply (only its sha256, per the
 * "never log exact post text" design already established for both Reddit
 * and Facebook workers) — so cross-reply repetition can only be checked
 * against the CURRENT draft's own internal structure, never against what
 * was actually said in earlier replies. The link-ratio check is the one
 * heuristic here backed by real historical data (had_miloosh_link is
 * stored per entry), everything else is necessarily judged from the
 * current text alone.
 */

export type QualityFinding = { severity: "error" | "warning"; code: string; message: string };

// Phrases that assert first-hand product/company usage this bot has never
// had — a categorical fabrication, not a style judgment, so any match is a
// hard block. Deliberately short and literal (word-boundary matches) to
// avoid false positives on unrelated uses of similar words.
const FAKE_EXPERIENCE_PATTERNS: RegExp[] = [
  /\bin my experience\b/i,
  /\bwhen i (was|used|switched|ran|worked)\b/i,
  /\bi('ve| have) (used|tried|switched|been using|worked with)\b/i,
  /\bas someone who(?:'s| has| had)\b/i,
  /\bmy (team|company|startup) (used|switched|tried)\b/i,
  /\bwe switched from\b/i,
  /\bi remember when\b/i,
];

// Openings that read as generic/template-shaped regardless of subreddit or
// question — the exact shape AutoModerator-style low-effort/AI filters key
// on. Checked only against the first ~80 characters, since a phrase deep
// in a real, substantive reply is not the same signal as leading with it.
const TEMPLATE_OPENING_PATTERNS: RegExp[] = [
  /^(great|good|solid|interesting) question/i,
  /^(honestly|so|well),?\s/i,
  /^i (totally |completely )?(get|understand|hear) (this|you|that)/i,
  /^this is a (common|great|classic)/i,
  /^here'?s (what|the thing|my take)/i,
  /^(first|firstly),?\s/i,
  /^great post/i,
  /^i('d| would) (say|suggest|recommend) that/i,
];

const MAX_REASONABLE_LENGTH_CHARS = 1400;
const LINK_RATIO_WINDOW = 10;
const MAX_LINK_RATIO = 0.3;

function findFakeExperience(text: string): QualityFinding | null {
  const match = FAKE_EXPERIENCE_PATTERNS.find((p) => p.test(text));
  return match ? { severity: "error", code: "FAKE_PERSONAL_EXPERIENCE", message: `Text claims first-hand experience this account doesn't have (matched ${match}).` } : null;
}

function findTemplateOpening(text: string): QualityFinding | null {
  const opening = text.trim().slice(0, 80);
  const match = TEMPLATE_OPENING_PATTERNS.find((p) => p.test(opening));
  return match ? { severity: "error", code: "TEMPLATE_OPENING", message: `Opens with a generic, template-shaped phrase (matched ${match}) instead of directly addressing the specific post.` } : null;
}

/** Internal repetition within THIS draft only — same sentence-starting 4+ word phrase repeated. Cannot check against prior replies' actual text (never stored, see file header). */
function findInternalRepetition(text: string): QualityFinding | null {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const openings = sentences.map((s) => s.trim().split(/\s+/).slice(0, 4).join(" ").toLowerCase());
  const seen = new Map<string, number>();
  for (const o of openings) {
    if (o.split(" ").length < 4) continue; // too short a prefix to be a meaningful repetition signal
    seen.set(o, (seen.get(o) ?? 0) + 1);
  }
  const repeated = [...seen.entries()].find(([, count]) => count >= 2);
  return repeated ? { severity: "error", code: "INTERNAL_REPETITION", message: `Repeats the same sentence-opening phrase ("${repeated[0]}...") ${repeated[1]} times within one reply.` } : null;
}

function findLength(text: string): QualityFinding | null {
  return text.length > MAX_REASONABLE_LENGTH_CHARS
    ? { severity: "warning", code: "LONG_REPLY", message: `${text.length} characters — consider whether a shorter, more direct answer would serve the specific question better.` }
    : null;
}

/** Backed by real stored history (had_miloosh_link), unlike the other checks. Only meaningful once enough real replies exist to form a ratio. */
function findLinkRatioExceeded(hasLink: boolean, recentActions: ActionLogEntry[]): QualityFinding | null {
  if (!hasLink) return null;
  const recentReplies = recentActions.filter((a) => a.command === "reddit_reply").slice(-LINK_RATIO_WINDOW);
  if (recentReplies.length < 3) return null; // not enough real history to compute a meaningful ratio yet
  const withLink = recentReplies.filter((a) => a.had_miloosh_link).length + 1; // +1 for this candidate reply
  const ratio = withLink / (recentReplies.length + 1);
  return ratio > MAX_LINK_RATIO
    ? { severity: "error", code: "LINK_RATIO_EXCEEDED", message: `This reply would push the link ratio to ${Math.round(ratio * 100)}% of the last ${recentReplies.length + 1} replies (limit ${Math.round(MAX_LINK_RATIO * 100)}%) — most replies should be no-link.` }
    : null;
}

export type ReplyQualityInput = { text: string; hasMilooshLink: boolean; recentActions: ActionLogEntry[] };

export function evaluateReplyQuality(input: ReplyQualityInput): { allowed: boolean; status: string; findings: QualityFinding[] } {
  const findings = [findFakeExperience(input.text), findTemplateOpening(input.text), findInternalRepetition(input.text), findLength(input.text), findLinkRatioExceeded(input.hasMilooshLink, input.recentActions)].filter((f): f is QualityFinding => f !== null);

  const hasError = findings.some((f) => f.severity === "error");
  return { allowed: !hasError, status: hasError ? "QUALITY_GATE_BLOCKED" : "QUALITY_GATE_PASSED", findings };
}
