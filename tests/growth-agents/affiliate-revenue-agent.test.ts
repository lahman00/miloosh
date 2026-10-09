import { describe, expect, it } from "vitest";
import { runAffiliateRevenueAgent, type AffiliateRevenueInputs } from "@/lib/growth-agents/affiliate-revenue-agent";
import { funnelFromEvents, unavailableFunnel } from "@/lib/growth-agents/funnel";
import { loadPartnerFacts, type PartnerFacts } from "@/lib/growth-agents/partners";
import { PARTNER_RESTRICTIONS } from "@/lib/growth-agents/partner-restrictions";
import { NOW, PROV, U, makeEvidence, makeInventory, makeProtection, makeSoftware, makeWorld, partnerFacts, signal, type PageRow } from "./fixtures";

const HIST: PageRow[] = [
  [U("/software/alpha"), 0, 240, 70],
  [U("/software/beta"), 0, 300, 75],
  [U("/software/gamma"), 0, 80, 60],
  [U("/compare/alpha-vs-beta"), 0, 40, 12],
  [U("/compare/beta-vs-gamma"), 0, 30, 30],
  [U("/software/delta"), 0, 6, 8],
];

const blockedRail = { railId: "rail-blocked", railLabel: "Blocked rail", readiness: "OWNER_ACTION_REQUIRED" as const, ownerActionPackId: "pack-blocked" };
const otherRail = { railId: "rail-other", railLabel: "Other rail", readiness: "UNVERIFIED" as const, ownerActionPackId: "pack-other" };

function run(partners: PartnerFacts[] | null, overrides: Partial<AffiliateRevenueInputs> = {}) {
  return runAffiliateRevenueAgent({
    now: NOW,
    partners,
    gsc: makeEvidence({ hist: HIST, recent: [[U("/"), 0, 4, 5]] }),
    inventory: makeInventory(),
    protection: makeProtection(),
    funnel: unavailableFunnel("not read in this test"),
    ...overrides,
  });
}

describe("missing partner registry", () => {
  it("returns NEEDS_DATA and makes no revenue statement", () => {
    const report = run(null);
    expect(report.status).toBe("NEEDS_DATA");
    expect(report.missingInputs).toEqual(["partner registry"]);
    expect(report.counts.activePartners).toBe(0);
    expect(report.recommendation.kind).toBe("NO_ACTION");
    expect(report.recommendation.summary).toMatch(/could not be read/);
  });
});

describe("outcomes are never invented", () => {
  it("reports conversions, approved commissions and payouts as NOT_MEASURED for any registry state", () => {
    for (const report of [run(null), run([partnerFacts("alpha")]), makeWorld().affiliate]) {
      for (const stage of [report.outcomes.conversions, report.outcomes.approvedCommissions, report.outcomes.payoutsReceived]) {
        expect(stage.state).toBe("NOT_MEASURED");
        expect("value" in stage).toBe(false);
      }
      expect(report.limitations.join(" ")).toMatch(/NOT_MEASURED, not zero/);
    }
  });

  it("keeps a revenue-ready partner distinct from a measured conversion", () => {
    const report = run([partnerFacts("alpha", { revenueReady: true })]);
    expect(report.counts.revenueReady).toBe(1);
    expect(report.outcomes.conversions.state).toBe("NOT_MEASURED");
  });

  it("carries hand-entered network observations without treating them as conversions", () => {
    const signals = [{ observedAt: "2026-09-10", signal: "Network dashboard showed 5 clicks", clickFloor: 5 }];
    const report = run([partnerFacts("alpha", { networkSignals: signals })]);
    expect(report.partners[0]!.networkSignals).toEqual(signals);
    expect(report.outcomes.conversions.state).toBe("NOT_MEASURED");
  });

  it("passes the first-party funnel through unchanged and never mixes it into the outcomes", () => {
    const funnel = funnelFromEvents([], PROV, null);
    const report = run([partnerFacts("alpha")], { funnel });
    expect(report.funnel).toBe(funnel);
    expect(JSON.stringify(report.outcomes)).not.toMatch(/partnerClicks/);
  });
});

