import { describe, it, expect } from "vitest";
import { assignCtaCopyVariant, getCtaCopyLabel, CTA_COPY_EXPERIMENT_ID } from "@/lib/experiments/cta-copy-experiment";

describe("CTA copy experiment", () => {
  it("assigns the same variant to the same visitorId every time (deterministic, no flicker across sessions)", () => {
    const id = "v_abc123xyz";
    const first = assignCtaCopyVariant(id);
    for (let i = 0; i < 20; i++) {
      expect(assignCtaCopyVariant(id)).toBe(first);
    }
  });

  it("splits a real spread of visitor IDs roughly evenly between control and treatment", () => {
    const ids = Array.from({ length: 200 }, (_, i) => `v_${i}_${Math.random().toString(36).slice(2)}`);
    const counts = { control: 0, treatment: 0 };
    for (const id of ids) counts[assignCtaCopyVariant(id)]++;
    // Not a strict 50/50 requirement -- just proves neither arm is starved.
    expect(counts.control).toBeGreaterThan(50);
    expect(counts.treatment).toBeGreaterThan(50);
  });

  it("control copy is byte-identical to the pre-experiment CTA text", () => {
    expect(getCtaCopyLabel("control", "CircleCI")).toBe("Visit CircleCI");
  });

  it("treatment copy names the destination as the official site, without claiming pricing/trial/deal", () => {
    const label = getCtaCopyLabel("treatment", "CircleCI");
    expect(label).toBe("Visit CircleCI's Official Site");
    expect(label.toLowerCase()).not.toMatch(/pricing|trial|deal|best|save/);
  });

  it("experiment ID is a stable, non-empty string", () => {
    expect(CTA_COPY_EXPERIMENT_ID.length).toBeGreaterThan(0);
  });
});
