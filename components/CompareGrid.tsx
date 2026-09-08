"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Card } from "@/components/Card";
import { getComparisonSlug } from "@/data/comparisons";

export type CompareGridItem = {
  slugA: string;
  nameA: string;
  slugB: string;
  nameB: string;
  categoryLabel: string;
};

const INITIAL_VISIBLE = 72;
const LOAD_MORE_STEP = 72;

/**
 * Keep the full comparison dataset searchable without forcing more than a
 * thousand cards into the initial HTML. Every published comparison also has
 * durable crawl links from both software pages (and relevant category pages),
 * so progressive rendering here improves the human/performance path without
 * making comparison URLs dependent on client-side discovery.
 */
export function CompareGrid({ items }: { items: CompareGridItem[] }) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.nameA.toLowerCase().includes(q) ||
        item.nameB.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
          strokeWidth={2}
        />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(INITIAL_VISIBLE);
          }}
          type="search"
          placeholder="Filter by product or category, e.g. Notion or CRM"
          aria-label="Filter comparisons"
          className="min-h-14 w-full rounded-xl border border-white/15 bg-white/5 pl-12 pr-5 text-white outline-none placeholder:text-zinc-500 focus:border-accent focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <p className="mt-4 text-sm text-zinc-500" aria-live="polite">
        {query.trim()
          ? `${filtered.length} of ${items.length} comparisons match "${query.trim()}"`
          : `${items.length} comparisons available`}
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, visibleCount).map((item) => (
          <Link
            key={getComparisonSlug(item.slugA, item.slugB)}
            href={`/compare/${getComparisonSlug(item.slugA, item.slugB)}`}
            className="group block h-full"
          >
            <Card className="flex h-full flex-col group-hover:border-white/25 group-hover:bg-white/[0.05]">
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{item.categoryLabel}</p>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-zinc-600 transition group-hover:text-white" />
              </div>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {item.nameA} vs {item.nameB}
              </h3>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length > visibleCount ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
            className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Show more comparisons
          </button>
          <p className="mt-3 text-xs text-zinc-500">
            Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}
          </p>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">
          No comparisons match &ldquo;{query.trim()}&rdquo;. Try a product or category name.
        </p>
      ) : null}
    </div>
  );
}
