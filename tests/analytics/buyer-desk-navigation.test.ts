import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrackedInternalCtaLink } from "@/components/TrackedInternalCtaLink";
import { trackEvent } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

describe("buyer desk reuses first-party internal navigation", () => {
  it.each([
    ["/software/pipedrive", "product-research"],
    ["/software/close", "shortlist-research"],
    ["/compare/pipedrive-vs-close", "full-comparison"],
    ["/recommend", "matcher"],
  ])("reports one internal event for %s, with no priorities or outbound event", (href, name) => {
    const element = TrackedInternalCtaLink({ href, sourcePath: "/", targetPath: href, ctaName: `buyer-desk-${name}`, children: "Explore" });
    expect(element.props.href).toBe(href);
    element.props.onClick();
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith({ type: "internal_cta_click", path: "/", targetPath: href, ctaName: `buyer-desk-${name}` });
    expect(element.props.target).toBeUndefined();
  });
});
