import { describe, expect, it } from "vitest";
import { VENDOR_STATUS_NOTES } from "@/data/seo/vendor-status-notes";
import clari from "@/data/software/clari.json";
import { getSoftware } from "@/data/software";

describe("vendor status notes", () => {
  it("name real profiles, a real date, an https source, and say the facts are not yet verified", () => {
    for (const [slug, note] of Object.entries(VENDOR_STATUS_NOTES)) {
      expect(getSoftware(slug), slug).toBeDefined();
      expect(note.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(note.sourceUrl).toMatch(/^https:\/\//);
      expect(note.text).toContain("not yet verified");
    }
  });
});

describe("Clari merger evidence", () => {
  it("distinguishes the completion announcement date from a legal closing date across the note and FAQ", () => {
    const note = VENDOR_STATUS_NOTES.clari;
    const answer = clari.faq.find((entry) => entry.question === "Are Clari and Salesloft the same company?")!.answer;
    for (const text of [note.text, answer]) {
      expect(text).toContain("announcement published December 3, 2025");
      expect(text).toContain("completed their merger");
      expect(text).not.toContain("completed their merger on December");
      expect(text).not.toContain("does not say the merger has closed");
    }
    expect(clari.sources).toContain(note.sourceUrl);
    expect(note.text).toContain("Pricing, features and security details");
    expect(note.text).toContain("not yet verified");
  });

  it("keeps the product name distinct from the unified company brand without claiming completed module integration", () => {
    expect(clari.description).toContain("now part of Salesloft");
    expect(clari.cons.join(" ")).toContain("Clari Forecast retains its name");
    expect(clari.cons.join(" ")).toContain("verify current module packaging and integration");
    expect(clari.sources).toContain("https://www.salesloft.com/company/newsroom/salesloft-unveils-unified-brand-identity");
  });
});
