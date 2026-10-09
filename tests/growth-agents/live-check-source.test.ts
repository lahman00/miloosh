import { describe, expect, it } from "vitest";
import { LIVE_CHECK_USER_AGENT, LiveCheckError, observeLivePage, type FetchLike, type FetchResponseLike } from "@/lib/growth-agents/live-check-source";
import { U } from "./fixtures";

const html = (head = "") => `<html><head><link rel="canonical" href="${U("/software/clickup")}">${head}</head><body><h1>x</h1></body></html>`;

function response(status: number, body: string, headers: Record<string, string> = {}): FetchResponseLike {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { status, headers: { get: (name) => lower[name.toLowerCase()] ?? null }, text: async () => body };
}

function fakeFetch(routes: Record<string, FetchResponseLike | Error>) {
  const calls: Array<{ url: string; method: string; redirect: string; headers: Record<string, string> }> = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, method: init.method, redirect: init.redirect, headers: init.headers });
    const route = routes[url];
    if (!route) throw new Error(`unexpected request to ${url}`);
    if (route instanceof Error) throw route;
    return route;
  };
  return { impl, calls };
}

describe("observeLivePage: plain GET requests to Miloosh's own pages only", () => {
  it("sends one GET with a clear user agent, no body, and no automatic redirect handling", async () => {
    const { impl, calls } = fakeFetch({ [U("/software/clickup")]: response(200, html(), { "content-type": "text/html", "x-robots-tag": "noarchive" }) });
    const obs = await observeLivePage(U("/software/clickup"), impl);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ url: U("/software/clickup"), method: "GET", redirect: "manual" });
    expect(calls[0]!.headers["user-agent"]).toBe(LIVE_CHECK_USER_AGENT);
    expect(obs).toMatchObject({ status: 200, finalUrl: U("/software/clickup"), canonical: U("/software/clickup"), xRobotsTag: "noarchive", redirectChain: [] });
  });

  it("refuses any URL that is not a Miloosh page, before any request is made", async () => {
    const { impl, calls } = fakeFetch({});
    for (const url of ["https://example.com/x", "https://flowtemplate-delta.vercel.app/software/clickup", "https://miloosh.com.evil.example/", "https://blog.miloosh.com/x", "not a url", "ftp://miloosh.com/x"]) {
      await expect(observeLivePage(url, impl), url).rejects.toBeInstanceOf(LiveCheckError);
    }
    expect(calls).toEqual([]);
  });

  it("follows a same-site redirect (www to apex) and records the chain", async () => {
    const { impl, calls } = fakeFetch({
      "https://www.miloosh.com/software/clickup": response(308, "", { location: U("/software/clickup") }),
      [U("/software/clickup")]: response(200, html(), { "content-type": "text/html" }),
    });
    const obs = await observeLivePage("https://www.miloosh.com/software/clickup", impl);
    expect(calls.map((c) => c.url)).toEqual(["https://www.miloosh.com/software/clickup", U("/software/clickup")]);
    expect(obs).toMatchObject({ status: 200, finalUrl: U("/software/clickup"), redirectChain: [U("/software/clickup")] });
  });

  it("does not follow a redirect to another host: it records the destination and stops", async () => {
    const { impl, calls } = fakeFetch({ [U("/software/clickup")]: response(301, "", { location: "https://partner.example/landing?ref=x" }) });
    const obs = await observeLivePage(U("/software/clickup"), impl);
    expect(calls).toHaveLength(1);
    expect(obs).toMatchObject({ status: 301, finalUrl: "https://partner.example/landing?ref=x" });
  });

  it("stops after too many redirects instead of looping", async () => {
    const loop: Record<string, FetchResponseLike> = {};
    for (let i = 0; i < 10; i += 1) loop[U(`/a${i}`)] = response(302, "", { location: U(`/a${i + 1}`) });
    await expect(observeLivePage(U("/a0"), fakeFetch(loop).impl)).rejects.toThrow(/redirected more than/);
  });

  it("reports a network failure as an error with the URL, never as an empty page", async () => {
    const { impl } = fakeFetch({ [U("/software/clickup")]: new Error("ECONNRESET") });
    await expect(observeLivePage(U("/software/clickup"), impl)).rejects.toThrow(/GET .*software\/clickup failed: ECONNRESET/);
  });

  it("refuses to parse an enormous body", async () => {
    const { impl } = fakeFetch({ [U("/software/clickup")]: response(200, "x".repeat(4_000_001)) });
    await expect(observeLivePage(U("/software/clickup"), impl)).rejects.toThrow(/refusing to parse/);
  });

  it("never requests a link that appears in the page", async () => {
    const body = `<html><head></head><body><a rel="sponsored" href="https://partner.example/r/abc">Visit Monday.com</a><a href="${U("/software/asana")}">Asana</a></body></html>`;
    const { impl, calls } = fakeFetch({ [U("/software/clickup")]: response(200, body, { "content-type": "text/html" }) });
    const obs = await observeLivePage(U("/software/clickup"), impl);
    expect(obs.sponsoredAnchorTexts).toEqual(["Visit Monday.com"]);
    expect(calls.map((c) => c.url)).toEqual([U("/software/clickup")]);
  });
});
