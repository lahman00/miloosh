import { describe, expect, it } from "vitest";
import promptsSeed from "@/data/growth/cloro/prompts.json";
import baselineSeed from "@/data/growth/cloro/baseline-20260927.json";
import {
  cloroReportSchema,
  cloroPromptSchema,
  estimateCloroCredits,
  observationFromResponse,
} from "@/lib/growth/cloro-visibility";

describe("Cloro visibility evidence", () => {
  const prompts = cloroPromptSchema.array().parse(promptsSeed);

  it("keeps the default baseline under a bounded 60-credit budget", () => {
    expect(estimateCloroCredits(prompts, ["chatgpt", "perplexity", "google"])).toBe(54);
  });

  it("records the 2026-09-27 baseline as brand recognition without generic visibility", () => {
    const report = cloroReportSchema.parse(baselineSeed);
    expect(report.observations).toHaveLength(9);
    expect(report.summary.brandRecognizedProviders).toEqual(["chatgpt", "perplexity", "google"]);
    expect(report.summary.genericVisibleProviders).toEqual([]);
    expect(report.summary.brandOnly).toBe(true);
    expect(report.summary.noGenericVisibility).toBe(true);
    expect(report.chargedCredits).toBe(54);
  });

  it("uses source URLs rather than answer prose to establish citation evidence", () => {
    const observation = observationFromResponse({
      prompt: prompts.find(p => p.id === "support")!,
      provider: "chatgpt",
      country: "US",
      capturedAt: "2026-09-27T12:00:00Z",
      statusCode: 200,
      creditsCharged: 7,
      requestId: "req-1",
      raw: {
        success: true,
        result: {
          text: "Miloosh is mentioned here but not cited.",
          sources: [{ position: 1, label: "Other", url: "https://example.com/x" }],
        },
      },
    });
    expect(observation.milooshMentioned).toBe(true);
    expect(observation.milooshCited).toBe(false);
  });

  it("captures Miloosh's exact Google organic position when present", () => {
    const observation = observationFromResponse({
      prompt: prompts.find(p => p.id === "brand")!,
      provider: "google",
      country: "US",
      capturedAt: "2026-09-27T12:00:00Z",
      statusCode: 200,
      creditsCharged: 5,
      requestId: "req-2",
      raw: {
        success: true,
        result: {
          organicResults: [
            { position: 1, title: "Other", url: "https://example.com" },
            { position: 7, title: "Miloosh", url: "https://miloosh.com/" },
          ],
        },
      },
    });
    expect(observation.milooshCited).toBe(true);
    expect(observation.milooshOrganicPosition).toBe(7);
  });
});
