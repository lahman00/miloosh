/**
 * Reads and rewrites the machine-generated block of `data/seo/unreachable-comparisons.ts`.
 * Everything between the two markers belongs to the generator; the rest of the file is written by hand.
 */

export const GENERATED_BEGIN = "  // generated:begin - do not edit by hand; run `npm run check:built-site -- --write-unreachable`";
export const GENERATED_END = "  // generated:end";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function renderGeneratedBlock(slugs: readonly string[]): string {
  const unique = [...new Set(slugs)].sort();
  const invalid = unique.filter((slug) => !SLUG.test(slug));
  if (invalid.length > 0) throw new Error(`Not a comparison slug: ${invalid.slice(0, 3).join(", ")}`);
  return [GENERATED_BEGIN, ...unique.map((slug) => `  ${JSON.stringify(slug)},`), GENERATED_END].join("\n");
}

export function replaceGeneratedBlock(source: string, slugs: readonly string[]): string {
  const begin = source.indexOf("  // generated:begin");
  const end = source.indexOf(GENERATED_END);
  if (begin === -1 || end === -1 || end < begin) throw new Error("The generated:begin / generated:end markers were not found in order.");
  return source.slice(0, begin) + renderGeneratedBlock(slugs) + source.slice(end + GENERATED_END.length);
}

/** The slugs currently inside the generated block, for a before/after summary. */
export function readGeneratedSlugs(source: string): string[] {
  const begin = source.indexOf("  // generated:begin");
  const end = source.indexOf(GENERATED_END);
  if (begin === -1 || end === -1 || end < begin) throw new Error("The generated:begin / generated:end markers were not found in order.");
  return [...source.slice(begin, end).matchAll(/^\s*"([a-z0-9-]+)",\s*$/gm)].map((match) => match[1]!);
}
