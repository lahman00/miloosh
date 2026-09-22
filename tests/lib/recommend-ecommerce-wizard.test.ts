import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, track: vi.fn(), push: vi.fn() }));
vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useEffect: () => {},
  useState: (initial: unknown) => {
    const index = mocks.cursor++;
    if (!(index in mocks.values)) mocks.values[index] = initial;
    return [mocks.values[index], (next: unknown) => {
      mocks.values[index] = typeof next === "function" ? next(mocks.values[index]) : next;
    }];
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/analytics/track", () => ({ trackEvent: mocks.track }));
import { RecommendWizard } from "@/components/recommend/RecommendWizard";
import { DEFAULT_ANSWERS, initialRecommendAnswers } from "@/lib/recommend/query";
import { ECOMMERCE_SITUATIONS } from "@/lib/recommend/types";

type Element = React.ReactElement<{ title?: string; selected?: boolean; disabled?: boolean; children?: React.ReactNode; onClick?: () => void }>;
function elements(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}
function render() { mocks.cursor = 0; return elements(RecommendWizard({})); }
function renderWithInitial(initialAnswers: typeof DEFAULT_ANSWERS, fastEcommerceEntry = false) {
  mocks.cursor = 0;
  return elements(RecommendWizard({ initialAnswers, fastEcommerceEntry }));
}
function option(title: string) { return render().find(e => e.props.title === title)!; }
function button(text: string) { return render().find(e => React.Children.toArray(e.props.children).includes(text))!; }
beforeEach(() => { vi.stubGlobal("React", React); mocks.values = []; mocks.cursor = 0; mocks.track.mockClear(); mocks.push.mockClear(); });
afterEach(() => vi.unstubAllGlobals());
describe("campaign-aligned Recommend entry", () => {
  it("prefills ecommerce only for the existing ecommerce-decision campaign", () => {
    expect(initialRecommendAnswers({ utm_campaign: "ecommerce-decision" }).primaryNeed).toBe("ecommerce_platform");
    expect(initialRecommendAnswers({ utm_campaign: "profile-cta" }).primaryNeed).toBeNull();
    expect(initialRecommendAnswers({ utm_campaign: "ecommerce-decision", need: "crm" }).primaryNeed).toBe("crm");
  });

  it("shows the ecommerce decision first and keeps other software choices available on demand", () => {
    const initial = { ...DEFAULT_ANSWERS, primaryNeed: "ecommerce_platform" as const };
    const rendered = renderWithInitial(initial);
    expect(rendered.find(e => e.props.title === "Fix my current store")).toBeDefined();
    expect(rendered.find(e => e.props.title === "Plan and track work")).toBeUndefined();
    expect(mocks.track).not.toHaveBeenCalled();

    rendered.find(e => React.Children.toArray(e.props.children).includes("Choose a different type of software"))!.props.onClick!();
    expect(renderWithInitial(initial).find(e => e.props.title === "Plan and track work")).toBeDefined();
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("turns one explicit campaign situation choice into a completed fast-path result", () => {
    const initial = { ...DEFAULT_ANSWERS, primaryNeed: "ecommerce_platform" as const };
    const rendered = renderWithInitial(initial, true);
    mocks.track.mockClear();

    rendered.find(e => e.props.title === "Fix my current store")!.props.onClick!();

    expect(mocks.track).toHaveBeenNthCalledWith(1, {
      type: "recommend_ecommerce_situation_selected",
      path: "/recommend",
      situation: "repair",
    });
    expect(mocks.track).toHaveBeenNthCalledWith(2, {
      type: "recommend_completed",
      path: "/recommend",
      domain: "ecommerce_platform",
    });
    expect(mocks.push).toHaveBeenCalledTimes(1);
    expect(mocks.push.mock.calls[0][0]).toContain("need=ecommerce_platform");
    expect(mocks.push.mock.calls[0][0]).toContain("ecommerceSituation=repair");
  });
});

describe("wizard situation state and one event per selection", () => {
  it("requires an explicit ecommerce situation before continuing", () => {
    expect(option("Launch my first online store")).toBeUndefined();
    option("Build an online store").props.onClick!();
    expect(option("Launch my first online store")).toBeDefined();
    expect(button("Next").props.disabled).toBe(true);
    option("Launch my first online store").props.onClick!();
    expect(button("Next").props.disabled).toBe(false);
    button("Next").props.onClick!();
    expect(option("Launch my first online store")).toBeUndefined();
    button("Back").props.onClick!();
    expect(option("Launch my first online store")).toBeDefined();
  });
  it("each explicit selection fires once; rerenders/back/submit do not duplicate it", () => {
    option("Build an online store").props.onClick!();
    mocks.track.mockClear();
    const titles = ["Launch my first online store", "Fix my current store", "Keep my site, change how I sell", "Move to another platform", "Help me diagnose it"];
    titles.forEach((title, i) => {
      render().filter(e => e.props.title === title).at(-1)!.props.onClick!();
      render(); render();
      expect(mocks.track).toHaveBeenCalledTimes(i + 1);
      expect(mocks.track).toHaveBeenLastCalledWith({ type: "recommend_ecommerce_situation_selected", path: "/recommend", situation: ECOMMERCE_SITUATIONS[i] });
    });
    button("Next").props.onClick!(); button("Back").props.onClick!();
    expect(mocks.track).toHaveBeenCalledTimes(5);
  });
  it("domain switch clears stale situation in UI and final URL", () => {
    option("Build an online store").props.onClick!();
    option("Fix my current store").props.onClick!();
    button("Next").props.onClick!(); button("Back").props.onClick!();
    render().find(e => e.props.title === "Not sure yet")!.props.onClick!();
    expect(option("Fix my current store")).toBeUndefined();
    option("Build an online store").props.onClick!();
    expect(option("Help me diagnose it").props.selected).toBe(false);
    option("Help me diagnose it").props.onClick!();
    for (let i = 0; i < 3; i++) button("Next").props.onClick!();
    button("Get my recommendations").props.onClick!();
    expect(mocks.push.mock.calls[0][0]).not.toContain("ecommerceSituation");
  });
});