describe("counts and readiness stay separate facts", () => {
  it("counts approval, issued link, technical path, payout readiness and revenue readiness independently", () => {
    const report = run([
      partnerFacts("alpha"),
      partnerFacts("beta", { issuedLinkPresent: false, technicalPathReady: false, revenueReady: false }),
      partnerFacts("gamma", { payout: blockedRail, revenueReady: false }),
      partnerFacts("delta", { payout: otherRail, revenueReady: false }),
    ]);
    expect(report.counts).toEqual({
      activePartners: 4,
      issuedLinks: 3,
      technicalPathReady: 3,
      payoutVerified: 2,
      payoutOwnerActionRequired: 1,
      payoutUnverified: 1,
      revenueReady: 1,
      ledgerDisagreements: 0,
    });
  });

  it("flags a disagreement between the active registry and the ledger instead of trusting either", () => {
    const report = run([partnerFacts("alpha", { ledgerAgrees: false, ledgerStatus: "PENDING_REVIEW" }), partnerFacts("beta", { ledgerAgrees: false, ledgerStatus: null }), partnerFacts("gamma", { registryActive: false })]);
    const byApproval = Object.fromEntries(report.partners.map((p) => [p.slug, p.approval]));
    expect(byApproval).toEqual({ alpha: "LEDGER_DISAGREES", beta: "REGISTRY_ONLY", gamma: "LEDGER_DISAGREES" });
    expect(report.counts.ledgerDisagreements).toBe(3);
  });
});

describe("partner-program restrictions travel with the partner", () => {
  it("attaches the typed restrictions of each partner to its row", () => {
    const report = run([partnerFacts("setmore"), partnerFacts("airtable")]);
    const setmore = report.partners.find((p) => p.slug === "setmore")!;
    const airtable = report.partners.find((p) => p.slug === "airtable")!;
    expect(setmore.restrictions.map((r) => r.channel)).toEqual(expect.arrayContaining(["PAID_SEARCH_OR_PPC", "BRAND_BIDDING"]));
    expect(airtable.restrictions).toEqual([]);
    expect(report.limitations.join(" ")).toMatch(/NOT_RECORDED, not unrestricted/);
  });

  it("uses an injected restriction table, so a changed program term is picked up", () => {
    const report = run([partnerFacts("alpha")], { restrictions: [{ ...PARTNER_RESTRICTIONS[0]!, partnerSlug: "alpha" }] });
    expect(report.partners[0]!.restrictions).toHaveLength(1);
  });
});

describe("payout blockers are ranked by the demand they hold back", () => {
  const partners = [
    partnerFacts("alpha", { payout: otherRail, revenueReady: false, comparisonPageUrls: [U("/compare/alpha-vs-beta")] }),
    partnerFacts("gamma", { payout: blockedRail, revenueReady: false, comparisonPageUrls: [U("/compare/beta-vs-gamma")] }),
  ];

  it("lists each unverified rail once with its partners and the pages' historical impressions, each page counted once", () => {
    const report = run(partners);
    expect(report.payoutBlockers.map((b) => b.railId)).toEqual(["rail-other", "rail-blocked"]);
    expect(report.payoutBlockers[0]).toMatchObject({ partners: ["alpha"], historicalImpressionsAtStake: 280, pagesWithHistoricalDemand: 2 });
    expect(report.payoutBlockers[1]).toMatchObject({ partners: ["gamma"], historicalImpressionsAtStake: 110, pagesWithHistoricalDemand: 2 });
  });

  it("counts a page shared by two partners on one rail only once", () => {
    const shared = [
      partnerFacts("alpha", { payout: blockedRail, revenueReady: false, comparisonPageUrls: [U("/compare/alpha-vs-beta")] }),
      partnerFacts("beta", { payout: blockedRail, revenueReady: false, comparisonPageUrls: [U("/compare/alpha-vs-beta")] }),
    ];
    const blocker = run(shared).payoutBlockers[0]!;
    expect(blocker.partners).toEqual(["alpha", "beta"]);
    // alpha 240 + beta 300 + one copy of the shared comparison (40)
    expect(blocker.historicalImpressionsAtStake).toBe(580);
  });

  it("does not rank a rail by demand it cannot measure: unmeasured demand sorts last and is reported as null", () => {
    const report = run(partners, { gsc: null });
    expect(report.payoutBlockers.every((b) => b.historicalImpressionsAtStake === null)).toBe(true);
    expect(report.payoutBlockers.map((b) => b.railId)).toEqual(["rail-blocked", "rail-other"]);
    expect(report.recommendation.summary).toMatch(/an unmeasured amount of/);
  });

  it("is not listed at all when every rail is verified", () => {
    expect(run([partnerFacts("alpha"), partnerFacts("gamma")]).payoutBlockers).toEqual([]);
  });
});

