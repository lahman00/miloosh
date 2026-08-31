import { createServer } from "node:http";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseRedditTask, type RedditTask } from "./worker";

export const MAX_TASK_BODY_BYTES = 32 * 1024;
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.modify";
export const TASK_SUBJECT_PREFIX = "MILOOSH_REDDIT_TASK";
export const RESULT_SUBJECT_PREFIX = "MILOOSH_REDDIT_RESULT";
export const ERROR_SUBJECT_PREFIX = "MILOOSH_REDDIT_ERROR";
export const PROCESSED_LABEL = "Miloosh/Reddit/Processed";
export const REJECTED_LABEL = "Miloosh/Reddit/Rejected";

const EXPECTED_EMAIL = process.env.MILOOSH_GMAIL_ACCOUNT ?? "lahman00@gmail.com";
const STATE_DIR = process.env.MILOOSH_GMAIL_REDDIT_STATE_DIR ?? join(homedir(), ".local", "share", "miloosh-gmail-reddit-transport");
const LEDGER_PATH = join(STATE_DIR, "ledger.json");
const OAUTH_CLIENT_PATH = process.env.MILOOSH_GMAIL_OAUTH_CLIENT ?? join(homedir(), ".config", "importfix", "gmail-oauth-client.json");
const KEYCHAIN_SERVICE = "com.miloosh.gmail-reddit.oauth";
const KEYCHAIN_ACCOUNT = "refresh-token";
const BRIDGE_ROOT = process.env.MILOOSH_BRIDGE_ROOT ?? join(homedir(), "Library", "CloudStorage", "GoogleDrive-lahman00@gmail.com", "My Drive", "ImportFix-Claude-Bridge");
const TASK_DIR = join(STATE_DIR, "tasks");
const RESULT_DIR = join(STATE_DIR, "results");
const WORKER_TIMEOUT_MS = Number(process.env.MILOOSH_REDDIT_WORKER_TIMEOUT_MS ?? "120000");
const GMAIL_TIMEOUT_MS = Number(process.env.MILOOSH_GMAIL_TIMEOUT_MS ?? "15000");

type OAuthClient = {
  client_id: string;
  client_secret: string;
  auth_uri: string;
  token_uri: string;
};

type GmailMessage = {
  id: string;
  labelIds?: string[];
  payload?: MimePart;
};

type MimePart = {
  mimeType?: string;
  headers?: Array<{ name?: string; value?: string }>;
  body?: { data?: string; size?: number };
  parts?: MimePart[];
};

export type TaskState = "RECEIVED" | "ACCEPTED" | "EXECUTING" | "RESULT_READY" | "RESULT_SENT" | "FAILED";
export type TransportTaskEntry = {
  message_id: string;
  sender: string;
  command: RedditTask["command"];
  state: TaskState;
  accepted_at: string;
  updated_at: string;
  task_path: string;
  result_path: string;
  result_sent_at?: string;
  terminal_message_id?: string;
  error?: string;
};
export type TransportLedger = {
  version: 2;
  messages: Record<string, { task_id: string | null; disposition: "accepted" | "rejected"; processed_at: string }>;
  tasks: Record<string, TransportTaskEntry>;
};
type LegacyLedger = { version?: 1; messages?: TransportLedger["messages"]; tasks?: Record<string, { message_id: string; sender: string; accepted_at: string; result_sent_at?: string }> };

export type ParsedIncomingTask = {
  taskId: string;
  task: RedditTask;
};

