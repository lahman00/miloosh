import { describe, expect, it } from "vitest";
import type { FetchLike, FetchResponseLike } from "@/lib/growth-agents/live-check-source";
import { main, parseArgs, runPageCheck, type PageCheckDeps } from "../../scripts/growth/page-live-check";
import { U } from "./fixtures";

const ROOT = "/repo";
const page = (canonical: string, extra = "") => `<html><head><link rel="canonical" href="${canonical}"></head><body><h1>x</h1>${extra}</body></html>`;
const ok = (body: string): FetchResponseLike => ({ status: 200, headers: { get: (n) => (n.toLowerCase() === "content-type" ? "text/html" : null) }, text: async () => body });

function deps(routes: Record<string, FetchResponseLike | Error>, overrides: Partial<PageCheckDeps> = {}) {
  const writes: Array<[string, string]> = [];
  const logs: string[] = [];
  const requested: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    requested.push(url);
    const r = routes[url];
    if (!r) throw new Error("no route");
    if (r instanceof Error) throw r;
    return r;
  };
  const d: PageCheckDeps = {
    fetchImpl,
    partners: () => [{ slug: "monday", name: "Monday.com" }],
    writeText: (f, c) => void writes.push([f, c]),
    sleep: async () => {},
    log: (l) => void logs.push(l),
    ...overrides,
  };
  return { d, writes, logs, requested };
}

describe("parseArgs", () => {
  it("accepts a comma list and a file, removes duplicates and resolves --out against the repository root", () => {
    const parsed = parseArgs(["--urls", `${U("/software/a")},${U("/software/b")}`, "--urls-file", "urls.txt", "--out", "docs/extras.json", "--now", "2026-10-09T00:00:00Z", "--delay-ms", "0"], ROOT, () => `# comment\n${U("/software/b")}\n\n${U("/software/c")}\n`);
    if ("help" in parsed) throw new Error("unexpected help");
    expect(parsed.urls).toEqual([U("/software/a"), U("/software/b"), U("/software/c")]);
    expect(parsed).toMatchObject({ out: "/repo/docs/extras.json", delayMs: 0 });
    expect(parsed.now.toISOString()).toBe("2026-10-09T00:00:00.000Z");
  });

  it("rejects a missing list, too many URLs, a URL that is not a Miloosh page, unknown options and bad numbers", () => {
    expect(() => parseArgs([], ROOT)).toThrow(/No URL given/);
    expect(() => parseArgs(["--urls", Array.from({ length: 26 }, (_, i) => U(`/software/p${i}`)).join(",")], ROOT)).toThrow(/At most 25/);
    expect(() => parseArgs(["--urls", "https://example.com/x"], ROOT)).toThrow(/Only miloosh.com page URLs/);
    expect(() => parseArgs(["--urls", "https://partner.example/r/abc"], ROOT)).toThrow(/Only miloosh.com page URLs/);
    expect(() => parseArgs(["--urls", U("/software/a"), "--post", "x"], ROOT)).toThrow(/Unknown option --post/);
    expect(() => parseArgs(["--urls", U("/software/a"), "--now", "later"], ROOT)).toThrow(/--now must be an ISO timestamp/);
    expect(() => parseArgs(["--urls", U("/software/a"), "--delay-ms", "-5"], ROOT)).toThrow(/--delay-ms/);
    expect(() => parseArgs(["stray"], ROOT)).toThrow(/Unexpected argument/);
  });

  it("returns help without requiring a URL", () => {
    expect(parseArgs(["--help"], ROOT)).toEqual({ help: true });
  });
});

describe("runPageCheck", () => {
  const url = U("/software/clickup");

  it("reports each page's status, canonical, robots and rendered partner calls to action", async () => {
    const { d } = deps({ [url]: ok(page(url, `<a rel="sponsored" href="https://p.example/x">Visit Monday.com</a>`)) });
    const result = await runPageCheck({ urls: [url], out: null, now: new Date("2026-10-09T00:00:00Z"), delayMs: 0 }, d);
    expect(result.exitCode).toBe(0);
    expect(result.extras[0]).toMatchObject({ url, live: { state: "MEASURED", value: { status: 200, indexable: true } }, rendered: { state: "MEASURED", value: { partnerSlugs: ["monday"] } } });
    expect(JSON.parse(result.json)).toHaveLength(1);
    expect(result.json).not.toMatch(/p\.example/);
  });

  it("writes only when --out was given, and only that file", async () => {
    const quiet = deps({ [url]: ok(page(url)) });
    await runPageCheck({ urls: [url], out: null, now: new Date(), delayMs: 0 }, quiet.d);
    expect(quiet.writes).toEqual([]);
    const loud = deps({ [url]: ok(page(url)) });
    await runPageCheck({ urls: [url], out: "/repo/extras.json", now: new Date(), delayMs: 0 }, loud.d);
    expect(loud.writes.map(([f]) => f)).toEqual(["/repo/extras.json"]);
  });

  it("marks a page it could not read UNAVAILABLE, keeps going and exits 1", async () => {
    const { d } = deps({ [url]: new Error("ETIMEDOUT"), [U("/software/asana")]: ok(page(U("/software/asana"))) });
    const result = await runPageCheck({ urls: [url, U("/software/asana")], out: null, now: new Date(), delayMs: 0 }, d);
    expect(result.exitCode).toBe(1);
    expect(result.extras[0]!.live.state).toBe("UNAVAILABLE");
    expect(result.extras[1]!.live.state).toBe("MEASURED");
  });

  it("pauses between requests but not before the first", async () => {
    const pauses: number[] = [];
    const { d } = deps({ [url]: ok(page(url)), [U("/software/asana")]: ok(page(U("/software/asana"))) }, { sleep: async (ms) => void pauses.push(ms) });
    await runPageCheck({ urls: [url, U("/software/asana")], out: null, now: new Date(), delayMs: 750 }, d);
    expect(pauses).toEqual([750]);
  });

  it("requests only the pages it was asked for", async () => {
    const { d, requested } = deps({ [url]: ok(page(url, `<a rel="sponsored" href="https://p.example/x">Visit Monday.com</a>`)) });
    await runPageCheck({ urls: [url], out: null, now: new Date(), delayMs: 0 }, d);
    expect(requested).toEqual([url]);
  });
});

describe("main", () => {
  it("exits 2 on bad arguments and 0 for --help, without any request", async () => {
    const { d, requested } = deps({});
    expect(await main(["--urls", "https://example.com/x"], ROOT, d)).toBe(2);
    expect(await main(["--help"], ROOT, d)).toBe(0);
    expect(requested).toEqual([]);
  });
});
