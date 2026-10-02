import { describe, expect, it } from "vitest";
import { CANONICAL_AFFILIATE_LEDGER, getRelationshipAffiliateUrl } from "@/data/affiliate/canonical-ledger";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";

const byProgramId = new Map(CANONICAL_AFFILIATE_LEDGER.map((program) => [program.programId, program]));

describe("canonical affiliate ledger state invariants", () => {
  it("does not conflate Jotform qualification delay with an attribution-cookie window", () => {
    const jotform = byProgramId.get("jotform");
    expect(jotform?.cookieWindow).toBeNull();
    expect(jotform?.commissionModel).toContain("60-day qualification");
    expect(jotform?.notes).toContain("homepage and pricing assets are both configured");
  });
  it("keeps pending relationships undecided and without affiliate URLs", () => {
    for (const program of CANONICAL_AFFILIATE_LEDGER.filter((p) => p.status === "PENDING_REVIEW")) {
      expect(program.decisionAt, `${program.programId} pending but has decisionAt`).toBeNull();
      expect(program.affiliateUrl, `${program.programId} pending but has affiliateUrl`).toBeNull();
      expect(program.notes, `${program.programId} pending but notes say rejected`).not.toMatch(/\b(rejected|declined)\b/i);
      expect(program.eligibility ?? "", `${program.programId} pending but eligibility says declined`).not.toMatch(/\b(rejected|declined)\b/i);
    }
  });

  it("keeps rejected relationships non-active and decision-backed", () => {
    for (const program of CANONICAL_AFFILIATE_LEDGER.filter((p) => p.status === "REJECTED")) {
      expect(program.affiliateUrl, `${program.programId} rejected but has affiliateUrl`).toBeNull();
      expect(program.decisionAt, `${program.programId} rejected but has no decisionAt`).toBeTruthy();
      expect(
        `${program.eligibility ?? ""} ${program.notes}`,
        `${program.programId} rejected but has no rejection/decline language`
      ).toMatch(/\b(rejected|declined|decline)\b/i);
    }
  });

  it("requires every ACTIVE canonical relationship to have a real URL", () => {
    for (const program of CANONICAL_AFFILIATE_LEDGER.filter((p) => p.status === "ACTIVE")) {
      expect(program.affiliateUrl, `${program.programId} ACTIVE without affiliateUrl`).toBeTruthy();
      expect(program.ownerBlocker, `${program.programId} ACTIVE but owner-blocked`).toBeNull();
      expect(program.formBlocker, `${program.programId} ACTIVE but form-blocked`).toBeNull();
    }
  });

  it("keeps active-partners registry exactly backed by an ACTIVE canonical relationship", () => {
    for (const active of ACTIVE_PARTNERS) {
      const matches = CANONICAL_AFFILIATE_LEDGER.filter(
        (program) => program.status === "ACTIVE" && program.productSlugs.includes(active.slug)
      );
      expect(matches, `${active.slug} has no unique ACTIVE canonical relationship`).toHaveLength(1);
      expect(getRelationshipAffiliateUrl(matches[0], active.slug), `${active.slug} canonical URL differs from active registry`).toBe(active.affiliateUrl);
    }
  });

  it("locks the corrected high-risk relationships", () => {
    expect(byProgramId.get("freshworks")?.status).toBe("PENDING_REVIEW");
    expect(byProgramId.get("freshworks")?.decisionAt).toBeNull();
    expect(byProgramId.get("help-scout")?.status).toBe("REJECTED");
    expect(byProgramId.get("clickup")?.status).toBe("REJECTED");
    expect(byProgramId.get("close")?.status).toBe("ACTIVE");
    expect(byProgramId.get("callrail")?.status).toBe("APPROVED_NEEDS_LINK");
    expect(byProgramId.get("callrail")?.applicationSubmittedAt).toBe("2026-09-30");
    expect(byProgramId.get("callrail")?.affiliateUrl).toBeNull();
    expect(byProgramId.get("zendesk")?.status).toBe("REJECTED");
    expect(byProgramId.get("zendesk")?.decisionAt).toBe("2026-09-28");
    expect(byProgramId.get("freshworks")?.lastFollowupAt).toBe("2026-09-29");
    expect(byProgramId.get("amplitude")?.lastFollowupAt).toBe("2026-09-29");
    expect(byProgramId.get("toggl-track")?.lastFollowupAt).toBe("2026-09-29");
  });

  it("locks the 2026-08-28 suspension-period reconciliation (Zoho issued product assets, Sprout Social/RingCentral/Framer routes) against silent regression", () => {
    // The six portal-issued destinations and successful Multi DC approval
    // supersede the earlier password / missing-link checkpoint.
    const zoho = byProgramId.get("zoho-ecosystem");
    expect(zoho?.status).toBe("ACTIVE");
    expect(zoho?.decisionAt).toBe("2026-09-29");
    expect(zoho?.affiliateUrl).toBe("https://go.zoho.com/RqIa");
    expect(zoho?.ownerBlocker).toBeNull();
    expect(zoho?.productSlugs).toContain("zoho-campaigns");
    expect(Object.keys(zoho?.productAffiliateUrls ?? {})).toHaveLength(6);

    // Sprout Social: re-modeled onto the CJ account, not the generic Impact
    // bucket -- both directions must hold, or the two ledgers disagree on
    // which network is responsible for this relationship.
    expect(byProgramId.get("cj-portfolio")?.productSlugs).toContain("sprout-social");
    expect(byProgramId.get("impact-portfolio")?.productSlugs).not.toContain("sprout-social");

    // RingCentral: carved out of the Impact bucket into its own
    // pending-clarification record -- Impact is no longer assumed correct.
    expect(byProgramId.get("ringcentral")?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(byProgramId.get("ringcentral")?.affiliateUrl).toBeNull();
    expect(byProgramId.get("impact-portfolio")?.productSlugs).not.toContain("ringcentral");

    // Framer: its own record, not buried in the generic
    // collaboration-and-design-portfolio bucket.
    expect(byProgramId.get("framer")?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(byProgramId.get("framer")?.affiliateUrl).toBeNull();
    expect(byProgramId.get("collaboration-and-design-portfolio")?.productSlugs).not.toContain("framer");

    // None of these remaining relationships may be ACTIVE without
    // a verified tracking asset -- this session found none, so none should
    // claim one.
    for (const id of ["cj-portfolio", "ringcentral", "framer", "buffer"]) {
      const program = byProgramId.get(id);
      expect(program?.status, `${id} marked ACTIVE without this test being updated to expect it`).not.toBe("ACTIVE");
      expect(program?.affiliateUrl, `${id} has a tracking URL but isn't ACTIVE`).toBeNull();
    }
  });

  it("locks the 2026-08-31 six-item reconciliation pass (Trainual/Framer re-verified, Semrush/Hootsuite added, Monday/PartnerStack narrative untouched)", () => {
    // Trainual's 2026-08-31 owner-action state is deliberately superseded
    // only by the vendor's 2026-09-30 welcome email and exact issued asset.
    const trainual = byProgramId.get("trainual");
    expect(trainual?.status).toBe("ACTIVE");
    expect(trainual?.decisionAt).toBe("2026-09-30");
    expect(trainual?.affiliateUrl).toBe("https://start.trainual.com/0j9to92n49iy");
    expect(trainual?.ownerBlocker).toBeNull();
    expect(trainual?.evidence.some((e) => e.includes("1a0f2363e2a1521e"))).toBe(true);

    // Framer: re-verified 2026-08-31 against framer.com/partners and
    // framer.com/legal/affiliates/1.0 -- terms unchanged (90-day cookie,
    // 50%/12mo, $200 threshold, Stripe via Dub, PPC prohibited). Still no
    // application submitted and no tracking asset.
    const framer = byProgramId.get("framer");
    expect(framer?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(framer?.affiliateUrl).toBeNull();
    expect(framer?.evidence.some((e) => e.includes("2026-08-31"))).toBe(true);

    // Semrush: genuinely new, real, verifiable Impact.com program, added to
    // the ledger for the first time this pass. Must never be ACTIVE:
    // applying requires an authenticated Impact.com session this agent does
    // not have.
    const semrush = byProgramId.get("semrush");
    expect(semrush?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(semrush?.affiliateUrl).toBeNull();
    expect(semrush?.network).toBe("Impact.com");
    expect(semrush?.applicationUrl ?? "").toMatch(/^https:\/\/app\.impact\.com\//);
    expect(semrush?.productSlugs).toEqual(["semrush"]);
    expect(ACTIVE_PARTNERS.map((p): string => p.slug)).not.toContain("semrush");

    // Hootsuite: carved out of the generic impact-portfolio bucket into its
    // own dedicated, specifically-evidenced record (the same treatment
    // Framer/RingCentral/Sprout Social already got) now that direct-fetched
    // evidence gives it real commission/cookie/application-URL terms.
    // Impact.com is still the correct network -- unlike Sprout Social/
    // RingCentral this is not a network correction -- and it must never be
    // ACTIVE without a real issued tracking link, and must not be left
    // double-counted inside the generic bucket.
    const hootsuite = byProgramId.get("hootsuite");
    expect(hootsuite?.status).toBe("OWNER_ACTION_REQUIRED");
    expect(hootsuite?.affiliateUrl).toBeNull();
    expect(hootsuite?.network).toBe("Impact.com");
    expect(hootsuite?.productSlugs).toEqual(["hootsuite"]);
    expect(ACTIVE_PARTNERS.map((p): string => p.slug)).not.toContain("hootsuite");
    expect(byProgramId.get("impact-portfolio")?.productSlugs).not.toContain("hootsuite");

    // Monday.com: already-ACTIVE partner whose payout sits on the
    // network-declined PartnerStack Account #2 (see
    // data/affiliate/payout-rails.ts) -- the tracking URL itself is still
    // real and still resolves on-site, so its ACTIVE status and exact URL
    // must not move without direct evidence of a real tracking-URL problem;
    // a payout-rail concern is a separate axis, not a reason to deactivate.
    const monday = byProgramId.get("monday");
    expect(monday?.status).toBe("ACTIVE");
    expect(monday?.affiliateUrl).toBe("https://try.monday.com/1p2fpizulcj7");
    expect(ACTIVE_PARTNERS.find((p) => p.slug === "monday")?.affiliateUrl).toBe(
      "https://try.monday.com/1p2fpizulcj7"
    );

    // Framer/Semrush/Hootsuite still lack a verified tracking asset.
    // Trainual is excluded because its later first-party welcome supplied one.
    for (const id of ["framer", "semrush", "hootsuite"]) {
      const program = byProgramId.get(id);
      expect(program?.status, `${id} marked ACTIVE without this test being updated to expect it`).not.toBe("ACTIVE");
      expect(program?.affiliateUrl, `${id} has a tracking URL but isn't ACTIVE`).toBeNull();
    }
  });
});
