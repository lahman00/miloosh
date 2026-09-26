import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GuidesPage from "@/app/guides/page";
import { SectionHeading } from "@/components/SectionHeading";

it("gives the discovery hub one primary heading before hydration", () => {
  const html = renderToStaticMarkup(createElement(GuidesPage));
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain("Start with the job, not the software logo</h1>");
  expect(html).toContain('href="/best-no-code-database-for-operations"');
});

it("keeps ordinary section headings at level two", () => {
  expect(renderToStaticMarkup(createElement(SectionHeading, { title: "Pricing" }))).toMatch(/<h2\b[^>]*>Pricing<\/h2>/);
});
