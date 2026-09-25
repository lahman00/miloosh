import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { firstRevenuePriceLine, firstRevenueCompactPrice } from "@/lib/revenue/first-revenue-price";

describe("five canonical buyer pages: pricing and offer integrity", () => {
  it.each(["airtable","close","todoist","setmore"])("%s names the annual commitment without calling the monthly rate annual",(slug)=>{
    const text=firstRevenuePriceLine(getSoftware(slug)!);
    expect(text).toContain("/month");
    expect(text).toContain("Annual billing required");
    expect(text).not.toContain("/annual");
  });
  it("keeps actual annual amounts annual rather than applying a global divide-by-12 workaround",()=>{
    const s=getSoftware("airtable")!;
    expect(firstRevenuePriceLine({...s,pricing:{...s.pricing,status:"verified",entryPaid:{amount:"240",currency:"USD",billingPeriod:"annual"}}})).toContain("USD 240/year");
  });
  it("keeps ElevenLabs Creator renewal separate from the introductory discount",()=>{
    const tier=getSoftware("elevenlabs")!.pricing!.tiers!.find((t)=>t.name==="Creator")!;
    expect(tier.amount).toBe("22");
    expect(tier.notes).toContain("first-month");
    expect(tier.notes).toContain("not the renewal price");
  });
  it("has five canonical pages, twenty labeled query targets and active issued affiliate assets",()=>{
    expect(FIRST_REVENUE_PAGES).toHaveLength(5);
    expect(FIRST_REVENUE_PAGES.flatMap((p)=>p.queries)).toHaveLength(20);
    for(const p of FIRST_REVENUE_PAGES){expect(getActivePartner(p.slug)?.status).toBe("active");expect(getActivePartner(p.slug)?.affiliateUrl).toBeTruthy();expect(getSoftware(p.slug)?.pricing?.officialSource).toBeTruthy();}
  });
  it("states per-seat pricing and the free plan for Setmore",()=>expect(firstRevenuePriceLine(getSoftware("setmore")!)).toContain("Free plan available. Paid-plan snapshot: USD 5/month per seat."));
  it("gives Close specific limitations instead of hiding an empty cons array",()=>expect(getSoftware("close")!.cons).toHaveLength(2));
});

it("renders one decision panel and labels the sticky placement separately", () => {
  const layout=fs.readFileSync("app/software/[slug]/layout.tsx","utf8");
  const page=fs.readFileSync("app/software/[slug]/page.tsx","utf8");
  expect(layout).not.toContain("<FirstRevenueSoftwarePanel");
  expect(page.match(/<FirstRevenueSoftwarePanel /g)).toHaveLength(1);
  expect(layout).toContain('ctaLocation="money-page-sticky-cta"');
  expect(layout).toContain("Affiliate link");
  expect(firstRevenueCompactPrice(getSoftware("airtable")!)).toBe("USD 20/mo per seat · billed annually");
});
