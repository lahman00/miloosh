import Link from "next/link";
import { TrackedInternalCtaLink } from "@/components/TrackedInternalCtaLink";

/** Proposed buyer checks, not a claim of hands-on merchant testing. No form gate; the comparison shortcut logs only an internal navigation event. */
export function EcommerceDecisionKit() {
  return (
    <section id="store-decision-kit" aria-labelledby="store-decision-kit-title" className="mb-10 scroll-mt-24 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Small-store decision kit</p>
      <h2 id="store-decision-kit-title" className="mt-3 text-2xl font-bold text-white">Fix your current store or switch platforms?</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-300">Name the problem before moving the store. Compare a focused repair, a new commerce layer on the existing website, and a full migration. Then check the catalog, checkout and records each route must preserve.</p>
      <TrackedInternalCtaLink
        href="#quick-comparison"
        sourcePath="/best-ecommerce-platform-for-small-business"
        targetPath="/best-ecommerce-platform-for-small-business#quick-comparison"
        ctaName="store-decision-kit-quick-comparison"
        className="mt-4 inline-flex rounded-xl border border-emerald-400/30 px-4 py-2 text-sm font-semibold text-emerald-300 hover:border-emerald-300 hover:text-emerald-200"
      >
        Ready to compare platforms? Jump to plans, trial status, and vendor links
      </TrackedInternalCtaLink>
      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h3 className="font-semibold text-white">Before you compare platforms: how does the sale actually happen?</h3>
        <ul className="mt-2 space-y-2 text-sm leading-7 text-zinc-300">
          <li><strong className="text-white">Quote first or checkout first?</strong> Separate products customers can buy at a fixed price from installation or service work that needs an inquiry or quote first. For quote-first work, map how the request is approved and how payment happens afterward before choosing a platform.</li>
          <li><strong className="text-white">Must you keep a payment provider?</strong> Treat that as an elimination gate. Confirm the exact provider, your business country and the intended payment flow are supported on the exact plan you would buy before shortlisting a platform.</li>
        </ul>
        <p className="mt-2 text-xs leading-6 text-zinc-400">These are buyer checks, not claims that Wix, Shopify, WooCommerce or Ecwid supports every service, quote or payment-provider combination.</p>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><dt className="font-semibold text-white">Website first, with a supported store</dt><dd className="mt-1 text-sm leading-6 text-zinc-300"><a href="#wix" className="text-emerald-300 underline underline-offset-4">Evaluate Wix</a> when keeping website and store management together is the priority. Prove the required commerce plan and payment support first.</dd></div>
        <div><dt className="font-semibold text-white">Commerce operations first</dt><dd className="mt-1 text-sm leading-6 text-zinc-300"><a href="#shopify" className="text-emerald-300 underline underline-offset-4">Evaluate Shopify</a> when a managed commerce-led rebuild fits. Quote the required apps and a separate method for each data family.</dd></div>
        <div><dt className="font-semibold text-white">The current store mostly works</dt><dd className="mt-1 text-sm leading-6 text-zinc-300"><a href="#woocommerce" className="text-emerald-300 underline underline-offset-4">Price a WooCommerce repair</a> before migrating. A single failing extension is not proof that the platform needs replacing.</dd></div>
        <div><dt className="font-semibold text-white">Keep the website, change commerce</dt><dd className="mt-1 text-sm leading-6 text-zinc-300"><a href="#ecwid" className="text-emerald-300 underline underline-offset-4">Evaluate embedded commerce with Ecwid</a>. Check product limits, staff needs and the checkout experience on the proposed tier.</dd></div>
      </dl>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <a href="/resources/ecommerce-platform-decision-checklist.html" aria-describedby="worksheet-access-note" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200">Open the free decision checklist</a>
        <a href="/resources/ecommerce-platform-decision-checklist.html" download className="text-sm text-emerald-300 underline underline-offset-4">Download the free decision checklist</a>
        <Link href="/compare/wix-vs-shopify" className="text-sm text-emerald-300 underline underline-offset-4">Compare Wix and Shopify</Link>
      </div>
      <p id="worksheet-access-note" className="mt-3 text-xs leading-6 text-zinc-400">Open the worksheet in your browser or download a printable HTML copy. No email required; no signup required. Use your own plan quote and a safe test store. The recommendations are editorial fit judgments, not benchmark results.</p>
      <details className="mt-5 border-t border-white/10 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-200">Two documented constraints to check before committing</summary>
        <p className="mt-3 text-sm leading-7 text-zinc-300">Wix’s documented Cart2Cart route requires a payment-enabled plan to import store orders. The guide lists limits of 1,000 products and 1,000 orders for that import route; this is not a statement about Wix’s overall catalog capacity. Installation can be free while the migration itself is paid. Review the demo and quote first; the optional target-data cleanup is irreversible and can delete existing records of the selected types. <a href="https://support.wix.com/en/article/wix-stores-migrating-from-other-ecommerce-platforms-to-wix-stores" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Wix source</a>.</p>
        <p className="mt-3 text-sm leading-7 text-zinc-300">Shopify says payment-gateway testing requires a paid plan. Simulated test transactions are not payouts, and customers cannot place live orders while payment providers are in test mode. Use a safe test environment; do not switch a live store into test mode casually. <a href="https://help.shopify.com/en/manual/checkout-settings/test-orders" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Shopify source</a>.</p>
        <p className="mt-2 text-xs text-zinc-400">These two source checks: September 17, 2026. They do not refresh every fact elsewhere in this guide.</p>
      </details>
    </section>
  );
}
