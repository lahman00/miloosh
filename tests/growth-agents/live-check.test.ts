import { describe, expect, it } from "vitest";
import { failedLiveExtras, judgeLivePage, liveExtrasOf, parseLivePage, partnerNameIndex, productNameOfAnchor, renderedCtasOf } from "@/lib/growth-agents/live-check";
import { U } from "./fixtures";

const URL_ = U("/software/clickup");

const page = (head: string, body = "") => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
const observe = (html: string, overrides: Partial<Parameters<typeof parseLivePage>[0]> = {}) =>
  parseLivePage({ url: URL_, finalUrl: URL_, status: 200, headers: { contentType: "text/html; charset=utf-8" }, html, ...overrides });

const GOOD_HEAD = `<title>Best ClickUp Alternatives | Miloosh</title><link rel="canonical" href="${URL_}"/>`;

describe("parseLivePage", () => {
  it("reads the canonical in either attribute order and either quote style", () => {
    expect(observe(page(`<link rel="canonical" href="${URL_}"/>`)).canonical).toBe(URL_);
    expect(observe(page(`<link href="${URL_}" rel="canonical">`)).canonical).toBe(URL_);
    expect(observe(page(`<link rel='canonical' href='${URL_}'>`)).canonical).toBe(URL_);
    expect(observe(page(`<link rel="alternate canonical" href="${URL_}">`)).canonical).toBe(URL_);
    expect(observe(page(`<link rel="stylesheet" href="/a.css">`)).canonical).toBeNull();
  });

  it("reads robots directives from meta tags (robots and googlebot) and keeps the response header separate", () => {
    expect(observe(page(`${GOOD_HEAD}<meta name="robots" content="noindex, follow">`)).robotsMeta).toBe("noindex, follow");
    expect(observe(page(`${GOOD_HEAD}<meta name='googlebot' content='nofollow'>`)).robotsMeta).toBe("nofollow");
    expect(observe(page(GOOD_HEAD)).robotsMeta).toBeNull();
    expect(observe(page(GOOD_HEAD), { headers: { xRobotsTag: "noindex", contentType: "text/html" } }).xRobotsTag).toBe("noindex");
  });

  it("decodes the title and counts headings and structured-data blocks", () => {
    const obs = observe(page(`<title>MkDocs vs Read the Docs (2026): Hosting, Pricing &amp; Best Fit | Miloosh</title>${GOOD_HEAD}`, `<h1>One</h1><script type="application/ld+json">{}</script><script type='application/ld+json'>{}</script>`));
    expect(obs.title).toContain("Hosting, Pricing & Best Fit");
    expect(obs.h1Count).toBe(1);
    expect(obs.structuredDataBlocks).toBe(2);
  });

  it("collects the visible text of sponsored links only, whatever else the rel contains", () => {
    const body = `
      <a href="https://p.example/a" rel="sponsored noopener noreferrer" target="_blank"><span>Visit</span> Monday.com <svg></svg></a>
      <a href="https://p.example/b" rel="nofollow noopener">Visit Asana</a>
      <a href="/software/trello" rel="">Explore Trello</a>
      <a href="https://p.example/c" REL='SPONSORED'>Visit  GetResponse</a>`;
    expect(observe(page(GOOD_HEAD, body)).sponsoredAnchorTexts).toEqual(["Visit Monday.com", "Visit GetResponse"]);
  });

  it("does not read a robots tag from the body", () => {
    expect(observe(page(GOOD_HEAD, `<meta name="robots" content="noindex">`)).robotsMeta).toBeNull();
  });
});

