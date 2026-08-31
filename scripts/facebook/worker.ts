import { type BrowserContext, type Page } from "playwright-core";
import { mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  acquireLock,
  appendJsonLogLine,
  bodyText,
  connectPersistentChrome,
  firstVisible,
  readJsonLogLines,
  readJsonWithDefaults,
  releaseLock,
  textOf,
  writeJsonPrivate,
} from "../lib/local-worker-runtime";

const STATE_DIR = process.env.MILOOSH_FACEBOOK_STATE_DIR ?? join(homedir(), ".local", "share", "miloosh-facebook-worker");
const PROFILE_DIR = join(STATE_DIR, "chrome-profile");
const ACTION_LOG = join(STATE_DIR, "logs", "actions.jsonl");
const AUTONOMOUS_POLICY_PATH = join(STATE_DIR, "autonomous-policy.json");
const LOCK_DIR = join(STATE_DIR, "run.lock");
const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = Number(process.env.MILOOSH_FACEBOOK_CDP_PORT ?? "9226");

// ---------------------------------------------------------------------------
// Task contract — strict allowlist. Nothing outside this schema parses.
// ---------------------------------------------------------------------------

const nonBlankExactText = z.string().refine((value) => value.trim().length > 0, "must not be blank");

function isFacebookHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "facebook.com" || host.endsWith(".facebook.com");
}

const facebookUrl = z.string().url().refine((value) => {
  try {
    return isFacebookHostname(new URL(value).hostname);
  } catch {
    return false;
  }
}, "must be a facebook.com URL");

const facebookGroupUrl = facebookUrl.refine(
  (value) => /^\/groups\/[^/]+\/?$/i.test(new URL(value).pathname),
  "must be a facebook.com/groups/<id> URL",
);

const facebookGroupPostUrl = facebookUrl.refine(
  (value) => /^\/groups\/[^/]+\/(posts|permalink)\/[^/]+\/?$/i.test(new URL(value).pathname),
  "must be a facebook.com/groups/<id>/posts|permalink/<id> URL",
);

export const taskSchema = z.discriminatedUnion("command", [
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("facebook_status"), wait_for_login_seconds: z.number().int().min(0).max(900).optional() }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("facebook_open_group"), group_url: facebookGroupUrl }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("facebook_rules"), group_url: facebookGroupUrl }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("facebook_open_post"), post_url: facebookGroupPostUrl }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("facebook_create_post"), group_url: facebookGroupUrl, text: nonBlankExactText }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("facebook_comment"), post_url: facebookGroupPostUrl, text: nonBlankExactText }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("facebook_notifications") }).strict(),
]);

export type FacebookTask = z.infer<typeof taskSchema>;
type WriteTask = Extract<FacebookTask, { command: "facebook_create_post" | "facebook_comment" }>;

export function parseFacebookTask(input: unknown): FacebookTask {
  return taskSchema.parse(input);
}

// ---------------------------------------------------------------------------
// Autonomous write policy — ships disabled. Mirrors Reddit's rate-limit
// enforcement shape and field names required by the facebook_status contract.
// ---------------------------------------------------------------------------

export type AutonomousPolicy = {
  autonomous_write_enabled: boolean;
  max_writes_24h: number;
  max_posts_24h: number;
  max_posts_7d: number;
  min_write_interval_minutes: number;
  disabled_reason?: string;
  disabled_at?: string;
};

export const DEFAULT_AUTONOMOUS_POLICY: AutonomousPolicy = {
  autonomous_write_enabled: false,
  max_writes_24h: 2,
  max_posts_24h: 1,
  max_posts_7d: 3,
  min_write_interval_minutes: 60,
};

export type ActionLogEntry = {
  timestamp: string;
  request_id: string | null;
  command: "facebook_create_post" | "facebook_comment";
  group_name: string | null;
  group_url: string;
  published_url: string;
  had_miloosh_link: boolean;
  text_sha256: string;
  // Hash of a normalized (case/whitespace/punctuation-folded) form of the
  // text. Still a one-way hash — never the text itself — used only to catch
  // near-identical copy posted to a different group. Additive beyond the
  // spec's literal field list; see the final report for why.
  normalized_text_sha256: string;
  rule_confidence: "VERIFIED_CURRENT" | "PARTIAL" | "UNKNOWN";
};

type WorkerResult = {
  ok: boolean;
  command?: FacebookTask["command"];
  status: string;
  [key: string]: unknown;
};

function isWriteTask(task: FacebookTask): task is WriteTask {
  return task.command === "facebook_create_post" || task.command === "facebook_comment";
}

export function sanitizeFacebookUrl(value: string): string {
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
}

