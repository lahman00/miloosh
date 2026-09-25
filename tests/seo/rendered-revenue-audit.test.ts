import { describe, expect, it } from "vitest";
import { renderedHtml, internalTarget } from "@/lib/seo/rendered-html";
describe("initial-HTML release evidence", () => {
  it("reads SSR anchors and canonical regardless of attribute order without counting RSC strings", () => {
    const html = '<title>Buyer &amp; cost</title><h1>Pick <b>one</b></h1><link href="https://miloosh.com/software/a" rel="canonical"><meta content="Description" name="description"><a href="/software/a?source=x&amp;qa=1#fit" rel="nofollow">Best <em>fit</em></a><script>self.__next_f.push(["href=\\"/fake\\""])</script><div id="fit"></div><script type="application/ld+json">{"@type":"BreadcrumbList"}</script>';
    const page = renderedHtml(html);
    expect(page.links).toEqual([{ href: "/software/a?source=x&qa=1#fit", rel: "nofollow", text: "Best fit" }]);
    expect(page.canonicals).toEqual(["https://miloosh.com/software/a"]);
    expect(page.h1s).toEqual(["Pick one"]);
    expect(page.schemas).toEqual([{ "@type": "BreadcrumbList" }]);
    expect(page.title).toBe("Buyer & cost");
    expect(page.ids.has("fit")).toBe(true);
  });
  it("never treats external merchant/preview links as internal crawl targets", () => {
    for (const href of ["https://merchant.invalid", "https://preview.vercel.app/a", "//merchant.invalid", "javascript:void(0)"]) expect(internalTarget(href, "/software/a")).toBeUndefined();
    expect(internalTarget("#fit", "/software/a")?.pathname).toBe("/software/a");
  });
});
