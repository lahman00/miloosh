import { getAllSoftware, type Software } from "@/data/software";
import { getRelatedSoftware } from "@/lib/related";

// שינוי תחום לחנות בלבד. הקשר שנאצר הוא אות רלוונטיות, לא דירוג איכות או עמלה.
export function selectStoreRelatedSoftware(
  current: readonly Software[], catalog: readonly Software[], limit = 3,
  excludeDirectAlternatives = false,
): Software[] {
  if (!current.length || !Number.isFinite(limit) || limit <= 0) return [];
  const excluded = new Set(current.map(item => item.slug));
  const direct = new Set(current.flatMap(item => item.alternatives.map(alt => alt.slug)));
  if (excludeDirectAlternatives) for (const slug of direct) excluded.add(slug);
  const candidates = [...new Map(catalog.map(item => [item.slug, item])).values()]
    .filter(item => !excluded.has(item.slug) && (item.category === "ecommerce" || item.slug === "wix"));
  const relevance = (item: Software) => Number(direct.has(item.slug))
    + Number(item.alternatives.some(alt => current.some(source => source.slug === alt.slug)));
  return candidates.sort((a, b) => relevance(b) - relevance(a)
    || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)).slice(0, Math.floor(limit));
}

export function getStoreRelatedSoftware(current: readonly Software[], limit = 3, excludeDirectAlternatives = false) {
  return selectStoreRelatedSoftware(current, getAllSoftware(), limit, excludeDirectAlternatives);
}

export function getComparisonRelatedSoftware(a: Software, b: Software, limit = 3): Software[] {
  if (a.category === "ecommerce" || b.category === "ecommerce") return getStoreRelatedSoftware([a, b], limit);
  const excluded = new Set([a.slug, b.slug]);
  return [...getRelatedSoftware(a, limit), ...getRelatedSoftware(b, limit)]
    .filter(item => !excluded.has(item.slug))
    .filter((item, index, all) => all.findIndex(other => other.slug === item.slug) === index).slice(0, limit);
}