function emptyLedger(): TransportLedger {
  return { version: 2, messages: {}, tasks: {} };
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function header(part: MimePart | undefined, name: string): string {
  return part?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function mailboxAddresses(value: string): string[] {
  return [...value.matchAll(/<?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/gi)].map((match) => match[1]!.toLowerCase());
}

function plainTextBody(part: MimePart | undefined): string | null {
  if (!part) return null;
  if (part.mimeType?.toLowerCase() === "text/plain" && part.body?.data) return base64UrlDecode(part.body.data);
  for (const child of part.parts ?? []) {
    const found = plainTextBody(child);
    if (found !== null) return found;
  }
  return null;
}

export function taskIdFromSubject(subject: string): string | null {
  const match = subject.match(/^MILOOSH_REDDIT_TASK ([A-Za-z0-9][A-Za-z0-9._-]{0,79})$/);
  return match?.[1] ?? null;
}

export function parseIncomingTask(input: {
  subject: string;
  body: string;
  to: string;
  from: string;
  authenticatedEmail: string;
  seenTaskIds?: ReadonlySet<string>;
}): ParsedIncomingTask {
  const taskId = taskIdFromSubject(input.subject);
  if (!taskId) throw new Error("INVALID_SUBJECT");
  if (Buffer.byteLength(input.body, "utf8") > MAX_TASK_BODY_BYTES) throw new Error("TASK_BODY_TOO_LARGE");
  const authenticatedEmail = input.authenticatedEmail.toLowerCase();
  if (!mailboxAddresses(input.to).includes(authenticatedEmail)) throw new Error("WRONG_RECIPIENT");
  if (!mailboxAddresses(input.from).includes(authenticatedEmail)) throw new Error("UNTRUSTED_SENDER");
  if (input.seenTaskIds?.has(taskId)) throw new Error("DUPLICATE_TASK_ID");

  let raw: unknown;
  try {
    raw = JSON.parse(input.body.trim());
  } catch {
    throw new Error("MALFORMED_JSON");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("INVALID_TASK");
  const candidate = { ...(raw as Record<string, unknown>) };
  if ((candidate.command === "reddit_open" || candidate.command === "reddit_reply") && typeof candidate.url === "string" && candidate.thread_url === undefined) {
    candidate.thread_url = candidate.url;
    delete candidate.url;
  }
  if (candidate.request_id !== undefined && candidate.request_id !== taskId) throw new Error("REQUEST_ID_MISMATCH");
  candidate.request_id = taskId;
  try {
    return { taskId, task: parseRedditTask(candidate) };
  } catch {
    throw new Error("INVALID_OR_UNSUPPORTED_TASK");
  }
}

export function buildResultEmail(taskId: string, resultBody: string, recipient: string): { subject: string; body: string; raw: string; ok: boolean } {
  let result: { ok?: unknown; status?: unknown };
  try {
    result = JSON.parse(resultBody) as { ok?: unknown; status?: unknown };
  } catch {
    result = { ok: false, status: "INVALID_WORKER_RESULT" };
    resultBody = `${JSON.stringify(result, null, 2)}\n`;
  }
  const ok = result.ok === true;
  const subject = `${ok ? RESULT_SUBJECT_PREFIX : ERROR_SUBJECT_PREFIX} ${taskId}`;
  const rawMessage = [
    `To: ${recipient}`,
    `From: ${EXPECTED_EMAIL}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    resultBody,
  ].join("\r\n");
  return { subject, body: resultBody, raw: base64UrlEncode(rawMessage), ok };
}

export function isReplay(ledger: TransportLedger, messageId: string, taskId: string): boolean {
  return Boolean(ledger.messages[messageId] || ledger.tasks[taskId]);
}

async function readLedger(): Promise<TransportLedger> {
  const raw = await readFile(LEDGER_PATH, "utf8").then((value) => JSON.parse(value) as TransportLedger | LegacyLedger).catch(() => emptyLedger());
  if (raw.version === 2) return raw as TransportLedger;
  const migrated = emptyLedger();
  migrated.messages = raw.messages ?? {};
  for (const [taskId, entry] of Object.entries(raw.tasks ?? {})) {
    const taskPath = join(TASK_DIR, `miloosh_task_reddit_${taskId}.json`);
    const legacyPath = join(BRIDGE_ROOT, "inbox", `miloosh_task_reddit_${taskId}.json`);
    const resultPath = join(RESULT_DIR, `result_miloosh_task_reddit_${taskId}.json`);
    migrated.tasks[taskId] = { message_id: entry.message_id, sender: entry.sender, command: "reddit_status", state: entry.result_sent_at ? "RESULT_SENT" : "ACCEPTED", accepted_at: entry.accepted_at, updated_at: entry.accepted_at, task_path: await stat(taskPath).then(() => taskPath).catch(() => legacyPath), result_path: resultPath, result_sent_at: entry.result_sent_at };
  }
  await writeLedger(migrated);
  return migrated;
}

async function writeLedger(ledger: TransportLedger): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true, mode: 0o700 });
  const temporary = `${LEDGER_PATH}.tmp`;
  await writeFile(temporary, `${JSON.stringify(ledger, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, LEDGER_PATH);
}

async function loadOAuthClient(): Promise<OAuthClient> {
  const raw = JSON.parse(await readFile(OAUTH_CLIENT_PATH, "utf8")) as { installed?: OAuthClient; web?: OAuthClient };
  const client = raw.installed ?? raw.web;
  if (!client?.client_id || !client.client_secret || !client.auth_uri || !client.token_uri) throw new Error("OAUTH_CLIENT_INVALID");
  return client;
}

function keychainRefreshToken(): string {
  try {
    return execFileSync("/usr/bin/security", ["find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    throw new Error("GMAIL_OAUTH_REQUIRED");
  }
}

function saveRefreshToken(refreshToken: string): void {
  execFileSync("/usr/bin/security", ["add-generic-password", "-U", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w", refreshToken], { stdio: ["ignore", "ignore", "ignore"] });
}

async function accessToken(): Promise<string> {
  const client = await loadOAuthClient();
  const response = await fetch(client.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: client.client_id, client_secret: client.client_secret, refresh_token: keychainRefreshToken(), grant_type: "refresh_token" }),
  });
  const payload = await response.json() as { access_token?: string; scope?: string; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(`OAUTH_REFRESH_FAILED_${response.status}`);
  const scopes = new Set((payload.scope ?? "").split(/\s+/).filter(Boolean));
  if (scopes.size > 0 && !scopes.has(GMAIL_SCOPE)) throw new Error("GMAIL_SCOPE_MISSING");
  return payload.access_token;
}

async function gmail<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(GMAIL_TIMEOUT_MS),
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`GMAIL_API_${response.status}`);
  return response.status === 204 ? undefined as T : await response.json() as T;
}

async function profile(token: string): Promise<string> {
  const value = await gmail<{ emailAddress: string }>(token, "/profile");
  if (value.emailAddress.toLowerCase() !== EXPECTED_EMAIL.toLowerCase()) throw new Error("GMAIL_ACCOUNT_MISMATCH");
  return value.emailAddress;
}

async function labelIds(token: string): Promise<{ processed: string; rejected: string }> {
  const listed = await gmail<{ labels?: Array<{ id: string; name: string }> }>(token, "/labels");
  const labels = listed.labels ?? [];
  const ensure = async (name: string) => {
    const existing = labels.find((label) => label.name === name);
    if (existing) return existing.id;
    return (await gmail<{ id: string }>(token, "/labels", { method: "POST", body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show" }) })).id;
  };
  return { processed: await ensure(PROCESSED_LABEL), rejected: await ensure(REJECTED_LABEL) };
}

async function modifyMessage(token: string, messageId: string, addLabelIds: string[]): Promise<void> {
  await gmail(token, `/messages/${encodeURIComponent(messageId)}/modify`, { method: "POST", body: JSON.stringify({ addLabelIds, removeLabelIds: ["UNREAD"] }) });
}

async function sendRaw(token: string, raw: string): Promise<string> {
  return (await gmail<{ id: string }>(token, "/messages/send", { method: "POST", body: JSON.stringify({ raw }), signal: AbortSignal.timeout(GMAIL_TIMEOUT_MS) })).id;
}

async function rejectionEmail(token: string, taskId: string, reason: string, recipient: string): Promise<void> {
  const body = `${JSON.stringify({ request_id: taskId, command: null, ok: false, status: "REJECTED", reason, error: reason, retryable: false, human_action_required: false }, null, 2)}\n`;
  await sendRaw(token, buildResultEmail(taskId, body, recipient).raw);
}

async function acceptIncoming(token: string, email: string, message: GmailMessage, ledger: TransportLedger, labels: { processed: string; rejected: string }): Promise<void> {
  const subject = header(message.payload, "Subject");
  const from = header(message.payload, "From");
  const to = header(message.payload, "To");
  const taskId = taskIdFromSubject(subject) ?? `invalid-${message.id}`;
  const sender = mailboxAddresses(from)[0] ?? email;
  try {
    if (ledger.messages[message.id]) return;
    const body = plainTextBody(message.payload);
    if (body === null) throw new Error("PLAIN_JSON_BODY_REQUIRED");
    const parsed = parseIncomingTask({ subject, body, from, to, authenticatedEmail: email, seenTaskIds: new Set(Object.keys(ledger.tasks)) });
    if (isReplay(ledger, message.id, parsed.taskId)) throw new Error("DUPLICATE_TASK_ID");

    await mkdir(TASK_DIR, { recursive: true, mode: 0o700 });
    await mkdir(RESULT_DIR, { recursive: true, mode: 0o700 });
    const target = join(TASK_DIR, `miloosh_task_reddit_${parsed.taskId}.json`);
    const existing = await stat(target).then(() => true).catch(() => false);
    if (existing) throw new Error("DUPLICATE_TASK_ID");
    const temporary = `${target}.tmp`;
    await writeFile(temporary, `${JSON.stringify(parsed.task, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, target);

    const now = new Date().toISOString();
    ledger.tasks[parsed.taskId] = { message_id: message.id, sender, command: parsed.task.command, state: "RECEIVED", accepted_at: now, updated_at: now, task_path: target, result_path: join(RESULT_DIR, `result_miloosh_task_reddit_${parsed.taskId}.json`) };
    await writeLedger(ledger);
    ledger.messages[message.id] = { task_id: parsed.taskId, disposition: "accepted", processed_at: now };
    ledger.tasks[parsed.taskId]!.state = "ACCEPTED";
    await writeLedger(ledger);
    await modifyMessage(token, message.id, [labels.processed]);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "UNKNOWN_REJECTION";
    ledger.messages[message.id] = { task_id: taskId, disposition: "rejected", processed_at: new Date().toISOString() };
    await writeLedger(ledger);
    await modifyMessage(token, message.id, [labels.rejected]);
    await rejectionEmail(token, taskId, reason, sender);
  }
}

export function structuredFailure(taskId: string, command: string | null, status: string, retryable = false, humanActionRequired = false): string {
  return `${JSON.stringify({ request_id: taskId, command, ok: false, status, reason: status, error: status, retryable, human_action_required: humanActionRequired }, null, 2)}\n`;
}

function normalizeWorkerResult(taskId: string, command: RedditTask["command"], value: string): string {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return `${JSON.stringify({ request_id: taskId, command, retryable: false, human_action_required: false, ...parsed }, null, 2)}\n`;
  } catch {
    return structuredFailure(taskId, command, "WORKER_INVALID_OUTPUT");
  }
}

async function writeResult(entry: TransportTaskEntry, body: string): Promise<void> {
  await mkdir(dirname(entry.result_path), { recursive: true, mode: 0o700 });
  const temporary = `${entry.result_path}.tmp`;
  await writeFile(temporary, body, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, entry.result_path);
}

async function runWorker(taskPath: string): Promise<{ output: string; timedOut: boolean }> {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [resolve("node_modules/tsx/dist/cli.mjs"), resolve("scripts/reddit/worker.ts"), "--task", taskPath], { cwd: resolve("."), stdio: ["ignore", "pipe", "ignore"] });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, WORKER_TIMEOUT_MS);
    child.on("close", () => { clearTimeout(timer); resolveRun({ output: Buffer.concat(chunks).toString("utf8"), timedOut }); });
    child.on("error", () => { clearTimeout(timer); resolveRun({ output: "", timedOut: false }); });
  });
}

export function reconcileRestart(entry: TransportTaskEntry): { action: "execute" | "send" | "fail" | "none"; status?: string } {
  if (entry.state === "RECEIVED" || entry.state === "ACCEPTED") return { action: "execute" };
  if (entry.state === "RESULT_READY" || (entry.state === "FAILED" && !entry.result_sent_at)) return { action: "send" };
  if (entry.state === "EXECUTING") return entry.command === "reddit_reply" || entry.command === "reddit_create_post" ? { action: "fail", status: "AMBIGUOUS_WRITE_NOT_RETRIED" } : { action: "execute" };
  return { action: "none" };
}

async function reconcileTasks(token: string, ledger: TransportLedger): Promise<void> {
  for (const [taskId, entry] of Object.entries(ledger.tasks)) {
    let action = reconcileRestart(entry);
    if (action.action === "fail") {
      await writeResult(entry, structuredFailure(taskId, entry.command, action.status!));
      entry.state = "FAILED"; entry.error = action.status; entry.updated_at = new Date().toISOString();
      await writeLedger(ledger); action = { action: "send" };
    }
    if (action.action === "execute") {
      entry.state = "EXECUTING"; entry.updated_at = new Date().toISOString(); await writeLedger(ledger);
      const run = await runWorker(entry.task_path);
      const body = run.timedOut ? structuredFailure(taskId, entry.command, "WORKER_TIMEOUT", false, true) : normalizeWorkerResult(taskId, entry.command, run.output);
      await writeResult(entry, body);
      const parsed = JSON.parse(body) as { ok?: boolean; status?: string };
      entry.state = parsed.ok === true ? "RESULT_READY" : "FAILED"; entry.error = parsed.ok ? undefined : parsed.status; entry.updated_at = new Date().toISOString(); await writeLedger(ledger);
      action = { action: "send" };
    }
    if (action.action === "send" && !entry.result_sent_at) {
      const body = await readFile(entry.result_path, "utf8").catch(() => structuredFailure(taskId, entry.command, "RESULT_FILE_MISSING"));
      try {
        entry.terminal_message_id = await sendRaw(token, buildResultEmail(taskId, body, entry.sender).raw);
        entry.result_sent_at = new Date().toISOString(); entry.updated_at = entry.result_sent_at;
        if (entry.state !== "FAILED") entry.state = "RESULT_SENT";
        await writeLedger(ledger);
      } catch (error) {
        entry.updated_at = new Date().toISOString(); entry.error = error instanceof Error ? error.message : "RESULT_SEND_FAILED"; await writeLedger(ledger);
      }
    }
  }
}

async function pollOnce(): Promise<void> {
  const token = await accessToken();
  const email = await profile(token);
  const labels = await labelIds(token);
  const ledger = await readLedger();
  const query = encodeURIComponent(`is:unread to:${email} subject:"${TASK_SUBJECT_PREFIX}" -label:"${PROCESSED_LABEL}" -label:"${REJECTED_LABEL}"`);
  const listed = await gmail<{ messages?: Array<{ id: string }> }>(token, `/messages?q=${query}&maxResults=25`);
  for (const item of listed.messages ?? []) {
    const message = await gmail<GmailMessage>(token, `/messages/${encodeURIComponent(item.id)}?format=full`);
    await acceptIncoming(token, email, message, ledger, labels);
  }
  await reconcileTasks(token, ledger);
  process.stdout.write(`${JSON.stringify({ ok: true, status: "POLL_COMPLETE", account: email, messages_checked: listed.messages?.length ?? 0 })}\n`);
}

async function authorize(): Promise<void> {
  const client = await loadOAuthClient();
  const state = randomBytes(24).toString("hex");
  let resolveCode: (value: string) => void;
  let rejectCode: (reason: Error) => void;
  const codePromise = new Promise<string>((resolvePromise, rejectPromise) => { resolveCode = resolvePromise; rejectCode = rejectPromise; });
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
      response.writeHead(400, { "content-type": "text/plain" });
      response.end("Authorization failed. You may close this window.");
      rejectCode(new Error("OAUTH_CALLBACK_INVALID"));
      return;
    }
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("Miloosh Gmail transport authorized. You may close this window.");
    resolveCode(url.searchParams.get("code")!);
  });
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("OAUTH_LISTENER_FAILED");
  const redirectUri = `http://localhost:${address.port}`;
  const authorizationUrl = new URL(client.auth_uri);
  authorizationUrl.search = new URLSearchParams({ client_id: client.client_id, redirect_uri: redirectUri, response_type: "code", scope: GMAIL_SCOPE, access_type: "offline", prompt: "consent", state }).toString();
  spawn("/usr/bin/open", [authorizationUrl.toString()], { detached: true, stdio: "ignore" }).unref();
  try {
    const code = await Promise.race([codePromise, new Promise<never>((_, rejectTimeout) => setTimeout(() => rejectTimeout(new Error("OAUTH_TIMEOUT")), 300_000))]);
    const response = await fetch(client.token_uri, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: client.client_id, client_secret: client.client_secret, code, grant_type: "authorization_code", redirect_uri: redirectUri }) });
    const payload = await response.json() as { refresh_token?: string; access_token?: string; scope?: string };
    if (!response.ok || !payload.refresh_token || !payload.access_token) throw new Error(`OAUTH_EXCHANGE_FAILED_${response.status}`);
    if (!new Set((payload.scope ?? "").split(/\s+/)).has(GMAIL_SCOPE)) throw new Error("GMAIL_SCOPE_MISSING");
    const account = await profile(payload.access_token);
    saveRefreshToken(payload.refresh_token);
    process.stdout.write(`${JSON.stringify({ ok: true, status: "AUTHORIZED", account, scopes: [GMAIL_SCOPE], token_storage: "macOS Keychain" }, null, 2)}\n`);
  } finally {
    server.close();
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "poll";
  if (command === "authorize") return authorize();
  if (command === "poll" || command === "--once") return pollOnce();
  throw new Error("UNSUPPORTED_TRANSPORT_COMMAND");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  void main()
    .then(() => process.exit(0))
    .catch((error) => {
      process.stdout.write(`${JSON.stringify({ ok: false, status: error instanceof Error ? error.message : "UNKNOWN_ERROR" })}\n`);
      process.exit(1);
    });
}
