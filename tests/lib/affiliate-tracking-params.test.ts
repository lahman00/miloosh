import { describe, expect, it } from "vitest";
import { withTrackingParams } from "@/lib/affiliate";

describe("affiliate tracking parameter safety", () => {
  it("never overwrites a network-issued ref parameter", () => {
    const url = withTrackingParams("https://www.setmore.com?ref=nge2zwi", { ref: "generic-miloosh-ref" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("ref")).toBe("nge2zwi");
  });

  it("adds a configured parameter when the affiliate URL does not already own that key", () => {
    const url = withTrackingParams("https://example.com/affiliate?campaign=abc", { ref: "miloosh" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("campaign")).toBe("abc");
    expect(parsed.searchParams.get("ref")).toBe("miloosh");
  });

  it("preserves an invalid URL rather than mutating or throwing", () => {
    expect(withTrackingParams("not-a-url", { ref: "miloosh" })).toBe("not-a-url");
  });
});
