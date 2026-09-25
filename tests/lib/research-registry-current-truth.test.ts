import { describe, expect, it } from "vitest";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import { researchAllCatalogSoftware } from "@/scripts/growth/research-all-software";

const records = researchAllCatalogSoftware();
const bySlug = new Map(records.map((record) => [record.slug, record]));
const activeSlugs = new Set<string>(ACTIVE_PARTNERS.map(({ slug }) => slug));

describe("catalog affiliate research registry follows current affiliate truth", () => {
  it("reports every ledger-covered catalog product with its current ledger status", () => {
    for (const relationship of CURRENT_AFFILIATE_LEDGER) {
      for (const slug of relationship.productSlugs) {
        const record = bySlug.get(slug);
        if (!record) continue;
        const expected = relationship.status === "ACTIVE" && !activeSlugs.has(slug) ? "APPROVED_NEEDS_LINK" : relationship.status;
        expect(record.status, `${slug} (${relationship.programId})`).toBe(expected);
      }
    }
  });

  it("only carries an affiliate URL for active registry partners", () => {
    for (const record of records) {
      if (record.affiliateUrl) expect(activeSlugs.has(record.slug), record.slug).toBe(true);
    }
  });

  it("locks the corrections that the stale hard-coded sets got wrong", () => {
    expect(bySlug.get("activecampaign")?.status).toBe("PENDING_REVIEW");
    expect(bySlug.get("woocommerce")?.status).toBe("PENDING_REVIEW");
    expect(bySlug.get("close")?.status).toBe("ACTIVE");
    expect(bySlug.get("freshbooks")?.status).toBe("ACTIVE");
    expect(bySlug.get("calendly")?.status).toBe("NO_REAL_PROGRAM_FOUND");
    expect(bySlug.get("bigcommerce")?.status).toBe("PROGRAM_ENDED");
    expect(bySlug.get("coda")?.status).toBe("PROGRAM_ENDED");
  });

  it("never labels an unsourced script note as verified", () => {
    for (const record of records.filter((r) => r.evidenceSource.startsWith("Unsourced"))) {
      expect(record.status, record.slug).toBe("PROGRAM_NOT_VERIFIED");
    }
  });
});