describe("judgeLivePage: nothing blocks indexing, with every reason spelled out", () => {
  it("accepts a 200, self-canonical page with no noindex", () => {
    expect(judgeLivePage(observe(page(GOOD_HEAD)))).toMatchObject({ indexable: true, reasons: [] });
  });

  it("accepts an equivalent canonical written with www, a trailing slash or a query string", () => {
    for (const href of ["https://www.miloosh.com/software/clickup/", `${URL_}?utm_source=x`]) {
      expect(judgeLivePage(observe(page(`<link rel="canonical" href="${href}">`))).indexable, href).toBe(true);
    }
  });

  it.each([
    ["a non-200 status", () => observe(page(GOOD_HEAD), { status: 404 }), /HTTP 404/],
    ["a redirect", () => observe(page(GOOD_HEAD), { finalUrl: U("/software/other"), redirectChain: [U("/software/other")] }), /redirects to/],
    ["a canonical to another page", () => observe(page(`<link rel="canonical" href="${U("/software/other")}">`)), /canonical points to/],
    ["a missing canonical", () => observe(page("<title>x</title>")), /no canonical link/],
    ["a noindex meta", () => observe(page(`${GOOD_HEAD}<meta name="robots" content="NOINDEX,follow">`)), /robots meta says/],
    ["a none directive", () => observe(page(`${GOOD_HEAD}<meta name="robots" content="none">`)), /robots meta says none/],
    ["an X-Robots-Tag noindex", () => observe(page(GOOD_HEAD), { headers: { xRobotsTag: "noindex, nofollow", contentType: "text/html" } }), /X-Robots-Tag says/],
    ["a non-HTML response", () => observe(page(GOOD_HEAD), { headers: { contentType: "application/json" } }), /content type/],
  ])("blocks on %s", (_name, make, reason) => {
    const verdict = judgeLivePage(make());
    expect(verdict.indexable).toBe(false);
    expect(verdict.reasons.join(" ")).toMatch(reason);
  });

  it("does not treat 'nofollow' or 'noarchive' as an indexing block", () => {
    expect(judgeLivePage(observe(page(`${GOOD_HEAD}<meta name="robots" content="nofollow, noarchive">`))).indexable).toBe(true);
  });
});

describe("rendered calls to action", () => {
  const names = partnerNameIndex([{ slug: "monday", name: "Monday.com" }, { slug: "getresponse", name: "GetResponse" }, { slug: "activecampaign", name: "ActiveCampaign" }]);

  it("names the product in a link text, with or without the official-site wording", () => {
    expect(productNameOfAnchor("Visit Monday.com")).toBe("Monday.com");
    expect(productNameOfAnchor("Visit ActiveCampaign's Official Site")).toBe("ActiveCampaign");
    expect(productNameOfAnchor("Try Asana")).toBe("Asana");
  });

  it("maps sponsored links to active partners and keeps the ones it cannot place visible", () => {
    const html = page(GOOD_HEAD, `<a rel="sponsored" href="https://p.example/1">Visit Monday.com</a><a rel="sponsored" href="https://p.example/2">Visit Monday.com</a><a rel="sponsored" href="https://p.example/3">Visit Wix Website Builder</a>`);
    expect(renderedCtasOf(observe(html), names)).toEqual({ sponsoredLinkCount: 3, partnerSlugs: ["monday"], unmatchedAnchorTexts: ["Visit Wix Website Builder"] });
  });

  it("finds a partner by its slug as well as its name", () => {
    const html = page(GOOD_HEAD, `<a rel="sponsored" href="https://p.example/1">Visit get-response</a>`);
    expect(renderedCtasOf(observe(html), names).partnerSlugs).toEqual(["getresponse"]);
  });

  it("never records a link target, only counts and names", () => {
    const html = page(GOOD_HEAD, `<a rel="sponsored" href="https://partner.example/r/secret-ref-123?aff=eyal">Visit Monday.com</a>`);
    const extras = liveExtrasOf(observe(html), names, "2026-10-09T00:00:00Z");
    expect(JSON.stringify(extras)).not.toMatch(/partner\.example|secret-ref|aff=/);
  });
});

describe("evidence wrappers", () => {
  it("returns MEASURED live and rendered evidence with the reading's provenance", () => {
    const extras = liveExtrasOf(observe(page(GOOD_HEAD)), new Map(), "2026-10-09T00:00:00Z");
    expect(extras.url).toBe(URL_);
    expect(extras.live).toMatchObject({ state: "MEASURED", value: { status: 200, canonical: URL_, indexable: true }, provenance: { source: "live-page-get", capturedAt: "2026-10-09T00:00:00Z" } });
    expect(extras.rendered).toMatchObject({ state: "MEASURED", value: { sponsoredLinkCount: 0, partnerSlugs: [] } });
  });

  it("states the blocking facts in the provenance caveat when a page cannot be indexed", () => {
    const extras = liveExtrasOf(observe(page("<title>x</title>")), new Map(), "2026-10-09T00:00:00Z");
    expect(extras.live).toMatchObject({ value: { indexable: false } });
    expect(extras.live.state === "MEASURED" && extras.live.provenance.caveat).toMatch(/no canonical link/);
  });

  it("marks a page that could not be read UNAVAILABLE, never as healthy", () => {
    const failed = failedLiveExtras(URL_, "GET failed: timeout");
    expect(failed.live).toEqual({ state: "UNAVAILABLE", reason: "GET failed: timeout" });
    expect(failed.rendered.state).toBe("UNAVAILABLE");
  });
});
