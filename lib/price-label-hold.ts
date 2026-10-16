import hold from "@/data/seo/price-label-hold.json";

/**
 * Profiles under a running measurement keep their current price wording until the hold ends (owner decision: protected
 * pages wait until 2026-11-04). `npm run seo:price-label-hold` writes the list from the growth protection mechanism.
 * A profile the list does not name is editable and gets the corrected wording.
 */
const HELD = new Set<string>(hold.heldSoftware);

export function isPriceLabelHeld(slug: string): boolean {
  return HELD.has(slug);
}
