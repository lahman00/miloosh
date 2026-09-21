import { chromium, type BrowserContext, type Locator, type Page } from "playwright-core";
import { appendFile, chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { evaluateReplyQuality } from "@/scripts/reddit/quality-gate";

const STATE_DIR = process.env.MILOOSH_REDDIT_STATE_DIR ?? join(homedir(), ".local", "share", "miloosh-reddit-worker");
const PROFILE_DIR = join(STATE_DIR, "chrome-profile");
const ACTION_LOG = join(STATE_DIR, "logs", "actions.jsonl");
const AUTONOMOUS_POLICY_PATH = join(STATE_DIR, "autonomous-policy.json");
const APPROVAL_DIR = join(STATE_DIR, "approvals");
const LOCK_DIR = join(STATE_DIR, "run.lock");
const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = Number(process.env.MILOOSH_REDDIT_CDP_PORT ?? "9225");
const CDP_ENDPOINT = `http://127.0.0.1:${CDP_PORT}`;

const nonBlankExactText = z.string().refine((value) => value.trim().length > 0, "must not be blank");
const redditUrl = z.string().url().refine((value) => {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname === "reddit.com" || hostname.endsWith(".reddit.com");
}, "must be a reddit.com URL");
const subreddit = z.string().regex(/^[A-Za-z0-9_]{2,21}$/, "invalid subreddit name");
export const MILOOSH_LINK_PATTERN = /(?:https?:\/\/)?(?:www\.)?miloosh\.com/i;

export const taskSchema = z.discriminatedUnion("command", [
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_status"), wait_for_login_seconds: z.number().int().min(0).max(900).optional() }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_open"), thread_url: redditUrl }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_reply"), thread_url: redditUrl, text: nonBlankExactText }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_create_post"), subreddit, title: nonBlankExactText, body: nonBlankExactText }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_notifications") }).strict(),
]);

export type RedditTask = z.infer<typeof taskSchema>;

export type AutonomousPolicy = {
  autonomous_write_enabled: boolean;
  max_comments_24h: number;
  max_posts_24h: number;
  max_posts_7d: number;
  min_write_interval_minutes: number;
  disabled_reason?: string;
  disabled_at?: string;
};

export type ActionLogEntry = {
  timestamp: string;
  request_id: string | null;
  command: "reddit_reply" | "reddit_create_post";
  subreddit: string | null;
  thread_url: string | null;
  published_permalink: string;
  had_miloosh_link: boolean;
  text_sha256: string;
};

export const DEFAULT_AUTONOMOUS_POLICY: AutonomousPolicy = {
  autonomous_write_enabled: false,
  max_comments_24h: 8,
  max_posts_24h: 1,
  max_posts_7d: 3,
  min_write_interval_minutes: 20,
};

type WorkerResult = {
  ok: boolean;
  command?: RedditTask["command"];
  status: string;
  [key: string]: unknown;
};

export function parseRedditTask(input: unknown): RedditTask {
  return taskSchema.parse(input);
}

