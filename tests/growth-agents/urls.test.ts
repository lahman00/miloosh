import { describe, expect, it } from "vitest";
import { canonicalPageUrl, classifyPage, comparisonUrl, pathOf, softwareUrl } from "@/lib/growth-agents/urls";

describe("canonicalPageUrl", () => {
  it("folds www and apex into one canonical URL and drops query, fragment and trailing slash", () => {
    const expected = "https://miloosh.com/software/airtable";
    expect(canonicalPageUrl("https://www.miloosh.com/software/airtable")).toBe(expected);
    expect(canonicalPageUrl("https://miloosh.com/software/airtable/")).toBe(expected);
    expect(canonicalPageUrl("http://miloosh.com/software/airtable?utm_source=x#top")).toBe(expected);
    expect(canonicalPageUrl("https://miloosh.com//software//airtable")).toBe(expected);
  });

  it("keeps the home page as a single slash", () => {
    expect(canonicalPageUrl("https://www.miloosh.com")).toBe("https://miloosh.com/");
    expect(canonicalPageUrl("https://miloosh.com/")).toBe("https://miloosh.com/");
  });

  it("rejects everything that is not a plain Miloosh page URL", () => {
    expect(canonicalPageUrl("https://example.com/software/airtable")).toBeNull();
    expect(canonicalPageUrl("https://miloosh.com.evil.example/software/airtable")).toBeNull();
    expect(canonicalPageUrl("https://evilmiloosh.com/software/airtable")).toBeNull();
    expect(canonicalPageUrl("https://blog.miloosh.com/software/airtable")).toBeNull();
    expect(canonicalPageUrl("https://evil.example/?u=https://miloosh.com/software/airtable")).toBeNull();
    expect(canonicalPageUrl("https://user:pw@miloosh.com/software/airtable")).toBeNull();
    expect(canonicalPageUrl("https://miloosh.com:8443/software/airtable")).toBeNull();
    expect(canonicalPageUrl("ftp://miloosh.com/software/airtable")).toBeNull();
    expect(canonicalPageUrl("not a url")).toBeNull();
  });
});

describe("classifyPage", () => {
  const routes = { guideSlugs: new Set(["best-crm-for-startups"]), legalPaths: new Set(["/privacy"]) };

  it("recognises each page family from the path", () => {
    expect(classifyPage("https://miloosh.com/", routes).kind).toBe("home");
    expect(classifyPage("https://miloosh.com/software/airtable", routes)).toMatchObject({ kind: "software", slug: "airtable" });
    expect(classifyPage("https://miloosh.com/compare/airtable-vs-notion", routes)).toMatchObject({ kind: "compare", slug: "airtable-vs-notion" });
    expect(classifyPage("https://miloosh.com/category/crm", routes)).toMatchObject({ kind: "category", slug: "crm" });
    expect(classifyPage("https://miloosh.com/best-crm-for-startups", routes)).toMatchObject({ kind: "guide", slug: "best-crm-for-startups" });
    expect(classifyPage("https://miloosh.com/privacy", routes).kind).toBe("legal");
  });

  it("does not guess: an unknown root path or a hub index is 'other'", () => {
    expect(classifyPage("https://miloosh.com/something-else", routes).kind).toBe("other");
    expect(classifyPage("https://miloosh.com/compare", routes).kind).toBe("other");
    expect(classifyPage("https://miloosh.com/software/airtable/extra", routes).kind).toBe("other");
    expect(classifyPage("https://miloosh.com/best-crm-for-startups").kind).toBe("other");
  });

  it("builds URLs and paths symmetrically", () => {
    expect(softwareUrl("airtable")).toBe("https://miloosh.com/software/airtable");
    expect(comparisonUrl("a-vs-b")).toBe("https://miloosh.com/compare/a-vs-b");
    expect(pathOf("https://miloosh.com/software/airtable")).toBe("/software/airtable");
    expect(pathOf("https://miloosh.com/")).toBe("/");
  });
});
