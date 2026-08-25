import { describe, it, expect } from "vitest";
import { buildApplicationPack, BUSINESS_DESCRIPTION, PROMOTION_STRATEGY, APPLICANT_LINKEDIN_URL } from "@/lib/revenue/application-pack";
import { getAllSoftware } from "@/data/software";

describe("application pack generator", () => {
  it("returns null for an unknown slug", () => {
    expect(buildApplicationPack("not-a-real-product")).toBeNull();
  });

  it("uses the owner-approved truthful description and promotion strategy", () => {
    const pack = buildApplicationPack("clickup")!;
    expect(pack.description).toBe(BUSINESS_DESCRIPTION);
    expect(pack.promotionStrategy).toBe(PROMOTION_STRATEGY);
    expect(pack.description).toContain("independent software research and comparison platform");
    expect(pack.promotionStrategy).toContain("clearly disclosed affiliate links");
  });

  it("does not call a rejected public program ready to apply", () => {
    const clickup = buildApplicationPack("clickup")!;
    expect(clickup.program?.programExists).toBe("yes");
    expect(clickup.currentRelationshipStatus).toBe("REJECTED");
    expect(clickup.readyToApply).toBe(false);
    expect(clickup.operationalBlockReason).toMatch(/rejected/i);
  });

  it("does not call an active or pending relationship a fresh application", () => {
    const close = buildApplicationPack("close")!;
    expect(close.currentRelationshipStatus).toBe("ACTIVE_REGISTRY");
    expect(close.readyToApply).toBe(false);

    const freshdesk = buildApplicationPack("freshdesk")!;
    expect(freshdesk.currentRelationshipStatus).toBe("PENDING_REVIEW");
    expect(freshdesk.readyToApply).toBe(false);
  });

  it("still produces at least one genuinely fresh ready application pack from current data", () => {
    const ready = getAllSoftware()
      .map((software) => buildApplicationPack(software.slug))
      .find((pack) => pack?.readyToApply);
    expect(ready).toBeDefined();
    expect(ready?.program?.programExists).toBe("yes");
    expect(ready?.applicationUrl).toBeTruthy();
    expect(ready?.currentRelationshipStatus).toBe("NO_RELATIONSHIP");
  });

  it("uses the real owner-provided LinkedIn company URL", () => {
    const pack = buildApplicationPack("clickup")!;
    expect(pack.linkedinUrl).toBe(APPLICANT_LINKEDIN_URL);
    expect(pack.linkedinUrl).toBe("https://www.linkedin.com/company/141163964/");
    expect(pack.missingOwnerInputs.some((item) => item.includes("LinkedIn"))).toBe(false);
  });

  it("uses the real business identity fields", () => {
    const pack = buildApplicationPack("clickup")!;
    expect(pack.businessName).toBe("Miloosh");
    expect(pack.website).toBe("https://miloosh.com");
    expect(pack.businessEmail).toBe("hello@miloosh.com");
  });
});
