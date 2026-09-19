import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { EcommerceSituationGuidance } from "@/components/recommend/EcommerceSituationGuidance";
import type { EcommerceSituation } from "@/lib/recommend/types";
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());
const render = (situation: EcommerceSituation, productSlugs: string[] = []) => renderToStaticMarkup(React.createElement(EcommerceSituationGuidance, { situation, productSlugs }));
describe("ecommerce decision support", () => {
  it("new stores do not get an existing-platform warning or decision-kit link", () => {
    const html = render("new");
    expect(html).toContain("Starting from scratch");
    expect(html).not.toContain("store-decision-kit");
    expect(html).not.toContain("existing store");
  });
  it("repair always links checklist; WooCommerce repair check only when in results", () => {
    expect(render("repair")).toContain("#store-decision-kit");
    expect(render("repair")).not.toContain("#woocommerce-repair-check");
    expect(render("repair", ["woocommerce"])).toContain("/software/woocommerce#woocommerce-repair-check");
  });
  it("embed links Ecwid and conditionally the WooCommerce comparison", () => {
    expect(render("embed")).toContain("/software/ecwid#ecwid-integration-decision");
    expect(render("embed")).not.toContain("#store-ownership-choice");
    expect(render("embed", ["woocommerce"])).toContain("/compare/ecwid-vs-woocommerce#store-ownership-choice");
  });
  it("migration links existing buyer checks without promising migration success", () => {
    expect(render("migrate")).toContain("/compare/wix-vs-shopify#small-store-buyer-checks");
    expect(render("migrate")).toContain("does not prove");
  });
  it("not-sure keeps a conditional existing-store caveat", () => {
    expect(render("not-sure")).toContain("If you have a store");
  });
});
