import { describe, expect, it } from "vitest";
import { opportunitySchema } from "@/lib/growth-agents/contracts";
import { measured } from "@/lib/growth-agents/evidence";
import { buildOpportunity, compareForShortlist, runDirector, tierOf, type DirectorInputs, type OwnerDecision } from "@/lib/growth-agents/director";
import { partnerExposureFor, runAffiliateRevenueAgent } from "@/lib/growth-agents/affiliate-revenue-agent";
import { funnelFromEvents, unavailableFunnel } from "@/lib/growth-agents/funnel";
import { actionTitleHe, andHe, he, ownerDecisionHe, renderHebrewReport } from "@/lib/growth-agents/report-he";
import { buildGscEvidence } from "@/lib/growth-agents/gsc-import";
import { REQUIRED_GATES, runGuardian, type GateProvenance } from "@/lib/growth-agents/guardian";
import { PROV, SHA, NOW, U, addPageQueryTable, fullExtras, gateResult, guardianInputs, makeCapture, makeGuardian, makeIndexation, makeInventory, makeProtection, makeWorld, partnerFacts, signal, type PageRow } from "./fixtures";

const ALPHA = U("/software/alpha");
const BETA = U("/software/beta");
const GAMMA = U("/software/gamma");
const AB = U("/compare/alpha-vs-beta");
const BG = U("/compare/beta-vs-gamma");

const blockedRail = { railId: "rail-blocked", railLabel: "Blocked rail", readiness: "OWNER_ACTION_REQUIRED" as const, ownerActionPackId: "pack-blocked" };

function direct(world = makeWorld(), overrides: Partial<DirectorInputs> = {}) {
  return runDirector({
    now: NOW,
    checkoutSha: SHA,
    branch: "claude/test",
    google: world.google,
    affiliate: world.affiliate,
    guardian: makeGuardian(),
    production: null,
    ...overrides,
  });
}

describe("the Director answers one question with one action", () => {
  it("is read-only, versioned and names the question it answers", () => {
    const report = direct();
    expect(report.mode).toBe("READ_ONLY");
    expect(report.schemaVersion).toBe(1);
    expect(report.question).toMatch(/single most valuable, defensible action/);
    expect(report.answer.actionId).toBeTruthy();
    expect(report.queue[0]!.id).toBe(report.answer.actionId);
  });

  it("puts the owner's payout action first when no page can be changed safely and a rail blocks revenue", () => {
    const report = direct();
    expect(report.answer.kind).toBe("OWNER_PAYOUT_ACTION");
    expect(report.answer.contentEditsAllowedNow).toBe(false);
    expect(report.answer.summary).toMatch(/Blocked rail/);
    expect(report.answer.whyThisFirst.join(" ")).toMatch(/110 historical impressions/);
    expect(report.ownerDecisions.map((d) => d.kind)).toContain("PAYOUT_RAIL");
  });

  it("prefers work an agent can do now (a hand-off of an eligible page) over a decision only the owner can take", () => {
    const urls = [ALPHA, BETA, GAMMA, AB, BG, U("/software/delta")];
    const world = makeWorld({ google: { extras: new Map(urls.map((u) => [u, fullExtras(u)])), indexation: makeIndexation(urls) } });
    expect(world.google.nextAction.kind).toBe("HANDOFF_TO_PAGE_UPGRADER");
    const report = direct(world);
    expect(report.answer.kind).toBe("HANDOFF_TO_PAGE_UPGRADER");
    expect(report.answer.contentEditsAllowedNow).toBe(true);
    // The owner's payout decision is still queued, just not first.
    expect(report.queue.some((item) => item.kind === "OWNER_PAYOUT_ACTION")).toBe(true);
  });

  it("never lets the Guardian lane answer the question, however its gates stand", () => {
    for (const guardian of [makeGuardian(), makeGuardian(["tests"]), null]) {
      const report = direct(makeWorld(), { guardian });
      expect(report.queue.find((i) => i.id === report.answer.actionId)!.lane).not.toBe("GUARDIAN");
    }
  });

  it("falls back to the Guardian item only when no other lane has anything to do", () => {
    const partners = [partnerFacts("alpha")];
    const world = makeWorld({ partners });
    const idle = { ...world.google, shortlist: [], candidates: [], technicalTriage: [], indexation: { ...world.google.indexation, postReleaseCrawl: null } };
    const affiliate = runAffiliateRevenueAgent({ now: NOW, partners, gsc: world.gsc, inventory: world.inventory, protection: world.protection, funnel: funnelFromEvents([], PROV, null) });
    expect(affiliate.recommendation.kind).toBe("NO_ACTION");
    const report = direct({ ...world, google: idle, affiliate }, { guardian: makeGuardian(["lint"]) });
    expect(report.queue.map((i) => i.id)).toEqual(["guardian:release-gates"]);
    expect(report.answer.kind).toBe("RELEASE_GATES");
  });
});

