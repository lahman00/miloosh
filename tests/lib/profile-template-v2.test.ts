import { describe, expect, it } from "vitest";
import { HUMAN_REVIEWED_PROFILES } from "@/data/seo/human-reviews";
import { getAllSoftware, getSoftware, type Software } from "@/data/software";
import { generateChoosingGuide, generateFaq } from "@/lib/generators";
import { describeReviewStatus, getReviewStatus } from "@/lib/review-status";
import { getProductJsonLd } from "@/lib/structured-data";

function software(overrides: Partial<Software> = {}): Software {
  return {
    slug: "x",
    name: "X",
    category: "crm",
    description: "X is a tool.",
    bestFor: "Sales teams that want a pipeline view.",
    website: "https://x.example",
    accessedAt: "2026-10-08",
    platforms: ["Web", "iOS"],
    alternatives: [
      { name: "A", slug: "a", description: "d", bestFor: "Small teams.", strengths: ["s"] },
      { name: "B", slug: "b", description: "d", bestFor: "Large teams.", strengths: ["s"] },
    ],
    ...overrides,
  } as Software;
}

const GENERIC = ["Most teams start by exporting their existing", "Integration support varies by tool", "See the comparison above"];

describe("generateFaq", () => {
  it("v1 keeps the template questions, including the two generic answers", () => {
    const text = JSON.stringify(generateFaq(software()));
    for (const needle of GENERIC.slice(0, 2)) expect(text).toContain(needle);
  });

  it("v2 keeps only questions grounded in the product's data and none of the generic sentences", () => {
    const items = generateFaq(software(), { v2: true });
    expect(items.map((item) => item.question)).toEqual(["What are the best alternatives to X?", "What platforms does X run on?"]);
    const text = JSON.stringify(items);
    for (const needle of GENERIC) expect(text).not.toContain(needle);
    expect(items[0]!.answer).toBe("Based on core features and use case fit, the strongest X alternatives are A and B.");
    expect(items[1]!.answer).toBe("X is available on Web and iOS, per its official site.");
  });

  it("v2 drops the section when fewer than two grounded answers remain", () => {
    expect(generateFaq(software({ platforms: undefined }), { v2: true })).toEqual([]);
    expect(generateFaq(software({ alternatives: [], platforms: ["Web"] }), { v2: true })).toEqual([]);
  });

  it("returns the product's own FAQ unchanged under either template", () => {
    const faq = [{ question: "Does X publish its pricing?", answer: "Yes, on its pricing page." }];
    expect(generateFaq(software({ faq }))).toEqual(faq);
    expect(generateFaq(software({ faq }), { v2: true })).toEqual(faq);
  });
});

describe("generateChoosingGuide", () => {
  const closing = "Compare each against the workflow you actually run today";

  it("v1 keeps the closing advice", () => {
    expect(generateChoosingGuide(software())).toContain(closing);
  });

  it("v2 keeps the product-specific part and the platforms note and drops the closing advice", () => {
    const text = generateChoosingGuide(software(), { v2: true });
    expect(text).toBe("If you are weighing a move away from X, compare its listed alternatives: A (Small teams); B (Large teams). Confirm it runs on the platforms you need (Web, iOS) before switching.");
  });
});

describe("review status", () => {
  const base = software({ slug: "x", accessedAt: "2026-10-08" });

  it("states the real check date and pricing date, and no human review by default", () => {
    const status = getReviewStatus({ ...base, pricing: { lastVerified: "2026-10-06" } });
    expect(status).toEqual({ checkedOn: "2026-10-08", pricingVerifiedOn: "2026-10-06", humanReviewedOn: null });
    expect(describeReviewStatus(status)).toBe("Last reviewed October 8, 2026 against the vendor's official sources. Pricing last verified October 6, 2026.");
  });

  it("omits the pricing sentence when pricing is not recorded", () => {
    expect(describeReviewStatus(getReviewStatus(base))).toBe("Last reviewed October 8, 2026 against the vendor's official sources.");
  });

  it("mentions a person only when the owner has marked the page", () => {
    expect(describeReviewStatus(getReviewStatus(base, { x: "2026-10-20" }))).toContain("Reviewed by a person on October 20, 2026.");
    expect(describeReviewStatus(getReviewStatus(base, { other: "2026-10-20" }))).not.toContain("person");
  });

  it("has no page marked as reviewed by a person until the owner marks one", () => {
    expect(HUMAN_REVIEWED_PROFILES).toEqual({});
  });

  it("only ever accepts a real profile and a real date for a human review", () => {
    for (const [slug, date] of Object.entries(HUMAN_REVIEWED_PROFILES)) {
      expect(getSoftware(slug), slug).toBeDefined();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Date.parse(date)).toBeLessThanOrEqual(Date.now());
    }
  });
});

describe("getProductJsonLd", () => {
  it("describes the product itself with the facts the profile stores", () => {
    expect(getProductJsonLd(software())).toEqual({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "X",
      description: "X is a tool.",
      applicationCategory: "CRM",
      operatingSystem: "Web, iOS",
      url: expect.stringMatching(/\/software\/x$/),
      sameAs: ["https://x.example"],
    });
  });

  it("claims no rating, review or price for any product, and leaves out operatingSystem when platforms are unknown", () => {
    for (const product of getAllSoftware()) {
      const json = JSON.stringify(getProductJsonLd(product));
      expect(json, product.slug).not.toMatch(/aggregateRating|"review"|"offers"|"price"/);
    }
    expect(getProductJsonLd(software({ platforms: undefined }))).not.toHaveProperty("operatingSystem");
  });
});

describe("generateOverview", () => {
  it("v1 repeats the description before best-for; v2 gives only who it is for", async () => {
    const { generateOverview } = await import("@/lib/generators");
    const s = software();
    expect(generateOverview(s)).toBe("X is a tool. Sales teams that want a pipeline view.");
    expect(generateOverview(s, { v2: true })).toBe("Sales teams that want a pipeline view.");
  });
});
