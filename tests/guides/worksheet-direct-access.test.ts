import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EcommerceDecisionKit } from "@/components/EcommerceDecisionKit";

const destination = "/resources/ecommerce-platform-decision-checklist.html";
const tag = (anchor: string) => anchor.slice(0, anchor.indexOf(">") + 1);
const isDownload = (anchor: string) => /\sdownload(?:\s|=|>)/i.test(tag(anchor));

describe("direct access to the existing decision worksheet", () => {
  it("opens in the current tab and preserves the exact downloadable destination", () => {
    const html = renderToStaticMarkup(createElement(EcommerceDecisionKit));
    const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) ?? [];
    const links = anchors.filter((anchor) => tag(anchor).includes(`href="${destination}"`));
    expect(links).toHaveLength(2);
    const direct = links.filter((anchor) => !isDownload(anchor));
    const download = links.filter(isDownload);
    expect(direct).toHaveLength(1);
    expect(download).toHaveLength(1);
    expect(direct[0]).toContain("Open the free decision checklist");
    expect(tag(direct[0]!)).not.toMatch(/\starget\s*=/i);
    expect(download[0]).toContain("Download the free decision checklist");
    expect(html).toContain('href="/compare/wix-vs-shopify"');
    expect(html).toContain("No email required");
    expect(html).toContain("no signup required");
  });
  it("keeps both the kit and worksheet ungated without client scripts", () => {
    const kit = renderToStaticMarkup(createElement(EcommerceDecisionKit));
    const worksheet = fs.readFileSync(`public${destination}`, "utf8");
    for (const markup of [kit, worksheet]) {
      expect(markup).not.toMatch(/<form\b|<script\b/i);
      expect(markup).not.toMatch(/<input\b[^>]*\btype\s*=\s*["']?email\b/i);
    }
    expect(worksheet).toContain('noindex,follow');
    expect(worksheet).toContain('href="https://miloosh.com/best-ecommerce-platform-for-small-business"');
  });
});
