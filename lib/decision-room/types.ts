/**
 * Decision Room data contracts (2026-10-30). Everything the room shows about a product comes from the existing verified dataset
 * (data/software/*.json) and is carried in these shapes. Nothing is invented: a missing fact stays missing.
 */
export type RoomCurrency = "USD" | "EUR" | "GBP";
export const ROOM_CURRENCIES: readonly RoomCurrency[] = ["USD", "EUR", "GBP"];

export type RoomIndexEntry = {
  slug: string;
  name: string;
  category: string;
  categoryName: string;
  /** Short vendor-positioning line, at most 120 characters. */
  bestFor: string;
};

export type RoomPricing = {
  status: string | null;
  model: string | null;
  startingPrice: string | null;
  freePlan: boolean | null;
  freeTrial: { available: boolean; days: number | null } | null;
  entryPaid: { amount: number; currency: string; billingPeriod: "monthly" | "annual" | "one_time" | "unknown"; /** null = the record does not say whether the price is per seat or flat. */ perSeat: boolean | null; annualBillingRequired: boolean } | null;
  enterpriseContactSales: boolean | null;
  lastVerified: string | null;
  officialSource: string | null;
};

export type RoomProduct = RoomIndexEntry & {
  description: string;
  features: string[];
  pros: string[];
  cons: string[];
  platforms: string[];
  tags: string[];
  faq: Array<{ question: string; answer: string }>;
  sources: string[];
  /** Date the product's sources were fetched or verified, YYYY-MM-DD. */
  accessedAt: string;
  website: string;
  pricing: RoomPricing;
  /** The same link, rel and disclosure rule the rest of the site uses. Resolved on the server, never rebuilt on the client. */
  cta: { href: string; rel: string; disclosure: boolean };
};

export type EvidenceStatus = "verified" | "documented_limited" | "unknown";

export type Evidence = {
  criterionId: string;
  label: string;
  status: EvidenceStatus;
  /** yes or no only when the status is verified or documented; null when unknown. */
  value: "yes" | "no" | null;
  detail: string;
  /** What the buyer needs to verify, shown whenever the status is not verified. */
  toVerify: string | null;
  sources: Array<{ label: string; url: string }>;
  checkedAt: string | null;
};
