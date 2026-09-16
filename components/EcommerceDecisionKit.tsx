import Link from "next/link";

/** Proposed buyer checks, not a claim of hands-on merchant testing. No new tracking or form gate. */
export function EcommerceDecisionKit() {
  return (
    <section id="store-decision-kit" aria-labelledby="store-decision-kit-title" className="mb-10 scroll-mt-24 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Small-store decision kit</p>
      <h2 id="store-decision-kit-title" className="mt-3 text-2xl font-bold text-white">Choose the scope before choosing the platform</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-300">A good-looking replacement is not enough. Match the change to the work you need to remove, then check the catalog, checkout and records you cannot lose.</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><dt className="font-semibold text-white">Website first, with a supported store</dt><dd className="mt-1 text-sm leading-6 text-zinc-300"><a href="#wix" className="text-emerald-300 underline underline-offset-4">Evaluate Wix</a> when keeping website and store management together is the priority. Prove the required commerce plan and payment support first.</dd></div>
        <div><dt className="font-semibold text-white">Commerce operations first</dt><dd className="mt-1 text-sm leading-6 text-zinc-300"><a href="#shopify" className="text-emerald-300 underline underline-offset-4">Evaluate Shopify</a> when a managed commerce-led rebuild fits. Quote the required apps and a separate method for each data family.</dd></div>
        <div><dt className="font-semibold text-white">The current store mostly works</dt><dd className="mt-1 text-sm leading-6 text-zinc-300"><a href="#woocommerce" className="text-emerald-300 underline underline-offset-4">Price a WooCommerce repair</a> before migrating. A single failing extension is not proof that the platform needs replacing.</dd></div>
        <div><dt className="font-semibold text-white">Keep the website, change commerce</dt><dd className="mt-1 text-sm leading-6 text-zinc-300"><a href="#ecwid" className="text-emerald-300 underline underline-offset-4">Evaluate embedded commerce with Ecwid</a>. Check product limits, staff needs and the checkout experience on the proposed tier.</dd></div>
      </dl>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <a href="/resources/ecommerce-platform-decision-checklist.html" download className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200">Download the free decision checklist</a>
        <Link href="/compare/wix-vs-shopify" className="text-sm text-emerald-300 underline underline-offset-4">Compare Wix and Shopify</Link>
      </div>
      <p className="mt-3 text-xs leading-6 text-zinc-400">Printable HTML worksheet, no signup required. Use your own plan quote and a safe test store. The recommendations are editorial fit judgments, not benchmark results.</p>
      <details className="mt-5 border-t border-white/10 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Two documented constraints to check before committing</summary>
        <p className="mt-3 text-sm leading-7 text-zinc-300">Wix’s documented Cart2Cart route requires a payment-enabled plan to import store orders. The guide lists limits of 1,000 products and 1,000 orders for that import route; this is not a statement about Wix’s overall catalog capacity. Installation can be free while the migration itself is paid. <a href="https://support.wix.com/en/article/wix-stores-migrating-from-other-ecommerce-platforms-to-wix-stores" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Wix source</a>.</p>
        <p className="mt-3 text-sm leading-7 text-zinc-300">Shopify says payment-gateway testing requires a paid plan. Simulated test transactions are not payouts, and customers cannot place live orders while payment providers are in test mode. Use a safe test environment; do not switch a live store into test mode casually. <a href="https://help.shopify.com/en/manual/checkout-settings/test-orders" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Shopify source</a>.</p>
        <p className="mt-2 text-xs text-zinc-400">These two source checks: September 16, 2026. They do not refresh every fact elsewhere in this guide.</p>
      </details>
    </section>
  );
}
