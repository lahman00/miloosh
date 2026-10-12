import { describe, expect, it } from "vitest";
import { VENDOR_STATUS_NOTES } from "@/data/seo/vendor-status-notes";
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
