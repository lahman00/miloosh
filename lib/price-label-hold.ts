import hold from "@/data/seo/price-label-hold.json";

/**
 * Profiles protected or observed in the source snapshot retain their exact old price wording.
 * "holdUntil" is a mandatory review date, NOT automatic permission to change a protected page:
 * after the date a fresh protection snapshot and build comparison is still required.
 * A scoped owner decision may release a documented factual correction from this
 * specific label hold without releasing any other experiment protection.
 * Regenerate by running `npm run seo:price-label-hold` from the exact release source.
 */
const HELD = new Set<string>(hold.heldSoftware);

export function isPriceLabelHeld(slug: string): boolean {
  return HELD.has(slug);
}
