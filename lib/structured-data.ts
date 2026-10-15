import { getSoftware, type Software } from "@/data/software";
import { getCategory, type Category } from "@/data/categories";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
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

/**
 * The product the profile page is about, described only with facts the profile stores: its name, description,
 * category, platforms and official website. Deliberately no aggregateRating, review or offers: the site publishes
 * none, so the markup claims none.
 */
export function getProductJsonLd(software: Software) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: software.name,
    description: software.description,
    applicationCategory: getCategory(software.category)?.name,
    ...(software.platforms?.length ? { operatingSystem: software.platforms.join(", ") } : {}),
    url: `${SITE_URL}/software/${software.slug}`,
    sameAs: [software.website],
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
