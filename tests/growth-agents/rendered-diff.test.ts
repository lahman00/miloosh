import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { compareRendered, normalizeRenderedHtml } from "@/lib/growth-agents/rendered-diff";
import { main, parseArgs, run, type RenderedDiffDeps } from "../../scripts/growth/rendered-diff";

const page = (body: string, head = "") => `<!DOCTYPE html><html><head><title>Best ClickUp Alternatives | Miloosh</title><link rel="canonical" href="https://miloosh.com/software/clickup"/>${head}</head><body>${body}</body></html>`;

describe("normalizeRenderedHtml removes build noise and keeps what a reader or a crawler sees", () => {
  it("ignores content-hashed asset names, script payloads, deployment markers and whitespace", () => {
    const a = page(`<h1>ClickUp</h1><a href="/software/asana">Asana</a><script src="/_next/static/chunks/a1b2c3.js" nonce="x1" async></script><script>self.__next_f.push([1,"build-111"])</script>`, `<link rel="stylesheet" href="/_next/static/css/aaa111.css" data-precedence="next"/><link rel="preload" as="image" href="/_next/static/media/logo.aaa.png?dpl=dpl_AAA"/>`);
    const b = page(`<h1>ClickUp</h1>\n  <a   href="/software/asana">Asana</a><script src="/_next/static/chunks/zzz999.js" nonce="x2" async></script><script>self.__next_f.push([1,"build-222"])</script>`, `<link rel="stylesheet" href="/_next/static/css/bbb222.css" data-precedence="next"/><link rel="preload" as="image" href="/_next/static/media/logo.bbb.png?dpl=dpl_BBB"/>`);
    expect(normalizeRenderedHtml(a)).toBe(normalizeRenderedHtml(b));
  });

  it("drops the platform's deployment id from asset URLs wherever it sits, so a live page equals a local build of the same commit", () => {
    const id = "dpl_4AHS358cZHgukiyYtVkwsTZ3W4kn";
    const local = page(`<link rel="preload" as="image" imageSrcSet="/_next/image?url=%2Fa.png&amp;w=32&amp;q=75 1x"/><img src="/img/a.png"/><img src="/img/b.png?v=1"/><img src="/img/c.png"/>`);
    const live = page(`<link rel="preload" as="image" imageSrcSet="/_next/image?url=%2Fa.png&amp;w=32&amp;q=75&amp;dpl=${id} 1x"/><img src="/img/a.png?dpl=${id}"/><img src="/img/b.png?dpl=${id}&amp;v=1"/><img src="/img/c.png?v=1"/>`.replace("c.png?v=1", "c.png"));
    expect(normalizeRenderedHtml(live)).toBe(normalizeRenderedHtml(local));
    expect(normalizeRenderedHtml(live)).not.toMatch(/dpl/);
    // an unescaped & separator is handled the same way, as are the first and last position
    expect(normalizeRenderedHtml(`<a href="/x?a=1&dpl=dpl_Z">x</a>`)).toBe(normalizeRenderedHtml(`<a href="/x?a=1">x</a>`));
    expect(normalizeRenderedHtml(`<a href="/x?dpl=dpl_Z&a=1">x</a>`)).toBe(normalizeRenderedHtml(`<a href="/x?a=1">x</a>`));
    expect(normalizeRenderedHtml(`<a href="/x?dpl=dpl_Z">x</a>`)).toBe(normalizeRenderedHtml(`<a href="/x">x</a>`));
  });

  it("does not hide a real difference that happens to sit next to a deployment id", () => {
    const differ = (a: string, b: string) => expect(normalizeRenderedHtml(page(a))).not.toBe(normalizeRenderedHtml(page(b)));
    differ(`<a href="/go?to=asana&amp;dpl=dpl_A">Go</a>`, `<a href="/go?to=monday&amp;dpl=dpl_B">Go</a>`);
    // a difference after the marker survives as well
    differ(`<a href="/go?dpl=dpl_A&amp;to=asana">Go</a>`, `<a href="/go?dpl=dpl_B&amp;to=monday">Go</a>`);
    differ(`<a href="/go?x=1&amp;dpl=dpl_A&amp;to=asana">Go</a>`, `<a href="/go?x=1&amp;dpl=dpl_B&amp;to=monday">Go</a>`);
  });

  it("keeps structured data, because JSON-LD is page content", () => {
    const withLd = (name: string) => page(`<script type="application/ld+json">{"@type":"Product","name":"${name}"}</script>`);
    expect(normalizeRenderedHtml(withLd("A"))).not.toBe(normalizeRenderedHtml(withLd("B")));
    expect(normalizeRenderedHtml(withLd("A"))).toContain('"name":"A"');
  });

  it.each([
    ["a different title", (h: string) => h.replace("Best ClickUp Alternatives", "ClickUp Alternatives")],
    ["a different canonical", (h: string) => h.replace("/software/clickup", "/software/other")],
    ["an added robots directive", (h: string) => h.replace("</head>", '<meta name="robots" content="noindex"/></head>')],
    ["different visible text", (h: string) => h.replace("<h1>ClickUp</h1>", "<h1>ClickUp Pro</h1>")],
    ["a different link target", (h: string) => h.replace('href="/software/asana"', 'href="/software/trello"')],
    ["a different call to action rel", (h: string) => h.replace('rel="sponsored"', 'rel="nofollow"')],
    ["an added affiliate link", (h: string) => h.replace("</body>", '<a rel="sponsored" href="https://p.example/x">Visit X</a></body>')],
  ])("notices %s", (_name, mutate) => {
    const base = page(`<h1>ClickUp</h1><a href="/software/asana">Asana</a><a rel="sponsored" href="https://p.example/a">Visit Monday.com</a>`);
    expect(normalizeRenderedHtml(mutate(base))).not.toBe(normalizeRenderedHtml(base));
  });
});

