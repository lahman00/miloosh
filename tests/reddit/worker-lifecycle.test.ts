import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
let temp: string;
beforeEach(() => { temp = fs.mkdtempSync(path.join(os.tmpdir(), "miloosh-reddit-lifecycle-")); });
afterEach(() => { fs.rmSync(temp, { recursive: true, force: true }); });
function run(args: string[], holdInput = false, input = ""): Promise<{ code: number | null; timedOut: boolean; body: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/reddit/worker.ts", ...args], {
      cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, MILOOSH_REDDIT_STATE_DIR: temp, MILOOSH_REDDIT_CHROME: path.join(temp, "NO_BROWSER") },
    });
    let body = ""; let timedOut = false;
    child.stdout.on("data", (chunk) => { body += chunk.toString(); });
    child.stderr.resume();
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, 2500);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => { clearTimeout(timer); resolve({ code, timedOut, body }); });
    if (!holdInput) child.stdin.end(input);
  });
}
function seedLock(pid: string) {
  fs.mkdirSync(path.join(temp, "run.lock"));
  fs.writeFileSync(path.join(temp, "run.lock", "pid"), pid);
  fs.writeFileSync(path.join(temp, "run.lock", "sentinel"), "owned by another invocation");
}

describe("Reddit CLI lifecycle without browser or account access", () => {
  it.each(["--help", "-h"])("%s returns without consuming stdin or taking a lock", async (arg) => {
    const result = await run([arg], true);
    expect(result.timedOut).toBe(false); expect(result.code).toBe(0);
    expect(JSON.parse(result.body).status).toBe("HELP");
    expect(fs.readdirSync(temp)).toEqual([]);
  });
  it.each([["reddit_status"], ["--task"], ["--task", "x", "--set-autonomous", "true"]])("rejects unsupported arguments %j before taking a lock", async (...args) => {
    const result = await run(args, true);
    expect(result.timedOut).toBe(false); expect(result.code).toBe(1);
    expect(JSON.parse(result.body).status).toBe("INVALID_CLI_ARGUMENTS");
    expect(fs.readdirSync(temp)).toEqual([]);
  });
  it("a busy contender does not delete another live invocation's lock", async () => {
    seedLock(String(process.pid));
    const result = await run([], false, '{"command":"reddit_status"}');
    expect(JSON.parse(result.body).status).toBe("REDDIT_WORKER_BUSY");
    expect(fs.readFileSync(path.join(temp, "run.lock", "pid"), "utf8")).toBe(String(process.pid));
    expect(fs.existsSync(path.join(temp, "run.lock", "sentinel"))).toBe(true);
  });
  it("does not seize or remove a lock with an unverified owner", async () => {
    seedLock("not-a-pid"); const result = await run([], false, "{}");
    expect(JSON.parse(result.body).status).toBe("REDDIT_LOCK_UNVERIFIED");
    expect(fs.existsSync(path.join(temp, "run.lock", "sentinel"))).toBe(true);
  });
  it("releases only its own lock after invalid task data", async () => {
    const result = await run([], false, "{}");
    expect(JSON.parse(result.body).status).toBe("INVALID_TASK");
    expect(fs.existsSync(path.join(temp, "run.lock"))).toBe(false);
  });
});
