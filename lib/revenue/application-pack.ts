import type { Software } from "@/data/software";
import { getSoftware, getAllSoftware } from "@/data/software";
import { getAllCategories } from "@/data/categories";
import { getAffiliateProgram } from "@/lib/revenue/affiliate-manager";
import type { AffiliateProgramInfo } from "@/data/revenue/affiliate-programs";
import { CURRENT_AFFILIATE_LEDGER } from "@/data/affiliate/current-affiliate-truth";
import type { AffiliateProgramRelationship, CanonicalLedgerStatus } from "@/data/affiliate/canonical-ledger";
import { ACTIVE_PARTNERS } from "@/data/affiliate/active-partners";
import { KNOWN_APPLICATION_BLOCKERS } from "@/lib/revenue/affiliate-priority";

export const APPLICANT_BUSINESS_NAME = "Miloosh";
export const APPLICANT_WEBSITE = "https://miloosh.com";
export const APPLICANT_BUSINESS_EMAIL = "hello@miloosh.com";
export const APPLICANT_LINKEDIN_URL: string | null = "https://www.linkedin.com/company/141163964/";

export const BUSINESS_DESCRIPTION =
  "Miloosh is an independent software research and comparison platform focused on helping users make better-informed software decisions using clear product information, comparisons and alternatives.";

export const PROMOTION_STRATEGY =
  "Miloosh helps users research and compare business software before making a purchase decision. We promote relevant software through product, comparison and alternatives pages. Traffic is generated primarily through organic search and software-focused content. When a product is relevant to a visitor's research, users may be directed to the vendor through clearly disclosed affiliate links.";

export const PUBLISHER_CLASSIFICATION = "Publisher of product reviews, buying guides or comparison articles.";

export function getAudienceDescription(): string {
  const productCount = getAllSoftware().length;
  const categoryCount = getAllCategories().length;
  return `Miloosh's audience is people actively researching and comparing business software — reaching us primarily through organic search while evaluating a specific tool or category, not general readers. The site currently covers ${productCount} software products across ${categoryCount} categories (project management, CRM, communication, and others), each with dedicated comparison and alternatives content aimed at buying-intent search queries.`;
}

export function getPromotedSoftwareSummary(): string {
  const productCount = getAllSoftware().length;
  const categoryCount = getAllCategories().length;
  return `${productCount} SaaS/business-software products across ${categoryCount} categories are covered on Miloosh today, each with its own product page and relevant head-to-head comparison pages against direct competitors.`;
}

export function getCategoriesNichesList(): string {
  return getAllCategories().map((category) => category.name).join(", ");
}

export function getCommonAnswers(): Record<string, string> {
  return {
    "How will you promote us?": PROMOTION_STRATEGY,
    "What is your main source of traffic?": "Organic search (Google) — visitors arrive via software comparison and buying-guide queries, not paid acquisition or social.",
    "Do you have an existing audience or email list?": "No email list or social following is used for promotion; all traffic is organic search landing directly on relevant product/comparison pages.",
    "Do you currently promote any competing or similar products?": "Miloosh is a neutral, multi-vendor comparison site — it lists and compares many competing products in the same category, including this one's direct competitors, as part of its normal editorial content, not as a conflict of interest.",
  };
}

export type ApplicationPack = {
  slug: string;
  productName: string;
  businessName: string;
  website: string;
  businessEmail: string;
  linkedinUrl: string | null;
  description: string;
  promotionStrategy: string;
  classification: string;
  audienceDescription: string;
  promotedSoftwareSummary: string;
  categoriesNiches: string;
  commonAnswers: Record<string, string>;
  program: AffiliateProgramInfo | null;
  applicationUrl: string | null;
  currentRelationshipStatus: CanonicalLedgerStatus | "ACTIVE_REGISTRY" | "NO_RELATIONSHIP";
  /** Static/account-truth gate. The prepare CLI adds the mutable pipeline gate before representing a pack as submit-ready. */
  readyToApply: boolean;
  operationalBlockReason: string | null;
  missingOwnerInputs: string[];
};

