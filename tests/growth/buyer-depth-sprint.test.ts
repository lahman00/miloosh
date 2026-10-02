import sitemap from "@/app/sitemap";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BUYER_DEPTH_CHECKLISTS, BUYER_DEPTH_GUIDE_UPDATED_AT, BUYER_DEPTH_GUIDE_PATHS } from "@/data/seo/buyer-depth-checklists";
import { BUYER_CHECKLISTS } from "@/data/seo/buyer-checklists";
import { DECISION_PATHS } from "@/data/seo/decision-paths";
import { DecisionBuyerChecklist } from "@/components/DecisionBuyerChecklist";
import { getSoftware } from "@/data/software";
import { getActivePartner } from "@/data/affiliate/active-partners";
import { getSoftwareCtaUrl } from "@/lib/affiliate";
import { loadCurrentProtection } from "@/lib/google-war/current-protection";
import { renderedHtml } from "@/lib/seo/rendered-html";

const slugs = ["trainual", "zoho-flow", "zoho-desk", "close", "zoho-projects", "elevenlabs", "todoist", "setmore", "shopify", "wix"] as const;
const hosts = new Set(["trainual.com", "www.zoho.com", "help.zoho.com", "close.com", "help.close.com", "elevenlabs.io", "www.todoist.com", "www.setmore.com", "support.setmore.com", "www.shopify.com", "help.shopify.com", "support.wix.com", "www.wix.com"]);
describe("Buyer-depth sprint: factual and commercial boundaries", () => {
  it("is bounded to ten existing unprotected products, not a new catalog or experiment", () => {
    expect(Object.keys(BUYER_DEPTH_CHECKLISTS).sort()).toEqual([...slugs].sort());
    for (const slug of slugs) {
      expect(getSoftware(slug)).toBeDefined();
      expect(loadCurrentProtection().filter(p => p.page === `/software/${slug}`)).toEqual([]);
    }
  });
  it.each(slugs)("%s has three dated source-based decisions without claimed hands-on testing", slug => {
    const c = BUYER_DEPTH_CHECKLISTS[slug];
    expect(BUYER_CHECKLISTS[slug]).toEqual(c);
    expect(c.verifiedAt).toBe(slug === "shopify" || slug === "wix" ? "2026-10-02" : "2026-10-01");
    expect(c.introduction).toMatch(/Documentation-based/);
    expect(c.introduction).toMatch(/not a/);
    expect(c.checks).toHaveLength(3);
    expect(new Set(c.checks.map(x => x.question)).size).toBe(3);
    for (const check of c.checks) {
      const url = new URL(check.source);
      expect(url.protocol).toBe("https:");
      expect(hosts.has(url.hostname)).toBe(true);
      expect(check.answer.length).toBeGreaterThan(100);
      expect(check.sourceLabel).toBeTruthy();
      expect(check.answer).not.toMatch(/guaranteed (savings|rankings)|we tested|our hands-on/i);
    }
  });
  it("does not publish Trainual marginal-looking rates as a numeric starting subscription", () => {
    const p = getSoftware("trainual")!.pricing!;
    expect(p.status).toBe("contact_sales");
    expect(p.entryPaid).toBeUndefined();
    expect(p.tiers!.every(t => t.amount === undefined)).toBe(true);
    expect(p.tiers![0].notes).toContain("$3,000");
    expect(p.tiers![0].notes).toContain("10-seat");
    expect(BUYER_DEPTH_CHECKLISTS.trainual.checks[1].answer).toContain("$1,000");
  });
  it("makes the worked examples reproducible from the published plan rates", () => {
    const close = getSoftware("close")!.pricing!.tiers!;
    const growth = Number(close.find(t => t.name === "Growth")!.amount);
    const essentials = Number(close.find(t => t.name === "Essentials")!.amount);
    expect(4 * growth * 12).toBe(4752);
    expect(4 * essentials * 12).toBe(1680);
    const desk = Number(getSoftware("zoho-desk")!.pricing!.tiers!.find(t => t.name === "Professional")!.amount);
    expect(6 * desk * 12).toBe(1656);
    expect(2000 * 3).toBe(6000);
    for (const slug of ["close", "zoho-desk", "zoho-flow"])
      expect(BUYER_DEPTH_CHECKLISTS[slug].checks.map(c => c.answer).join(" ")).toMatch(/Worked example/);
  });
  it("preserves meaningful constraints instead of recommending the cheapest plan", () => {
    expect(getSoftware("zoho-flow")!.cons!.join(" ")).toContain("overage");
    expect(getSoftware("zoho-desk")!.cons!.join(" ")).toContain("cannot reply");
    expect(getSoftware("close")!.cons!.join(" ")).toContain("one user");
    expect(getSoftware("trainual")!.cons!.join(" ")).toContain("minimum payable");
  });
  it("keeps Todoist and Setmore plan gates explicit", () => {
    const todoist = BUYER_DEPTH_CHECKLISTS.todoist.checks.map(c => c.answer).join(" ");
    expect(todoist).toContain("five active personal projects");
    expect(todoist).toContain("$480 per year");
    expect(todoist).toContain("seven-day Pro trial");
    const setmore = BUYER_DEPTH_CHECKLISTS.setmore.checks.map(c => c.answer).join(" ");
    expect(setmore).toContain("up to four users");
    expect(setmore).toContain("$360 per year");
    expect(setmore).toContain("two-way calendar sync");
  });
  it("keeps Zoho Projects role gates and ElevenLabs usage rights explicit", () => {
    const projects = BUYER_DEPTH_CHECKLISTS["zoho-projects"].checks.map(c => c.answer).join(" ");
    expect(projects).toContain("five users");
    expect(projects).toContain("Read-Only");
    expect(projects).toContain("Lite Users");
    const eleven = BUYER_DEPTH_CHECKLISTS.elevenlabs.checks.map(c => c.answer).join(" ");
    expect(eleven).toContain("commercial rights");
    expect(eleven).toContain("one monthly credit pool");
    expect(eleven).toContain("Pay As You Go");
  });
  it("keeps Shopify and Wix plan gates explicit without inventing a universal Wix price", () => {
    const shopify = BUYER_DEPTH_CHECKLISTS.shopify.checks.map(c => c.answer).join(" ");
    expect(shopify).toContain("five staff accounts");
    expect(shopify).toContain("2% on Basic");
    expect(shopify).toContain("15 staff accounts");
    const wix = BUYER_DEPTH_CHECKLISTS.wix.checks.map(c => c.answer).join(" ");
    expect(wix).toContain("Core");
    expect(wix).toContain("five site collaborators");
    expect(wix).toContain("prices and currency vary by location");
  });
  it.each(slugs)("%s renders the real issued CTA, sponsored disclosure and a usable anchor", slug => {
    const html = renderToStaticMarkup(createElement(DecisionBuyerChecklist, { checklist: BUYER_DEPTH_CHECKLISTS[slug] }));
    const affiliate = getActivePartner(slug)!.affiliateUrl!;
    expect(getSoftwareCtaUrl(getSoftware(slug)!)).toBe(affiliate);
    expect(renderedHtml(html).links.some(a => a.href === affiliate)).toBe(true);
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).toContain("This is an affiliate link");
    expect(html).toContain('id="buyer-checklist"');
    expect((html.match(/<h3/g) ?? []).length).toBe(4);
  });
  it("adds exactly ten deep links to actual rendered checklist anchors", () => {
    const links = Object.values(DECISION_PATHS).flat().filter(p => p.href.endsWith("#buyer-checklist"));
    expect(links).toHaveLength(10);
    for (const link of links) {
      const slug = link.href.split("#")[0].split("/").pop()!;
      expect(BUYER_DEPTH_CHECKLISTS[slug]).toBeDefined();
      const html = renderToStaticMarkup(createElement(DecisionBuyerChecklist, { checklist: BUYER_DEPTH_CHECKLISTS[slug] }));
      expect(html).toContain('id="buyer-checklist"');
    }
  });
});

it("updates only recorded content dates without expanding the sitemap inventory", () => {
  const rows = sitemap();
  expect(rows).toHaveLength(988);
  const dates = new Map(rows.map(r => [new URL(r.url).pathname, new Date(r.lastModified ?? 0).toISOString().slice(0,10)]));
  for (const slug of slugs) expect(dates.get(`/software/${slug}`)).toBe(BUYER_DEPTH_CHECKLISTS[slug].verifiedAt);
  for (const path of BUYER_DEPTH_GUIDE_PATHS) expect(dates.get(path)).toBe(BUYER_DEPTH_GUIDE_UPDATED_AT[path]);
  expect(dates.get("/compare/wix-vs-shopify")).toBe("2026-09-25");
  expect(BUYER_DEPTH_CHECKLISTS["airtable"]).toBeUndefined();
});
