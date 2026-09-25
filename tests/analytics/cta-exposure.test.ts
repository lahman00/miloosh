import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeCtaExposure } from "@/lib/analytics/cta-exposure";

let callback: (entries: Partial<IntersectionObserverEntry>[]) => void;
let visibilityChange: () => void;
const node = {} as Element;
const disconnect = vi.fn();
const doc = { visibilityState: "visible", addEventListener: vi.fn(), removeEventListener: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  doc.visibilityState = "visible";
  doc.addEventListener.mockImplementation((_name, fn) => { visibilityChange = fn; });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("IntersectionObserver", class {
    constructor(fn: typeof callback) { callback = fn; }
    observe = vi.fn();
    disconnect = disconnect;
  });
});
afterEach(() => vi.unstubAllGlobals());
const intersection = (ratio: number) => callback([{ target: node, isIntersecting: ratio > 0, intersectionRatio: ratio }]);

describe("CTA exposure truth", () => {
  it("does not count an initial below-threshold intersection; counts half-visible once", () => {
    const report = vi.fn();
    observeCtaExposure(node, report);
    intersection(0.01); intersection(0.49);
    expect(report).not.toHaveBeenCalled();
    intersection(0.5); intersection(1); intersection(0); intersection(1);
    expect(report).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
  it("defers a background-tab intersection until the document is visible", () => {
    const report = vi.fn();
    doc.visibilityState = "hidden";
    observeCtaExposure(node, report);
    intersection(1);
    expect(report).not.toHaveBeenCalled();
    doc.visibilityState = "visible";
    visibilityChange(); visibilityChange();
    expect(report).toHaveBeenCalledTimes(1);
  });
  it("does not reuse an old positive intersection when the link moved out of view", () => {
    doc.visibilityState = "hidden";
    const report = vi.fn();
    const cleanup = observeCtaExposure(node, report);
    intersection(1); intersection(0);
    doc.visibilityState = "visible";
    visibilityChange(); cleanup();
    expect(report).not.toHaveBeenCalled();
    expect(doc.removeEventListener).toHaveBeenCalledWith("visibilitychange", visibilityChange);
  });
  it("unsupported observer does not crash or manufacture exposure", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const report = vi.fn();
    expect(() => observeCtaExposure(node, report)()).not.toThrow();
    expect(report).not.toHaveBeenCalled();
  });
});
