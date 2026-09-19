import { afterEach, describe, expect, it, vi } from "vitest";
const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/track", () => ({ trackEvent: track }));
vi.mock("next/navigation", () => ({ usePathname: () => "/category/ecommerce" }));
vi.mock("react", () => ({ useRef: () => ({ current: null }), useEffect: (effect: () => unknown) => effect() }));
import { FirstPartyAnalytics } from "@/components/FirstPartyAnalytics";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("canonical category instrumentation", () => {
  it("records the actual category slug once alongside page_view", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { location: { search: "?qa=1" } });
    FirstPartyAnalytics();
    expect(track.mock.calls.map(c => c[0])).toEqual([
      { type: "page_view", path: "/category/ecommerce" },
      { type: "category_view", path: "/category/ecommerce", categorySlug: "ecommerce" },
    ]);
  });
});
