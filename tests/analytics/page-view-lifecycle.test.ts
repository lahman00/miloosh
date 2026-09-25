import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  path: "/software/airtable", refs: [] as { current: unknown }[], index: 0,
  effect: undefined as (() => void | (() => void)) | undefined,
  track: vi.fn(),
}));
vi.mock("react", () => ({
  useRef: (value: unknown) => hooks.refs[hooks.index++] ?? (hooks.refs[hooks.index - 1] = { current: value }),
  useEffect: (fn: typeof hooks.effect) => { hooks.effect = fn; },
}));
vi.mock("next/navigation", () => ({ usePathname: () => hooks.path }));
vi.mock("@/lib/analytics/track", () => ({ trackEvent: hooks.track }));
import { FirstPartyAnalytics } from "@/components/FirstPartyAnalytics";

function mount(path = hooks.path) {
  hooks.path = path; hooks.index = 0;
  FirstPartyAnalytics();
  return hooks.effect!();
}
beforeEach(() => {
  hooks.refs = []; hooks.path = "/software/airtable"; hooks.track.mockClear();
  vi.useFakeTimers();
  vi.stubGlobal("window", { location: { search: "" } });
  vi.stubGlobal("document", { referrer: "https://www.google.com/" });
  const store = new Map();
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => store.get(key), setItem: (key: string, value: string) => store.set(key, value) });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("page view effect lifecycle", () => {
  it("StrictMode setup -> cleanup -> setup records one visit and one dwell", () => {
    const cleanup = mount(); cleanup?.(); mount();
    vi.advanceTimersByTime(10001);
    const events = hooks.track.mock.calls.map(([e]) => e);
    expect(events.filter(e => e.type === "page_view")).toHaveLength(1);
    expect(events.filter(e => e.type === "software_view")).toHaveLength(1);
    expect(events.filter(e => e.type === "engaged_view")).toHaveLength(1);
  });
  it("real A -> B -> A navigation counts three visits without a stale dwell", () => {
    let cleanup = mount(); vi.advanceTimersByTime(5000); cleanup?.();
    cleanup = mount("/software/todoist"); vi.advanceTimersByTime(5000); cleanup?.();
    mount("/software/airtable"); vi.advanceTimersByTime(10001);
    const events = hooks.track.mock.calls.map(([e]) => e);
    expect(events.filter(e => e.type === "page_view").map(e => e.path)).toEqual(["/software/airtable", "/software/todoist", "/software/airtable"]);
    expect(events.filter(e => e.type === "engaged_view")).toHaveLength(1);
  });
});
