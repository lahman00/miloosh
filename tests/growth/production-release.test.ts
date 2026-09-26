import fs from "node:fs";
import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { assertQaOrigin, qaRequestAction } from "@/lib/authority/browser-qa-policy";
import { GET as crmJson } from "@/app/api/research/crm-plan-gates-2026/route";
import { GET as crmCsv } from "@/app/api/research/crm-plan-gates-2026/csv/route";
import { buildSupportPricingBenchmark } from "@/lib/support-pricing-benchmark/build";
import snapshots from "@/lib/support-pricing-benchmark/research-pricing-snapshots.json";
import { buildCrmPlanGateDataset } from "@/lib/crm-plan-gates/build";

describe("production read-only release contract", () => {
  it("requires exact production origin and explicit read-only opt-in", () => {
    expect(() => assertQaOrigin("http://127.0.0.1:3214")).not.toThrow();
    expect(() => assertQaOrigin("https://miloosh.com")).toThrow();
    expect(() => assertQaOrigin("https://miloosh.com", true)).not.toThrow();
    for (const origin of ["https://merchant.test", "https://miloosh.com.evil.test", "http://miloosh.com", "https://secret@miloosh.com", "https://miloosh.com/api/"]) expect(() => assertQaOrigin(origin, true)).toThrow();
  });
  it("never sends APIs, writes, internal requests or merchant navigations", () => {
    const origin = "https://miloosh.com";
    for (const method of ["GET", "POST", "PUT", "DELETE"]) {
      expect(qaRequestAction(origin, origin + "/api/outbound-click", method)).toBe("MOCK");
      expect(qaRequestAction(origin, "https://merchant.test/?affiliate=1", method)).toBe("BLOCK");
      expect(qaRequestAction(origin, origin + "/internal/growth", method)).toBe("BLOCK");
    }
    expect(qaRequestAction(origin, origin + "/research", "POST")).toBe("BLOCK");
    expect(qaRequestAction(origin, origin + "/research", "GET")).toBe("READ");
  });
  it("exports all seven CRM rows without private affiliate data", async () => {
    const r = await crmJson(), data = await r.json();
    expect(r.status).toBe(200); expect(data.rows).toEqual(buildCrmPlanGateDataset().rows);
    expect(data.sampleSize).toBe(7);
    expect(JSON.stringify(data)).not.toMatch(/affiliateUrl|CRON_SECRET|authorization/);
    const csv = await crmCsv();
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect((await csv.text()).trim().split("\n")).toHaveLength(8);
  });
  it("holds both control product files and cohort membership byte-for-byte at release intake", () => {
    const expected = {
      "data/software/reamaze.json": "21385313a113855334584786ed792563c27b651bec06c7d6e4f965af93f6d99a",
      "data/software/tidio.json": "d8b8d10c3c45ce68b143757557411a65da3145b3959008f79832626f30bd39be",
      "data/growth/frozen-cohorts.ts": "d83fbee251fbc02b09fe24243e887c4045e045ad1b79cce37af1d9ed1d4490d6",
      "data/experiments/comparison-quality-cohort.ts": "27e6614221ead9ac25e364d3d4454b59c44ec5624405c82f2821197de151c144",
    };
    for (const [file, hash] of Object.entries(expected)) expect(createHash("sha256").update(fs.readFileSync(file)).digest("hex"), file).toBe(hash);
  });
  it("keeps Claude's newly verified pricing in research-only snapshots", () => {
    const research = buildSupportPricingBenchmark();
    for (const [slug, pricing] of Object.entries(snapshots)) {
      const row = research.rows.find(r => r.slug === slug)!;
      expect(row.lastVerified).toBe(pricing.lastVerified);
      expect(row.officialSource).toBe(pricing.officialSource);
    }
    expect(research.billingUnitStats.disclosedAiUsageUnit).toBe(9);
    expect(research.rows.find(r => r.slug === "tidio")!.entryPerSeat).toBe(false);
  });
  it("dates Dataset revisions by verified content date rather than build clock", () => {
    for (const slug of ["customer-support-pricing-2026", "crm-plan-gates-2026"]) {
      const code = fs.readFileSync(`app/research/${slug}/page.tsx`, "utf8");
      expect(code).toContain("dateModified: VERIFIED_DATE");
      expect(code).not.toContain("dateModified: generatedDate");
    }
  });
  it("connects the new CRM research to an existing comparison without changing its ranking", () => {
    const page = fs.readFileSync("app/research/crm-plan-gates-2026/page.tsx", "utf8");
    expect(page).toContain('href: "/compare/pipedrive-vs-close"');
    expect(page).toContain("This is not a ranking");
  });
});
