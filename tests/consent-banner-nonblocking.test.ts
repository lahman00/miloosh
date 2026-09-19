import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("components/ConsentBanner.tsx", "utf8");

describe("cookie consent banner layout guard", () => {
  it("reserves its fixed mobile height and restores body spacing on unmount", () => {
    expect(source).toContain('ref={bannerRef}');
    expect(source).toContain("getBoundingClientRect().height");
    expect(source).toContain("body.style.paddingBottom");
    expect(source).toContain("new ResizeObserver(reserveBannerSpace)");
    expect(source).toContain("body.style.paddingBottom = previousPaddingBottom");
  });
});
