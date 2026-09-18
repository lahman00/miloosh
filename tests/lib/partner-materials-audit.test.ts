import { describe, expect, it } from "vitest";
import { PARTNER_MATERIAL_AUDIT } from "@/data/affiliate/partner-materials-audit";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";

describe("partner materials audit", () => {
  it("has one record per company and no duplicate known affiliate URL", () => {
    const slugs = PARTNER_MATERIAL_AUDIT.map((record) => record.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const urls = PARTNER_MATERIAL_AUDIT.map((record) => record.affiliateUrl).filter((url) => url !== "UNKNOWN");
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("never marks a company ready without an evidence-backed URL", () => {
    for (const record of PARTNER_MATERIAL_AUDIT.filter((item) => item.readiness === "READY NOW")) {
      expect(record.affiliateUrl).not.toBe("UNKNOWN");
      expect(record.evidence.length).toBeGreaterThan(0);
    }
  });

  it("covers every company explicitly required by the audit brief", () => {
    const required = ["iconosquare", "carepatron", "ruby", "mindstudio", "miro", "8fig", "pagecloud", "rocketreach", "flatpay", "hubstaff", "closely", "pipedrive", "getresponse", "volza", "todoist"];
    const slugs = new Set(PARTNER_MATERIAL_AUDIT.map((record) => record.slug));
    for (const slug of required) expect(slugs.has(slug)).toBe(true);
  });

  it("keeps rejected, pending, and hold states distinct", () => {
    expect(PARTNER_MATERIAL_AUDIT.find((record) => record.slug === "hubspot")?.readiness).toBe("REJECTED");
    // ClickUp: this assertion expected PENDING APPROVAL, written before a
    // first-party PartnerStack rejection email dated 2026-08-21 arrived
    // ("After careful consideration, ClickUp has declined your application").
    // Real data was correctly updated to REJECTED; this stale test
    // assertion was the one still behind.
    expect(PARTNER_MATERIAL_AUDIT.find((record) => record.slug === "clickup")?.readiness).toBe("REJECTED");
    // Brevo: PartnerStack's top-level badge still showed Active, but the program's own Messages
    // thread carried a first-party rejection dated 2026-08-19 — corrected from APPROVED BUT NEEDS
    // LINK to REJECTED, same treatment as HubSpot/n8n.
    expect(PARTNER_MATERIAL_AUDIT.find((record) => record.slug === "brevo")?.readiness).toBe("REJECTED");
    // Miro: the prior "approved" pipeline status had no cited source and is contradicted by a live
    // PartnerStack check (zero results) — corrected from APPROVED BUT NEEDS LINK to HOLD / UNCLEAR.
    expect(PARTNER_MATERIAL_AUDIT.find((record) => record.slug === "miro")?.readiness).toBe("HOLD / UNCLEAR");
  });

  // MILOOSH MONEY SPRINT (2026-08-26) -- Wrike was found ACTIVE in
  // data/affiliate/active-partners.ts and data/affiliate/canonical-ledger.ts
  // while this audit still listed it PENDING APPROVAL alongside FreshBooks/
  // Zendesk, a stale-drift class this test now guards against generally.
  it("resolves every currently active partner to READY NOW with a real affiliate URL, never stale pending/rejected history", () => {
    for (const partner of ACTIVE_PARTNERS) {
      const record = PARTNER_MATERIAL_AUDIT.find((item) => item.slug === partner.slug);
      expect(record, `active partner "${partner.slug}" is missing from PARTNER_MATERIAL_AUDIT`).toBeDefined();
      expect(record!.readiness, `active partner "${partner.slug}" should read READY NOW`).toBe("READY NOW");
      expect(record!.affiliateUrl).not.toBe("UNKNOWN");
    }
  });

  it("scopes SurveyMonkey's August fail-close only to the retired old asset", () => {
    const record = PARTNER_MATERIAL_AUDIT.find((item) => item.slug === "surveymonkey");
    const evidence = record?.evidence.join(" ") ?? "";
    expect(record?.affiliateUrl).toBe("https://get.surveymonkey.com/tbaic7ngidg4");
    expect(evidence).toContain("OLD asset https://try.partnerstack.com/jx99ylh3mexb");
    expect(evidence).toContain("replacement asset https://get.surveymonkey.com/tbaic7ngidg4");
    expect(evidence).not.toContain("this asset is genuinely Miloosh's own");
  });

});
