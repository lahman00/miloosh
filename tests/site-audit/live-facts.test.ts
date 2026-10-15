import { describe, expect, it } from "vitest";
import { extractLiveFacts, liveInconsistencies } from "@/lib/site-audit/live-facts";

const footer = (tools: number, date: string) => `<footer><p>v0.12.0 · ${tools} tools across 27 categories · sources last verified ${date}</p></footer>`;
const html = (dpl: string, tools = 354, date = "October 8, 2026") => `<html><body><script src="/_next/static/a.js?dpl=${dpl}"></script>${footer(tools, date)}</body></html>`;
const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name.toLowerCase()] ?? null });
const NEW = "dpl_ELzZhKvrvkCkmp9X5TSPz8AyoHUc";
const OLD = "dpl_E7ZUzKPjLg2riKfb4dUTt7afSSEP";

describe("extractLiveFacts", () => {
  it("reads the deployment id, footer line, region and cache state", () => {
    const facts = extractLiveFacts("https://miloosh.com/x", 200, html(NEW), headers({ "x-vercel-id": "fra1::iad1::abc", "x-vercel-cache": "HIT", age: "42" }));
    expect(facts).toEqual({ url: "https://miloosh.com/x", status: 200, deployments: [NEW], footerLine: "v0.12.0 · 354 tools across 27 categories · sources last verified October 8, 2026", region: "fra1", cache: "HIT", age: "42" });
  });

  it("returns nulls when the response carries no such information", () => {
    const facts = extractLiveFacts("https://miloosh.com/", 200, "<html></html>", headers({}));
    expect(facts).toMatchObject({ deployments: [], footerLine: null, region: null, cache: null, age: null });
  });
});

describe("liveInconsistencies", () => {
  const fact = (url: string, body: string) => extractLiveFacts(url, 200, body, headers({}));

  it("is empty when every page comes from one build", () => {
    expect(liveInconsistencies([fact("https://miloosh.com/a", html(NEW)), fact("https://miloosh.com/b", html(NEW))])).toEqual([]);
  });

  it("names both versions when an old build is served next to the new one", () => {
    const problems = liveInconsistencies([fact("https://miloosh.com/software/pipedrive", html(OLD, 254, "August 28, 2026")), fact("https://miloosh.com/", html(NEW))]);
    expect(problems.join("\n")).toContain("254 tools");
    expect(problems.join("\n")).toContain(OLD);
    expect(problems.join("\n")).toContain(NEW);
  });

  it("reports a page that does not answer 200", () => {
    expect(liveInconsistencies([extractLiveFacts("https://miloosh.com/x", 503, html(NEW), headers({}))])).toEqual(["https://miloosh.com/x answered HTTP 503"]);
  });
});
