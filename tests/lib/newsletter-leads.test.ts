import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { recordNewsletterLead, getLeadByEmail, unsubscribeByToken, getAllNewsletterLeads } from "@/lib/newsletter/leads";

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23) — Email Acquisition Engine MVP
 * regression suite. Runs against the real local-file fallback (no
 * BLOB_READ_WRITE_TOKEN in the test environment), matching the same
 * backup/restore-a-real-file convention already established for other
 * var/-backed modules in this codebase (see tests/lib/indexation-
 * priority.test.ts).
 */
const LOCAL_FALLBACK_PATH = path.join(process.cwd(), "var", "newsletter-leads.json");

describe("newsletter leads", () => {
  let backup: string | null = null;

  beforeEach(() => {
    backup = fs.existsSync(LOCAL_FALLBACK_PATH) ? fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8") : null;
    fs.rmSync(LOCAL_FALLBACK_PATH, { force: true });
  });

  afterEach(() => {
    if (backup !== null) {
      fs.mkdirSync(path.dirname(LOCAL_FALLBACK_PATH), { recursive: true });
      fs.writeFileSync(LOCAL_FALLBACK_PATH, backup);
    } else {
      fs.rmSync(LOCAL_FALLBACK_PATH, { force: true });
    }
  });

  it("records a lead and can look it up by email, case-insensitively", async () => {
    await recordNewsletterLead({ email: "Test@Example.com", source: "newsletter-page" });
    const lead = await getLeadByEmail("test@example.com");
    expect(lead?.email).toBe("test@example.com");
    expect(lead?.source).toBe("newsletter-page");
    expect(lead?.unsubscribedAt).toBeNull();
  });

  it("re-subscribing the same email updates the record instead of creating a duplicate", async () => {
    await recordNewsletterLead({ email: "dup@example.com", source: "newsletter-page" });
    await recordNewsletterLead({ email: "dup@example.com", source: "saas-cost-calculator" });
    const all = await getAllNewsletterLeads();
    const matches = all.filter((l) => l.email === "dup@example.com");
    expect(matches).toHaveLength(1);
    expect(matches[0]!.source).toBe("saas-cost-calculator");
  });

  it("preserves the same unsubscribe token across a re-subscribe", async () => {
    const first = await recordNewsletterLead({ email: "stable@example.com", source: "newsletter-page" });
    const second = await recordNewsletterLead({ email: "stable@example.com", source: "newsletter-page" });
    expect(second.unsubscribeToken).toBe(first.unsubscribeToken);
  });

  it("unsubscribeByToken marks the lead unsubscribed and getAllNewsletterLeads excludes it by default", async () => {
    const lead = await recordNewsletterLead({ email: "bye@example.com", source: "newsletter-page" });
    const result = await unsubscribeByToken(lead.unsubscribeToken);
    expect(result).toBe(true);

    const active = await getAllNewsletterLeads();
    expect(active.find((l) => l.email === "bye@example.com")).toBeUndefined();

    const all = await getAllNewsletterLeads(true);
    const found = all.find((l) => l.email === "bye@example.com");
    expect(found?.unsubscribedAt).not.toBeNull();
  });

  it("unsubscribeByToken returns false for an unknown/invalid token, never fabricating success", async () => {
    const result = await unsubscribeByToken("not-a-real-token");
    expect(result).toBe(false);
  });

  it("re-subscribing after an unsubscribe clears the unsubscribed state", async () => {
    const lead = await recordNewsletterLead({ email: "again@example.com", source: "newsletter-page" });
    await unsubscribeByToken(lead.unsubscribeToken);
    await recordNewsletterLead({ email: "again@example.com", source: "newsletter-page" });
    const active = await getAllNewsletterLeads();
    expect(active.find((l) => l.email === "again@example.com")?.unsubscribedAt).toBeNull();
  });

  it("stores full real attribution fields when provided", async () => {
    const lead = await recordNewsletterLead({
      email: "attributed@example.com",
      source: "saas-cost-calculator",
      landingPath: "/tools/saas-cost-calculator",
      utmSource: "facebook",
      utmMedium: "social",
      utmCampaign: "organic",
      utmContent: "abc123",
      visitorId: "v_test123",
    });
    expect(lead.landingPath).toBe("/tools/saas-cost-calculator");
    expect(lead.utmSource).toBe("facebook");
    expect(lead.visitorId).toBe("v_test123");
  });

  it("getAllNewsletterLeads returns an empty array, not a crash, when nothing has ever been recorded", async () => {
    expect(await getAllNewsletterLeads()).toEqual([]);
  });
});
