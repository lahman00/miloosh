// Shared, low-risk infrastructure for local authenticated browser workers
// (CDP connection/launch, a single-instance lock, and private JSON/JSONL
// state files). This module carries no per-service business logic — no
// task schemas, no rate-limit policy, no credential handling — so it is
// safe to share between workers without coupling their behavior.
//
// Deliberately NOT wired into scripts/reddit/worker.ts: that worker is
// already operational and this file was added for the new Facebook worker.
// Retrofitting Reddit to use it is a separate, independent decision left
// for a future change so this addition carries zero risk to Reddit.
import { chromium, type BrowserContext, type Locator, type Page } from "playwright-core";
import { appendFile, chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";

export type ConnectChromeOptions = {
  profileDir: string;
  cdpPort: number;
  chromeExecutablePath: string;
  startUrl: string;
};

export async function cdpIsReady(endpoint: string): Promise<boolean> {
  return fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(1_000) })
    .then((response) => response.ok)
    .catch(() => false);
}

/**
 * Launches (or attaches to) a persistent, dedicated Chrome profile over a
 * loopback-only CDP port, then hands back the first browser context.
 * Mirrors scripts/reddit/worker.ts's connectPersistentChrome exactly, just
 * parameterized so each worker can use its own profile dir and port.
 */
export async function connectPersistentChrome(options: ConnectChromeOptions): Promise<BrowserContext> {
  const endpoint = `http://127.0.0.1:${options.cdpPort}`;
  if (!(await cdpIsReady(endpoint))) {
    const child = spawn(options.chromeExecutablePath, [
      `--user-data-dir=${options.profileDir}`,
      `--remote-debugging-port=${options.cdpPort}`,
      "--remote-debugging-address=127.0.0.1",
      "--no-first-run",
      "--no-default-browser-check",
      options.startUrl,
    ], { detached: true, stdio: "ignore" });
    child.unref();

    const deadline = Date.now() + 15_000;
    while (!(await cdpIsReady(endpoint)) && Date.now() < deadline) await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    if (!(await cdpIsReady(endpoint))) throw new Error("CHROME_CDP_START_FAILED");
  }

  const browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  if (!context) throw new Error("CHROME_PROFILE_CONTEXT_MISSING");
  return context;
}

/** Single-instance advisory lock using a directory + pid file, stale-lock aware. */
export async function acquireLock(lockDir: string, stateDir: string, busyErrorMessage = "WORKER_BUSY"): Promise<void> {
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  try {
    await mkdir(lockDir);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : null;
    if (code !== "EEXIST") throw error;
    const storedPid = Number((await readFile(join(lockDir, "pid"), "utf8").catch(() => "0")).trim());
    let active = false;
    if (storedPid > 0) {
      try {
        process.kill(storedPid, 0);
        active = true;
      } catch {
        active = false;
      }
    }
    if (active) throw new Error(busyErrorMessage);
    await rm(lockDir, { recursive: true, force: true });
    await mkdir(lockDir);
  }
  await writeFile(join(lockDir, "pid"), `${process.pid}\n`, { encoding: "utf8", mode: 0o600 });
}

export async function releaseLock(lockDir: string): Promise<void> {
  await rm(lockDir, { recursive: true, force: true }).catch(() => undefined);
}

export async function readJsonWithDefaults<T extends Record<string, unknown>>(path: string, defaults: T): Promise<T> {
  return readFile(path, "utf8").then((value) => ({ ...defaults, ...JSON.parse(value) }) as T).catch(() => ({ ...defaults }));
}

export async function writeJsonPrivate(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(path, 0o600);
}

export async function appendJsonLogLine(path: string, entry: Record<string, unknown>): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await appendFile(path, `${JSON.stringify(entry)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(path, 0o600);
}

export async function readJsonLogLines<T>(path: string): Promise<T[]> {
  return readFile(path, "utf8")
    .then((value) => value.split("\n").filter(Boolean).map((line) => JSON.parse(line) as T))
    .catch(() => []);
}

/** Returns the first visible locator among candidates, scanning at most 20 matches per candidate. */
export async function firstVisible(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    const count = Math.min(await locator.count().catch(() => 0), 20);
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) return candidate;
    }
  }
  return null;
}

export async function textOf(locators: Locator[]): Promise<string | null> {
  const locator = await firstVisible(locators);
  const text = locator ? await locator.innerText().catch(() => "") : "";
  return text.trim() || null;
}

export async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText().catch(() => "");
}
