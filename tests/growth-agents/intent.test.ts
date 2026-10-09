import { describe, expect, it } from "vitest";
import { DEFAULT_INTENT_OPTIONS, isDecisionStageQuery, summarizeIntent } from "@/lib/growth-agents/intent";

describe("which searches ask to compare, replace or price a product", () => {
  it.each([
    "clickup alternatives",
    "alternative to clickup",
    "ClickUp Alternative!",
    "clickup competitors",
    "who are mulesoft competitors",
    "mulesoft vs wso2",
    "wso2 versus mulesoft",
    "jitterbit vs. mulesoft",
    "tools like confluence",
    "software similar to confluence",
    "confluence like",
    "similar to sprout social",
    "better than confluence",
    "confluence analogs",
    "mulesoft replacement",
    "best sprout social alternatives",
    "clickup pricing",
    "mulesoft anypoint platform reviews",
    "best crm for startups",
    "clickup comparison",
    "comparatif confluence",
    "clickup vergleich",
    "clickup alternative deutsch",
    "clickup alternatifi",
    "alternativas a activecampaign",
    "active campaign alternativen",
  ])("treats %j as decision-stage", (query) => {
    expect(isDecisionStageQuery(query)).toBe(true);
  });

  it.each(["clickup", "clickup.com", "clickup login", "how to use clickup", "clickup api documentation", "clickup download", "mulesoft anypoint studio", "confluence"])("does not treat %j as a purchase decision", (query) => {
    expect(isDecisionStageQuery(query)).toBe(false);
  });

  it("is not fooled by words that merely contain a keyword", () => {
    expect(isDecisionStageQuery("plansible tutorial")).toBe(false);
    expect(isDecisionStageQuery("evs charging")).toBe(false);
    expect(isDecisionStageQuery("bestiary")).toBe(false);
  });
});

describe("summarizeIntent", () => {
  const rows = [
    { query: "clickup alternatives", impressions: 123 },
    { query: "clickup alternative", impressions: 111 },
    { query: "clickup.com", impressions: 3 },
    { query: "clickup login", impressions: 2 },
  ];

  it("counts listed queries and impressions and the decision-stage share of them", () => {
    expect(summarizeIntent(rows)).toEqual({ commercial: true, listedQueries: 4, listedImpressions: 239, decisionQueries: 2, decisionImpressions: 234, decisionShare: 0.979 });
  });

  it("calls a page commercial only when at least half of the listed impressions are decision-stage", () => {
    const half = [{ query: "x alternatives", impressions: 5 }, { query: "x login", impressions: 5 }, { query: "x docs", impressions: 5 }, { query: "x pricing", impressions: 5 }];
    expect(summarizeIntent(half).commercial).toBe(true);
    expect(summarizeIntent([...half, { query: "x download", impressions: 1 }]).commercial).toBe(false);
    expect(summarizeIntent(half, { commercialShare: 0.6 }).commercial).toBe(false);
  });

  it("says nothing, rather than guessing, when too few impressions are listed", () => {
    const tiny = [{ query: "x alternatives", impressions: 4 }];
    expect(summarizeIntent(tiny).commercial).toBeNull();
    expect(summarizeIntent(tiny, { minListedImpressions: 4 }).commercial).toBe(true);
    expect(summarizeIntent([])).toEqual({ commercial: null, listedQueries: 0, listedImpressions: 0, decisionQueries: 0, decisionImpressions: 0, decisionShare: null });
  });

  it("is a pure function of its rows, whatever their order", () => {
    expect(summarizeIntent([...rows].reverse())).toEqual(summarizeIntent(rows));
    expect(DEFAULT_INTENT_OPTIONS).toEqual({ minListedImpressions: 10, commercialShare: 0.5 });
  });
});
