import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/software/wix" }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: () => {}, useState: (initial: unknown) => [initial, () => {}], useRef: () => ({ current: null }) }));
import { TrackedVendorLink } from "@/components/TrackedVendorLink";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";

beforeEach(() => {
  vi.stubGlobal("window", { location: { search: "?qa=1" } });
  vi.stubGlobal("localStorage", { getItem: () => { throw Error("blocked"); } });
  vi.stubGlobal("sessionStorage", { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({}));
});
afterEach(() => vi.unstubAllGlobals());

describe.each([TrackedVendorLink, TrackedCtaLink])("native outbound activation: %s", Component => {
  function link() { return Component({ slug: "wix", href: "https://example.invalid/never-navigate", ctaLocation: "software-page-cta", children: "Visit vendor" }); }
  it.each([0, 1, 2])("records button %i only once and does not prevent native navigation", button => {
    const event = { button, preventDefault: vi.fn() };
    const element = link();
    if (button === 0) element.props.onClick(event); else element.props.onAuxClick(event);

    const calls = vi.mocked(fetch).mock.calls;
    const outboundCalls = calls.filter(([url]) => url === "/api/outbound-click");
    const analyticsCalls = calls.filter(([url]) => url === "/api/analytics/event");

    expect(outboundCalls).toHaveLength(button === 2 ? 0 : 1);
    expect(analyticsCalls).toHaveLength(button !== 2 && Component === TrackedCtaLink ? 1 : 0);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(element.props.href).toBe("https://example.invalid/never-navigate");

    if (button !== 2) {
      expect(JSON.parse(outboundCalls[0]![1]!.body as string).isTest).toBe(true);
      if (Component === TrackedCtaLink) {
        expect(JSON.parse(analyticsCalls[0]![1]!.body as string).type).toBe("cta_click");
      }
    }
  });
  it("tracking rejection or synchronous denial never throws into navigation", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(Error("offline"));
    expect(() => link().props.onClick({ preventDefault: vi.fn() })).not.toThrow();
    await Promise.resolve();
    vi.mocked(fetch).mockImplementationOnce(() => { throw Error("API denied"); });
    expect(() => link().props.onClick({ preventDefault: vi.fn() })).not.toThrow();
  });
});
