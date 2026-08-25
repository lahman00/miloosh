import { describe, expect, it } from "vitest";
import { buildCommercialGraph } from "@/scripts/growth/commercial-graph-engine";

function node(slug: string) {
  const found = buildCommercialGraph().nodes.find((item) => item.slug === slug);
  expect(found, `expected commercial graph node for ${slug}`).toBeDefined();
  return found!;
}

describe("commercial graph current affiliate truth", () => {
  it("never resurrects rejected programs merely because historical research says the program exists", () => {
    expect(node("clickup").affiliateStatus).toBe("REJECTED");
  });

  it("keeps dead or explicitly absent publisher paths out of the opportunity pool", () => {
    expect(node("calendly").affiliateStatus).toBe("NO_PROGRAM");
    expect(node("coda").affiliateStatus).toBe("REJECTED");
  });

  it("keeps current owner-gated routes owner-blocked instead of pretending they are ready programs", () => {
    expect(node("shift4shop").affiliateStatus).toBe("OWNER_BLOCKED");
    expect(node("later").affiliateStatus).toBe("OWNER_BLOCKED");
  });

  it("lets the verified active registry override every non-active research artifact", () => {
    expect(node("close").affiliateStatus).toBe("ACTIVE");
  });
});
