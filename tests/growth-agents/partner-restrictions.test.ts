import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import {
  PARTNER_RESTRICTIONS,
  channelVerdict,
  organicChannelsAllowed,
  restrictionsFor,
  type PartnerRestriction,
  type PromotionChannel,
} from "@/lib/growth-agents/partner-restrictions";

const ROOT = process.cwd();
const normalize = (text: string) => text.replace(/\s+/g, " ").replace(/^\s*\*\s?/gm, "").toLowerCase();

describe("typed partner-program restrictions", () => {
  it("forbids paid media for Setmore, whose approval email prohibits it", () => {
    for (const channel of ["PAID_SEARCH_OR_PPC", "PAID_SOCIAL_OR_DISPLAY", "BRAND_BIDDING"] as const) {
      expect(channelVerdict("setmore", channel), channel).toBe("FORBIDDEN");
    }
  });

  it("forbids brand bidding, unsolicited messages and third-party promotion for SurveyMonkey, and gates altered links", () => {
    expect(channelVerdict("surveymonkey", "BRAND_BIDDING")).toBe("FORBIDDEN");
    expect(channelVerdict("surveymonkey", "UNSOLICITED_MESSAGES")).toBe("FORBIDDEN");
    expect(channelVerdict("surveymonkey", "THIRD_PARTY_SOCIAL_PROMOTION")).toBe("FORBIDDEN");
    expect(channelVerdict("surveymonkey", "ALTERED_LINKS_OR_NEW_BRANDED_MATERIALS")).toBe("REQUIRES_PRIOR_WRITTEN_APPROVAL");
  });

  it("forbids paid traffic to the link and coupon sites for Trainual", () => {
    expect(channelVerdict("trainual", "PAID_AD_TRAFFIC_TO_LINK")).toBe("FORBIDDEN");
    expect(channelVerdict("trainual", "COUPON_OR_DEAL_SITES")).toBe("FORBIDDEN");
  });

  it("records FreshBooks' paid-campaign stop as Miloosh's own policy, not the vendor's", () => {
    const rows = restrictionsFor("freshbooks");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.imposedBy === "MILOOSH_POLICY")).toBe(true);
  });

  it("never answers 'allowed': a partner with no record is NOT_RECORDED, which is not permission", () => {
    expect(channelVerdict("airtable", "PAID_SEARCH_OR_PPC")).toBe("NOT_RECORDED");
    expect(channelVerdict("setmore", "COUPON_OR_DEAL_SITES")).toBe("NOT_RECORDED");
    const verdicts = new Set<string>();
    for (const row of PARTNER_RESTRICTIONS) verdicts.add(channelVerdict(row.partnerSlug, row.channel));
    expect(verdicts.has("allowed")).toBe(false);
    expect([...verdicts].every((v) => v === "FORBIDDEN" || v === "REQUIRES_PRIOR_WRITTEN_APPROVAL")).toBe(true);
  });

  it("is the stricter row when two records disagree", () => {
    const table: PartnerRestriction[] = [
      { partnerSlug: "x", channel: "BRAND_BIDDING", verdict: "REQUIRES_PRIOR_WRITTEN_APPROVAL", source: "a", imposedBy: "VENDOR" },
      { partnerSlug: "x", channel: "BRAND_BIDDING", verdict: "FORBIDDEN", source: "b", imposedBy: "VENDOR" },
    ];
    expect(channelVerdict("x", "BRAND_BIDDING", table)).toBe("FORBIDDEN");
  });

  it("proposes an organic channel only when no partner on the page forbids or gates it", () => {
    const solo = organicChannelsAllowed(["airtable"]);
    expect(solo.blocked).toEqual([]);
    expect(solo.allowed).toEqual(expect.arrayContaining<PromotionChannel>(["THIRD_PARTY_SOCIAL_PROMOTION", "UNSOLICITED_MESSAGES", "COUPON_OR_DEAL_SITES"]));

    const withSurveyMonkey = organicChannelsAllowed(["airtable", "surveymonkey"]);
    expect(withSurveyMonkey.allowed).not.toContain("THIRD_PARTY_SOCIAL_PROMOTION");
    expect(withSurveyMonkey.allowed).not.toContain("UNSOLICITED_MESSAGES");
    expect(withSurveyMonkey.blocked.map((b) => `${b.partnerSlug}:${b.channel}`)).toEqual(expect.arrayContaining(["surveymonkey:UNSOLICITED_MESSAGES", "surveymonkey:THIRD_PARTY_SOCIAL_PROMOTION"]));

    const withTrainual = organicChannelsAllowed(["trainual"]);
    expect(withTrainual.allowed).not.toContain("COUPON_OR_DEAL_SITES");
  });
});

describe("the typed table stays faithful to the repository's recorded terms (real files)", () => {
  const activeSlugs = new Set<string>(ACTIVE_PARTNERS.map((p) => p.slug));

  it("only restricts partners that are in the active registry", () => {
    for (const row of PARTNER_RESTRICTIONS) expect(activeSlugs.has(row.partnerSlug), row.partnerSlug).toBe(true);
  });

  it("points every row at a file that exists and, where it quotes a phrase, at a phrase that is in that file", () => {
    for (const row of PARTNER_RESTRICTIONS) {
      const file = /(data\/[\w\-/]+\.ts)/.exec(row.source)?.[1];
      expect(file, `${row.partnerSlug}/${row.channel}: ${row.source}`).toBeTruthy();
      const text = normalize(fs.readFileSync(path.join(ROOT, file!), "utf8"));
      for (const quoted of row.source.matchAll(/"([^"]{6,})"/g)) {
        const phrase = quoted[1]!;
        if (phrase.includes("...")) continue;
        expect(text.includes(normalize(phrase)), `${row.partnerSlug}/${row.channel}: "${phrase}" not found in ${file}`).toBe(true);
      }
    }
  });

  it("has a typed row for every active partner whose ledger prose records a program restriction", () => {
    const restrictionProse = /no paid (media|campaign|ad)|\bppc\b|google ads|brand bidding|brand ads|unsolicited|coupon|discount sites?|paid-ad traffic|altered links?|new branded/i;
    const missing: string[] = [];
    for (const relationship of CURRENT_AFFILIATE_LEDGER) {
      if (relationship.status !== "ACTIVE") continue;
      const prose = [relationship.notes, relationship.eligibility, relationship.ownerBlocker, relationship.formBlocker, relationship.commissionModel].filter(Boolean).join(" | ");
      if (!restrictionProse.test(prose)) continue;
      for (const slug of relationship.productSlugs) {
        if (activeSlugs.has(slug) && restrictionsFor(slug).length === 0) missing.push(`${slug}: "${prose.match(restrictionProse)![0]}"`);
      }
    }
    expect(missing, `Add a typed restriction in lib/growth-agents/partner-restrictions.ts for: ${missing.join("; ")}`).toEqual([]);
  });
});