describe("compareRendered", () => {
  const base = new Map([["software/a.html", page("<h1>A</h1>")], ["software/b.html", page("<h1>B</h1>")], ["gone.html", page("<h1>G</h1>")]]);

  it("reports identical builds as identical", () => {
    const candidate = new Map([["software/a.html", page("<h1>A</h1>")], ["software/b.html", page("<h1>B</h1>")], ["gone.html", page("<h1>G</h1>")]]);
    expect(compareRendered(base, candidate)).toEqual({ compared: 3, differing: 0, differingSample: [], onlyInBase: [], onlyInCandidate: [] });
  });

  it("lists the differing pages and the pages only one build has", () => {
    const candidate = new Map([["software/a.html", page("<h1>A</h1>")], ["software/b.html", page("<h1>B changed</h1>")], ["new.html", page("<h1>N</h1>")]]);
    expect(compareRendered(base, candidate)).toEqual({ compared: 2, differing: 1, differingSample: ["software/b.html"], onlyInBase: ["gone.html"], onlyInCandidate: ["new.html"] });
  });

  it("limits the sample but counts every difference", () => {
    const many = (suffix: string) => new Map(Array.from({ length: 30 }, (_, i) => [`p${i}.html`, page(`<h1>${i}${suffix}</h1>`)] as const));
    const result = compareRendered(many(""), many("!"), 5);
    expect(result.differing).toBe(30);
    expect(result.differingSample).toHaveLength(5);
  });
});

describe("growth:rendered-diff command", () => {
  function deps(files: Record<string, Record<string, string>>): { d: RenderedDiffDeps; writes: Array<[string, string]> } {
    const writes: Array<[string, string]> = [];
    return {
      writes,
      d: {
        listHtml: (dir) => Object.keys(files[dir] ?? {}).sort(),
        readText: (file) => {
          for (const [dir, entries] of Object.entries(files)) for (const [name, text] of Object.entries(entries)) if (path.join(dir, name) === file) return text;
          throw new Error(`ENOENT ${file}`);
        },
        writeText: (file, content) => void writes.push([file, content]),
      },
    };
  }
  const identical = { "/b": { "a.html": page("<h1>A</h1>") }, "/c": { "a.html": page("<h1>A</h1>") } };

  it("parses relative paths against the repository root and rejects bad input", () => {
    expect(parseArgs(["--base", "x/b", "--candidate", "x/c", "--out", "out.json"], "/repo")).toEqual({ base: "/repo/x/b", candidate: "/repo/x/c", out: "/repo/out.json" });
    expect(() => parseArgs(["--base", "x"], "/repo")).toThrow(/Both --base and --candidate/);
    expect(() => parseArgs(["--base", "a", "--candidate", "b", "--delete"], "/repo")).toThrow(/Unknown option --delete/);
    expect(() => parseArgs(["stray"], "/repo")).toThrow(/Unexpected argument/);
    expect(parseArgs(["--help"], "/repo")).toEqual({ help: true });
  });

  it("exits 0 and writes nothing for identical builds without --out", () => {
    const { d, writes } = deps(identical);
    const outcome = run({ base: "/b", candidate: "/c", out: null }, d);
    expect(outcome.exitCode).toBe(0);
    expect(outcome.result).toMatchObject({ compared: 1, differing: 0, baseFiles: 1, candidateFiles: 1 });
    expect(writes).toEqual([]);
  });

  it("writes one file, only with --out", () => {
    const { d, writes } = deps(identical);
    run({ base: "/b", candidate: "/c", out: "/out.json" }, d);
    expect(writes.map(([f]) => f)).toEqual(["/out.json"]);
  });

  it("exits 1 for a difference, a page only one build has, or an empty build (nothing compared is not a pass)", () => {
    expect(run({ base: "/b", candidate: "/c", out: null }, deps({ "/b": { "a.html": page("<h1>A</h1>") }, "/c": { "a.html": page("<h1>B</h1>") } }).d).exitCode).toBe(1);
    expect(run({ base: "/b", candidate: "/c", out: null }, deps({ "/b": { "a.html": page("x") }, "/c": { "a.html": page("x"), "b.html": page("y") } }).d).exitCode).toBe(1);
    expect(run({ base: "/b", candidate: "/c", out: null }, deps({ "/b": {}, "/c": {} }).d).exitCode).toBe(1);
  });

  it("main reports invalid arguments with exit 2 and --help with exit 0", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(main(["--base", "x"], "/repo", deps({}).d)).toBe(2);
    expect(main(["--help"], "/repo", deps({}).d)).toBe(0);
    vi.restoreAllMocks();
  });
});
