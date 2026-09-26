import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd } from "@/components/JsonLd";
import { FaqSection } from "@/components/FaqSection";
import { getAllSoftware, getSoftware } from "@/data/software";
import { generateFaq } from "@/lib/generators";
import { getBreadcrumbJsonLd, getFaqJsonLd, getSoftwareApplicationJsonLd } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

describe("structured data truth and serialization", () => {
  it("serializes hostile text as data without creating another script", () => {
    const data = { "@type": "Thing", name: '</script><script>alert("x")</script>&\u2028' };
    const html = renderToStaticMarkup(createElement(JsonLd, { data }));
    expect(html.match(/<script/g)).toHaveLength(1);
    const payload = html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>"));
    expect(payload).not.toContain("<");
    expect(JSON.parse(payload)).toEqual(data);
  });

  it("describes only visible catalog alternatives in their rendered order", () => {
    for (const software of getAllSoftware()) {
      const schema = getSoftwareApplicationJsonLd(software);
      expect(schema.itemListElement).toHaveLength(software.alternatives.length);
      for (const [index, entry] of schema.itemListElement.entries()) {
        const alternative = software.alternatives[index];
        expect(entry.position).toBe(index + 1);
        expect(entry.item.name).toBe(alternative.name);
        expect(entry.item.description).toBe(alternative.description);
        expect(getSoftware(alternative.slug), alternative.slug).toBeDefined();
        expect(entry.item.url).toBe(`${SITE_URL}/software/${alternative.slug}`);
      }
      expect(JSON.stringify(schema)).not.toMatch(/"(?:aggregateRating|review|offers)":/);
    }
  });

  it.each(["airtable", "todoist", "close", "setmore", "elevenlabs"])("renders %s FAQ answers before hydration", (slug) => {
    const items = generateFaq(getSoftware(slug)!);
    const schema = getFaqJsonLd(items);
    const html = renderToStaticMarkup(createElement(FaqSection, { items }));
    expect(schema.mainEntity.length).toBeGreaterThan(0);
    for (const entity of schema.mainEntity) {
      const escaped = (text: string) => renderToStaticMarkup(createElement("span", null, text)).slice(6, -7);
      expect(html).toContain(escaped(entity.name));
      expect(html).toContain(escaped(entity.acceptedAnswer.text));
    }
    expect(html.match(/<details/g)).toHaveLength(items.length);
  });

  it("keeps breadcrumb positions contiguous and URLs canonical", () => {
    const items = [{ name: "Home", url: SITE_URL }, { name: "Airtable", url: `${SITE_URL}/software/airtable` }];
    expect(getBreadcrumbJsonLd(items).itemListElement.map((item) => [item.position, item.name, item.item]))
      .toEqual([[1, "Home", SITE_URL], [2, "Airtable", `${SITE_URL}/software/airtable`]]);
  });
});