describe("one recommendation, chosen by fixed precedence", () => {
  const ok = partnerFacts("alpha");
  const payoutBlocked = partnerFacts("gamma", { payout: blockedRail, revenueReady: false });
  const brokenPath = partnerFacts("beta", { technicalPathReady: false, revenueReady: false });
  const conflict = partnerFacts("delta", { ledgerAgrees: false });

  it("repairs a broken technical path before anything else", () => {
    const report = run([ok, payoutBlocked, brokenPath, conflict]);
    expect(report.recommendation).toMatchObject({ kind: "REPAIR_TECHNICAL_PATH", subject: "beta", requiresOwnerDecision: false });
  });

  it("then resolves a registry/ledger conflict", () => {
    const report = run([ok, payoutBlocked, conflict]);
    expect(report.recommendation).toMatchObject({ kind: "RESOLVE_REGISTRY_CONFLICT", subject: "delta", requiresOwnerDecision: true });
  });

  it("then asks the owner to finish the payout setup that holds back the most demand", () => {
    const report = run([ok, payoutBlocked]);
    expect(report.recommendation).toMatchObject({ kind: "OWNER_PAYOUT_ACTION", subject: "rail-blocked", requiresOwnerDecision: true });
    expect(report.recommendation.evidence.join(" ")).toMatch(/owner action pack pack-blocked/);
    expect(report.recommendation.summary).toMatch(/cannot be shown to end in a payable commission/);
  });

  it("then asks to measure the funnel when the funnel could not be read", () => {
    const report = run([ok]);
    expect(report.recommendation.kind).toBe("MEASURE_FUNNEL");
    expect(report.recommendation.requiresOwnerDecision).toBe(false);
  });

  it("only reports no action when everything is ready and the funnel was measured", () => {
    const report = run([ok], { funnel: funnelFromEvents([], PROV, null) });
    expect(report.recommendation.kind).toBe("NO_ACTION");
  });

  it("picks the technical gap with the most historical demand", () => {
    const small = partnerFacts("delta", { technicalPathReady: false, revenueReady: false });
    const big = partnerFacts("beta", { technicalPathReady: false, revenueReady: false });
    expect(run([small, big]).recommendation.subject).toBe("beta");
  });
});

describe("non-partner opportunities", () => {
  it("lists pages with demand whose products have no active partner, largest first, with the ledger status passed through", () => {
    const status = (slug: string) => (slug === "beta" ? { status: "PENDING_REVIEW", note: "application submitted" } : { status: null, note: null });
    const report = run([partnerFacts("alpha", { comparisonPageUrls: [U("/compare/alpha-vs-beta")] })], { programStatus: status });
    expect(report.nonPartnerDemand.map((r) => r.url)).toEqual([U("/software/beta"), U("/software/gamma"), U("/compare/beta-vs-gamma"), U("/software/delta")]);
    expect(report.nonPartnerDemand[0]).toMatchObject({ historicalImpressions: 300, programStatus: "PENDING_REVIEW", programNote: "application submitted" });
    // Pages that list an active partner (alpha, or the comparison it appears in) are not "non-partner".
    expect(report.nonPartnerDemand.map((r) => r.url)).not.toContain(U("/software/alpha"));
    expect(report.nonPartnerDemand.map((r) => r.url)).not.toContain(U("/compare/alpha-vs-beta"));
  });

  it("never turns a pending, rejected or unverified program into a partner", () => {
    const report = run([partnerFacts("alpha")], { programStatus: () => ({ status: "ACTIVE", note: "claimed elsewhere" }) });
    expect(report.counts.activePartners).toBe(1);
    expect(report.partners.map((p) => p.slug)).toEqual(["alpha"]);
    expect(report.nonPartnerDemand.every((r) => r.programStatus === "ACTIVE")).toBe(true);
  });

  it("counts comparisons by how many sides carry an active partner, and only sitemap-listed ones as monetised in the sitemap", () => {
    const both = run([partnerFacts("alpha"), partnerFacts("beta")]);
    expect(both.commercialPaths).toMatchObject({ comparisonsTotal: 2, comparisonsWithActivePartnerOnOneSide: 1, comparisonsWithActivePartnerOnBothSides: 1, monetizedComparisonsInSitemap: 2 });
    const noSitemap = run([partnerFacts("alpha"), partnerFacts("beta")], { inventory: makeInventory({ sitemapPaths: ["/"] }) });
    expect(noSitemap.commercialPaths!.monetizedComparisonsInSitemap).toBe(0);
  });

  it("makes no catalogue claim without an inventory", () => {
    const report = run([partnerFacts("alpha")], { inventory: null });
    expect(report.commercialPaths).toBeNull();
    expect(report.nonPartnerDemand).toEqual([]);
  });
});

