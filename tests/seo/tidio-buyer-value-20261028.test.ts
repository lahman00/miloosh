import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSoftware } from "@/data/software";
import { getSoftwareIndexingQualityReasons } from "@/lib/indexing-quality";

const reviewDate = new Date("2026-11-05T12:00:00.000Z");

// Pricing exactly as released at 9ca469f. This editorial change must not touch it.
const releasedPricing = {
    "model": "freemium",
    "starting_price": "$24.17/month",
    "has_free_tier": true,
    "status": "verified",
    "free_plan": true,
    "free_trial": {
      "available": true,
      "days": 7
    },
    "entry_paid": {
      "amount": "24.17",
      "currency": "USD",
      "billing_period": "monthly"
    },
    "tiers": [
      {
        "name": "Free",
        "amount": "0",
        "currency": "USD",
        "billing_period": "monthly",
        "notes": "50 billable conversations/month, 50 one-time Lyro AI conversations, 100 Flows visitors/month."
      },
      {
        "name": "Starter",
        "amount": "24.17",
        "currency": "USD",
        "billing_period": "monthly",
        "notes": "100 billable conversations/month, 50 Lyro AI conversations/month."
      },
      {
        "name": "Growth",
        "amount": "49.17",
        "currency": "USD",
        "billing_period": "monthly",
        "notes": "Starting price, scales with usage. 250+ billable conversations/month, 50+ Lyro AI conversations/month. Marked \"Popular\"."
      },
      {
        "name": "Plus",
        "amount": "300",
        "currency": "USD",
        "billing_period": "monthly",
        "notes": "Starting price + monthly usage charges on top. Custom conversation limits, dedicated success manager, requires contacting sales for exact pricing."
      }
    ],
    "enterprise_contact_sales": true,
    "last_verified": "2026-08-23",
    "official_source": "https://www.tidio.com/pricing/"
  };

describe("Tidio October 2026 buyer-value refresh", () => {
  it("leaves the pricing object and its dates exactly as released", () => {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), "data/software/tidio.json"), "utf8"));
    expect(raw.pricing).toEqual(releasedPricing);
    expect(raw.accessed_at).toBe("2026-08-04");
    expect(getSoftware("tidio")!.pricing?.lastVerified).toBe("2026-08-23");
  });

  it("links the official pricing, quota and trial sources", () => {
    const sources = getSoftware("tidio")!.sources;
    expect(sources).toContain("https://www.tidio.com/pricing/");
    expect(sources).toContain("https://help.tidio.com/hc/en-us/articles/11874534946460-The-monthly-conversations-limit");
    expect(sources).toContain("https://help.tidio.com/hc/en-us/articles/5423133940764-The-Tidio-trial-version");
  });

  it("states a neutral buyer-fit criterion instead of a vendor customer count", () => {
    const bestFor = getSoftware("tidio")!.bestFor;
    expect(bestFor).not.toMatch(/300,000/);
    expect(bestFor).toContain("forecast");
    expect(bestFor).toContain("Lyro");
    expect(bestFor).toContain("Flows");
  });

  it("explains the pooled human-agent quota and what happens at the limit", () => {
    const cons = (getSoftware("tidio")!.cons ?? []).join(" ");
    expect(cons).toContain("pooled");
    expect(cons).toContain("tickets/email");
    expect(cons).toContain("WhatsApp");
    expect(cons).toContain("cannot reply or see incoming message details");
    expect(cons).toContain("Lyro and Flows have separate quotas");
    // Existing caveats stay.
    expect(cons).toContain("one-time");
    // The software page renders only the first two cons; the quota caveat must be visible there
    // while cons[0] (reused by the buyer desk) stays the original pricing caveat.
    const list = getSoftware("tidio")!.cons ?? [];
    expect(list[0]).toContain("scales with conversation volume");
    expect(list.slice(0, 2).join(" ")).toContain("pooled");
  });

  it("does not bump the shared accessedAt field and keeps the strict gate honest", () => {
    const tidio = getSoftware("tidio")!;
    expect(tidio.accessedAt).toBe("2026-08-04");
    const reasons = getSoftwareIndexingQualityReasons(tidio, reviewDate);
    expect(reasons).toContain("content-freshness");
  });

  it("leaves description, alternatives and affiliate-facing fields untouched", () => {
    const tidio = getSoftware("tidio")!;
    expect(tidio.description).toBe(
      "Tidio is a customer service platform combining live chat, a help desk, and the Lyro AI agent, which can independently handle a large share of repetitive support conversations.",
    );
    expect(tidio.alternatives.map((a) => a.slug)).toEqual(["intercom", "crisp", "liveagent", "zoho-desk"]);
  });
});