export function normalizeSubreddit(value: string): string {
  return value.replace(/^r\//i, "");
}

export function normalizeRedditCommentReadback(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function isRedditCommentReadbackMatch(rendered: string, taskText: string, username: string | null): boolean {
  if (!username) return false;
  const normalizedRendered = normalizeRedditCommentReadback(rendered);
  const normalizedTask = normalizeRedditCommentReadback(taskText);
  const stablePrefix = normalizedTask.slice(0, Math.min(180, normalizedTask.length));
  return Boolean(stablePrefix && normalizedRendered.includes(username) && normalizedRendered.includes(stablePrefix));
}

export function sanitizeRedditUrl(value: string): string {
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
}

export function approvalId(task: RedditTask): string {
  return createHash("sha256").update(JSON.stringify(task)).digest("hex");
}

function isWriteTask(task: RedditTask): task is Extract<RedditTask, { command: "reddit_reply" | "reddit_create_post" }> {
  return task.command === "reddit_reply" || task.command === "reddit_create_post";
}

function taskText(task: Extract<RedditTask, { command: "reddit_reply" | "reddit_create_post" }>): string {
  return task.command === "reddit_reply" ? task.text : `${task.title}\n\n${task.body}`;
}

export function textSha256(task: Extract<RedditTask, { command: "reddit_reply" | "reddit_create_post" }>): string {
  return createHash("sha256").update(taskText(task)).digest("hex");
}

export function evaluateAutonomousWrite(task: RedditTask, policy: AutonomousPolicy, actions: ActionLogEntry[], now = new Date()): { allowed: boolean; status: string } {
  if (!isWriteTask(task)) return { allowed: true, status: "READ_ONLY" };
  if (!policy.autonomous_write_enabled) return { allowed: false, status: "AUTONOMOUS_WRITE_DISABLED" };
  const time = now.getTime();
  const since24h = actions.filter((entry) => time - Date.parse(entry.timestamp) < 86_400_000);
  const since7d = actions.filter((entry) => time - Date.parse(entry.timestamp) < 7 * 86_400_000);
  const last = [...actions].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
  if (last && time - Date.parse(last.timestamp) < policy.min_write_interval_minutes * 60_000) return { allowed: false, status: "WRITE_INTERVAL_LIMIT" };
  if (actions.some((entry) => entry.text_sha256 === textSha256(task))) return { allowed: false, status: "DUPLICATE_TEXT" };
  if (task.command === "reddit_reply") {
    if (since24h.filter((entry) => entry.command === "reddit_reply").length >= policy.max_comments_24h) return { allowed: false, status: "DAILY_COMMENT_CAP" };
    if (actions.some((entry) => entry.command === "reddit_reply" && entry.thread_url === task.thread_url)) return { allowed: false, status: "SAME_THREAD_REPLY_REQUIRES_NEW_DIRECT_REPLY" };
  } else {
    if (since24h.filter((entry) => entry.command === "reddit_create_post").length >= policy.max_posts_24h) return { allowed: false, status: "DAILY_POST_CAP" };
    if (since7d.filter((entry) => entry.command === "reddit_create_post").length >= policy.max_posts_7d) return { allowed: false, status: "ROLLING_7_DAY_POST_CAP" };
  }
  return { allowed: true, status: "AUTONOMOUS_EXECUTION_ALLOWED" };
}

async function readPolicy(): Promise<AutonomousPolicy> {
  return readFile(AUTONOMOUS_POLICY_PATH, "utf8").then((value) => ({ ...DEFAULT_AUTONOMOUS_POLICY, ...JSON.parse(value) } as AutonomousPolicy)).catch(() => ({ ...DEFAULT_AUTONOMOUS_POLICY }));
}

async function writePolicy(policy: AutonomousPolicy): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true, mode: 0o700 });
  await writeFile(AUTONOMOUS_POLICY_PATH, `${JSON.stringify(policy, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(AUTONOMOUS_POLICY_PATH, 0o600);
}

async function readActions(): Promise<ActionLogEntry[]> {
  return readFile(ACTION_LOG, "utf8").then((value) => value.split("\n").filter(Boolean).map((line) => JSON.parse(line) as ActionLogEntry)).catch(() => []);
}

async function disableAutonomousWrites(reason: string): Promise<void> {
  const policy = await readPolicy();
  await writePolicy({ ...policy, autonomous_write_enabled: false, disabled_reason: reason, disabled_at: new Date().toISOString() });
}

export function isSafetyShutdownStatus(status: string): boolean {
  return new Set(["CAPTCHA", "REDDIT_JS_CHALLENGE", "ACCOUNT_VERIFICATION", "SUSPICIOUS_LOGIN", "POSTING_RESTRICTION", "MODERATOR_WARNING", "RATE_LIMIT"]).has(status);
}

/**
 * Quality gate runs before approval/rate-limit checks and applies to EVERY
 * write path (autonomous or manually pre-approved) — a manually-approved
 * but low-effort/template draft is just as likely to get AutoModerator-
 * removed as an autonomous one, so approval never bypasses it.
 */
async function authorizeWrite(task: RedditTask): Promise<void> {
  if (!isWriteTask(task)) return;
  const text = taskText(task);
  const quality = evaluateReplyQuality({ text, hasMilooshLink: MILOOSH_LINK_PATTERN.test(text), recentActions: await readActions() });
  if (!quality.allowed) throw new Error(quality.status);
  if (await hasValidApproval(task)) return requireAndConsumeApproval(task);
  const decision = evaluateAutonomousWrite(task, await readPolicy(), await readActions());
  if (!decision.allowed) throw new Error(decision.status);
}

export function requiresWriteApproval(task: RedditTask): boolean {
  return isWriteTask(task);
}

function requiresHumanAction(status: string): boolean {
  return new Set([
    "CAPTCHA",
    "REDDIT_JS_CHALLENGE",
    "ACCOUNT_VERIFICATION",
    "SUSPICIOUS_LOGIN",
    "POSTING_RESTRICTION",
    "MODERATOR_WARNING",
    "FLAIR_REQUIRED",
    "WRITE_APPROVAL_REQUIRED",
    "WRITE_APPROVAL_EXPIRED",
    "LOGIN_REQUIRED",
  ]).has(status);
}

async function approvalPath(task: RedditTask): Promise<string> {
  return join(APPROVAL_DIR, `${approvalId(task)}.json`);
}

async function requireAndConsumeApproval(task: RedditTask): Promise<void> {
  const path = await approvalPath(task);
  const approval = JSON.parse(await readFile(path, "utf8")) as { expires_at?: string };
  if (!approval.expires_at || Date.parse(approval.expires_at) <= Date.now()) {
    await rm(path, { force: true });
    throw new Error("WRITE_APPROVAL_EXPIRED");
  }
  await rm(path, { force: true });
}

async function hasValidApproval(task: RedditTask): Promise<boolean> {
  if (!isWriteTask(task)) return true;
  const approval = await readFile(await approvalPath(task), "utf8").then((value) => JSON.parse(value) as { expires_at?: string }).catch(() => null);
  return Boolean(approval?.expires_at && Date.parse(approval.expires_at) > Date.now());
}

async function approveTask(path: string): Promise<void> {
  const task = parseRedditTask(JSON.parse(await readFile(resolve(path), "utf8")));
  if (!isWriteTask(task)) throw new Error("APPROVAL_ONLY_APPLIES_TO_WRITE_TASKS");
  await mkdir(APPROVAL_DIR, { recursive: true, mode: 0o700 });
  const file = await approvalPath(task);
  await writeFile(file, `${JSON.stringify({ approval_id: approvalId(task), expires_at: new Date(Date.now() + 10 * 60_000).toISOString() })}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(file, 0o600);
  process.stdout.write(`${JSON.stringify({ ok: true, status: "WRITE_APPROVED_ONCE", approval_id: approvalId(task), expires_in_seconds: 600 }, null, 2)}\n`);
}

