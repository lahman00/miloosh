import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  path: "/software/airtable", refs: [] as { current: unknown }[], index: 0,
  effects: [] as Array<() => void | (() => void)>,
  track: vi.fn(),
}));
vi.mock("react", () => ({
  useRef: (value: unknown) => hooks.refs[hooks.index++] ?? (hooks.refs[hooks.index - 1] = { current: value }),
  useEffect: (fn: () => void | (() => void)) => { hooks.effects.push(fn); },
}));
vi.mock("next/navigation", () => ({ usePathname: () => hooks.path }));
vi.mock("@/lib/analytics/track", () => ({ trackEvent: hooks.track }));
import { FirstPartyAnalytics } from "@/components/FirstPartyAnalytics";
import { RESEARCH_PATHS } from "@/lib/analytics/research";

function mount(path = hooks.path) {
  hooks.path = path; hooks.index = 0; hooks.effects = [];
  FirstPartyAnalytics();
  const cleanups = hooks.effects.map(effect => effect());
  return () => cleanups.forEach(cleanup => cleanup?.());
}
let visibility: DocumentVisibilityState;
function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
}
beforeEach(() => {
  hooks.refs = []; hooks.path = "/software/airtable"; hooks.track.mockClear();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date", "performance"] });
  vi.stubGlobal("window", { location: { search: "" } });
  visibility = "visible";
  const page = new EventTarget();
  Object.defineProperty(page, "visibilityState", { get: () => visibility });
  vi.stubGlobal("document", page);
  const store = new Map();
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => store.get(key), setItem: (key: string, value: string) => store.set(key, value) });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("page view effect lifecycle", () => {
  it.each(RESEARCH_PATHS)("research StrictMode replay keeps one ordinary and one research view: %s", path => {
    const cleanup = mount(path); cleanup();
    const finalCleanup = mount();
    expect(hooks.track.mock.calls.filter(([e]) => e.type === "page_view")).toHaveLength(1);
    expect(hooks.track.mock.calls.filter(([e]) => e.type === "research_page_view")).toHaveLength(1);
    finalCleanup();
  });
  it("a background tab never fabricates an engaged view", () => {
    setVisibility("hidden");
    const cleanup = mount();
    vi.advanceTimersByTime(60_000);
    expect(hooks.track.mock.calls.filter(([e]) => e.type === "engaged_view")).toHaveLength(0);
    setVisibility("visible");
    vi.advanceTimersByTime(10_000);
    expect(hooks.track.mock.calls.filter(([e]) => e.type === "engaged_view")).toHaveLength(1);
    cleanup?.();
  });
  it("excludes hidden time and reports just one foreground-duration event", () => {
    const cleanup = mount();
    vi.advanceTimersByTime(4_000);
    setVisibility("hidden");
    vi.advanceTimersByTime(60_000);
    expect(hooks.track.mock.calls.filter(([e]) => e.type === "engaged_view")).toHaveLength(0);
    setVisibility("visible");
    vi.advanceTimersByTime(5_999);
    expect(hooks.track.mock.calls.filter(([e]) => e.type === "engaged_view")).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(hooks.track.mock.calls.filter(([e]) => e.type === "engaged_view")).toEqual([
      [{ type: "engaged_view", path: "/software/airtable", durationSeconds: 10 }],
    ]);
    setVisibility("hidden"); setVisibility("visible");
    vi.advanceTimersByTime(20_000);
    expect(hooks.track.mock.calls.filter(([e]) => e.type === "engaged_view")).toHaveLength(1);
    cleanup?.();
  });
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
