import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllRoleGuides } from "@/data/guides/registry";

const mocks = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  track: vi.fn(),
  dependencies: [] as unknown[][],
}));
vi.mock("react", () => ({
  useEffect: (effect: () => void, deps: unknown[]) => {
    mocks.effects.push(effect);
    mocks.dependencies.push(deps);
  },
}));
vi.mock("@/lib/analytics/track", () => ({ trackEvent: mocks.track }));
import { RoleGuideAnalytics } from "@/components/RoleGuideAnalytics";

beforeEach(() => {
  mocks.effects.length = 0;
  mocks.dependencies.length = 0;
  mocks.track.mockClear();
});

describe("RoleGuideAnalytics shared-sender contract", () => {
  it("renders no UI and does not send during render", () => {
    expect(RoleGuideAnalytics({ guideSlug: "best-ecommerce-platform-for-small-business" })).toBeNull();
    expect(mocks.track).not.toHaveBeenCalled();
  });
  it("emits exactly one guide event per effect for every registered guide", () => {
    for (const guide of getAllRoleGuides()) {
      mocks.track.mockClear();
      RoleGuideAnalytics({ guideSlug: guide.slug });
      mocks.effects.pop()!();
      expect(mocks.track).toHaveBeenCalledExactlyOnceWith({
        type: "guide_view", path: `/${guide.slug}`, guideSlug: guide.slug,
      });
      expect(mocks.dependencies.at(-1)).toEqual([guide.slug]);
    }
  });
  it("rejects empty, query-bearing and nested values rather than recording them", () => {
    for (const guideSlug of ["", "/", "guides/test", "a?email=private", "a#section", "a b", "../x"]) {
      RoleGuideAnalytics({ guideSlug });
      mocks.effects.pop()!();
    }
    expect(mocks.track).not.toHaveBeenCalled();
  });
  it("reuses the shared sender without importing the server-side catalog", () => {
    const source = readFileSync("components/RoleGuideAnalytics.tsx", "utf8");
    expect(source).toContain('from "@/lib/analytics/track"');
    expect(source).not.toMatch(/sendBeacon|fetch\(|localStorage|data\/guides/);
  });
  it("does not mount the root-guide tracker in the global layout", () => {
    expect(readFileSync("app/layout.tsx", "utf8")).not.toContain("RoleGuideAnalytics");
  });
});
