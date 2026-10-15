import { describe, expect, it } from "vitest";
import { slugsWithSearchVisibility } from "@/lib/site-audit/search-data";

const csv = `Top pages,Clicks,Impressions,CTR,Position
https://miloosh.com/compare/a-vs-b,0,12,0%,40
https://www.miloosh.com/compare/a-vs-b/,1,3,0%,30
https://miloosh.com/compare/c-vs-d,0,0,0%,0
https://miloosh.com/compare/not-listed-vs-x,5,"1,200",0%,3
https://miloosh.com/software/slack,9,90,0%,3`;

describe("slugsWithSearchVisibility", () => {
  it("sums the www and apex rows of a listed page and ignores unlisted pages and zero rows", () => {
    expect(slugsWithSearchVisibility(csv, ["a-vs-b", "c-vs-d"])).toEqual([{ slug: "a-vs-b", clicks: 1, impressions: 15 }]);
  });
  it("rejects a file without the expected columns", () => {
    expect(() => slugsWithSearchVisibility("a,b\n1,2", ["x"])).toThrow(/Pages export/);
  });
});