async function firstVisible(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    const count = Math.min(await locator.count().catch(() => 0), 20);
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
  }
  return null;
}

async function textOf(locators: Locator[]): Promise<string | null> {
  const locator = await firstVisible(locators);
  const text = locator ? await locator.innerText().catch(() => "") : "";
  return text.trim() || null;
}

async function detectChallenge(page: Page): Promise<string | null> {
  if (/[?&]captcha=1(?:&|$)/i.test(page.url())) return "CAPTCHA";
  if (/[?&]js_challenge=1(?:&|$)/i.test(page.url())) return "REDDIT_JS_CHALLENGE";
  const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  const challenges: Array<[RegExp, string]> = [
    [/captcha|prove you.re human/, "CAPTCHA"],
    [/verify your email|account verification/, "ACCOUNT_VERIFICATION"],
    [/suspicious activity|suspicious login/, "SUSPICIOUS_LOGIN"],
    [/you.ve been temporarily blocked|posting is restricted|you are doing that too much/, "POSTING_RESTRICTION"],
    [/moderator warning|message from the moderators/, "MODERATOR_WARNING"],
  ];
  return challenges.find(([pattern]) => pattern.test(body))?.[1] ?? null;
}

async function getSession(page: Page): Promise<{ authenticated: boolean; username: string | null; current_url: string }> {
  const profileLink = await firstVisible([
    page.locator('header a[href^="/user/"]:not([href*="/comments/"])'),
    page.locator('nav a[href^="/user/"]:not([href*="/comments/"])'),
    page.locator('reddit-header-large a[href^="/user/"]:not([href*="/comments/"])'),
  ]);
  const href = await profileLink?.getAttribute("href").catch(() => null) ?? null;
  const match = href?.match(/^\/user\/([^/?#]+)/i);
  if (match?.[1]) return { authenticated: true, username: decodeURIComponent(match[1]), current_url: sanitizeRedditUrl(page.url()) };

  return { authenticated: false, username: null, current_url: sanitizeRedditUrl(page.url()) };
}

async function requireAuthenticated(page: Page): Promise<{ username: string | null }> {
  const session = await getSession(page);
  if (!session.authenticated) throw new Error("REDDIT_LOGIN_REQUIRED");
  return { username: session.username };
}

async function openThread(page: Page, threadUrl: string) {
  await page.goto(threadUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const challenge = await detectChallenge(page);
  if (challenge) throw new Error(challenge);

  const post = page.locator("shreddit-post").first();
  const title = await textOf([
    post.locator('h1[slot="title"]'),
    post.locator("h1"),
    page.locator("main h1"),
  ]);
  const subredditHref = await post.locator('a[href^="/r/"]').first().getAttribute("href").catch(() => null)
    ?? await page.locator('a[href^="/r/"]').first().getAttribute("href").catch(() => null);
  const subredditMatch = new URL(threadUrl).pathname.match(/^\/r\/([^/?#]+)/i)
    ?? subredditHref?.match(/^\/r\/([^/?#]+)/i);
  const visiblePostText = await textOf([
    post.locator('[slot="text-body"]'),
    post.locator("div.md"),
    page.locator('[data-post-click-location="text-body"]'),
  ]);
  const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  const locked = (await post.getAttribute("is-locked").catch(() => null)) === "true" || /comments are locked/.test(body);
  const removed = /\[removed\]|this post was removed|removed by reddit/.test(body);
  const composerVisible = Boolean(await firstVisible([
    page.locator("shreddit-composer"),
    page.getByPlaceholder(/add a comment|join the conversation/i),
  ]));

  return {
    title,
    subreddit: subredditMatch?.[1] ?? null,
    visible_post_text: visiblePostText,
    comments_enabled: !locked && !removed && composerVisible,
    removed,
    locked,
    current_url: sanitizeRedditUrl(page.url()),
  };
}

async function appendActionLog(entry: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(ACTION_LOG), { recursive: true, mode: 0o700 });
  await appendFile(ACTION_LOG, `${JSON.stringify(entry)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(ACTION_LOG, 0o600);
}

async function status(page: Page, waitSeconds = 0): Promise<WorkerResult> {
  await page.goto("https://www.reddit.com/", { waitUntil: "domcontentloaded", timeout: 45_000 });
  const challenge = await detectChallenge(page);
  if (challenge) return { ok: false, command: "reddit_status", status: challenge, current_url: sanitizeRedditUrl(page.url()) };

  let session = await getSession(page);
  const deadline = Date.now() + waitSeconds * 1000;
  while (!session.authenticated && Date.now() < deadline) {
    await page.waitForTimeout(2_000);
    const waitingChallenge = await detectChallenge(page);
    if (waitingChallenge && waitingChallenge !== "REDDIT_JS_CHALLENGE") return { ok: false, command: "reddit_status", status: waitingChallenge, authenticated: false, username: null, current_url: sanitizeRedditUrl(page.url()) };
    session = await getSession(page);
  }
  if (session.authenticated && /[?&]js_challenge=1(?:&|$)/i.test(page.url())) {
    await page.goto("https://www.reddit.com/", { waitUntil: "domcontentloaded", timeout: 45_000 });
    session = await getSession(page);
  }
  const finalChallenge = await detectChallenge(page);
  if (finalChallenge) return { ok: false, command: "reddit_status", status: finalChallenge, authenticated: false, username: null, current_url: sanitizeRedditUrl(page.url()) };
  const policy = await readPolicy();
  return { ok: session.authenticated, command: "reddit_status", status: session.authenticated ? "AUTHENTICATED" : "LOGIN_REQUIRED", ...session, autonomous_write_enabled: policy.autonomous_write_enabled, autonomous_policy: { max_comments_24h: policy.max_comments_24h, max_posts_24h: policy.max_posts_24h, max_posts_7d: policy.max_posts_7d, min_write_interval_minutes: policy.min_write_interval_minutes }, autonomous_disabled_reason: policy.disabled_reason ?? null };
}

async function reply(page: Page, task: Extract<RedditTask, { command: "reddit_reply" }>): Promise<WorkerResult> {
  const { username } = await requireAuthenticated(page);
  const thread = await openThread(page, task.thread_url);
  if (thread.locked) return { ok: false, command: task.command, status: "THREAD_LOCKED", ...thread };
  if (thread.removed) return { ok: false, command: task.command, status: "THREAD_REMOVED", ...thread };
  if (!thread.comments_enabled) return { ok: false, command: task.command, status: "COMMENTS_UNAVAILABLE", ...thread };
  await authorizeWrite(task);

  const opener = await firstVisible([
    page.getByRole("button", { name: /add a comment|join the conversation/i }),
    page.getByPlaceholder(/add a comment|join the conversation/i),
    page.locator("shreddit-composer"),
  ]);
  if (!opener) return { ok: false, command: task.command, status: "COMMENT_COMPOSER_NOT_FOUND", ...thread };
  await opener.click().catch(() => undefined);
  await page.waitForTimeout(750);

  const editor = await firstVisible([
    page.locator("shreddit-composer textarea"),
    page.locator("shreddit-composer [contenteditable='true']"),
    page.getByPlaceholder(/add a comment|join the conversation/i),
    page.locator("[contenteditable='true'][role='textbox']:not([aria-label*='search' i])"),
  ]);
  if (!editor) return { ok: false, command: task.command, status: "COMMENT_EDITOR_NOT_FOUND", ...thread };
  await editor.fill(task.text);

  // The shared Reddit session has proven capable of losing authentication between the
  // initial gate and Submit. Fail closed immediately before the irreversible click.
  const preSubmitChallenge = await detectChallenge(page);
  if (preSubmitChallenge) return { ok: false, command: task.command, status: preSubmitChallenge, current_url: sanitizeRedditUrl(page.url()) };
  const preSubmitSession = await getSession(page);
  if (!preSubmitSession.authenticated || !preSubmitSession.username || preSubmitSession.username !== username) {
    return { ok: false, command: task.command, status: "LOGIN_REQUIRED_BEFORE_SUBMIT", current_url: sanitizeRedditUrl(page.url()) };
  }

  const submit = await firstVisible([
    page.getByRole("button", { name: /^comment$/i }),
    page.getByRole("button", { name: /^reply$/i }),
  ]);
  if (!submit) return { ok: false, command: task.command, status: "COMMENT_SUBMIT_NOT_FOUND", ...thread };
  await submit.click();

  await page.waitForTimeout(2_000);
  const challenge = await detectChallenge(page);
  if (challenge) return { ok: false, command: task.command, status: challenge, current_url: sanitizeRedditUrl(page.url()) };

  let exact = page.locator("shreddit-comment").filter({ hasText: task.text }).first();
  let verified = await exact.isVisible().catch(() => false);

  // Reddit can acknowledge the write before the newly-created comment is fully hydrated
  // into the page DOM. Never click Submit again. Instead, poll read-only for the already
  // submitted comment and verify a stable text prefix plus the authenticated username.
  if (!verified) {
    for (let attempt = 0; attempt < 8 && !verified; attempt += 1) {
      await page.waitForTimeout(1_000);
      const comments = page.locator("shreddit-comment");
      const count = Math.min(await comments.count().catch(() => 0), 500);
      for (let index = 0; index < count; index += 1) {
        const candidate = comments.nth(index);
        const rendered = await candidate.innerText().catch(() => "");
        if (isRedditCommentReadbackMatch(rendered, task.text, username)) {
          exact = candidate;
          verified = true;
          break;
        }
      }
    }
  }

  if (!verified) {
    return { ok: false, command: task.command, status: "AMBIGUOUS_SUBMISSION_NOT_RETRIED", current_url: sanitizeRedditUrl(page.url()) };
  }
  const permalinkHref = await exact.locator('a[href*="/comments/"]').last().getAttribute("href").catch(() => null);
  const permalink = permalinkHref ? new URL(permalinkHref, "https://www.reddit.com").toString() : page.url();
  await appendActionLog({ timestamp: new Date().toISOString(), request_id: task.request_id ?? null, command: task.command, subreddit: thread.subreddit, thread_url: task.thread_url, published_permalink: permalink, had_miloosh_link: MILOOSH_LINK_PATTERN.test(task.text), text_sha256: textSha256(task) });
  return { ok: true, command: task.command, status: "PUBLISHED", permalink, subreddit: thread.subreddit };
}

async function createPost(page: Page, task: Extract<RedditTask, { command: "reddit_create_post" }>): Promise<WorkerResult> {
  await requireAuthenticated(page);
  const sub = normalizeSubreddit(task.subreddit);
  await authorizeWrite(task);
  await page.goto(`https://www.reddit.com/r/${encodeURIComponent(sub)}/submit?type=TEXT`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const challenge = await detectChallenge(page);
  if (challenge) return { ok: false, command: task.command, status: challenge, current_url: sanitizeRedditUrl(page.url()) };

  const title = await firstVisible([page.locator("textarea[name='title']"), page.locator("input[name='title']"), page.getByRole("textbox", { name: /title/i })]);
  const body = await firstVisible([page.locator("textarea[name='body']"), page.locator("[contenteditable='true'][role='textbox']"), page.getByRole("textbox", { name: /body|text/i })]);
  if (!title || !body) return { ok: false, command: task.command, status: "POST_COMPOSER_NOT_FOUND", current_url: sanitizeRedditUrl(page.url()) };
  await title.fill(task.title);
  await body.fill(task.body);

  const pageText = (await page.locator("body").innerText()).toLowerCase();
  const flairRequired = /post flair.*required|required.*post flair|select a flair/.test(pageText);
  if (flairRequired) return { ok: false, command: task.command, status: "FLAIR_REQUIRED", required_field: "post flair", current_url: sanitizeRedditUrl(page.url()) };

  const submit = await firstVisible([page.getByRole("button", { name: /^post$/i })]);
  if (!submit || await submit.isDisabled()) return { ok: false, command: task.command, status: "MANDATORY_FIELD_OR_RESTRICTION", current_url: sanitizeRedditUrl(page.url()) };
  await Promise.all([page.waitForURL(/\/comments\//, { timeout: 30_000 }).catch(() => undefined), submit.click()]);
  const postChallenge = await detectChallenge(page);
  if (postChallenge) return { ok: false, command: task.command, status: postChallenge, current_url: sanitizeRedditUrl(page.url()) };
  if (!/\/comments\//.test(page.url())) return { ok: false, command: task.command, status: "AMBIGUOUS_SUBMISSION_NOT_RETRIED", current_url: sanitizeRedditUrl(page.url()) };

  const permalink = sanitizeRedditUrl(page.url());
  await appendActionLog({ timestamp: new Date().toISOString(), request_id: task.request_id ?? null, command: task.command, subreddit: sub, thread_url: null, published_permalink: permalink, had_miloosh_link: MILOOSH_LINK_PATTERN.test(`${task.title}\n${task.body}`), text_sha256: textSha256(task) });
  return { ok: true, command: task.command, status: "PUBLISHED", permalink, subreddit: sub };
}

async function notifications(page: Page): Promise<WorkerResult> {
  await requireAuthenticated(page);
  await page.goto("https://www.reddit.com/notifications", { waitUntil: "domcontentloaded", timeout: 45_000 });
  const challenge = await detectChallenge(page);
  if (challenge) return { ok: false, command: "reddit_notifications", status: challenge, current_url: sanitizeRedditUrl(page.url()) };

  const entries = page.locator("main shreddit-notification, main article, main li");
  const count = Math.min(await entries.count(), 100);
  const items: Array<{ text: string; url: string | null }> = [];
  for (let index = 0; index < count; index += 1) {
    const entry = entries.nth(index);
    const text = (await entry.innerText().catch(() => "")).trim();
    if (!text) continue;
    const href = await entry.locator('a[href*="/comments/"]').first().getAttribute("href").catch(() => null);
    if (/miloosh/i.test(text) || href) items.push({ text, url: href ? new URL(href, "https://www.reddit.com").toString() : null });
  }
  return { ok: true, command: "reddit_notifications", status: "READ_ONLY_COMPLETE", current_url: sanitizeRedditUrl(page.url()), notifications: items };
}

async function executeTask(context: BrowserContext, task: RedditTask): Promise<WorkerResult> {
  const page = context.pages()[0] ?? await context.newPage();
  if (task.command === "reddit_status") return status(page, task.wait_for_login_seconds ?? 0);
  if (task.command === "reddit_open") return { ok: true, command: task.command, status: "OPENED", ...await openThread(page, task.thread_url) };
  if (task.command === "reddit_reply") return reply(page, task);
  if (task.command === "reddit_create_post") return createPost(page, task);
  return notifications(page);
}

async function loadTask(): Promise<RedditTask> {
  const taskIndex = process.argv.indexOf("--task");
  if (taskIndex >= 0 && process.argv[taskIndex + 1]) return parseRedditTask(JSON.parse(await readFile(resolve(process.argv[taskIndex + 1]!), "utf8")));
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return parseRedditTask(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}

async function acquireLock(): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true, mode: 0o700 });
  try {
    await mkdir(LOCK_DIR);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : null;
    if (code !== "EEXIST") throw error;
    const pidFile = await readFile(join(LOCK_DIR, "pid"), "utf8").catch(() => null);
    const storedPid = pidFile === null ? NaN : Number(pidFile.trim());
    // An unparseable or missing pid means we cannot verify who owns this lock --
    // never seize or delete it on a guess, only on confirmed evidence the owner is dead.
    if (!Number.isInteger(storedPid) || storedPid <= 0) throw new Error("REDDIT_LOCK_UNVERIFIED");
    let active = false;
    try {
      process.kill(storedPid, 0);
      active = true;
    } catch {
      active = false;
    }
    if (active) throw new Error("REDDIT_WORKER_BUSY");
    await rm(LOCK_DIR, { recursive: true, force: true });
    await mkdir(LOCK_DIR);
  }
  await writeFile(join(LOCK_DIR, "pid"), `${process.pid}\n`, { encoding: "utf8", mode: 0o600 });
}

const CLI_FLAGS_WITH_VALUE = ["--task", "--set-autonomous", "--approve-task", "--check-approval"] as const;

/** Rejects malformed or combined CLI invocations before any lock/stdin is touched. */
function validCliArgs(argv: string[]): boolean {
  const consumed = new Set<number>();
  const modesPresent: string[] = [];
  for (const flag of CLI_FLAGS_WITH_VALUE) {
    const index = argv.indexOf(flag);
    if (index === -1) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("-")) return false;
    modesPresent.push(flag);
    consumed.add(index);
    consumed.add(index + 1);
  }
  if (modesPresent.length > 1) return false;
  return argv.every((_, index) => consumed.has(index));
}

async function cdpIsReady(): Promise<boolean> {
  return fetch(`${CDP_ENDPOINT}/json/version`, { signal: AbortSignal.timeout(1_000) })
    .then((response) => response.ok)
    .catch(() => false);
}

async function connectPersistentChrome(): Promise<BrowserContext> {
  if (!(await cdpIsReady())) {
    const chrome = process.env.MILOOSH_REDDIT_CHROME ?? DEFAULT_CHROME;
    const child = spawn(chrome, [
      `--user-data-dir=${PROFILE_DIR}`,
      `--remote-debugging-port=${CDP_PORT}`,
      "--remote-debugging-address=127.0.0.1",
      "--no-first-run",
      "--no-default-browser-check",
      "https://www.reddit.com/",
    ], { detached: true, stdio: "ignore" });
    child.unref();

    const deadline = Date.now() + 15_000;
    while (!(await cdpIsReady()) && Date.now() < deadline) await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    if (!(await cdpIsReady())) throw new Error("CHROME_CDP_START_FAILED");
  }

  const browser = await chromium.connectOverCDP(CDP_ENDPOINT);
  const context = browser.contexts()[0];
  if (!context) throw new Error("CHROME_PROFILE_CONTEXT_MISSING");
  return context;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${JSON.stringify({ ok: true, status: "HELP", usage: "reddit_status | reddit_open | reddit_reply | reddit_create_post | reddit_notifications via stdin JSON, or --task <path>, --set-autonomous <true|false>, --approve-task <path>, --check-approval <path>" }, null, 2)}\n`);
    return;
  }
  if (!validCliArgs(args)) {
    process.stdout.write(`${JSON.stringify({ ok: false, status: "INVALID_CLI_ARGUMENTS", reason: "INVALID_CLI_ARGUMENTS", retryable: false, human_action_required: false }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  let lockAcquired = false;
  try {
    await acquireLock();
    lockAcquired = true;
    const autonomousIndex = process.argv.indexOf("--set-autonomous");
    if (autonomousIndex >= 0 && process.argv[autonomousIndex + 1]) {
      const enabled = process.argv[autonomousIndex + 1] === "true";
      if (!enabled && process.argv[autonomousIndex + 1] !== "false") throw new Error("INVALID_AUTONOMOUS_VALUE");
      await writePolicy({ ...await readPolicy(), autonomous_write_enabled: enabled, disabled_reason: undefined, disabled_at: undefined });
      process.stdout.write(`${JSON.stringify({ ok: true, status: enabled ? "AUTONOMOUS_WRITES_ENABLED" : "AUTONOMOUS_WRITES_DISABLED", autonomous_write_enabled: enabled }, null, 2)}\n`);
      return;
    }
    const approvalIndex = process.argv.indexOf("--approve-task");
    if (approvalIndex >= 0 && process.argv[approvalIndex + 1]) {
      await approveTask(process.argv[approvalIndex + 1]!);
      return;
    }
    const approvalCheckIndex = process.argv.indexOf("--check-approval");
    if (approvalCheckIndex >= 0 && process.argv[approvalCheckIndex + 1]) {
      const task = parseRedditTask(JSON.parse(await readFile(resolve(process.argv[approvalCheckIndex + 1]!), "utf8")));
      const approved = await hasValidApproval(task) || evaluateAutonomousWrite(task, await readPolicy(), await readActions()).allowed;
      process.stdout.write(`${JSON.stringify({ ok: approved, status: approved ? "EXECUTION_ALLOWED" : "WRITE_APPROVAL_REQUIRED", approval_id: isWriteTask(task) ? approvalId(task) : null }, null, 2)}\n`);
      if (!approved) process.exitCode = 3;
      return;
    }
    const task = await loadTask();
    await mkdir(PROFILE_DIR, { recursive: true, mode: 0o700 });
    const context = await connectPersistentChrome();
    let result = await executeTask(context, task);
    if (!result.ok) {
      if (isSafetyShutdownStatus(result.status)) await disableAutonomousWrites(result.status);
      result = { ...result, reason: result.reason ?? result.status, retryable: false, human_action_required: requiresHumanAction(result.status) };
    }
    process.stdout.write(`${JSON.stringify({ request_id: task.request_id ?? null, ...result }, null, 2)}\n`);
    if (!result.ok) process.exitCode = 2;
  } catch (error) {
    const message = error instanceof z.ZodError ? "INVALID_TASK" : error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (isSafetyShutdownStatus(message)) await disableAutonomousWrites(message);
    process.stdout.write(`${JSON.stringify({ ok: false, status: message, reason: message, retryable: false, human_action_required: requiresHumanAction(message) }, null, 2)}\n`);
    process.exitCode = 1;
  } finally {
    if (lockAcquired) await rm(LOCK_DIR, { recursive: true, force: true }).catch(() => undefined);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  void main().then(() => process.exit(process.exitCode ?? 0));
}
