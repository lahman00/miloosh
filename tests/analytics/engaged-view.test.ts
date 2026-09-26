import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeEngagedView } from "@/lib/analytics/engaged-view";

let visibility: string;
function show(state: string) {
  visibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date", "performance"] });
  visibility = "visible";
  const page = new EventTarget();
  Object.defineProperty(page, "visibilityState", { get: () => visibility });
  vi.stubGlobal("document", page);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("foreground engagement evidence", () => {
  it("does not fire early or more than once", () => {
    const report = vi.fn();
    observeEngagedView(report);
    vi.advanceTimersByTime(9_999);
    expect(report).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    show("hidden"); show("visible");
    vi.advanceTimersByTime(60_000);
    expect(report.mock.calls).toEqual([[10]]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["hidden", "prerender", "unknown"])("does not infer visibility from %s", state => {
    show(state);
    const report = vi.fn();
    const stop = observeEngagedView(report);
    vi.advanceTimersByTime(60_000);
    expect(report).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });
  it("cleans up both the timer and visibility listener on navigation", () => {
    const report = vi.fn();
    const stop = observeEngagedView(report);
    vi.advanceTimersByTime(5_000);
    stop(); stop();
    show("hidden"); show("visible");
    vi.advanceTimersByTime(20_000);
    expect(report).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("ignores system-clock changes", () => {
    const report = vi.fn();
    observeEngagedView(report);
    vi.advanceTimersByTime(4_000);
    vi.setSystemTime(Date.now() + 60 * 60 * 1000);
    show("hidden");
    vi.advanceTimersByTime(30_000);
    show("visible");
    vi.advanceTimersByTime(6_000);
    expect(report.mock.calls).toEqual([[10]]);
  });
  it("does not double-credit redundant visibility events", () => {
    const report = vi.fn();
    observeEngagedView(report);
    vi.advanceTimersByTime(4_000);
    show("visible"); show("visible");
    vi.advanceTimersByTime(5_999);
    expect(report).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(report.mock.calls).toEqual([[10]]);
  });
  it("rejects an uncertain interval if the timer runs hidden before visibilitychange", () => {
    const report = vi.fn();
    observeEngagedView(report);
    visibility = "hidden";
    vi.advanceTimersByTime(10_000);
    expect(report).not.toHaveBeenCalled();
    show("visible");
    vi.advanceTimersByTime(9_999);
    expect(report).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(report.mock.calls).toEqual([[10]]);
  });
  it("does nothing without a document", () => {
    vi.stubGlobal("document", undefined);
    const report = vi.fn();
    expect(() => observeEngagedView(report)()).not.toThrow();
    expect(report).not.toHaveBeenCalled();
  });
});
