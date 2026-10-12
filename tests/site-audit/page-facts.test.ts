import { describe, expect, it } from "vitest";
import { decodeEntities, isNoindex, parsePageFacts, stripTags } from "@/lib/site-audit/page-facts";

const head = (extra = "") => `<html><head><title>Best Pipedrive Alternatives | Miloosh</title><meta name="description" content="3 alternatives &amp; more"/><meta name="robots" content="index, follow"/><link rel="canonical" href="https://miloosh.com/software/pipedrive"/><meta property="og:title" content="Best Pipedrive Alternatives"/><meta property="og:url" content="https://miloosh.com/software/pipedrive"/><meta name="twitter:title" content="Best Pipedrive Alternatives"/><meta name="twitter:description" content="It&#x27;s a card"/>${extra}</head>`;

describe("decodeEntities and stripTags", () => {
  it("decodes the entities React emits", () => {
    expect(decodeEntities("A &amp; B &lt;i&gt; &quot;q&quot; it&#x27;s it&#39;s&nbsp;ok &#8212; &#x2014;")).toBe('A & B <i> "q" it\'s it\'s ok — —');
  });

  it("removes scripts, styles, comments and tags but keeps their neighbours' words apart", () => {
    expect(stripTags("<p>One<!-- x --><b>two</b></p><script>var a = 1;</script><style>.a{}</style><p>three</p>")).toBe("One two three");
  });
});

describe("parsePageFacts", () => {
  it("reads the title, description, canonical, robots and both social cards, decoding entities", () => {
    const facts = parsePageFacts("/software/pipedrive", `${head()}<body><h1>Pipedrive</h1></body></html>`);
    expect(facts.title).toBe("Best Pipedrive Alternatives | Miloosh");
    expect(facts.description).toBe("3 alternatives & more");
    expect(facts.canonical).toBe("https://miloosh.com/software/pipedrive");
    expect(facts.robots).toBe("index, follow");
    expect(facts.og).toMatchObject({ title: "Best Pipedrive Alternatives", url: "https://miloosh.com/software/pipedrive" });
    expect(facts.twitter).toEqual({ title: "Best Pipedrive Alternatives", description: "It's a card" });
    expect(facts.h1Count).toBe(1);
  });

  it("keeps the first of a repeated tag, as a browser would use it", () => {
    const facts = parsePageFacts("/", `<head><meta name="description" content="first"/><meta name="description" content="second"/></head>`);
    expect(facts.description).toBe("first");
  });

  it("merges several robots tags, because a crawler applies the strictest of them", () => {
    const facts = parsePageFacts("/x", `<meta name="robots" content="index, follow"/><meta name="robots" content="noindex"/>`);
    expect(facts.robots).toBe("index, follow, noindex");
    expect(isNoindex(facts)).toBe(true);
  });

  it("returns nulls and empty maps for a page with no head", () => {
    const facts = parsePageFacts("/x", "<body><p>hi</p></body>");
    expect(facts).toMatchObject({ title: null, description: null, canonical: null, robots: null, og: {}, twitter: {}, footerLine: null, h1Count: 0 });
  });

  it("collects JSON-LD types from nested objects and arrays, and counts blocks that do not parse", () => {
    const ld = (value: string) => `<script type="application/ld+json">${value}</script>`;
    const facts = parsePageFacts("/x", `${ld(JSON.stringify({ "@type": "ItemList", itemListElement: [{ "@type": "ListItem", item: { "@type": "SoftwareApplication" } }] }))}${ld('{"@type":["Organization","Thing"]}')}${ld("{not json")}`);
    expect(facts.jsonLd).toEqual({ types: ["ItemList", "ListItem", "Organization", "SoftwareApplication", "Thing"], invalid: 1 });
  });

  it("reads anchors with their rel and visible text, ignoring anchors without an href", () => {
    const facts = parsePageFacts("/x", `<a href="/a" rel="noopener">Plain <b>link</b></a><a name="x">no href</a><a href="https://v.example/?a=1&amp;b=2" rel="sponsored noopener">Visit</a>`);
    expect(facts.anchors.map((a) => [a.href, a.rel, a.text])).toEqual([["/a", "noopener", "Plain link"], ["https://v.example/?a=1&b=2", "sponsored noopener", "Visit"]]);
  });

  describe("affiliate disclosure next to a sponsored link", () => {
    const sponsored = `<a href="https://v.example/r" rel="sponsored noopener">Visit Pipedrive</a>`;
    const anchorOf = (html: string) => parsePageFacts("/x", html).anchors.find((a) => a.rel.includes("sponsored"))!;

    it("is found in the sentence right after the link", () => {
      expect(anchorOf(`<div>${sponsored}<p>This is an affiliate link. See our <a href="/affiliate-disclosure">Affiliate Disclosure</a>.</p></div>`).disclosureNearby).toBe(true);
    });

    it("is found just before the link", () => {
      expect(anchorOf(`<p>Affiliate link:</p>${sponsored}`).disclosureNearby).toBe(true);
    });

    it("is not found when the only mention is far away, such as the footer", () => {
      expect(anchorOf(`<div>${sponsored}</div><p>${"Unrelated text. ".repeat(80)}</p><footer>Some links are affiliate links.</footer>`).disclosureNearby).toBe(false);
    });

    it("is not found when there is none", () => {
      expect(anchorOf(`<td>${sponsored}</td>`).disclosureNearby).toBe(false);
    });

    it("is not required of links that are not sponsored", () => {
      expect(parsePageFacts("/x", `<a href="https://v.example" rel="noopener">Docs</a>`).anchors[0]!.disclosureNearby).toBe(true);
    });
  });

  it("reads the footer line through React's comment separators and the 'v 0.12.0' spacing they cause", () => {
    const footer = `<footer><p>© 2026</p><p>v<!-- -->0.12.0<!-- --> · <!-- -->354<!-- --> tools across <!-- -->27<!-- --> categories · sources last verified <!-- -->October 8, 2026</p></footer>`;
    expect(parsePageFacts("/x", footer).footerLine).toBe("v0.12.0 · 354 tools across 27 categories · sources last verified October 8, 2026");
  });

  it("returns visible text without scripts", () => {
    const facts = parsePageFacts("/x", `<body><script>self.__next_f.push("secret")</script><h1>Hello &amp; welcome</h1></body>`);
    expect(facts.text).toBe("Hello & welcome");
  });
});

describe("isNoindex", () => {
  it.each([
    ["noindex", true],
    ["noindex, follow", true],
    ["NOINDEX,NOFOLLOW", true],
    ["none", true],
    ["index, follow", false],
    ["max-image-preview:large", false],
    [null, false],
  ])("%s -> %s", (robots, expected) => {
    expect(isNoindex({ robots })).toBe(expected);
  });
});
