import { chromium, type BrowserContext, type Locator, type Page } from "playwright-core";
import { appendFile, chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";

const STATE_DIR = process.env.MILOOSH_REDDIT_STATE_DIR ?? join(homedir(), ".local", "share", "miloosh-reddit-worker");
const PROFILE_DIR = join(STATE_DIR, "chrome-profile");
const ACTION_LOG = join(STATE_DIR, "logs", "actions.jsonl");
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

export const taskSchema = z.discriminatedUnion("command", [
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_status"), wait_for_login_seconds: z.number().int().min(0).max(900).optional() }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_open"), thread_url: redditUrl }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_reply"), thread_url: redditUrl, text: nonBlankExactText }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_create_post"), subreddit, title: nonBlankExactText, body: nonBlankExactText }).strict(),
  z.object({ request_id: z.string().min(1).optional(), command: z.literal("reddit_notifications") }).strict(),
]);

export type RedditTask = z.infer<typeof taskSchema>;

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
    const candidate = locator.first();
    if (await candidate.isVisible().catch(() => false)) return candidate;
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
  const composerVisible = await page.locator("shreddit-composer, textarea[placeholder*='comment' i]").first().isVisible().catch(() => false);

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
  return { ok: session.authenticated, command: "reddit_status", status: session.authenticated ? "AUTHENTICATED" : "LOGIN_REQUIRED", ...session };
}

async function reply(page: Page, task: Extract<RedditTask, { command: "reddit_reply" }>): Promise<WorkerResult> {
  const session = await requireAuthenticated(page);
  const thread = await openThread(page, task.thread_url);
  if (!thread.comments_enabled) return { ok: false, command: task.command, status: "COMMENTS_UNAVAILABLE", ...thread };

  const opener = await firstVisible([
    page.getByRole("button", { name: /add a comment|join the conversation/i }),
    page.locator("shreddit-composer"),
    page.locator("textarea[placeholder*='comment' i]"),
  ]);
  if (!opener) return { ok: false, command: task.command, status: "COMMENT_COMPOSER_NOT_FOUND", ...thread };
  await opener.click().catch(() => undefined);

  const editor = await firstVisible([
    page.locator("textarea[placeholder*='comment' i]"),
    page.locator("shreddit-composer [contenteditable='true']"),
    page.locator("[contenteditable='true'][role='textbox']"),
  ]);
  if (!editor) return { ok: false, command: task.command, status: "COMMENT_EDITOR_NOT_FOUND", ...thread };
  await editor.fill(task.text);

  const submit = await firstVisible([
    page.getByRole("button", { name: /^comment$/i }),
    page.getByRole("button", { name: /^reply$/i }),
  ]);
  if (!submit) return { ok: false, command: task.command, status: "COMMENT_SUBMIT_NOT_FOUND", ...thread };
  await requireAndConsumeApproval(task);
  await submit.click();

  await page.waitForTimeout(2_000);
  const challenge = await detectChallenge(page);
  if (challenge) return { ok: false, command: task.command, status: challenge, current_url: sanitizeRedditUrl(page.url()) };
  const exact = page.locator("shreddit-comment").filter({ hasText: task.text }).first();
  if (!(await exact.isVisible().catch(() => false))) {
    return { ok: false, command: task.command, status: "AMBIGUOUS_SUBMISSION_NOT_RETRIED", current_url: sanitizeRedditUrl(page.url()) };
  }
  const permalinkHref = await exact.locator('a[href*="/comments/"]').last().getAttribute("href").catch(() => null);
  const permalink = permalinkHref ? new URL(permalinkHref, "https://www.reddit.com").toString() : page.url();
  await appendActionLog({ timestamp: new Date().toISOString(), action: task.command, subreddit: thread.subreddit, source_thread_url: task.thread_url, published_permalink: permalink, exact_text_posted: task.text, username: session.username });
  return { ok: true, command: task.command, status: "PUBLISHED", permalink, subreddit: thread.subreddit };
}

async function createPost(page: Page, task: Extract<RedditTask, { command: "reddit_create_post" }>): Promise<WorkerResult> {
  const session = await requireAuthenticated(page);
  const sub = normalizeSubreddit(task.subreddit);
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
  await requireAndConsumeApproval(task);
  await Promise.all([page.waitForURL(/\/comments\//, { timeout: 30_000 }).catch(() => undefined), submit.click()]);
  const postChallenge = await detectChallenge(page);
  if (postChallenge) return { ok: false, command: task.command, status: postChallenge, current_url: sanitizeRedditUrl(page.url()) };
  if (!/\/comments\//.test(page.url())) return { ok: false, command: task.command, status: "AMBIGUOUS_SUBMISSION_NOT_RETRIED", current_url: sanitizeRedditUrl(page.url()) };

  const permalink = sanitizeRedditUrl(page.url());
  await appendActionLog({ timestamp: new Date().toISOString(), action: task.command, subreddit: sub, source_thread_url: null, published_permalink: permalink, exact_text_posted: { title: task.title, body: task.body }, username: session.username });
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
    const storedPid = Number((await readFile(join(LOCK_DIR, "pid"), "utf8").catch(() => "0")).trim());
    let active = false;
    if (storedPid > 0) {
      try {
        process.kill(storedPid, 0);
        active = true;
      } catch {
        active = false;
      }
    }
    if (active) throw new Error("REDDIT_WORKER_BUSY");
    await rm(LOCK_DIR, { recursive: true, force: true });
    await mkdir(LOCK_DIR);
  }
  await writeFile(join(LOCK_DIR, "pid"), `${process.pid}\n`, { encoding: "utf8", mode: 0o600 });
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
  try {
    await acquireLock();
    const approvalIndex = process.argv.indexOf("--approve-task");
    if (approvalIndex >= 0 && process.argv[approvalIndex + 1]) {
      await approveTask(process.argv[approvalIndex + 1]!);
      return;
    }
    const task = await loadTask();
    await mkdir(PROFILE_DIR, { recursive: true, mode: 0o700 });
    const context = await connectPersistentChrome();
    const result = await executeTask(context, task);
    process.stdout.write(`${JSON.stringify({ request_id: task.request_id ?? null, ...result }, null, 2)}\n`);
    if (!result.ok) process.exitCode = 2;
  } catch (error) {
    const message = error instanceof z.ZodError ? "INVALID_TASK" : error instanceof Error ? error.message : "UNKNOWN_ERROR";
    process.stdout.write(`${JSON.stringify({ ok: false, status: message }, null, 2)}\n`);
    process.exitCode = 1;
  } finally {
    await rm(LOCK_DIR, { recursive: true, force: true }).catch(() => undefined);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  void main().then(() => process.exit(process.exitCode ?? 0));
}
