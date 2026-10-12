/** Comparison slugs that a Search Console "Pages" export shows with impressions or clicks. */
export function slugsWithSearchVisibility(csv: string, slugs: readonly string[]): Array<{ slug: string; clicks: number; impressions: number }> {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  const header = splitCsvLine(lines[0] ?? "").map((cell) => cell.toLowerCase());
  const pageIndex = header.findIndex((cell) => /page|url/.test(cell));
  const clicksIndex = header.indexOf("clicks");
  const impressionsIndex = header.indexOf("impressions");
  if (pageIndex === -1 || clicksIndex === -1 || impressionsIndex === -1) throw new Error("Expected a Pages export with Page, Clicks and Impressions columns.");
  const wanted = new Set(slugs);
  const found = new Map<string, { clicks: number; impressions: number }>();
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const slug = /\/compare\/([a-z0-9-]+)\/?(?:[?#].*)?$/.exec(cells[pageIndex] ?? "")?.[1];
    if (!slug || !wanted.has(slug)) continue;
    const clicks = Number(cells[clicksIndex]?.replace(/,/g, "")) || 0;
    const impressions = Number(cells[impressionsIndex]?.replace(/,/g, "")) || 0;
    const previous = found.get(slug) ?? { clicks: 0, impressions: 0 };
    found.set(slug, { clicks: previous.clicks + clicks, impressions: previous.impressions + impressions });
  }
  return [...found].filter(([, v]) => v.clicks > 0 || v.impressions > 0).map(([slug, v]) => ({ slug, ...v })).sort((a, b) => b.impressions - a.impressions || a.slug.localeCompare(b.slug));
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells;
}
