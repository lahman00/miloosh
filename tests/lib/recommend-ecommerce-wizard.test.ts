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
import { ECOMMERCE_SITUATIONS } from "@/lib/recommend/types";

type Element = React.ReactElement<{ title?: string; selected?: boolean; children?: React.ReactNode; onClick?: () => void }>;
function elements(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}
function render() { mocks.cursor = 0; return elements(RecommendWizard()); }
function option(title: string) { return render().find(e => e.props.title === title)!; }
function button(text: string) { return render().find(e => React.Children.toArray(e.props.children).includes(text))!; }
beforeEach(() => { vi.stubGlobal("React", React); mocks.values = []; mocks.cursor = 0; mocks.track.mockClear(); mocks.push.mockClear(); });
afterEach(() => vi.unstubAllGlobals());
describe("wizard situation state and one event per selection", () => {
  it("only shows the question for ecommerce in Step 0", () => {
    expect(option("Starting from scratch")).toBeUndefined();
    option("Build an online store").props.onClick!();
    expect(option("Starting from scratch")).toBeDefined();
    button("Next").props.onClick!();
    expect(option("Starting from scratch")).toBeUndefined();
    button("Back").props.onClick!();
    expect(option("Starting from scratch")).toBeDefined();
  });
  it("each explicit selection fires once; rerenders/back/submit do not duplicate it", () => {
    option("Build an online store").props.onClick!();
    mocks.track.mockClear();
    const titles = ["Starting from scratch", "Fixing the store I already have", "Keeping my website, changing the commerce layer", "Moving an existing store to a different platform", "Not sure yet"];
    titles.forEach((title, i) => {
      // Last 'Not sure yet' is the situation option, first is the domain fallback.
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
    option("Fixing the store I already have").props.onClick!();
    button("Next").props.onClick!(); button("Back").props.onClick!();
    render().find(e => e.props.title === "Not sure yet")!.props.onClick!();
    expect(option("Fixing the store I already have")).toBeUndefined();
    option("Build an online store").props.onClick!();
    expect(render().filter(e => e.props.title === "Not sure yet").at(-1)!.props.selected).toBe(true);
    render().find(e => e.props.title === "Not sure yet")!.props.onClick!();
    for (let i = 0; i < 3; i++) button("Next").props.onClick!();
    button("Get my recommendations").props.onClick!();
    expect(mocks.push.mock.calls[0][0]).not.toContain("ecommerceSituation");
  });
});
