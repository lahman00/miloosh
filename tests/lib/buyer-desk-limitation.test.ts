import { describe, expect, it } from "vitest";
import { getBuyerDeskProducts } from "@/lib/buyer-desk-catalog";
import { NO_LIMITATION_TEXT, makeDeskBrief, emptyDesk, type DeskProduct } from "@/lib/buyer-desk";
import { getSoftware } from "@/data/software";

describe("Buyer Desk limitations", () => {
  it("uses a product's first sourced constraint and never the old generic sentence", () => {
    for (const product of getBuyerDeskProducts()) {
      const cons = getSoftware(product.slug)!.cons;
      expect(product.limitation, product.slug).toBe(cons?.[0] ?? null);
      expect(product.limitation ?? "").not.toContain("Check the required plan, usage limits and workflow fit");
    }
  });

  it("says plainly that none is recorded in a saved brief", () => {
    const product: DeskProduct = { slug: "pipedrive", name: "P", category: "crm", description: "d", bestFor: "b", features: [], limitation: null, checkedAt: "2026-10-01" };
    const brief = makeDeskBrief({ ...emptyDesk(), saved: ["pipedrive"] }, [product]);
    expect(brief).toContain(`Limitation: ${NO_LIMITATION_TEXT}`);
  });
});
