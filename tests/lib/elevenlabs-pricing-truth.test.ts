import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";

describe("ElevenLabs pricing truth", () => {
  it("stores Creator at the ongoing $22 monthly price and labels $11 as first-month-only", () => {
    const elevenlabs = getSoftware("elevenlabs");
    expect(elevenlabs).toBeDefined();

    const creator = elevenlabs!.pricing?.tiers?.find((tier) => tier.name === "Creator");
    expect(creator?.amount).toBe("22");
    expect(creator?.billingPeriod).toBe("monthly");
    expect(creator?.notes).toContain("$22/month ongoing");
    expect(creator?.notes).toContain("first month ($11 for month one)");
    expect(elevenlabs!.pricing?.lastVerified).toBe("2026-08-26");
    expect(elevenlabs!.pricing?.officialSource).toBe("https://elevenlabs.io/pricing");
  });
});