describe("demand and protection are attached, not assumed", () => {
  it("reports measured historical demand for a partner's software page and comparisons", () => {
    const row = run([partnerFacts("alpha", { comparisonPageUrls: [U("/compare/alpha-vs-beta")] })]).partners[0]!;
    expect(row.demand).toMatchObject({ historicalImpressions: 280, recentImpressions: 0, pagesWithHistoricalDemand: 2, pagesChecked: 2 });
  });

  it("reports null demand, not zero, when there is no Search Console capture", () => {
    const row = run([partnerFacts("alpha")], { gsc: null }).partners[0]!;
    expect(row.demand.historicalImpressions).toBeNull();
    expect(row.demand.recentImpressions).toBeNull();
    expect(row.demand.basis).toBe("no Search Console capture");
  });

  it("reports recent demand as unknown when any of the partner's pages is not observed", () => {
    const gsc = makeEvidence({ hist: HIST, recent: [[U("/"), 0, 4, 5]], zeroJustification: false });
    const row = run([partnerFacts("alpha")], { gsc }).partners[0]!;
    expect(row.demand.historicalImpressions).toBe(240);
    expect(row.demand.recentImpressions).toBeNull();
  });

  it("shows whether the partner's software page is protected", () => {
    const protection = makeProtection([signal({ urls: [U("/software/alpha")] })]);
    const rows = run([partnerFacts("alpha"), partnerFacts("beta")], { protection }).partners;
    expect(rows.find((r) => r.slug === "alpha")!.softwarePageProtection).toBe("PROTECTED");
    expect(rows.find((r) => r.slug === "beta")!.softwarePageProtection).toBe("EDITABLE");
    expect(run([partnerFacts("alpha")], { protection: null }).partners[0]!.softwarePageProtection).toBe("NOT_CHECKED");
  });
});

