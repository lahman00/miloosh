import { describe, expect, it } from "vitest";
import { importInspectionUi, indexState } from "@/lib/google-war/evidence";
const url = "https://miloosh.com/research/customer-support-pricing-2026";
const inspect = (label: string) => importInspectionUi({ url, capturedAt: "2026-09-28T04:51:30Z",
  text: `${url}\nבדיקת כתובת אתר\n${label}\nסריקה אחרונה\nלא זמין`,
}, "Authenticated GSC UI translation regression fixture; not a fresh production observation");

describe("GSC translated coverage labels", () => {
  it("does not manufacture a crawl from the ambiguous Hebrew Discovered label", () => {
    const row = inspect("נסרק אך לא נכלל באינדקס");
    expect(row.coverageState).toBeNull();
    expect(indexState(row)).toBe("UNKNOWN");
    expect(indexState({ ...row, coverageState: "נסרק אך לא נכלל באינדקס" })).toBe("UNKNOWN");
  });
  it("retains the independently sampled unambiguous Crawled label", () => {
    expect(indexState(inspect("נסרק - לא נכלל באינדקס כרגע"))).toBe("CRAWLED_NOT_INDEXED");
  });
  it("uses exact English evidence to distinguish discovery from crawling", () => {
    const row = inspect("נסרק אך לא נכלל באינדקס");
    expect(indexState({ ...row, coverageState: "Discovered - currently not indexed" })).toBe("DISCOVERED_NOT_INDEXED");
    expect(indexState({ ...row, coverageState: "Crawled - currently not indexed" })).toBe("CRAWLED_NOT_INDEXED");
  });
});
