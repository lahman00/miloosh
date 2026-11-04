import { describe, expect, it } from "vitest";
import { buildProtectionSnapshot, protectionFor } from "@/lib/growth-agents/protection";
import { collectRegistrySignals } from "@/lib/growth-agents/protection-sources";

/**
 * Regression: the Miro production change must not become editable simply
 * because its 28-day git-log observation window has aged out.
 */
describe("Miro recrawl-gated measurement hold", () => {
  for (const date of ["2026-11-04", "2027-03-01"]) {
    it(`remains protected on ${date} until explicit measurement closure`, () => {
      const registry = collectRegistrySignals(process.cwd(), date);
      const snapshot = buildProtectionSnapshot({
        checkoutSha: "365928805bd9db5f8db7f5345b6a2d3509fd278c",
        generatedAt: `${date}T00:00:00Z`,
        sources: registry.sources,
        signals: registry.signals,
      });
      const result = protectionFor("/software/miro", snapshot);
      expect(result.verdict).toBe("PROTECTED");
      expect(result.reasons.some((reason) =>
        reason.source === "measuring-receipts" &&
        reason.evidence === "docs/work-revenue-experiment-receipt-miro-recrawl-hold-2026-11-04.json"
      )).toBe(true);
      expect(result.eligibleAfter).toBeNull();
    });
  }
});
