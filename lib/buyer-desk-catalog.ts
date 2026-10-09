import { getSoftware } from "@/data/software";
import { DESK_CATEGORIES, type DeskProduct } from "@/lib/buyer-desk";
import { getComparisonSlug, PUBLISHED_COMPARISONS } from "@/data/comparisons";

export function getBuyerDeskComparisons() {
  return DESK_CATEGORIES.flatMap(category => PUBLISHED_COMPARISONS
    .filter(([a, b]) => (category.slugs as readonly string[]).includes(a) && (category.slugs as readonly string[]).includes(b))
    .map(([a, b]) => ({ a, b, href: `/compare/${getComparisonSlug(a, b)}` })));
}

/** Server-side projection: canonical research, never prototype facts or affiliate ordering. */
export function getBuyerDeskProducts(): DeskProduct[] {
  return DESK_CATEGORIES.flatMap(category => category.slugs.map(slug => {
    const tool = getSoftware(slug);
    if (!tool) throw new Error(`Missing buyer-desk research: ${slug}`);
    return {
      slug: tool.slug, name: tool.name, category: category.id, description: tool.description,
      bestFor: tool.bestFor, features: tool.features.slice(0, 3),
      limitation: tool.cons?.[0] ?? "Check the required plan, usage limits and workflow fit before choosing.",
      checkedAt: tool.accessedAt,
    };
  }));
}
