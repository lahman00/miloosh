import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import type { WixFunnelContext } from "@/lib/wix-funnels";

export type FirstRevenueDecisionProduct = {
  slug: string;
  name: string;
  ranking: number;
  badge: string;
  price: string;
  chooseIf: string;
  skipIf: string;
  alternativeName: string | null;
  alternativeSlug: string | null;
  ctaUrl: string;
  ctaRel: string | undefined;
  wixContext?: WixFunnelContext;
};

export function FirstRevenueDecisionPanel({
  categorySlug,
  products,
}: {
  categorySlug: string;
  products: FirstRevenueDecisionProduct[];
}) {
  return (
    <section id="buyer-decision" className="mb-14 scroll-mt-24 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5 sm:p-7">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Decision-stage shortlist</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Choose by fit, price and the reason to walk away</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Start with the operating constraint, not the vendor logo. Pricing uses the verified plan context already stored for each product.
          The order stays editorial; affiliate status does not change ranking or inclusion.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {products.map((product) => (
          <article key={product.slug} className="flex h-full flex-col rounded-xl border border-white/10 bg-zinc-950/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">#{product.ranking} · {product.badge}</p>
                <h3 className="mt-1 text-xl font-bold text-white">{product.name}</h3>
              </div>
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white">
                {product.price}
              </span>
            </div>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-emerald-300">Choose it if</dt>
                <dd className="mt-1 leading-6 text-zinc-300">{product.chooseIf}</dd>
              </div>
              <div>
                <dt className="font-semibold text-amber-300">Skip it if</dt>
                <dd className="mt-1 leading-6 text-zinc-400">{product.skipIf}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-300">Alternative to check</dt>
                <dd className="mt-1 text-zinc-400">
                  {product.alternativeName && product.alternativeSlug ? (
                    <a href={`#${product.alternativeSlug}`} className="text-blue-400 underline-offset-4 hover:underline">
                      Compare the fit with {product.alternativeName}
                    </a>
                  ) : (
                    <Link href={`/category/${categorySlug}`} className="text-blue-400 underline-offset-4 hover:underline">
                      Browse the category
                    </Link>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-auto pt-5">
              <TrackedCtaLink
                slug={product.slug}
                href={product.ctaUrl}
                rel={product.ctaRel}
                target="_blank"
                ctaLocation="money-page-decision-card"
                wixContext={product.wixContext}
                variant="primary"
                className="w-full justify-center"
              >
                Check current {product.name} plans <ExternalLink className="ml-1.5 h-4 w-4" />
              </TrackedCtaLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
