export type GuideProductReview = {
  slug: string;
  badge: string;
  ranking: number;
  fitReason: string;
  limitations: string;
  pricingNote: string;
  summaryBestFor?: string;
  summaryPrice?: string;
  summaryAvailability?: string;
  strengths?: string[];
};

export type GuideCriterion = {
  title: string;
  description: string;
};

export type GuideFaq = {
  question: string;
  answer: string;
};

export type RoleGuide = {
  slug: string;
  title: string;
  headline: string;
  metaDescription: string;
  categorySlug: string;
  roleName: string;
  updatedAt: string;
  intro: string;
  targetAudience: string[];
  keyCriteria: GuideCriterion[];
  products: GuideProductReview[];
  comparisons: string[];
  faqs: GuideFaq[];
};
