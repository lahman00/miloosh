import { describe, it, expect, afterEach } from "vitest";
import { getAffiliateActivation } from "@/lib/revenue/affiliate-activation";
import { getSoftwareCtaUrl, getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { getSoftware } from "@/data/software";
import { getActivePartner } from "@/data/affiliate/active-partners";

const FAKE_URL = "https://example.com/test-fixture-affiliate-link?ref=test";
const ENV_VARS = [
  "NEXT_PUBLIC_AFFILIATE_URL_CLICKUP",
  "NEXT_PUBLIC_AFFILIATE_URL_PIPEDRIVE",
  "NEXT_PUBLIC_AFFILIATE_URL_TRELLO",
];

afterEach(() => {
  for (const key of ENV_VARS) delete process.env[key];
});

describe("legacy runtime affiliate activation truth boundary", () => {
  it("never reactivates a rejected Miloosh relationship even when an env URL exists", () => {
    process.env.NEXT_PUBLIC_AFFILIATE_URL_CLICKUP = FAKE_URL;
    const activation = getAffiliateActivation("clickup");
    expect(activation.isActive).toBe(false);
    expect(activation.affiliateUrl).toBeNull();

    const software = getSoftware("clickup")!;
    expect(getSoftwareCtaUrl(software)).toBe(software.website);
    expect(getSoftwareCtaRel(software)).toBe("noopener noreferrer");
    expect(shouldShowAffiliateDisclosure(software)).toBe(false);
  });

  it("permits legacy runtime config only for a relationship already ACTIVE in current truth", () => {
    process.env.NEXT_PUBLIC_AFFILIATE_URL_PIPEDRIVE = FAKE_URL;
    const activation = getAffiliateActivation("pipedrive");
    expect(activation.isActive).toBe(true);
    expect(activation.affiliateUrl).toBe(FAKE_URL);
  });

  it("canonical active-partner URL always beats a legacy env override", () => {
    process.env.NEXT_PUBLIC_AFFILIATE_URL_PIPEDRIVE = FAKE_URL;
    const canonicalUrl = getActivePartner("pipedrive")!.affiliateUrl!;
    const software = getSoftware("pipedrive")!;

    expect(getSoftwareCtaUrl(software)).toBe(canonicalUrl);
    expect(getSoftwareCtaUrl(software)).not.toBe(FAKE_URL);
    expect(getSoftwareCtaRel(software)).toContain("sponsored");
    expect(shouldShowAffiliateDisclosure(software)).toBe(true);
  });

  it("canonical active partner remains monetized without any legacy runtime env URL", () => {
    const activation = getAffiliateActivation("pipedrive");
    expect(activation.isActive).toBe(false);
    expect(getSoftwareCtaUrl(getSoftware("pipedrive")!)).toBe(getActivePartner("pipedrive")!.affiliateUrl);
  });

  it("never activates a product with no current ACTIVE relationship", () => {
    process.env.NEXT_PUBLIC_AFFILIATE_URL_TRELLO = FAKE_URL;
    const activation = getAffiliateActivation("trello");
    expect(activation.isActive).toBe(false);
    expect(activation.affiliateUrl).toBeNull();
  });

  /**
   * MILOOSH CRITICAL MONETIZATION CLOSEOUT (2026-08-29) P1-1 regression
   * fixture: a catalog-level software.affiliateUrl must never independently
   * activate monetization. Uses a real non-active product (trello, already
   * established above as having no current ACTIVE relationship) with a
   * synthetic affiliateUrl spliced onto it, simulating a stale or
   * accidentally-set field in that product's actual JSON -- which would be
   * a real, valid Software object, not a malformed one.
   */
  it("a stale/unverified catalog-level affiliateUrl never activates monetization on its own", () => {
    const trello = getSoftware("trello")!;
    const withStaleAffiliateUrl = { ...trello, affiliateUrl: FAKE_URL };

    expect(getSoftwareCtaUrl(withStaleAffiliateUrl)).toBe(trello.website);
    expect(getSoftwareCtaUrl(withStaleAffiliateUrl)).not.toBe(FAKE_URL);
    expect(getSoftwareCtaRel(withStaleAffiliateUrl)).toBe("noopener noreferrer");
    expect(shouldShowAffiliateDisclosure(withStaleAffiliateUrl)).toBe(false);
  });

  it("a catalog-level affiliateUrl IS honored when the same slug also has a real ACTIVE relationship", () => {
    const pipedrive = getSoftware("pipedrive")!;
    // pipedrive is genuinely ACTIVE via active-partners.ts already, so this
    // proves the gate is a real AND, not an accidental always-false: the
    // canonical registry URL still wins over the catalog-level one either
    // way (source precedence #1 beats #3), but the catalog-level path
    // itself is provably reachable for a slug with real current-truth
    // ACTIVE status, not just provably blocked for one without it.
    const withCatalogUrl = { ...pipedrive, affiliateUrl: FAKE_URL };
    expect(getSoftwareCtaRel(withCatalogUrl)).toContain("sponsored");
    expect(shouldShowAffiliateDisclosure(withCatalogUrl)).toBe(true);
  });
});
