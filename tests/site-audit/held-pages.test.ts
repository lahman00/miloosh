import { describe, expect, it } from "vitest";
import { heldPageChanges } from "@/lib/site-audit/held-pages";

const page = (body: string, { footer = "<footer><a href=\"/research\">Research</a></footer>", head = "" } = {}) =>
  `<html><head><title>T</title><meta name="description" content="D"/><link rel="canonical" href="https://miloosh.com/x"/><meta name="twitter:title" content="Site default"/>${head}</head><body><h1>H</h1>${body}${footer}</body></html>`;

describe("heldPageChanges", () => {
  const base = page("<p>Text</p><a href=\"/compare/a-vs-b\">A vs B</a>", { head: "<script type=\"application/ld+json\">{\"@type\":\"FAQPage\",\"x\":1}</script>" });

  it("is empty for identical pages, ignoring the footer, Twitter metadata and JSON key whitespace", () => {
    const after = page("<p>Text</p><a href=\"/compare/a-vs-b\">A vs B</a>", { footer: "<footer><a href=\"/research/report\">Pricing Pressure Index</a></footer>", head: "<meta name=\"twitter:title\" content=\"Real title\"/><script type=\"application/ld+json\">{ \"@type\": \"FAQPage\", \"x\": 1 }</script>" });
    expect(heldPageChanges("/software/x", base, after)).toEqual([]);
  });

  it("reports changed text with the first point of difference", () => {
    const reasons = heldPageChanges("/software/x", base, page("<p>Changed text</p><a href=\"/compare/a-vs-b\">A vs B</a>", { head: "<script type=\"application/ld+json\">{\"@type\":\"FAQPage\",\"x\":1}</script>" }));
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/^text changed at character \d+/);
  });

  it("allows the Open Graph keys the metadata fix completes, but not a changed value or another added key", () => {
    const withOg = (og: string) => page("<p>Text</p>", { head: og });
    const before = withOg('<meta property="og:title" content="A"/><meta property="og:image" content="i"/>');
    expect(heldPageChanges("/software/x", before, withOg('<meta property="og:title" content="A"/><meta property="og:url" content="u"/><meta property="og:site_name" content="S"/><meta property="og:locale" content="en_US"/><meta property="og:type" content="website"/><meta property="og:image" content="i"/>'))).toEqual([]);
    expect(heldPageChanges("/software/x", before, withOg('<meta property="og:title" content="B"/><meta property="og:image" content="i"/>'))).toEqual(["Open Graph changed"]);
    expect(heldPageChanges("/software/x", before, withOg('<meta property="og:title" content="A"/><meta property="og:image" content="i"/><meta property="og:video" content="v"/>'))).toEqual(["Open Graph changed"]);
    expect(heldPageChanges("/software/x", withOg('<meta property="og:url" content="old"/>'), withOg('<meta property="og:url" content="new"/>'))).toEqual(["Open Graph changed"]);
  });

  it("reports an added or removed link by name", () => {
    const reasons = heldPageChanges("/software/x", base, page("<p>Text</p><a href=\"/compare/a-vs-b\">A vs B</a><a href=\"/compare/new-vs-pair\">N</a>", { head: "<script type=\"application/ld+json\">{\"@type\":\"FAQPage\",\"x\":1}</script>" }));
    expect(reasons.some((r) => r.startsWith("links changed (added /compare/new-vs-pair"))).toBe(true);
  });

  it("reports changed structured data, title, description and robots", () => {
    const after = base.replace("\"x\":1", "\"x\":2").replace("<title>T</title>", "<title>U</title>").replace("content=\"D\"", "content=\"E\"").replace("</head>", "<meta name=\"robots\" content=\"noindex\"/></head>");
    expect(heldPageChanges("/software/x", base, after)).toEqual(expect.arrayContaining(["description changed", "robots changed", "structured data changed", "title changed"]));
  });
});
