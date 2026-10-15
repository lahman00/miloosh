/** Pure builder for data/seo/template-cohorts.json; see lib/template-cohorts.ts for what the file means. */

export type HeldPage = { verdict: string; sources: string[]; eligibleAfter: string | null };

export type TemplateCohorts = {
  generatedAt: string;
  baseSha: string;
  /** The earliest date a held page becomes eligible, per the owner's decision. */
  holdUntil: string;
  software: { editable: string[]; held: Record<string, HeldPage> };
  comparisons: { editable: string[]; held: Record<string, HeldPage> };
  /** Product slugs used by at least one held page: editing their data would change a held page. */
  productsSharedWithHeldPages: string[];
  /** Held pages the owner released early, with the reason. They are counted as editable. */
  released?: Record<string, { reason: string; releasedOn: string }>;
};

export type ProtectionRow = {
  kind: string;
  slug: string | null;
  verdict: string;
  sources: string[];
  eligibleAfter: string | null;
  softwareSlugs: readonly string[];
};

/** Pure: turns one protection verdict per page into the cohort file. Anything that is not plainly EDITABLE is held, UNKNOWN included. */
export function buildTemplateCohorts(rows: readonly ProtectionRow[], meta: { generatedAt: string; baseSha: string; holdUntil: string }, released: Record<string, { reason: string; releasedOn: string }> = {}): TemplateCohorts {
  rows = rows.map((row) => (row.kind === "compare" && row.slug && released[row.slug] ? { ...row, verdict: "EDITABLE" } : row));
  const split = (kind: string) => {
    const editable: string[] = [];
    const held: Record<string, HeldPage> = {};
    for (const row of [...rows].filter((r) => r.kind === kind && r.slug).sort((a, b) => a.slug!.localeCompare(b.slug!))) {
      if (row.verdict === "EDITABLE") editable.push(row.slug!);
      else held[row.slug!] = { verdict: row.verdict, sources: [...row.sources].sort(), eligibleAfter: row.eligibleAfter };
    }
    return { editable, held };
  };
  const shared = new Set<string>();
  for (const row of rows) if (row.verdict !== "EDITABLE") for (const slug of row.softwareSlugs) shared.add(slug);
  return {
    ...meta,
    software: split("software"),
    comparisons: split("compare"),
    productsSharedWithHeldPages: [...shared].sort(),
    ...(Object.keys(released).length > 0 ? { released } : {}),
  };
}