function relationshipForProduct(slug: string): AffiliateProgramRelationship | null {
  const matches = CURRENT_AFFILIATE_LEDGER.filter((relationship) => relationship.productSlugs.includes(slug));
  if (matches.length === 0) return null;
  return [...matches].sort(
    (a, b) => a.productSlugs.length - b.productSlugs.length || b.statusUpdatedAt.localeCompare(a.statusUpdatedAt),
  )[0]!;
}

function relationshipReason(relationship: AffiliateProgramRelationship): string {
  switch (relationship.status) {
    case "PENDING_REVIEW":
      return "Application is already pending review; do not submit a duplicate.";
    case "ACTIVE":
    case "READY_AND_VERIFIED":
      return "A verified relationship already exists; no fresh application is needed.";
    case "APPROVED_NEEDS_LINK":
    case "APPROVED_NEEDS_EDITORIAL_CONTENT":
      return "The program is already approved and needs activation work, not another application.";
    case "OWNER_ACTION_REQUIRED":
    case "BLOCKED_FORM_DEFECT":
    case "HOLD":
      return relationship.ownerBlocker ?? relationship.formBlocker ?? relationship.notes ?? "Current relationship is blocked.";
    case "REJECTED":
      return "Miloosh was rejected. Do not reapply without genuinely new first-party evidence.";
    case "NOT_ELIGIBLE":
      return "Miloosh is not eligible under current first-party evidence.";
    case "NO_REAL_PROGRAM_FOUND":
      return "No current real publisher program is verified.";
    case "PROGRAM_NOT_VERIFIED":
      return "Current publisher program is not sufficiently verified.";
    case "PROGRAM_ENDED":
      return "The historical affiliate program ended.";
  }
}

export function buildApplicationPack(slug: string): ApplicationPack | null {
  const software: Software | undefined = getSoftware(slug);
  if (!software) return null;
  const program = getAffiliateProgram(slug) ?? null;
  const active = ACTIVE_PARTNERS.find((partner) => partner.slug === slug);
  const relationship = relationshipForProduct(slug);

  let currentRelationshipStatus: ApplicationPack["currentRelationshipStatus"] = "NO_RELATIONSHIP";
  let operationalBlockReason: string | null = null;

  if (active) {
    currentRelationshipStatus = "ACTIVE_REGISTRY";
    operationalBlockReason = "Verified active partner already exists; do not apply again.";
  } else if (relationship) {
    currentRelationshipStatus = relationship.status;
    operationalBlockReason = relationshipReason(relationship);
  } else if (KNOWN_APPLICATION_BLOCKERS[slug]) {
    operationalBlockReason = KNOWN_APPLICATION_BLOCKERS[slug]!;
  } else if (!program || program.programExists !== "yes") {
    operationalBlockReason = "No confirmed current public affiliate program.";
  } else if (!program.applicationUrl) {
    operationalBlockReason = `Official application URL for ${software.name} is not confirmed.`;
  } else if (program.confidence === "low") {
    operationalBlockReason = "Public-program research confidence is too low to submit safely.";
  }

  const readyToApply = operationalBlockReason === null;
  const missingOwnerInputs: string[] = [];
  if (!APPLICANT_LINKEDIN_URL) {
    missingOwnerInputs.push("Miloosh LinkedIn company-page URL — provide it once and reuse it for every legitimate application.");
  }
  if (!program?.applicationUrl && !operationalBlockReason) {
    missingOwnerInputs.push(`Official application URL for ${software.name} — not confirmed.`);
  }

  return {
    slug,
    productName: software.name,
    businessName: APPLICANT_BUSINESS_NAME,
    website: APPLICANT_WEBSITE,
    businessEmail: APPLICANT_BUSINESS_EMAIL,
    linkedinUrl: APPLICANT_LINKEDIN_URL,
    description: BUSINESS_DESCRIPTION,
    promotionStrategy: PROMOTION_STRATEGY,
    classification: PUBLISHER_CLASSIFICATION,
    audienceDescription: getAudienceDescription(),
    promotedSoftwareSummary: getPromotedSoftwareSummary(),
    categoriesNiches: getCategoriesNichesList(),
    commonAnswers: getCommonAnswers(),
    program,
    applicationUrl: program?.applicationUrl ?? relationship?.applicationUrl ?? null,
    currentRelationshipStatus,
    readyToApply,
    operationalBlockReason,
    missingOwnerInputs,
  };
}