describe("shortlist: five at most, each with a defined path to action", () => {
  it("includes only editable or dated-observation pages above the evidence floor, never protected or in-flight ones", () => {
    const world = makeWorld({
      signals: [
        signal({ urls: [BETA] }), // protected experiment
        signal({ urls: [GAMMA], kind: "IN_FLIGHT", source: "in-flight-work" }),
        signal({ urls: [AB], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-10-25" }),
      ],
    });
    const report = direct(world);
    const urls = report.shortlist.map((o) => o.targetUrl);
    expect(urls).not.toContain(BETA);
    expect(urls).not.toContain(GAMMA);
    expect(urls).not.toContain(U("/software/delta")); // 6 impressions: below the floor of 20
    expect(report.shortlist.length).toBeLessThanOrEqual(5);
    expect(report.heldPages.map((h) => h.url)).toEqual(expect.arrayContaining([BETA, GAMMA]));
    expect(report.heldPages.every((h) => h.verdict === "PROTECTED" || h.verdict === "IN_FLIGHT")).toBe(true);
  });

  it("keeps a protected or in-flight page out of the shortlist even when no other page overlaps it", () => {
    // No comparisons exist here, so the overlap rule cannot be what excludes them.
    const inventory = makeInventory({ comparisons: [] });
    const world = makeWorld({ signals: [signal({ urls: [BETA] }), signal({ urls: [GAMMA], kind: "IN_FLIGHT", source: "in-flight-work" })], google: { inventory } });
    const report = direct(world);
    expect(report.shortlist.map((o) => o.targetUrl)).toEqual([ALPHA]);
    expect(report.overlapsSuppressed).toEqual([]);
    expect(report.heldPages.map((h) => h.url).sort()).toEqual([BETA, GAMMA]);
  });

  it("does not shortlist a page the checked-out code does not publish: that is a technical question, not an upgrade", () => {
    const hist: PageRow[] = [[ALPHA, 0, 240, 70], [U("/software/retired-tool"), 0, 900, 8]];
    const report = direct(makeWorld({ hist }));
    expect(report.shortlist.map((o) => o.targetUrl)).toEqual([ALPHA]);
    expect(report.blockers.some((b) => b.id === "triage:/software/retired-tool")).toBe(true);
    expect(report.shortlistRule).toMatch(/the checked-out code publishes it/);
  });

  it("ranks a verified revenue path before more impressions", () => {
    const order = direct().shortlist.map((o) => o.targetUrl);
    // alpha has a resolved link and a verified rail (value class 0) even though beta has more impressions.
    expect(order[0]).toBe(ALPHA);
    expect(order.indexOf(ALPHA)).toBeLessThan(order.indexOf(BETA));
  });

  it("orders by demand within a class and shows, rather than ranks by, whether a page is waiting out an observation window", () => {
    const report = direct(makeWorld({ signals: [signal({ urls: [ALPHA], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-10-25" })] }));
    // alpha (240 impressions, waiting until 2026-10-25) and alpha-vs-beta (40, editable) are both value class 0: more demand leads.
    expect(report.shortlist.map((o) => o.targetUrl)).toEqual([ALPHA, BETA, GAMMA]);
    expect(report.shortlist[0]).toMatchObject({ status: "WAITING", protection: { verdict: "OBSERVATION_WINDOW", eligibleAfter: "2026-10-25" } });
    expect(report.shortlist[0]!.recommendedAction.summary).toMatch(/Do not edit before 2026-10-25/);
    expect(report.shortlistRule).toMatch(/does not change the order/);
  });

  it("suppresses a page that shares a product record with a higher-ranked shortlisted page, and says so", () => {
    const report = direct();
    const shortlisted = report.shortlist.map((o) => o.targetUrl);
    expect(shortlisted).toEqual([ALPHA, BETA, GAMMA]);
    expect(report.overlapsSuppressed).toEqual([
      { url: AB, sharedWith: ALPHA, sharedProducts: ["alpha"] },
      { url: BG, sharedWith: BETA, sharedProducts: ["beta", "gamma"] },
    ]);
    expect(report.shortlistRule).toMatch(/shares a product record/);
  });

  it("is capped by the requested size, and the cap never reorders the list", () => {
    const full = direct();
    const capped = direct(makeWorld(), { shortlistSize: 2 });
    expect(capped.shortlist.map((o) => o.targetUrl)).toEqual(full.shortlist.slice(0, 2).map((o) => o.targetUrl));
  });

  it("returns every shortlisted opportunity in the typed contract, with the evidence fields the owner asked for", () => {
    for (const o of direct().shortlist) {
      expect(opportunitySchema.safeParse(o).success, o.id).toBe(true);
      expect(o.id).toMatch(/^opp:(software|compare):\//);
      expect(o.demand.historical.window).not.toBeNull();
      expect(o.measurement.clockStart).toMatch(/first observed Google recrawl/);
      expect(o.commercial.limitations.join(" ")).toMatch(/NOT_MEASURED, not zero/);
      expect(o.evidenceSources.length).toBeGreaterThan(0);
    }
  });

  it("separates verified current demand, historical demand and hypothetical demand, and never invents the last", () => {
    const summary = direct().demandSummary;
    expect(summary.hypotheticalDemandPages).toBe(0);
    expect(summary.verifiedCurrentDemandPages).toBe(0);
    expect(summary.historicalDemandPages).toBeGreaterThan(0);
    expect(summary.note).toMatch(/No ranked page has verified current demand/);
  });
});

describe("buildOpportunity: one recommended step per page state", () => {
  const world = makeWorld();
  const evaluation = (url: string, w = world) => w.google.candidates.find((c) => c.url === url)!;
  const rowsFor = (url: string, w = world) => partnerExposureFor(evaluation(url, w), new Map(w.affiliate.partners.map((p) => [p.slug, p])));

  it("routes an editable page with missing evidence to read-only evidence collection", () => {
    const opp = buildOpportunity(evaluation(ALPHA), rowsFor(ALPHA), 0);
    expect(opp.status).toBe("NEEDS_DATA");
    expect(opp.recommendedAction).toMatchObject({ kind: "COLLECT_EVIDENCE", handoffSkill: "miloosh-revenue-recovery-finder" });
    expect(opp.ownerDecision.required).toBe(false);
    expect(opp.measurement.firstReviewAfter).toBeNull(); // no change is proposed, so no review clock can be set
  });

  it("routes a protected page to the owner and states that only measurement is permitted", () => {
    const w = makeWorld({ signals: [signal({ urls: [ALPHA] })] });
    const opp = buildOpportunity(evaluation(ALPHA, w), rowsFor(ALPHA, w), 0);
    expect(opp.status).toBe("OWNER_DECISION");
    expect(opp.recommendedAction.summary).toMatch(/Do not edit/);
    expect(opp.ownerDecision).toMatchObject({ required: true });
    expect(opp.blockers.map((b) => b.code)).toContain("PROTECTED_EXPERIMENT");
  });

  it("asks the owner to close a MEASURING experiment record whose declared window has ended", () => {
    const w = makeWorld({ signals: [signal({ urls: [ALPHA], needsClosure: true, source: "measuring-receipts" })] });
    const opp = buildOpportunity(evaluation(ALPHA, w), rowsFor(ALPHA, w), 0);
    expect(opp.recommendedAction.summary).toMatch(/still MEASURING although its declared window has ended/);
  });

  it("makes an observation-window page WAITING until the window ends", () => {
    const w = makeWorld({ signals: [signal({ urls: [ALPHA], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-10-30" })] });
    const opp = buildOpportunity(evaluation(ALPHA, w), rowsFor(ALPHA, w), 0);
    expect(opp.status).toBe("WAITING");
    expect(opp.protection.eligibleAfter).toBe("2026-10-30");
    expect(opp.measurement.firstReviewAfter).toBe("2026-10-30");
    expect(opp.recommendedAction.summary).toMatch(/Do not edit before 2026-10-30/);
  });

  it("treats another worktree's unfinished work as an owner decision", () => {
    const w = makeWorld({ signals: [signal({ urls: [ALPHA], kind: "IN_FLIGHT", source: "in-flight-work" })] });
    const opp = buildOpportunity(evaluation(ALPHA, w), rowsFor(ALPHA, w), 0);
    expect(opp.status).toBe("OWNER_DECISION");
    expect(opp.recommendedAction.summary).toMatch(/Unfinished work/);
  });

  it("hands over only a page whose every gate passed", () => {
    const urls = [ALPHA, BETA, GAMMA, AB, BG];
    const w = makeWorld({ google: { extras: new Map(urls.map((u) => [u, fullExtras(u)])), indexation: makeIndexation(urls) } });
    const opp = buildOpportunity(evaluation(ALPHA, w), rowsFor(ALPHA, w), 0);
    expect(opp.status).toBe("READY");
    expect(opp.recommendedAction).toMatchObject({ kind: "HANDOFF_TO_PAGE_UPGRADER", handoffSkill: "miloosh-money-page-upgrader" });
  });

  it("says plainly when a page has no active partner and is worth visibility only", () => {
    const opp = buildOpportunity(evaluation(BETA), { own: [], viaOtherCtas: [] }, 2);
    expect(opp.affiliate).toMatchObject({ relationship: "NO_ACTIVE_PARTNER", partnerSlugs: [] });
    expect(opp.commercial.opportunity).toMatch(/visibility and decision usefulness only/);
  });

  it("does not call a click payable while a payout rail is unverified", () => {
    const opp = buildOpportunity(evaluation(GAMMA), rowsFor(GAMMA), 1);
    expect(opp.commercial.opportunity).toMatch(/cannot yet be shown to end in a payable commission/);
    expect(opp.affiliate.payoutReadiness).toBe("NONE_VERIFIED");
  });

  it("classifies partner tiers from payout and technical readiness", () => {
    expect(tierOf([])).toBe(2);
    const row = (readiness: "VERIFIED" | "UNVERIFIED", technicalPath: "READY" | "NOT_READY") => ({ ...world.affiliate.partners[0]!, payout: { ...world.affiliate.partners[0]!.payout, readiness }, technicalPath });
    expect(tierOf([row("VERIFIED", "READY")])).toBe(0);
    // One payable call to action is enough for a revenue path; the unverified one is reported separately.
    expect(tierOf([row("VERIFIED", "READY"), row("UNVERIFIED", "READY")])).toBe(0);
    expect(tierOf([row("UNVERIFIED", "READY"), row("UNVERIFIED", "READY")])).toBe(1);
    expect(tierOf([row("VERIFIED", "NOT_READY")])).toBe(1);
  });

  it("orders shortlist candidates by value class, then demand, then URL, and ignores actionability", () => {
    const base = world.google.candidates;
    const mk = (e: (typeof base)[number], value: 0 | 1) => ({ e, tier: 0 as const, value });
    expect(compareForShortlist(mk(base[1]!, 0), mk(base[0]!, 1))).toBeLessThan(0);
    const waiting = { ...base[0]!, protection: { ...base[0]!.protection, verdict: "OBSERVATION_WINDOW" as const } };
    // The waiting page has more impressions, so it still leads an editable page of the same class.
    expect(compareForShortlist(mk(waiting, 1), mk(base[1]!, 1))).toBeLessThan(0);
    expect(compareForShortlist(mk(base[0]!, 1), mk({ ...base[1]!, historical: { ...base[1]!.historical, impressions: 1 } }, 1))).toBeLessThan(0);
    const tieA = { ...base[0]!, url: U("/software/aaa") };
    const tieB = { ...base[0]!, url: U("/software/bbb") };
    expect(compareForShortlist(mk(tieA, 1), mk(tieB, 1))).toBeLessThan(0);
  });
});

describe("a partner shown as another option is a call to action on the page", () => {
  // beta has no partner of its own but its decision guide shows alpha (payable) and gamma (payout rail not verified).
  const inventory = () => makeInventory({ otherCtas: { beta: ["alpha", "gamma"], delta: ["gamma"] } });
  const world = () => makeWorld({ inventory: inventory(), google: { inventory: inventory() } });

  it("does not call such a page 'no active partner', and ranks it with the pages that have a verified revenue path", () => {
    const w = world();
    const beta = direct(w).shortlist.find((o) => o.targetUrl === BETA)!;
    expect(beta.affiliate).toMatchObject({ relationship: "ACTIVE_PARTNER", partnerSlugs: ["alpha", "gamma"], otherCtaPartnerSlugs: ["alpha", "gamma"] });
    expect(beta.affiliate.note).toMatch(/Alpha \(shown as another option\)/);
    expect(beta.commercial.opportunity).toMatch(/Shows Alpha \(as another option shown\) and Gamma \(as another option shown\)/);
    expect(beta.commercial.opportunity).toMatch(/For Alpha the issued link/);
  });

  it("keeps a page whose only partner is on an unverified rail out of the verified-revenue class", () => {
    const w = world();
    const delta = buildOpportunity(w.google.candidates.find((c) => c.url === U("/software/delta"))!, partnerExposureFor({ softwareSlugs: ["delta"], otherCtaSlugs: ["gamma"] }, new Map(w.affiliate.partners.map((p) => [p.slug, p]))), 1);
    expect(delta.commercial.opportunity).toMatch(/no payout rail is verified/);
    expect(delta.commercial.opportunity).toMatch(/cannot yet be shown to end in a payable commission/);
    expect(delta.affiliate.payoutReadiness).toBe("NONE_VERIFIED");
  });

  it("splits a rail's demand into the partners' own pages and the pages that list them as an alternative", () => {
    const report = direct(world());
    const blocker = report.ownerDecisions.find((d) => d.kind === "PAYOUT_RAIL")!;
    // gamma: own software page 80 + comparison 30 = 110; beta (300) and delta (6) list gamma as an alternative.
    expect(blocker.params).toMatchObject({ impressions: 416, ownImpressions: 110, otherCtaImpressions: 306 });
    expect(report.answer.summary).toMatch(/Blocked rail/);
  });

  it("states the split in Hebrew", () => {
    const w = world();
    const report = direct(w);
    const text = renderHebrewReport(report, w.google, w.affiliate, makeGuardian());
    expect(text).toMatch(/416 חשיפות היסטוריות ב-\d+ דפים \(מתוכן 110 חשיפות בדפי השותפים עצמם ו-306 חשיפות בדפים של מוצרים אחרים שמציגים אותם כאפשרות נוספת\)/);
    expect(text).toMatch(/אין שותף על המוצר עצמו, אבל שותף פעיל מוצג בדף כאפשרות נוספת \(alpha, gamma\)/);
  });
});

describe("buyer intent in an opportunity", () => {
  const worldWithQueries = () => {
    const capture = makeCapture({ hist: [[ALPHA, 0, 240, 70], [BETA, 0, 300, 75], [GAMMA, 0, 80, 60], [U("/"), 1, 20, 5]], recent: [[U("/"), 0, 4, 5]] });
    addPageQueryTable(capture, { path: "/software/alpha", rows: [["alpha alternatives", 150], ["alpha vs beta", 60], ["alpha login", 30]], declaredImpressions: 240 });
    return makeWorld({ google: { gsc: buildGscEvidence(capture.manifest, capture.files) } });
  };

  it("is based on query evidence, with the numbers, when the page's own queries were captured", () => {
    const opp = direct(worldWithQueries()).shortlist.find((o) => o.targetUrl === ALPHA)!;
    expect(opp.buyerIntent.basis).toBe("QUERY_EVIDENCE");
    expect(opp.buyerIntent.summary).toMatch(/88% of the 240 impressions Search Console lists for Alpha \(2 of 3 listed queries\)/);
    expect(opp.buyerIntent.summary).toMatch(/a buyer-intent page/);
    expect(opp.buyerIntent.summary).toMatch(/Anonymised queries are not listed/);
  });

  it("says plainly that the pattern is unconfirmed when no query table exists", () => {
    const opp = direct().shortlist.find((o) => o.targetUrl === ALPHA)!;
    expect(opp.buyerIntent.basis).toBe("PAGE_TYPE");
    expect(opp.buyerIntent.summary).toMatch(/not yet confirmed for this page/);
  });

  it("never puts query text in the opportunity", () => {
    const text = JSON.stringify(direct(worldWithQueries()).shortlist);
    expect(text).not.toMatch(/alpha alternatives|alpha vs beta|alpha login/);
  });
});

describe("the Hebrew report says how much of the visible site is locked", () => {
  it("lists editable, protected, in-window and in-flight pages among those Google showed", () => {
    const w = makeWorld({ signals: [signal({ urls: [ALPHA] }), signal({ urls: [BETA], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-11-01" })] });
    const text = renderHebrewReport(direct(w), w.google, w.affiliate, makeGuardian());
    expect(text).toMatch(/מתוך 7 דפים שגוגל הציגה בחלון ההיסטורי: 5 דפים ניתנים לעריכה, דף אחד מוגן \(ניסוי\), דף אחד בחלון מדידה, 0 דפים בעבודה פעילה בעץ אחר\./);
  });
});

describe("the release-gates section says which commit the results belong to and what each gate did", () => {
  const OTHER = "1d6746b3a1c0000000000000000000000000abcd";
  const section = (guardian: ReturnType<typeof makeGuardian> | null): string[] => {
    const w = makeWorld();
    const lines = renderHebrewReport(direct(w), w.google, w.affiliate, guardian).split("\n");
    const from = lines.indexOf("## שערי שחרור") + 1;
    return lines.slice(from, lines.indexOf("## מה לא לעשות")).filter((line) => line !== "");
  };
  const recorded = (overrides: Partial<GateProvenance> = {}): GateProvenance => ({ source: "RECORDED_FILE", ranOnSha: SHA, dirtyWhenRun: false, ...overrides });
  const failingTests = REQUIRED_GATES.map((g) => gateResult(g, g === "tests" ? "FAIL" : "PASS", g === "tests" ? ["a > b"] : []));
  const baseline = { baseSha: SHA, results: failingTests };

  it("lists every gate with its result, and whether the failure was already there at the base commit", () => {
    const lines = section(runGuardian(guardianInputs({ gates: failingTests, gateProvenance: recorded(), baseline, renderedDiff: { compared: 1785, differing: 0, differingSample: [] } })));
    expect(lines).toContain("- פסק הדין של השומר: שחרור חסום.");
    expect(lines.some((l) => /תוצאות השערים נרשמו עבור הקומיט 80eb1e5 בעץ עבודה נקי, והן שייכות לקומיט הנבדק/.test(l))).toBe(true);
    expect(lines.some((l) => /ההשוואה לבסיס נעשתה מול תוצאות שנרשמו בקומיט הבסיס 80eb1e5 בעץ נקי/.test(l))).toBe(true);
    expect(lines).toContain("- בדיקות: נכשל — failed · נכשל גם בקומיט הבסיס; השינוי לא הוסיף כשל.");
    expect(lines).toContain("- בנייה: עבר — ok · כמו בקומיט הבסיס.");
    expect(lines.filter((l) => /: (עבר|נכשל|לא הורץ)/.test(l))).toHaveLength(REQUIRED_GATES.length);
    expect(lines).toContain("- השוואת ה-HTML שנבנה מול קומיט הבסיס: 1,785 קבצי דף נבדקו, אף אחד לא שונה.");
  });

  it("says when a failure was introduced by the change, and when a gate was fixed", () => {
    const base = { baseSha: SHA, results: REQUIRED_GATES.map((g) => gateResult(g, g === "lint" ? "FAIL" : "PASS", g === "lint" ? ["old"] : [])) };
    const lines = section(runGuardian(guardianInputs({ gates: REQUIRED_GATES.map((g) => gateResult(g, g === "build" ? "FAIL" : "PASS")), gateProvenance: recorded(), baseline: base })));
    expect(lines.find((l) => l.startsWith("- בנייה:"))).toMatch(/הכשל הוכנס על ידי השינוי/);
    expect(lines.find((l) => l.startsWith("- lint:"))).toMatch(/תוקן לעומת קומיט הבסיס/);
  });

  it("does not repeat a gate failure as a separate reason line", () => {
    const lines = section(runGuardian(guardianInputs({ gates: failingTests, gateProvenance: recorded(), baseline })));
    expect(lines.filter((l) => /נכשל/.test(l))).toHaveLength(1);
  });

  it("explains in Hebrew why recorded results were set aside, for each reason", () => {
    const cases: Array<[GateProvenance, RegExp]> = [
      [recorded({ ranOnSha: OTHER }), /נרשמו עבור הקומיט 1d6746b ולא עבור הקומיט הנבדק \(80eb1e5\), ולכן לא נעשה בהן שימוש/],
      [recorded({ ranOnSha: null }), /לא מציין על איזה קומיט הורצו השערים/],
      [recorded({ dirtyWhenRun: true }), /בעץ עבודה עם שינויים שלא נשמרו/],
      [recorded({ dirtyWhenRun: null }), /לא מציין אם עץ העבודה היה נקי/],
      [recorded({ ranOnSha: null, dirtyWhenRun: null, problem: "x" }), /אינו קריא כתוצאות שערים/],
    ];
    for (const [provenance, pattern] of cases) {
      const lines = section(runGuardian(guardianInputs({ gates: failingTests, gateProvenance: provenance })));
      expect(lines.some((l) => pattern.test(l)), String(pattern)).toBe(true);
      expect(lines).toContain("- פסק הדין של השומר: לא ניתן לאמת, שער אחד לפחות לא הורץ.");
      expect(lines.filter((l) => /: לא הורץ/.test(l))).toHaveLength(REQUIRED_GATES.length);
    }
  });

  it("says the gates ran now when they did, says nothing about provenance when none were supplied, and notes an unusable baseline", () => {
    expect(section(runGuardian(guardianInputs())).some((l) => l === "- השערים הורצו עכשיו בעץ העבודה הזה.")).toBe(true);
    const none = section(runGuardian(guardianInputs({ gates: [], gateProvenance: { source: "NONE", ranOnSha: null, dirtyWhenRun: null } })));
    expect(none.some((l) => /תוצאות השערים/.test(l))).toBe(false);
    expect(none.filter((l) => /: לא הורץ/.test(l))).toHaveLength(REQUIRED_GATES.length);
    const wrongBaseline = section(runGuardian(guardianInputs({ baseline: { ...baseline, baseSha: OTHER } })));
    expect(wrongBaseline.some((l) => /תוצאות הבסיס שנמסרו לא שימשו להשוואה/.test(l))).toBe(true);
  });

  it("says no rendered comparison was made when none was supplied, and names the production commits a release would drop", () => {
    const production = { deploymentId: "dpl_x", createdAt: null, deployedSha: SHA, previousProductionShas: ["1d6746bAAAA", "11ba877BBBB"], ancestorOfCurrent: { "1d6746bAAAA": false, "11ba877BBBB": false } };
    const lines = section(runGuardian(guardianInputs({ production })));
    expect(lines).toContain("- לא בוצעה השוואת HTML שנבנה מול קומיט הבסיס (NOT_RUN).");
    expect(lines).toContain("- שחרור הקומיט הזה יסיר עבודה שכבר פורסמה ב-production (הקומיטים 1d6746b, 11ba877 אינם אבות של הקומיט הנבדק).");
  });

  it("reports differing rendered pages by number", () => {
    const lines = section(runGuardian(guardianInputs({ renderedDiff: { compared: 10, differing: 3, differingSample: ["a.html"] } })));
    expect(lines).toContain("- השוואת ה-HTML שנבנה מול קומיט הבסיס: 10 קבצי דף נבדקו, 3 שונים.");
  });

  it("says the Guardian did not run when there is no Guardian report", () => {
    expect(section(null)).toEqual(["- השומר לא הורץ, ולכן בטיחות השחרור NOT_VERIFIED."]);
  });
});

describe("demand on products with no active partner is shown for a partner-program check only", () => {
  it("lists the largest such pages with the program's own status, and never calls them partners", () => {
    const w = makeWorld();
    const affiliate = { ...w.affiliate, nonPartnerDemand: [{ url: U("/software/semrush"), historicalImpressions: 1655, programStatus: "OWNER_ACTION_REQUIRED", programNote: null }, { url: U("/software/freshdesk"), historicalImpressions: 1, programStatus: "PENDING_REVIEW", programNote: null }, { url: U("/software/zzz"), historicalImpressions: 30, programStatus: null, programNote: null }, { url: U("/software/odd"), historicalImpressions: 20, programStatus: "SOMETHING_NEW", programNote: null }] };
    const text = renderHebrewReport(direct(w), w.google, affiliate, makeGuardian());
    const line = text.split("\n").find((l) => l.includes("אינו שותף פעיל")) ?? "";
    expect(line).toMatch(/\/software\/semrush \(1,655 חשיפות; תוכנית: נדרשת פעולה שלך\)/);
    expect(line).toMatch(/\/software\/freshdesk \(חשיפה אחת; תוכנית: ממתין להחלטת התוכנית\)/);
    expect(line).toMatch(/\/software\/zzz \(30 חשיפות; תוכנית: לא רשומה\)/);
    expect(line).toMatch(/\/software\/odd \(20 חשיפות; תוכנית: SOMETHING_NEW\)/);
    expect(line).toMatch(/אין לקדם אותם כשותפים/);
  });

  it("is absent when no such page has demand", () => {
    const w = makeWorld();
    const text = renderHebrewReport(direct(w), w.google, { ...w.affiliate, nonPartnerDemand: [] }, makeGuardian());
    expect(text).not.toMatch(/אינו שותף פעיל/);
  });
});

describe("cannibalization is never overstated", () => {
  it("stays NOT_MEASURED site-wide even when queries were captured for some pages, and says how many", () => {
    const capture = makeCapture({ hist: [[ALPHA, 0, 240, 70], [U("/"), 1, 20, 5]], recent: [[U("/"), 0, 4, 5]] });
    addPageQueryTable(capture, { path: "/software/alpha", rows: [["alpha alternatives", 150], ["alpha vs beta", 60], ["alpha login", 30]], declaredImpressions: 240 });
    const w = makeWorld({ google: { gsc: buildGscEvidence(capture.manifest, capture.files) } });
    expect(w.google.cannibalization).toMatchObject({ status: "NOT_MEASURED", pageQueryTablesCaptured: 1 });
    expect(renderHebrewReport(direct(w), w.google, w.affiliate, makeGuardian())).toMatch(/שאילתות נלכדו רק עבור דף אחד, ולכן חפיפת דפים \(cannibalization\) נשארת NOT_MEASURED באתר כולו/);
    expect(direct(w).limitations.join(" ")).toMatch(/Queries were captured for 1 page\(s\) only, so cannibalization stays NOT_MEASURED site-wide/);
  });

  it("says no query rows were captured when none were", () => {
    const w = makeWorld();
    expect(w.google.cannibalization.pageQueryTablesCaptured).toBe(0);
    expect(renderHebrewReport(direct(w), w.google, w.affiliate, makeGuardian())).toMatch(/לא נלכדו שורות של שאילתה לפי דף/);
  });
});

describe("what is still open is said on each shortlist line", () => {
  const lineFor = (w: ReturnType<typeof makeWorld>, path: string) => renderHebrewReport(direct(w), w.google, w.affiliate, makeGuardian()).split("\n").find((l) => l.includes(`${path} —`)) ?? "";

  it("names every unverified fact in Hebrew, once, without repeating what the line already says", () => {
    const line = lineFor(makeWorld(), "/software/alpha");
    expect(line).toMatch(/עדיין פתוח: תגובת הדף החי לא נבדקה, מצב הכיסוי בגוגל לא נקרא, כוונת הקנייה לא אומתה, פער התוכן לא אומת מול מקור הספק;/);
    expect(line).not.toMatch(/הדף נמצא בחלון/);
  });

  it("says nothing is open when every gate passed", () => {
    const urls = [ALPHA, BETA, GAMMA, AB, BG];
    const w = makeWorld({ google: { extras: new Map(urls.map((u) => [u, fullExtras(u)])), indexation: makeIndexation(urls) } });
    expect(lineFor(w, "/software/alpha")).not.toMatch(/עדיין פתוח/);
  });

  it("explains a shared-record hold in plain words", () => {
    const w = makeWorld({ signals: [signal({ urls: [AB] })] });
    expect(lineFor(w, "/software/alpha")).toMatch(/שינוי ברשומה ישפיע גם על דפים מוגנים או במדידה/);
  });
});

describe("what the rendered page was seen to carry", () => {
  it("is added to the affiliate note of an opportunity, and absent when the page was not read", () => {
    const url = ALPHA;
    const withPage = makeWorld({ google: { extras: new Map([[url, { rendered: measured({ sponsoredLinkCount: 3, partnerSlugs: ["alpha", "gamma"], unmatchedAnchorTexts: [] }, PROV) }]]) } });
    expect(direct(withPage).shortlist.find((o) => o.targetUrl === url)!.affiliate.note).toMatch(/\. Rendered page read: 3 sponsored link\(s\) for alpha, gamma$/);
    expect(direct().shortlist.find((o) => o.targetUrl === url)!.affiliate.note).not.toMatch(/Rendered page read/);
  });
});

describe("a hold hidden by precedence is still shown", () => {
  const both = () =>
    makeWorld({
      signals: [
        signal({ urls: [ALPHA], kind: "OBSERVATION_WINDOW", source: "release-observation", until: "2026-11-04" }),
        signal({ urls: [ALPHA], kind: "IN_FLIGHT", source: "in-flight-work", detail: "salesforce-style unfinished work" }),
      ],
    });

  it("keeps a page in an observation window WAITING but says another worktree also holds unfinished work on it", () => {
    const w = both();
    const opp = direct(w).shortlist.find((o) => o.targetUrl === ALPHA)!;
    expect(opp.status).toBe("WAITING");
    expect(opp.protection.verdict).toBe("OBSERVATION_WINDOW");
    expect(opp.protection.reasons.join(" ")).toMatch(/in-flight-work: salesforce-style unfinished work/);
    expect(opp.recommendedAction.summary).toMatch(/Unfinished work on this page also exists in another worktree/);
  });

  it("says so in Hebrew on the shortlist line", () => {
    const w = both();
    const text = renderHebrewReport(direct(w), w.google, w.affiliate, makeGuardian());
    expect(text).toMatch(/\/software\/alpha — .*בחלון מדידה עד 2026-11-04; ובנוסף יש עבודה לא גמורה על הדף בעץ עבודה אחר/);
  });

  it("does not add the note for a page that is only in flight", () => {
    const w = makeWorld({ signals: [signal({ urls: [ALPHA], kind: "IN_FLIGHT", source: "in-flight-work" })] });
    const text = renderHebrewReport(direct(w), w.google, w.affiliate, makeGuardian());
    expect(text).not.toMatch(/ובנוסף יש עבודה לא גמורה/);
  });
});

describe("Hebrew wording of the payout stake", () => {
  const decision = (impressions: number, pages: number, own: number | null, other: number | null): OwnerDecision => ({
    id: "owner:payout:x",
    kind: "PAYOUT_RAIL",
    question: "",
    why: "",
    evidence: [],
    params: { railLabel: "Rail", partners: "p", impressions, pages, readiness: "OWNER_ACTION_REQUIRED", ownImpressions: own, otherCtaImpressions: other },
  });

  it("says no demand was recorded, instead of '0 impressions on 0 pages'", () => {
    const text = ownerDecisionHe(decision(0, 0, 0, 0));
    expect(text).toMatch(/לא נרשמו חשיפות היסטוריות/);
    expect(text).not.toMatch(/0 חשיפות|0 דפים/);
  });

  it("uses 'בדף אחד' for a single page and 'ב-N דפים' for several", () => {
    expect(ownerDecisionHe(decision(148, 1, 0, 148))).toMatch(/148 חשיפות היסטוריות בדף אחד/);
    expect(ownerDecisionHe(decision(148, 1, 0, 148))).not.toMatch(/ב-דף/);
    expect(ownerDecisionHe(decision(416, 4, 110, 306))).toMatch(/416 חשיפות היסטוריות ב-4 דפים \(מתוכן 110 חשיפות בדפי השותפים עצמם ו-306 חשיפות בדפים של מוצרים אחרים שמציגים אותם כאפשרות נוספת\)/);
  });

  it("leaves out the split when the other-products part is unknown", () => {
    expect(ownerDecisionHe(decision(110, 2, 110, null))).not.toMatch(/מתוכן/);
  });
});

describe("owner decisions and blockers", () => {
  it("lists every unverified payout rail as a decision, the largest first, without sending or changing anything", () => {
    const partners = [
      partnerFacts("alpha", { payout: { railId: "rail-a", railLabel: "Rail A", readiness: "UNVERIFIED", ownerActionPackId: "pack-a" }, revenueReady: false, comparisonPageUrls: [AB] }),
      partnerFacts("gamma", { payout: blockedRail, revenueReady: false, comparisonPageUrls: [BG] }),
    ];
    const report = direct(makeWorld({ partners }));
    const payouts = report.ownerDecisions.filter((d) => d.kind === "PAYOUT_RAIL");
    expect(payouts).toHaveLength(2);
    expect(payouts[0]!.params.railLabel).toBe("Rail A");
  });

  it("records a Guardian block as an owner decision and a blocker, never as a waived gate", () => {
    const report = direct(makeWorld(), { guardian: makeGuardian(["tests", "audit"]) });
    expect(report.ownerDecisions.map((d) => d.kind)).toContain("RELEASE_GATES");
    expect(report.blockers.some((b) => /Gate tests is FAIL/.test(b.detail))).toBe(true);
    const gates = report.queue.find((i) => i.id === "guardian:release-gates")!;
    expect(gates.status).toBe("BLOCKED");
    expect(gates.requiresOwner).toBe(true);
    expect(report.answer.whatNotToDo.join(" ")).toMatch(/Do not deploy, merge or waive any release gate/);
  });

  it("treats a missing Guardian run as NOT_VERIFIED, not as a pass", () => {
    const report = direct(makeWorld(), { guardian: null });
    expect(report.blockers.map((b) => b.id)).toContain("guardian:not-run");
    expect(report.queue.find((i) => i.id === "guardian:release-gates")!.params.verdict).toBe("NOT_RUN");
  });

  it("asks the owner to close elapsed experiment records", () => {
    const report = direct(makeWorld(), { elapsedExperimentRecords: 3 });
    expect(report.ownerDecisions.find((d) => d.kind === "CLOSE_EXPERIMENTS")!.question).toMatch(/3 page\(s\)/);
  });

  it("reports unpublished URLs that once had impressions as blockers to verify", () => {
    const hist: PageRow[] = [[ALPHA, 0, 240, 70], [U("/software/retired-tool"), 0, 90, 20]];
    const world = makeWorld({ hist });
    const report = direct(world);
    expect(report.blockers.some((b) => b.id === "triage:/software/retired-tool")).toBe(true);
  });
});

describe("deterministic and non-mutating", () => {
  it("produces the identical report for the identical evidence, whatever order the evidence arrived in", () => {
    const hist: PageRow[] = [
      [ALPHA, 0, 240, 70], [BETA, 0, 300, 75], [GAMMA, 0, 80, 60], [AB, 0, 40, 12], [BG, 0, 30, 30], [U("/software/delta"), 0, 6, 8], [U("/"), 1, 20, 5],
    ];
    const forward = direct(makeWorld({ hist }));
    const reversed = direct(makeWorld({ hist: [...hist].reverse(), partners: [partnerFacts("gamma", { payout: blockedRail, revenueReady: false, comparisonPageUrls: [BG] }), partnerFacts("alpha", { comparisonPageUrls: [AB] })] }));
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
  });

  it("does not change the reports it is given", () => {
    const world = makeWorld();
    const before = JSON.stringify([world.google, world.affiliate]);
    direct(world);
    expect(JSON.stringify([world.google, world.affiliate])).toBe(before);
  });

  it("does not need a clock: the same inputs at a different 'now' differ only in the timestamp", () => {
    const a = direct();
    const b = runDirector({ now: new Date("2027-01-01T00:00:00Z"), checkoutSha: SHA, branch: "claude/test", google: makeWorld().google, affiliate: makeWorld().affiliate, guardian: makeGuardian(), production: null });
    expect(JSON.stringify({ ...b, generatedAt: a.generatedAt })).toBe(JSON.stringify(a));
  });
});

describe("evidence basis and limitations describe the actual capture", () => {
  it("states how the Search Console data was captured, from the manifest", () => {
    const report = direct();
    expect(report.evidenceBasis.gscCapturedVia).toBe("ui-table-capture");
    expect(report.limitations.join(" ")).toMatch(/signed-in session as tables, not as an export file/);
  });

  it("does not describe a capture that was never read", () => {
    const world = makeWorld();
    const none = { ...world.google, windows: { ...world.google.windows, capturedVia: null } };
    const report = direct({ ...world, google: none });
    expect(report.limitations[0]).toMatch(/No Search Console capture was read/);
  });

  it("names the sitemap read date only when the sitemap report was read", () => {
    expect(direct().answer.whatNotToDo.join(" ")).toMatch(/resubmit the sitemap repeatedly/);
  });

  it("mentions an unread funnel as UNAVAILABLE, not zero", () => {
    expect(direct().limitations.join(" ")).toMatch(/UNAVAILABLE, not zero/);
  });
});

describe("Hebrew report", () => {
  const world = makeWorld();
  const report = direct(world);
  const text = renderHebrewReport(report, world.google, world.affiliate, makeGuardian());

  it("opens with the recommended action and states that nothing was changed or published", () => {
    expect(text).toMatch(/^# דוח מנהל הצמיחה של Miloosh/);
    expect(text).toMatch(/מצב: קריאה בלבד/);
    expect(text).toMatch(/לא שונה דף, לא פורסם דבר, לא הוגשה בקשת אינדוקס/);
    expect(text).toMatch(/\*\*הפעולה המומלצת:\*\*/);
  });

  it("states the measured rate change from the data instead of a fixed claim", () => {
    expect(text).toMatch(/קצב החשיפות ליום ירד מ-55.08 ל-0.14 \(99.7%\)/);
  });

  it("marks outcomes the repository cannot measure as NOT_MEASURED rather than zero", () => {
    expect(text).toMatch(/המרות, עמלות מאושרות ותשלומים שהתקבלו: NOT_MEASURED/);
    expect(text).toMatch(/UNAVAILABLE בריצה הזו/);
  });

  it("lists the selection rule with the configured floor", () => {
    expect(text).toMatch(/ולפחות 20 חשיפות היסטוריות שנמדדו/);
    const custom = renderHebrewReport(report, { ...world.google, config: { ...world.google.config, minHistoricalImpressions: 35 } }, world.affiliate, makeGuardian());
    expect(custom).toMatch(/ולפחות 35 חשיפות היסטוריות שנמדדו/);
  });

  it("does not claim the coverage report is outdated unless it predates the release", () => {
    expect(text).not.toMatch(/עודכן לפני ההפצה האחרונה/);
  });

  it("is deterministic, redaction-safe and free of affiliate URLs", () => {
    expect(renderHebrewReport(report, world.google, world.affiliate, makeGuardian())).toBe(text);
    const urls = text.match(/https?:\/\/\S+/g) ?? [];
    expect(urls.every((u) => u.startsWith("https://miloosh.com/"))).toBe(true);
  });

  it("explains a missing Search Console capture in plain words", () => {
    const empty = makeWorld();
    const google = { ...empty.google, windows: { ...empty.google.windows, historical: null, recent: null } };
    expect(renderHebrewReport(report, google, empty.affiliate, null)).toMatch(/אין נתוני Search Console, ולכן לא חושב שום דירוג/);
  });

  it("joins Hebrew words with a hyphen only before numerals", () => {
    expect(andHe("3 קליקים")).toBe("ו-3 קליקים");
    expect(andHe("קליק אחד")).toBe("ו" + "קליק אחד");
    expect(he.impressions(1)).toBe("חשיפה אחת");
    expect(he.impressions(0)).toBe("0 חשיפות");
    expect(he.impressions(null)).toBe("חשיפות לא ידועות");
    expect(he.clicks(null)).toBe("קליקים לא ידועים");
  });

  it("titles each action kind in Hebrew", () => {
    for (const item of report.queue) expect(actionTitleHe(item).length).toBeGreaterThan(5);
  });
});

describe("a world with no Search Console data still produces a safe report", () => {
  it("answers from the affiliate and Guardian lanes only and lists no opportunity", () => {
    const partners = [partnerFacts("alpha", { payout: blockedRail, revenueReady: false })];
    const inventory = makeInventory();
    const google = makeWorld({ partners }).google;
    const missing = { ...google, status: "NEEDS_DATA" as const, candidates: [], shortlist: [], windows: { ...google.windows, historical: null, recent: null } };
    const affiliate = runAffiliateRevenueAgent({ now: NOW, partners, gsc: null, inventory, protection: makeProtection(), funnel: unavailableFunnel("x") });
    const report = direct({ ...makeWorld({ partners }), google: missing, affiliate });
    expect(report.shortlist).toEqual([]);
    expect(report.answer.kind).toBe("OWNER_PAYOUT_ACTION");
    expect(report.demandSummary.verifiedCurrentDemandPages).toBe(0);
  });
});