describe("pages that show a call to action for a partner they are not about", () => {
  // beta's decision guide and buyer checklist show a call to action for each of the given products.
  const listing = (...shown: string[]) => makeInventory({ otherCtas: { beta: shown } });

  it("reports the demand on other products' pages that show the partner, separately from its own pages", () => {
    const row = run([partnerFacts("alpha", { comparisonPageUrls: [U("/compare/alpha-vs-beta")] })], { inventory: listing("alpha") }).partners[0]!;
    expect(row.demand).toMatchObject({ historicalImpressions: 280, pagesChecked: 2 });
    expect(row.demand.viaOtherCtas).toEqual({ pagesChecked: 1, pagesWithHistoricalDemand: 1, historicalImpressions: 300 });
  });

  it("never counts the partner's own page as exposure through itself", () => {
    const inventory = makeInventory({ software: [makeSoftware("alpha"), makeSoftware("beta")], comparisons: [], otherCtas: { alpha: ["alpha"] } });
    expect(run([partnerFacts("alpha")], { inventory }).partners[0]!.demand.viaOtherCtas).toEqual({ pagesChecked: 0, pagesWithHistoricalDemand: 0, historicalImpressions: 0 });
  });

  it("does not trust the inventory to leave a page's own product out of what it shows", () => {
    const inventory = makeInventory();
    inventory.pages.get(U("/software/alpha"))!.otherCtaSlugs.push("alpha");
    expect(run([partnerFacts("alpha")], { inventory }).partners[0]!.demand.viaOtherCtas).toMatchObject({ pagesChecked: 0 });
  });

  it("does not know the exposure without an inventory, and says so with null instead of zero", () => {
    expect(run([partnerFacts("alpha")], { inventory: null }).partners[0]!.demand.viaOtherCtas).toBeNull();
  });

  it("adds that demand to what a payout blocker holds back, naming each part, with a shared page counted once", () => {
    const partners = [
      partnerFacts("alpha", { payout: blockedRail, revenueReady: false, comparisonPageUrls: [U("/compare/alpha-vs-beta")] }),
      partnerFacts("gamma", { payout: blockedRail, revenueReady: false, comparisonPageUrls: [U("/compare/beta-vs-gamma")] }),
    ];
    // beta lists both partners; its 300 impressions must be counted once.
    const report = run(partners, { inventory: listing("alpha", "gamma") });
    const blocker = report.payoutBlockers[0]!;
    expect(blocker.partners).toEqual(["alpha", "gamma"]);
    expect(blocker.ownPagesImpressions).toBe(240 + 40 + 80 + 30);
    expect(blocker.viaOtherCtasImpressions).toBe(300);
    expect(blocker.historicalImpressionsAtStake).toBe(240 + 40 + 80 + 30 + 300);
    expect(report.recommendation.summary).toMatch(/their own pages and other products' pages that show them/);
  });

  it("does not double count a page that is one partner's own page and another's exposure page", () => {
    const partners = [partnerFacts("alpha", { payout: blockedRail, revenueReady: false }), partnerFacts("beta", { payout: blockedRail, revenueReady: false })];
    // beta's own software page shows alpha: it is already counted as beta's own page.
    const blocker = run(partners, { inventory: listing("alpha") }).payoutBlockers[0]!;
    expect(blocker.historicalImpressionsAtStake).toBe(240 + 300);
    expect(blocker.viaOtherCtasImpressions).toBe(0);
  });

  it("leaves the alternative part unknown when the inventory is missing", () => {
    const blocker = run([partnerFacts("alpha", { payout: blockedRail, revenueReady: false })], { inventory: null }).payoutBlockers[0]!;
    expect(blocker.viaOtherCtasImpressions).toBeNull();
    expect(blocker.historicalImpressionsAtStake).toBe(240);
  });
});

describe("determinism", () => {
  it("gives the same report whatever order the partners arrive in", () => {
    const partners = [partnerFacts("gamma", { payout: blockedRail, revenueReady: false }), partnerFacts("alpha"), partnerFacts("beta", { payout: otherRail, revenueReady: false })];
    expect(JSON.stringify(run([...partners].reverse()))).toBe(JSON.stringify(run(partners)));
  });

  it("is a pure function of its inputs", () => {
    expect(JSON.stringify(run([partnerFacts("alpha")]))).toBe(JSON.stringify(run([partnerFacts("alpha")])));
  });
});

describe("real registries (no network, no files written)", () => {
  const facts = loadPartnerFacts();

  it("reads one fact row per active partner and never carries an affiliate URL", () => {
    expect(facts.length).toBeGreaterThan(0);
    const text = JSON.stringify(facts);
    const urls = text.match(/https?:\/\/[^"\s]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    // Only Miloosh's own page URLs, and none of them with a query string (an affiliate or tracking parameter).
    expect(urls.every((u) => /^https:\/\/miloosh\.com\/[a-z0-9/-]*$/.test(u))).toBe(true);
  });

  it("carries the same restrictions the typed table holds for Setmore, SurveyMonkey, Trainual and FreshBooks", () => {
    const report = runAffiliateRevenueAgent({ now: NOW, partners: facts, gsc: null, inventory: null, protection: null, funnel: unavailableFunnel("n/a") });
    for (const slug of ["setmore", "surveymonkey", "trainual", "freshbooks"]) {
      const row = report.partners.find((p) => p.slug === slug);
      if (row) expect(row.restrictions.length, slug).toBeGreaterThan(0);
    }
    expect(report.counts.activePartners).toBe(facts.length);
    expect(report.outcomes.conversions.state).toBe("NOT_MEASURED");
  });
});
