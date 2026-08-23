"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import type { PricingIndexProduct } from "@/lib/pricing-index/build";

type SortKey = "name" | "category" | "startingMonthlyEquivalent" | "lastVerified";

/**
 * MILOOSH WAR MODE mission (2026-08-24) — real, sortable/filterable
 * evidence table for the Pricing Pressure Index. Every row links back to
 * both the Miloosh page (internal routing) and the vendor's own official
 * pricing source (source transparency, per the PR methodology doc).
 */
export function PricingIndexTable({ products }: { products: PricingIndexProduct[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("startingMonthlyEquivalent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [freeOnly, setFreeOnly] = useState(false);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);

  const filtered = useMemo(() => {
    return products
      .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
      .filter((p) => !freeOnly || p.hasFreeTier)
      .slice()
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortKey === "startingMonthlyEquivalent") {
          const av = a.startingMonthlyEquivalent ?? Infinity;
          const bv = b.startingMonthlyEquivalent ?? Infinity;
          return (av - bv) * dir;
        }
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        return av.localeCompare(bv) * dir;
      });
  }, [products, categoryFilter, freeOnly, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} className="h-3.5 w-3.5 rounded border-white/20 bg-transparent" />
          Free tier only
        </label>
        <span className="text-xs text-zinc-600">{filtered.length} products</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("name")}>
                <span className="inline-flex items-center gap-1">
                  Product <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("category")}>
                <span className="inline-flex items-center gap-1">
                  Category <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("startingMonthlyEquivalent")}>
                <span className="inline-flex items-center gap-1">
                  Starting price <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="px-4 py-3">Free tier</th>
              <th className="px-4 py-3">Per-seat</th>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("lastVerified")}>
                <span className="inline-flex items-center gap-1">
                  Verified <ArrowUpDown className="h-3 w-3" />
                </span>
              </th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.slug} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/software/${p.slug}`} className="text-zinc-200 underline-offset-4 hover:text-white hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.category}</td>
                <td className="px-4 py-3 text-zinc-300">{p.startingMonthlyEquivalent !== null ? `$${p.startingMonthlyEquivalent}/mo` : "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{p.hasFreeTier ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-zinc-400">{p.perSeat ? "Yes" : "—"}</td>
                <td className="px-4 py-3 text-zinc-500">{p.lastVerified ?? "—"}</td>
                <td className="px-4 py-3">
                  {p.officialSource ? (
                    <a href={p.officialSource} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
                      Vendor <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
