import { describe, expect, it } from "vitest";
import { collectExternalTargets, interleaveByHost, runPaced } from "@/lib/site-audit/external-links";
import type { Anchor, PageFacts } from "@/lib/site-audit/page-facts";

const SITE = "https://miloosh.com";
const anchor = (href: string, rel = "noopener noreferrer"): Anchor => ({ href, rel, text: "x", disclosureNearby: true });
const page = (path: string, anchors: Anchor[]): PageFacts =>
  ({ path, title: null, description: null, canonical: null, robots: null, og: {}, twitter: {}, jsonLd: { types: [], invalid: 0 }, h1Count: 1, footerLine: null, anchors, text: "" }) as PageFacts;

describe("collectExternalTargets", () => {
  it("lists each external URL once with every page that links to it, and ignores internal and non-http links", () => {
    const { checkable, excluded } = collectExternalTargets(
      [page("/b", [anchor("https://vendor.example/docs"), anchor("/internal"), anchor("mailto:a@b.c")]), page("/a", [anchor("https://vendor.example/docs"), anchor("https://miloosh.com/x"), anchor("https://other.example/")])],
      SITE,
    );
    expect(excluded).toEqual([]);
    expect(checkable).toEqual([
      { url: "https://other.example/", pages: ["/a"] },
      { url: "https://vendor.example/docs", pages: ["/a", "/b"] },
    ]);
  });

  it("never lists a sponsored link, even when another page links to the same URL without the rel", () => {
    const { checkable, excluded } = collectExternalTargets(
      [page("/a", [anchor("https://aff.example/abc", "sponsored noopener noreferrer")]), page("/b", [anchor("https://aff.example/abc")])],
      SITE,
    );
    expect(checkable).toEqual([]);
    expect(excluded).toEqual([{ url: "https://aff.example/abc", reason: "sponsored link" }]);
  });

  it("leaves alone a URL whose query string carries a referral code, but not one with ordinary parameters", () => {
    const { checkable, excluded } = collectExternalTargets([page("/a", [anchor("https://v.example/?ref=miloosh"), anchor("https://v.example/?utm_source=x&page=2"), anchor("https://v.example/p?aff=1&x=2")])], SITE);
    expect(excluded.map((e) => e.url)).toEqual(["https://v.example/?ref=miloosh", "https://v.example/p?aff=1&x=2"]);
    expect(checkable.map((t) => t.url)).toEqual(["https://v.example/?utm_source=x&page=2"]);
  });

  it("reports an unparseable URL instead of throwing", () => {
    const { excluded } = collectExternalTargets([page("/a", [anchor("http://")])], SITE);
    expect(excluded).toEqual([{ url: "http://", reason: "not a parseable URL" }]);
  });
});

describe("interleaveByHost", () => {
  it("alternates hosts so that consecutive URLs differ whenever there is a choice", () => {
    const urls = ["https://a.example/1", "https://a.example/2", "https://a.example/3", "https://b.example/1", "https://c.example/1"].map((url) => ({ url }));
    expect(interleaveByHost(urls).map((t) => t.url)).toEqual(["https://a.example/1", "https://b.example/1", "https://c.example/1", "https://a.example/2", "https://a.example/3"]);
  });

  it("keeps every URL exactly once", () => {
    const urls = Array.from({ length: 50 }, (_, i) => ({ url: `https://h${i % 7}.example/${i}` }));
    expect(interleaveByHost(urls).map((t) => t.url).sort()).toEqual(urls.map((t) => t.url).sort());
  });
});

describe("runPaced", () => {
  it("never has more requests in flight than the concurrency, and returns results in input order", async () => {
    const targets = Array.from({ length: 12 }, (_, i) => ({ url: `https://h${i}.example/`, id: i }));
    let inFlight = 0;
    let maxInFlight = 0;
    const results = await runPaced(
      targets,
      async (target) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 2));
        inFlight -= 1;
        return target.id;
      },
      { concurrency: 3, minGapPerHostMs: 0 },
    );
    expect(results).toEqual(targets.map((t) => t.id));
    expect(maxInFlight).toBe(3);
  });

  it("waits the minimum gap between two requests to the same host but not between different hosts", async () => {
    let clock = 0;
    const startedAt: Record<string, number[]> = {};
    const sleep = async (ms: number) => {
      clock += ms;
    };
    const targets = [{ url: "https://a.example/1" }, { url: "https://a.example/2" }, { url: "https://b.example/1" }];
    await runPaced(
      targets,
      async (target) => {
        (startedAt[new URL(target.url).hostname] ??= []).push(clock);
        return null;
      },
      { concurrency: 1, minGapPerHostMs: 1000 },
      { now: () => clock, sleep },
    );
    expect(startedAt["a.example"]).toEqual([0, 1000]);
    expect(startedAt["b.example"]).toEqual([1000]);
  });
});
