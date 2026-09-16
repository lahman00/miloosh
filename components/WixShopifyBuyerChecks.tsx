import Link from "next/link";

// רק ההשוואה הזו מקבלת את ההרחבה; אין קישורי שותפים חדשים או איסוף מידע.
export function WixShopifyBuyerChecks({ comparison }: { comparison: string }) {
  if (comparison !== "wix-vs-shopify") return null;
  return (
    <section id="small-store-buyer-checks" aria-labelledby="small-store-buyer-title" className="mt-10 scroll-mt-24 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">For a small store</p>
      <h2 id="small-store-buyer-title" className="mt-3 text-2xl font-bold text-white">Choose for the work you need to run, not the longest feature list</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold text-white">Start with Wix when the website leads</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-300">Shortlist Wix when managing the business website and a supported store together is the priority. Confirm the plan, payment methods and catalog rules your business needs. A website plan alone is not proof that checkout fits.</p>
        </div>
        <div>
          <h3 className="font-semibold text-white">Start with Shopify when commerce leads</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-300">Shortlist Shopify when selling and fulfilling orders are the central workload. Price the required apps and setup alongside the platform. A managed storefront does not remove every integration or migration task.</p>
        </div>
      </div>
      <h3 className="mt-6 font-semibold text-white">Before paying for a migration or a trial</h3>
      <p className="mt-2 text-sm leading-7 text-zinc-300">Wix ties the payment-enabled plan requirement to importing orders through its documented Cart2Cart route. That route has import limits, and free installation does not mean free migration. Review the demo and the quote; the optional target-data cleanup is irreversible. <a href="https://support.wix.com/en/article/wix-stores-migrating-from-other-ecommerce-platforms-to-wix-stores" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Wix migration documentation</a>.</p>
      <p className="mt-3 text-sm leading-7 text-zinc-300">Shopify requires a paid plan for payment-gateway testing. Simulated transactions are not payouts, and test mode prevents live customer orders. Use a safe test environment rather than interrupting a trading store. <a href="https://help.shopify.com/en/manual/checkout-settings/test-orders" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Shopify testing documentation</a>.</p>
      <p className="mt-5 text-sm leading-7 text-zinc-300">Already have a store? A failing extension may justify a repair, not a rebuild. <Link href="/best-ecommerce-platform-for-small-business#store-decision-kit" className="text-emerald-300 underline underline-offset-4">Compare staying on WooCommerce, embedding Ecwid, or migrating</Link> and use the free decision checklist before committing.</p>
      <p className="mt-4 text-xs leading-6 text-zinc-400">Fit recommendations are editorial judgments, not hands-on benchmarks. These two source checks: September 17, 2026. They do not refresh every fact elsewhere on this page. Existing partner links are disclosed beside their buttons.</p>
    </section>
  );
}
