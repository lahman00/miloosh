import { getSoftware, type Software } from "@/data/software";
import { getCategory, type Category } from "@/data/categories";
import { SITE_DESCRIPTION, SITE_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Why We Don't Rank War (2026-09-26) — Part 11/12 entity-consistency gap:
 * this previously carried only name/url. logo, description and a real
 * contact point are all already-established, real, public facts elsewhere
 * on the site (the actual shipped logo asset, the About page's own
 * description, and the Contact page's real working email) — this just
 * wires them into structured data rather than inventing anything new. No
 * sameAs is added: no real Miloosh social profiles exist in this codebase
 * to cite, and fabricating one would be exactly the fake E-E-A-T theater
 * this mission explicitly prohibits.
 */
export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-icon.png`,
    description: SITE_DESCRIPTION,
    contactPoint: {
      "@type": "ContactPoint",
      email: SITE_EMAIL,
      contactType: "customer support",
    },
  };
}

export function getBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function getSoftwareApplicationJsonLd(software: Software) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${software.name} alternatives`,
    itemListElement: software.alternatives.map((alternative, index) => {
      const alternativeSoftware = getSoftware(alternative.slug);
      const categoryName = alternativeSoftware
        ? getCategory(alternativeSoftware.category)?.name
        : getCategory(software.category)?.name;

      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareApplication",
          name: alternative.name,
          description: alternative.description,
          applicationCategory: categoryName,
          url: `${SITE_URL}/software/${alternative.slug}`,
        },
      };
    }),
  };
}

export function getFaqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/**
 * ItemList of the two compared SoftwareApplication entries — deliberately
 * no aggregateRating, no review, no offers/price. Comparison pages don't
 * publish ratings, so the structured data doesn't claim any either.
 */
export function getComparisonJsonLd(softwareA: Software, softwareB: Software) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${softwareA.name} vs ${softwareB.name}`,
    itemListElement: [softwareA, softwareB].map((software, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareApplication",
        name: software.name,
        description: software.description,
        applicationCategory: getCategory(software.category)?.name,
        url: `${SITE_URL}/software/${software.slug}`,
      },
    })),
  };
}

export function getCategoryJsonLd(category: Category, software: Software[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description,
    url: `${SITE_URL}/category/${category.slug}`,
    hasPart: software.map((item) => ({
      "@type": "SoftwareApplication",
      name: item.name,
      description: item.description,
      url: `${SITE_URL}/software/${item.slug}`,
    })),
  };
}
