"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Minus, X, Share2 } from "lucide-react";
import { Card } from "@/components/Card";

export type CalculatorProduct = {
  slug: string;
  name: string;
  category: string;
  amount: number;
  billingPeriod: "monthly" | "annual" | "one_time" | "unknown";
  perSeat: boolean;
  officialSource?: string;
};

/**
 * MILOOSH PEOPLE NOW mission (2026-08-23), Phase 16 — the first linkable
 * tool. Every number here comes from data/software/*.json's real,
 * first-party-sourced `pricing.entry_paid` field (see
 * app/tools/saas-cost-calculator/page.tsx for how the product list is
 * built) — nothing is estimated or invented. `amount` is always the
 * real monthly-equivalent rate regardless of billing_period label (the
 * codebase's own pricing schema convention: "annual" describes the
 * BILLING CADENCE the rate requires, not that the number itself is a
 * yearly lump sum) — safe to sum directly into a real monthly total.
 */
export function SaasCostCalculator({ products }: { products: CalculatorProduct[] }) {
  const searchParams = useSearchParams();
  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);

  // Restores a shared stack from the URL (?slug=seats&slug2=seats2) on first
  // render only -- a lazy useState initializer, not an effect, so a shared
  // link renders the real stack immediately rather than flashing empty
  // first. Unknown slugs (typos, a removed product) are silently ignored,
  // never fabricated into a fake entry.
  const [selected, setSelected] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const [slug, value] of searchParams.entries()) {
      if (!bySlug.has(slug)) continue;
      const seats = Number.parseInt(value, 10);
      if (Number.isFinite(seats) && seats > 0) initial[slug] = seats;
    }
    return initial;
  });
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, query]);

  const stack = Object.entries(selected)
    .map(([slug, seats]) => ({ product: bySlug.get(slug)!, seats }))
    .filter((row) => row.product);

  const monthlyTotal = stack.reduce((sum, row) => sum + row.product.amount * (row.product.perSeat ? row.seats : 1), 0);
  const annualTotal = monthlyTotal * 12;

  function addProduct(slug: string) {
    setSelected((prev) => (prev[slug] ? prev : { ...prev, [slug]: 1 }));
  }
  function removeProduct(slug: string) {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }
  function setSeats(slug: string, seats: number) {
    setSelected((prev) => ({ ...prev, [slug]: Math.max(1, seats) }));
  }

  function shareUrl(): string {
    const params = new URLSearchParams();
    for (const [slug, seats] of Object.entries(selected)) params.set(slug, String(seats));
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  async function handleShare() {
    try {
      const url = shareUrl();
      if (navigator.share) {
        await navigator.share({ title: "My SaaS stack cost — Miloosh", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled the share sheet or clipboard was unavailable — no-op.
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <h2 className="text-lg font-semibold text-white">Add tools to your stack</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or category…"
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-white/25 focus:outline-none"
        />
        <ul className="mt-4 max-h-96 space-y-1 overflow-y-auto">
          {filtered.map((p) => (
            <li key={p.slug} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
              <div className="min-w-0">
                <span className="text-sm text-zinc-200">{p.name}</span>
                <span className="ml-2 text-xs text-zinc-500">
                  ${p.amount}/mo{p.perSeat ? "/seat" : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => addProduct(p.slug)}
                disabled={Boolean(selected[p.slug])}
                className="shrink-0 rounded-full border border-white/10 p-1.5 text-zinc-300 transition hover:border-white/25 hover:text-white disabled:opacity-30"
                aria-label={`Add ${p.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {filtered.length === 0 ? <li className="px-2 py-4 text-sm text-zinc-500">No matches — every product here has real, sourced pricing.</li> : null}
        </ul>
      </Card>

      <Card className="flex flex-col">
        <h2 className="text-lg font-semibold text-white">Your stack</h2>
        {stack.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Add tools on the left to see your real monthly cost.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {stack.map(({ product, seats }) => (
              <li key={product.slug} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/software/${product.slug}`} className="min-w-0 truncate text-zinc-200 underline-offset-4 hover:text-white hover:underline">
                  {product.name}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  {product.perSeat ? (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setSeats(product.slug, seats - 1)} className="rounded border border-white/10 p-0.5 text-zinc-400 hover:text-white" aria-label="Fewer seats">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs text-zinc-400">{seats}</span>
                      <button type="button" onClick={() => setSeats(product.slug, seats + 1)} className="rounded border border-white/10 p-0.5 text-zinc-400 hover:text-white" aria-label="More seats">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                  <span className="text-zinc-400">${(product.amount * (product.perSeat ? seats : 1)).toFixed(2)}/mo</span>
                  <button type="button" onClick={() => removeProduct(product.slug)} className="text-zinc-500 hover:text-red-400" aria-label={`Remove ${product.name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 border-t border-white/10 pt-6">
          <p className="text-sm text-zinc-500">Estimated monthly cost</p>
          <p className="mt-1 text-3xl font-bold text-white">${monthlyTotal.toFixed(2)}</p>
          <p className="mt-1 text-sm text-zinc-500">${annualTotal.toFixed(2)}/year</p>
        </div>

        <button
          type="button"
          onClick={handleShare}
          disabled={stack.length === 0}
          className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:text-white disabled:opacity-30"
        >
          <Share2 className="h-4 w-4" />
          {copied ? "Link copied!" : "Share this stack"}
        </button>

        <p className="mt-4 text-xs text-zinc-600">
          Prices are per-seat/per-month starting rates from each vendor&apos;s own pricing page, verified on the date shown on each software page. Actual cost depends on your plan, seats, and billing cycle — verify current pricing before purchasing.
        </p>
      </Card>
    </div>
  );
}
