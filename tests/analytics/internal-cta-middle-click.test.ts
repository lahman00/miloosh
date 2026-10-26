import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));

import { trackEvent } from "@/lib/analytics/track";
import { TrackedInternalCtaLink } from "@/components/TrackedInternalCtaLink";

type Handlers = { onClick: () => void; onAuxClick: (event: { button: number }) => void };
const render = (extra: object = {}) => TrackedInternalCtaLink({ href: "/compare/a-vs-b", sourcePath: "/", targetPath: "/compare/a-vs-b", ctaName: "x", children: "Go", ...extra }).props as Handlers;
const expected = { type: "internal_cta_click", path: "/", targetPath: "/compare/a-vs-b", ctaName: "x" };

describe("TrackedInternalCtaLink middle click", () => {
  beforeEach(() => vi.mocked(trackEvent).mockClear());

  it("counts a middle-click (opens a new tab without a click event)", () => {
    render().onAuxClick({ button: 1 });
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(expected);
  });
  it("ignores other auxiliary buttons such as right-click", () => {
    render().onAuxClick({ button: 2 });
    expect(trackEvent).not.toHaveBeenCalled();
  });
  it("still counts a normal click exactly once and still calls a caller's onAuxClick", () => {
    const caller = vi.fn();
    const handlers = render({ onAuxClick: caller });
    handlers.onClick();
    expect(trackEvent).toHaveBeenCalledTimes(1);
    handlers.onAuxClick({ button: 1 });
    expect(caller).toHaveBeenCalledTimes(1);
  });
});