export function groupUrlFromPostUrl(postUrl: string): string {
  const url = new URL(postUrl);
  const match = url.pathname.match(/^(\/groups\/[^/]+)\//i);
  if (!match) throw new Error("NOT_A_GROUP_POST_URL");
  return `${url.origin}${match[1]}/`;
}

export function groupContextUrl(task: WriteTask): string {
  return task.command === "facebook_create_post" ? sanitizeFacebookUrl(task.group_url) : groupUrlFromPostUrl(task.post_url);
}

export function textSha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function normalizeForDuplicateCheck(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizedTextSha256(text: string): string {
  return createHash("sha256").update(normalizeForDuplicateCheck(text)).digest("hex");
}

export function containsLink(text: string): boolean {
  return /(https?:\/\/|www\.)\S+/i.test(text);
}

export function isFirstContributionToGroup(actions: ActionLogEntry[], groupUrl: string): boolean {
  return !actions.some((entry) => entry.group_url === groupUrl);
}

/**
 * Pure historical rate-limit evaluation — no page access, fully unit
 * testable. Mirrors scripts/reddit/worker.ts's evaluateAutonomousWrite.
 */
export function evaluateAutonomousWrite(task: FacebookTask, policy: AutonomousPolicy, actions: ActionLogEntry[], now: Date = new Date()): { allowed: boolean; status: string } {
  if (!isWriteTask(task)) return { allowed: true, status: "READ_ONLY" };
  if (!policy.autonomous_write_enabled) return { allowed: false, status: "AUTONOMOUS_WRITE_DISABLED" };

  const groupUrl = groupContextUrl(task);
  const time = now.getTime();
  const since24h = actions.filter((entry) => time - Date.parse(entry.timestamp) < 86_400_000);
  const since7d = actions.filter((entry) => time - Date.parse(entry.timestamp) < 7 * 86_400_000);
  const since72h = actions.filter((entry) => time - Date.parse(entry.timestamp) < 72 * 3_600_000);
  const last = [...actions].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];

  if (last && time - Date.parse(last.timestamp) < policy.min_write_interval_minutes * 60_000) return { allowed: false, status: "WRITE_INTERVAL_LIMIT" };
  if (actions.some((entry) => entry.text_sha256 === textSha256(task.text))) return { allowed: false, status: "DUPLICATE_TEXT" };
  if (actions.some((entry) => entry.group_url !== groupUrl && entry.normalized_text_sha256 === normalizedTextSha256(task.text))) return { allowed: false, status: "CROSS_GROUP_DUPLICATE_CONTENT" };
  if (since24h.length >= policy.max_writes_24h) return { allowed: false, status: "DAILY_WRITE_CAP" };

  if (task.command === "facebook_create_post") {
    if (since24h.filter((entry) => entry.command === "facebook_create_post").length >= policy.max_posts_24h) return { allowed: false, status: "DAILY_POST_CAP" };
    if (since7d.filter((entry) => entry.command === "facebook_create_post").length >= policy.max_posts_7d) return { allowed: false, status: "ROLLING_7_DAY_POST_CAP" };
    if (since72h.some((entry) => entry.command === "facebook_create_post" && entry.group_url === groupUrl)) return { allowed: false, status: "SAME_GROUP_POST_COOLDOWN" };
  }

  return { allowed: true, status: "AUTONOMOUS_EXECUTION_ALLOWED" };
}

export type LinksPolicy = "allowed" | "prohibited" | "conditional" | "unknown";

/**
 * First-contribution / rules-compliant link gate, evaluated at write time
 * against freshly re-read rules (not the historical action log).
 */
export function evaluateLinkPolicy(text: string, linksPolicy: LinksPolicy, isFirstContribution: boolean): { allowed: boolean; status: string } {
  if (!containsLink(text)) return { allowed: true, status: "NO_LINK" };
  if (linksPolicy === "allowed") return { allowed: true, status: "LINKS_ALLOWED_BY_RULES" };
  if (isFirstContribution) return { allowed: false, status: "FIRST_CONTRIBUTION_LINKS_NOT_PERMITTED" };
  if (linksPolicy === "prohibited") return { allowed: false, status: "LINKS_PROHIBITED_BY_RULES" };
  return { allowed: false, status: "LINKS_POLICY_UNCLEAR" };
}

export function isSafetyShutdownStatus(status: string): boolean {
  return new Set([
    "CAPTCHA",
    "SUSPICIOUS_LOGIN",
    "ACCOUNT_VERIFICATION",
    "ACCOUNT_RESTRICTION",
    "GROUP_POSTING_RESTRICTION",
    "MODERATOR_WARNING",
    "RATE_LIMIT",
    "GROUP_REJECTED",
    "GROUP_UNAVAILABLE",
    "SECURITY_CHECKPOINT",
    "AMBIGUOUS_RULES_AT_WRITE_TIME",
  ]).has(status);
}

function requiresHumanAction(status: string): boolean {
  return new Set([
    "CAPTCHA",
    "SUSPICIOUS_LOGIN",
    "ACCOUNT_VERIFICATION",
    "ACCOUNT_RESTRICTION",
    "GROUP_POSTING_RESTRICTION",
    "MODERATOR_WARNING",
    "SECURITY_CHECKPOINT",
    "LOGIN_REQUIRED",
  ]).has(status);
}

/** Generic structured-failure envelope applied to every non-ok result, mirroring Reddit's main() enrichment. */
export function enrichFailure(result: { ok: boolean; status: string; [key: string]: unknown }): { ok: boolean; status: string; reason: unknown; retryable: boolean; human_action_required: boolean; [key: string]: unknown } {
  if (result.ok) return result as WorkerResult & { reason: unknown; retryable: boolean; human_action_required: boolean };
  return { ...result, reason: result.reason ?? result.status, retryable: false, human_action_required: requiresHumanAction(result.status) };
}

/** A publish is only ever reported after a live, resolvable URL is captured — never on "the button was clicked." */
export function verifyPublishedUrl(candidateUrl: string | null): { ok: boolean; status: string } {
  if (!candidateUrl) return { ok: false, status: "AMBIGUOUS_SUBMISSION_NOT_RETRIED" };
  return { ok: true, status: "PUBLISHED" };
}

// ---------------------------------------------------------------------------
// Pure page-signal classifiers. Each takes plain strings/booleans (already
// extracted from the page) so the *decision* logic is unit testable without
// mocking Playwright. Facebook's DOM has no stable custom-element hooks like
// Reddit's shreddit-* tags, so these lean on visible text — best-effort,
// conservative-by-default (unknown/PARTIAL rather than a false positive).
// ---------------------------------------------------------------------------

export function classifySessionState(signals: { hasPasswordField: boolean; hasAuthenticatedNav: boolean }): "AUTHENTICATED" | "LOGIN_REQUIRED" {
  return signals.hasAuthenticatedNav && !signals.hasPasswordField ? "AUTHENTICATED" : "LOGIN_REQUIRED";
}

export function classifyChallenge(signals: { pathname: string; bodyText: string }): string | null {
  const path = signals.pathname.toLowerCase();
  if (/\/checkpoint\//.test(path) || /\/login\/checkpoint/.test(path)) return "SECURITY_CHECKPOINT";
  const body = signals.bodyText.toLowerCase();
  const patterns: Array<[RegExp, string]> = [
    [/captcha|select all (images|squares)|prove you.re human/, "CAPTCHA"],
    [/suspicious (login|activity)|we noticed unusual activity|unusual login attempt/, "SUSPICIOUS_LOGIN"],
    [/confirm your identity|verify your (account|identity)|help us confirm it.s you|upload a (photo|copy) of your id/, "ACCOUNT_VERIFICATION"],
    [/your account (has been|is) (restricted|suspended|disabled)|account restricted/, "ACCOUNT_RESTRICTION"],
    [/temporarily blocked from (posting|commenting)|your ability to post has been (limited|restricted)|blocked from posting in groups/, "GROUP_POSTING_RESTRICTION"],
    [/admin (has )?sent you a warning|moderator warning|you have received a warning/, "MODERATOR_WARNING"],
    [/try again later|you.re doing that too (much|often)|please wait before/, "RATE_LIMIT"],
    [/content isn.t available right now|this group is not available|this content isn.t available/, "GROUP_UNAVAILABLE"],
  ];
  return patterns.find(([pattern]) => pattern.test(body))?.[1] ?? null;
}

export function classifyGroupPrivacy(text: string): "public" | "private" | "unknown" {
  const body = text.toLowerCase();
  if (/\bpublic group\b/.test(body)) return "public";
  if (/\bprivate group\b/.test(body)) return "private";
  return "unknown";
}

export function classifyMembership(text: string): "member" | "not_member" | "pending_request" | "unknown" {
  const body = text.toLowerCase();
  if (/pending approval|your request to join|request pending/.test(body)) return "pending_request";
  if (/\byou.re a member\b|\bjoined\b|\bleave group\b/.test(body)) return "member";
  if (/\bjoin group\b/.test(body)) return "not_member";
  return "unknown";
}

export function deriveRulesConfidence(signals: { rulesHeadingFound: boolean; ruleItemsCount: number; membersOnlyNotice: boolean }): "VERIFIED_CURRENT" | "PARTIAL" | "UNKNOWN" {
  if (signals.membersOnlyNotice) return "UNKNOWN";
  if (signals.rulesHeadingFound && signals.ruleItemsCount > 0) return "VERIFIED_CURRENT";
  if (signals.rulesHeadingFound) return "PARTIAL";
  return "UNKNOWN";
}

export function classifyLinksPolicy(rulesText: string): LinksPolicy {
  const text = rulesText.toLowerCase();
  if (/no (links|self.promotion|promotion)|links? (are |is )?(not allowed|prohibited|forbidden)|do not (post|share) links/.test(text)) return "prohibited";
  if (/self.promotion (day|thread)|promo(tion)? (day|thread)|links allowed on/.test(text)) return "conditional";
  if (/links (are |is )?(allowed|welcome)|feel free to share links|resource links (are )?(welcome|allowed)/.test(text)) return "allowed";
  return "unknown";
}

export function classifyEducationalPostsPolicy(rulesText: string): "allowed" | "prohibited" | "conditional" | "unknown" {
  const text = rulesText.toLowerCase();
  if (/educational (posts|content) (are |is )?(welcome|allowed|encouraged)/.test(text)) return "allowed";
  if (/only (questions|discussions) allowed|no (standalone )?(articles|blog posts)/.test(text)) return "prohibited";
  if (/educational.*only on|value.*before promo/.test(text)) return "conditional";
  return "unknown";
}

export function detectPromoRestrictionVisible(rulesText: string): boolean {
  return /promo(tion)? (day|thread)|self.promotion (day|thread)|advertising (day|thread)/i.test(rulesText);
}

export function classifyAdminApprovalVisible(rulesText: string): boolean | "unknown" {
  const text = rulesText.toLowerCase();
  if (/admin approval required|posts (must be|require) approv|prior participation required|engage before you can post/.test(text)) return true;
  if (/no approval (required|needed)|posts are not moderated/.test(text)) return false;
  return "unknown";
}

// ---------------------------------------------------------------------------
// Live page interaction. Deliberately not unit tested (mirrors the Reddit
// worker's own test suite, which only covers the pure functions above) —
// validated instead against the real site, as this task's E2E run does.
// ---------------------------------------------------------------------------

async function pageSignals(page: Page): Promise<{ pathname: string; bodyText: string }> {
  const text = await bodyText(page);
  return { pathname: new URL(page.url()).pathname, bodyText: text };
}

async function detectChallenge(page: Page): Promise<string | null> {
  return classifyChallenge(await pageSignals(page));
}

async function getSession(page: Page): Promise<{ authenticated: boolean; current_url: string }> {
  const hasPasswordField = await page.locator('input[name="pass"]').first().isVisible().catch(() => false);
  const authNav = await firstVisible([
    page.locator('[aria-label="Your profile"]'),
    page.locator('a[href="/me/"]'),
    page.locator('[aria-label="Account"]'),
    page.locator('div[role="banner"] [aria-label*="profile" i]'),
  ]);
  const state = classifySessionState({ hasPasswordField, hasAuthenticatedNav: authNav !== null });
  return { authenticated: state === "AUTHENTICATED", current_url: sanitizeFacebookUrl(page.url()) };
}

async function requireAuthenticated(page: Page): Promise<void> {
  const session = await getSession(page);
  if (!session.authenticated) throw new Error("LOGIN_REQUIRED");
}

type GroupSnapshot = {
  ok: boolean;
  status: string;
  group_name: string | null;
  group_url: string;
  public_or_private: "public" | "private" | "unknown";
  membership_state: "member" | "not_member" | "pending_request" | "unknown";
  posting_enabled: boolean | "unknown";
  visible_rules_available: boolean;
  removed_or_unavailable: boolean;
  current_url: string;
};

async function inspectGroup(page: Page, groupUrl: string): Promise<GroupSnapshot> {
  const canonical = sanitizeFacebookUrl(groupUrl);
  const unresolved = (status: string, currentUrl: string): GroupSnapshot => ({
    ok: false,
    status,
    group_name: null,
    group_url: canonical,
    public_or_private: "unknown",
    membership_state: "unknown",
    posting_enabled: "unknown",
    visible_rules_available: false,
    removed_or_unavailable: false,
    current_url: currentUrl,
  });

  await page.goto(canonical, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const challenge = await detectChallenge(page);
  if (challenge) return unresolved(challenge, sanitizeFacebookUrl(page.url()));

  const session = await getSession(page);
  if (!session.authenticated) return unresolved("LOGIN_REQUIRED", session.current_url);

  const text = await bodyText(page);
  const groupName = await textOf([page.getByRole("heading", { level: 1 }), page.locator("h1")]);
  const composerVisible = (await firstVisible([
    page.getByRole("button", { name: /write something|create (a )?post|start a post/i }),
  ])) !== null;
  const postingRestricted = /only admins can post|admin approval required to post|posts must be approved/i.test(text);
  const unavailable = /content isn.t available right now|this content isn.t available|this group is not available|link may be broken/i.test(text);
  const rulesVisible = (await firstVisible([
    page.getByRole("link", { name: /group rules/i }),
    page.getByText(/group rules/i),
  ])) !== null;

  return {
    ok: true,
    status: unavailable ? "GROUP_UNAVAILABLE" : "OPENED",
    group_name: groupName,
    group_url: canonical,
    public_or_private: classifyGroupPrivacy(text),
    membership_state: classifyMembership(text),
    posting_enabled: composerVisible ? true : postingRestricted ? false : "unknown",
    visible_rules_available: rulesVisible,
    removed_or_unavailable: unavailable,
    current_url: sanitizeFacebookUrl(page.url()),
  };
}

type RulesSnapshot = {
  ok: boolean;
  status: string;
  group_url: string;
  group_name: string | null;
  current_url: string;
  rules_found: boolean;
  rule_headings: string[];
  standalone_educational_posts_allowed: "allowed" | "prohibited" | "conditional" | "unknown";
  links_or_self_promotion: LinksPolicy;
  promo_day_or_thread_restrictions_visible: boolean;
  admin_approval_or_prior_participation_visible: boolean | "unknown";
  confidence: "VERIFIED_CURRENT" | "PARTIAL" | "UNKNOWN";
};

async function inspectRules(page: Page, groupUrl: string): Promise<RulesSnapshot> {
  const group = await inspectGroup(page, groupUrl);
  const unresolved = (status: string): RulesSnapshot => ({
    ok: false,
    status,
    group_url: group.group_url,
    group_name: group.group_name,
    current_url: group.current_url,
    rules_found: false,
    rule_headings: [],
    standalone_educational_posts_allowed: "unknown",
    links_or_self_promotion: "unknown",
    promo_day_or_thread_restrictions_visible: false,
    admin_approval_or_prior_participation_visible: "unknown",
    confidence: "UNKNOWN",
  });
  if (!group.ok) return unresolved(group.status);
  if (group.removed_or_unavailable) return unresolved("GROUP_UNAVAILABLE");

  const rulesLink = await firstVisible([page.getByRole("link", { name: /group rules/i })]);
  if (rulesLink) await rulesLink.click().catch(() => undefined);
  await page.waitForTimeout(500);

  const text = await bodyText(page);
  const rulesHeadingFound = /group rules/i.test(text);
  const itemCandidates = page.locator('[role="listitem"], li');
  const itemCount = Math.min(await itemCandidates.count().catch(() => 0), 30);
  const headings: string[] = [];
  for (let index = 0; index < itemCount; index += 1) {
    const itemText = (await itemCandidates.nth(index).innerText().catch(() => "")).trim();
    const firstLine = itemText.split("\n")[0]?.trim();
    if (firstLine && /^\d+[.)]/.test(firstLine) && !headings.includes(firstLine)) headings.push(firstLine.slice(0, 200));
  }
  const membersOnlyNotice = /join this group to see|you must be a member|only members can see/i.test(text);
  const confidence = deriveRulesConfidence({ rulesHeadingFound, ruleItemsCount: headings.length, membersOnlyNotice });

  return {
    ok: true,
    status: "READ_ONLY_COMPLETE",
    group_url: group.group_url,
    group_name: group.group_name,
    current_url: sanitizeFacebookUrl(page.url()),
    rules_found: rulesHeadingFound || headings.length > 0,
    rule_headings: headings,
    standalone_educational_posts_allowed: classifyEducationalPostsPolicy(text),
    links_or_self_promotion: classifyLinksPolicy(text),
    promo_day_or_thread_restrictions_visible: detectPromoRestrictionVisible(text),
    admin_approval_or_prior_participation_visible: classifyAdminApprovalVisible(text),
    confidence,
  };
}

type PostSnapshot = {
  ok: boolean;
  status: string;
  post_url: string;
  group_url: string | null;
  visible_post_text: string | null;
  comments_enabled: boolean;
  removed: boolean;
  current_url: string;
};

async function inspectPost(page: Page, postUrl: string): Promise<PostSnapshot> {
  const canonical = sanitizeFacebookUrl(postUrl);
  const groupUrl = groupUrlFromPostUrl(canonical);
  const unresolved = (status: string, currentUrl: string): PostSnapshot => ({
    ok: false,
    status,
    post_url: canonical,
    group_url: groupUrl,
    visible_post_text: null,
    comments_enabled: false,
    removed: false,
    current_url: currentUrl,
  });

  await page.goto(canonical, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const challenge = await detectChallenge(page);
  if (challenge) return unresolved(challenge, sanitizeFacebookUrl(page.url()));

  const session = await getSession(page);
  if (!session.authenticated) return unresolved("LOGIN_REQUIRED", session.current_url);

  const text = await bodyText(page);
  const removed = /content isn.t available right now|this content isn.t available/i.test(text);
  const visibleText = await textOf([page.locator('[role="article"]').first()]);
  const commentBox = await firstVisible([
    page.locator('[contenteditable="true"][aria-label*="comment" i]'),
    page.getByPlaceholder(/write a comment/i),
  ]);

  return {
    ok: true,
    status: removed ? "POST_UNAVAILABLE" : "OPENED",
    post_url: canonical,
    group_url: groupUrl,
    visible_post_text: visibleText,
    comments_enabled: !removed && commentBox !== null,
    removed,
    current_url: sanitizeFacebookUrl(page.url()),
  };
}

async function appendActionLog(entry: ActionLogEntry): Promise<void> {
  await appendJsonLogLine(ACTION_LOG, entry);
}

async function readPolicy(): Promise<AutonomousPolicy> {
  return readJsonWithDefaults(AUTONOMOUS_POLICY_PATH, DEFAULT_AUTONOMOUS_POLICY);
}

async function writePolicy(policy: AutonomousPolicy): Promise<void> {
  await writeJsonPrivate(AUTONOMOUS_POLICY_PATH, policy);
}

async function readActions(): Promise<ActionLogEntry[]> {
  return readJsonLogLines<ActionLogEntry>(ACTION_LOG);
}

async function disableAutonomousWrites(reason: string): Promise<void> {
  const policy = await readPolicy();
  await writePolicy({ ...policy, autonomous_write_enabled: false, disabled_reason: reason, disabled_at: new Date().toISOString() });
}

async function cmdStatus(page: Page, waitSeconds = 0): Promise<WorkerResult> {
  await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 45_000 });
  const challenge = await detectChallenge(page);
  if (challenge) return { ok: false, command: "facebook_status", status: challenge, authenticated: false, current_url: sanitizeFacebookUrl(page.url()) };

  let session = await getSession(page);
  const deadline = Date.now() + waitSeconds * 1000;
  while (!session.authenticated && Date.now() < deadline) {
    await page.waitForTimeout(2_000);
    const waitingChallenge = await detectChallenge(page);
    if (waitingChallenge) return { ok: false, command: "facebook_status", status: waitingChallenge, authenticated: false, current_url: sanitizeFacebookUrl(page.url()) };
    session = await getSession(page);
  }

  const policy = await readPolicy();
  return {
    ok: session.authenticated,
    command: "facebook_status",
    status: session.authenticated ? "AUTHENTICATED" : "LOGIN_REQUIRED",
    authenticated: session.authenticated,
    current_url: session.current_url,
    autonomous_write_enabled: policy.autonomous_write_enabled,
    autonomous_policy: {
      max_writes_24h: policy.max_writes_24h,
      max_posts_24h: policy.max_posts_24h,
      max_posts_7d: policy.max_posts_7d,
      min_write_interval_minutes: policy.min_write_interval_minutes,
    },
    autonomous_disabled_reason: policy.disabled_reason ?? null,
  };
}

async function cmdOpenGroup(page: Page, groupUrl: string): Promise<WorkerResult> {
  const snapshot = await inspectGroup(page, groupUrl);
  return { command: "facebook_open_group", ...snapshot };
}

async function cmdRules(page: Page, groupUrl: string): Promise<WorkerResult> {
  const snapshot = await inspectRules(page, groupUrl);
  return { command: "facebook_rules", ...snapshot };
}

async function cmdOpenPost(page: Page, postUrl: string): Promise<WorkerResult> {
  const snapshot = await inspectPost(page, postUrl);
  return { command: "facebook_open_post", ...snapshot };
}

async function cmdCreatePost(page: Page, task: Extract<FacebookTask, { command: "facebook_create_post" }>, requestId: string | null): Promise<WorkerResult> {
  await requireAuthenticated(page);
  const actions = await readActions();
  const decision = evaluateAutonomousWrite(task, await readPolicy(), actions);
  if (!decision.allowed) return { ok: false, command: task.command, status: decision.status };

  const group = await inspectGroup(page, task.group_url);
  if (!group.ok) return { ok: false, command: task.command, status: group.status, current_url: group.current_url };
  if (group.removed_or_unavailable) return { ok: false, command: task.command, status: "GROUP_UNAVAILABLE", group_url: group.group_url, current_url: group.current_url };

  const currentRules = await inspectRules(page, task.group_url);
  if (!currentRules.ok || currentRules.confidence !== "VERIFIED_CURRENT") {
    return { ok: false, command: task.command, status: "AMBIGUOUS_RULES_AT_WRITE_TIME", group_url: group.group_url, current_url: currentRules.current_url };
  }

  const linkDecision = evaluateLinkPolicy(task.text, currentRules.links_or_self_promotion, isFirstContributionToGroup(actions, group.group_url));
  if (!linkDecision.allowed) return { ok: false, command: task.command, status: linkDecision.status, group_url: group.group_url };

  if (group.posting_enabled === false) return { ok: false, command: task.command, status: "GROUP_POSTING_NOT_PERMITTED", group_url: group.group_url };

  const opener = await firstVisible([page.getByRole("button", { name: /write something|create (a )?post|start a post/i })]);
  if (!opener) return { ok: false, command: task.command, status: "POST_COMPOSER_NOT_FOUND", group_url: group.group_url };
  await opener.click().catch(() => undefined);
  await page.waitForTimeout(750);

  const editor = await firstVisible([page.locator('[contenteditable="true"][role="textbox"]'), page.getByRole("textbox")]);
  if (!editor) return { ok: false, command: task.command, status: "POST_EDITOR_NOT_FOUND", group_url: group.group_url };
  await editor.fill(task.text);

  const submit = await firstVisible([page.getByRole("button", { name: /^post$/i })]);
  if (!submit || (await submit.isDisabled().catch(() => true))) return { ok: false, command: task.command, status: "POST_SUBMIT_NOT_FOUND", group_url: group.group_url };
  await submit.click();
  await page.waitForTimeout(2_500);

  const postChallenge = await detectChallenge(page);
  if (postChallenge) return { ok: false, command: task.command, status: postChallenge, current_url: sanitizeFacebookUrl(page.url()) };

  const exactPost = page.locator('[role="article"]').filter({ hasText: task.text }).first();
  const isLive = await exactPost.isVisible().catch(() => false);
  const permalinkHref = isLive ? await exactPost.locator('a[href*="/posts/"], a[href*="/permalink/"]').first().getAttribute("href").catch(() => null) : null;
  const verification = verifyPublishedUrl(permalinkHref ? new URL(permalinkHref, "https://www.facebook.com").toString() : null);
  if (!verification.ok) return { ok: false, command: task.command, status: verification.status, group_url: group.group_url, current_url: sanitizeFacebookUrl(page.url()) };

  const publishedUrl = sanitizeFacebookUrl(permalinkHref!);
  await appendActionLog({
    timestamp: new Date().toISOString(),
    request_id: requestId,
    command: task.command,
    group_name: group.group_name,
    group_url: group.group_url,
    published_url: publishedUrl,
    had_miloosh_link: /(?:https?:\/\/)?(?:www\.)?miloosh\.com/i.test(task.text),
    text_sha256: textSha256(task.text),
    normalized_text_sha256: normalizedTextSha256(task.text),
    rule_confidence: currentRules.confidence,
  });
  return { ok: true, command: task.command, status: "PUBLISHED", published_url: publishedUrl, group_name: group.group_name, group_url: group.group_url };
}

async function cmdComment(page: Page, task: Extract<FacebookTask, { command: "facebook_comment" }>, requestId: string | null): Promise<WorkerResult> {
  await requireAuthenticated(page);
  const actions = await readActions();
  const decision = evaluateAutonomousWrite(task, await readPolicy(), actions);
  if (!decision.allowed) return { ok: false, command: task.command, status: decision.status };

  const post = await inspectPost(page, task.post_url);
  if (!post.ok) return { ok: false, command: task.command, status: post.status, current_url: post.current_url };
  if (post.removed) return { ok: false, command: task.command, status: "POST_UNAVAILABLE", current_url: post.current_url };
  if (!post.comments_enabled) return { ok: false, command: task.command, status: "COMMENTS_UNAVAILABLE", current_url: post.current_url };

  const groupUrl = post.group_url ?? groupUrlFromPostUrl(post.post_url);
  const currentRules = await inspectRules(page, groupUrl);
  if (!currentRules.ok || currentRules.confidence !== "VERIFIED_CURRENT") {
    return { ok: false, command: task.command, status: "AMBIGUOUS_RULES_AT_WRITE_TIME", group_url: groupUrl };
  }
  const linkDecision = evaluateLinkPolicy(task.text, currentRules.links_or_self_promotion, isFirstContributionToGroup(actions, groupUrl));
  if (!linkDecision.allowed) return { ok: false, command: task.command, status: linkDecision.status, group_url: groupUrl };

  const editor = await firstVisible([
    page.locator('[contenteditable="true"][aria-label*="comment" i]'),
    page.getByPlaceholder(/write a comment/i),
  ]);
  if (!editor) return { ok: false, command: task.command, status: "COMMENT_EDITOR_NOT_FOUND", group_url: groupUrl };
  await editor.click().catch(() => undefined);
  await editor.fill(task.text);

  const submit = await firstVisible([page.getByRole("button", { name: /^comment$/i })]);
  if (submit) await submit.click();
  else await page.keyboard.press("Enter");
  await page.waitForTimeout(2_000);

  const postChallenge = await detectChallenge(page);
  if (postChallenge) return { ok: false, command: task.command, status: postChallenge, current_url: sanitizeFacebookUrl(page.url()) };

  const exactComment = page.locator('[role="article"], ul[role="list"] li').filter({ hasText: task.text }).first();
  const isLive = await exactComment.isVisible().catch(() => false);
  const permalinkHref = isLive ? await exactComment.locator('a[href*="comment_id="]').first().getAttribute("href").catch(() => null) : null;
  const verification = verifyPublishedUrl(permalinkHref ? new URL(permalinkHref, "https://www.facebook.com").toString() : null);
  if (!verification.ok) return { ok: false, command: task.command, status: verification.status, group_url: groupUrl };

  const publishedUrl = sanitizeFacebookUrl(permalinkHref!);
  await appendActionLog({
    timestamp: new Date().toISOString(),
    request_id: requestId,
    command: task.command,
    group_name: null,
    group_url: groupUrl,
    published_url: publishedUrl,
    had_miloosh_link: /(?:https?:\/\/)?(?:www\.)?miloosh\.com/i.test(task.text),
    text_sha256: textSha256(task.text),
    normalized_text_sha256: normalizedTextSha256(task.text),
    rule_confidence: currentRules.confidence,
  });
  return { ok: true, command: task.command, status: "PUBLISHED", published_url: publishedUrl, group_url: groupUrl };
}

async function cmdNotifications(page: Page): Promise<WorkerResult> {
  await requireAuthenticated(page);
  await page.goto("https://www.facebook.com/notifications", { waitUntil: "domcontentloaded", timeout: 45_000 });
  const challenge = await detectChallenge(page);
  if (challenge) return { ok: false, command: "facebook_notifications", status: challenge, current_url: sanitizeFacebookUrl(page.url()) };

  const entries = page.locator('[role="feed"] [role="article"], [role="main"] a[role="link"]');
  const count = Math.min(await entries.count().catch(() => 0), 100);
  const items: Array<{ text: string; url: string | null }> = [];
  for (let index = 0; index < count; index += 1) {
    const entry = entries.nth(index);
    const text = (await entry.innerText().catch(() => "")).trim();
    if (!text) continue;
    const href = await entry.getAttribute("href").catch(() => null);
    items.push({ text, url: href ? new URL(href, "https://www.facebook.com").toString() : null });
  }
  return { ok: true, command: "facebook_notifications", status: "READ_ONLY_COMPLETE", current_url: sanitizeFacebookUrl(page.url()), notifications: items };
}

async function executeTask(context: BrowserContext, task: FacebookTask): Promise<WorkerResult> {
  const page = context.pages()[0] ?? (await context.newPage());
  if (task.command === "facebook_status") return cmdStatus(page, task.wait_for_login_seconds ?? 0);
  if (task.command === "facebook_open_group") return cmdOpenGroup(page, task.group_url);
  if (task.command === "facebook_rules") return cmdRules(page, task.group_url);
  if (task.command === "facebook_open_post") return cmdOpenPost(page, task.post_url);
  if (task.command === "facebook_create_post") return cmdCreatePost(page, task, task.request_id ?? null);
  if (task.command === "facebook_comment") return cmdComment(page, task, task.request_id ?? null);
  return cmdNotifications(page);
}

async function loadTask(): Promise<FacebookTask> {
  const taskIndex = process.argv.indexOf("--task");
  if (taskIndex >= 0 && process.argv[taskIndex + 1]) return parseFacebookTask(JSON.parse(await readFile(resolve(process.argv[taskIndex + 1]!), "utf8")));
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return parseFacebookTask(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}

async function main(): Promise<void> {
  try {
    await acquireLock(LOCK_DIR, STATE_DIR, "FACEBOOK_WORKER_BUSY");
    const autonomousIndex = process.argv.indexOf("--set-autonomous");
    if (autonomousIndex >= 0 && process.argv[autonomousIndex + 1]) {
      const enabled = process.argv[autonomousIndex + 1] === "true";
      if (!enabled && process.argv[autonomousIndex + 1] !== "false") throw new Error("INVALID_AUTONOMOUS_VALUE");
      await writePolicy({ ...(await readPolicy()), autonomous_write_enabled: enabled, disabled_reason: undefined, disabled_at: undefined });
      process.stdout.write(`${JSON.stringify({ ok: true, status: enabled ? "AUTONOMOUS_WRITES_ENABLED" : "AUTONOMOUS_WRITES_DISABLED", autonomous_write_enabled: enabled }, null, 2)}\n`);
      return;
    }

    const task = await loadTask();
    await mkdir(PROFILE_DIR, { recursive: true, mode: 0o700 });
    const context = await connectPersistentChrome({
      profileDir: PROFILE_DIR,
      cdpPort: CDP_PORT,
      chromeExecutablePath: process.env.MILOOSH_FACEBOOK_CHROME ?? DEFAULT_CHROME,
      startUrl: "https://www.facebook.com/",
    });
    let result = await executeTask(context, task);
    if (!result.ok) {
      if (isSafetyShutdownStatus(result.status)) await disableAutonomousWrites(result.status);
      result = enrichFailure(result) as WorkerResult;
    }
    process.stdout.write(`${JSON.stringify({ request_id: task.request_id ?? null, ...result }, null, 2)}\n`);
    if (!result.ok) process.exitCode = 2;
  } catch (error) {
    const message = error instanceof z.ZodError ? "INVALID_TASK" : error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (isSafetyShutdownStatus(message)) await disableAutonomousWrites(message);
    process.stdout.write(`${JSON.stringify(enrichFailure({ ok: false, status: message }), null, 2)}\n`);
    process.exitCode = 1;
  } finally {
    await releaseLock(LOCK_DIR);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  void main().then(() => process.exit(process.exitCode ?? 0));
}
