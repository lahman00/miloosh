import Link from "next/link";

// Documentation-based decision aid only. No affiliate link, form, or claim of hands-on troubleshooting.
export function WooCommerceRepairCheck({ slug }: { slug: string }) {
  if (slug !== "woocommerce") return null;

  return (
    <section id="woocommerce-repair-check" aria-labelledby="woocommerce-repair-title" className="mt-14 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Before you migrate</p>
      <h2 id="woocommerce-repair-title" className="mt-3 text-2xl font-bold text-white">Repair the store before you replatform</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">A broken plugin, theme, or update path is a troubleshooting problem first, not proof that the whole platform needs replacing. WooCommerce recommends backing up the store, reproducing the issue on staging, and isolating theme or plugin conflicts before changing the live site.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><h3 className="font-semibold text-white">1. Isolate the failure</h3><p className="mt-2 text-sm leading-6 text-zinc-300">Use a current backup and a staging copy. Reproduce the exact failing workflow, then test a default theme and a reduced plugin set. Reactivate plugins one at a time to identify a conflict instead of changing several variables at once.</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><h3 className="font-semibold text-white">2. Define the repair scope</h3><p className="mt-2 text-sm leading-6 text-zinc-300">If the problem disappears when one theme or plugin is removed, price that specific repair, replacement, or vendor support path. If it persists with a minimal setup, continue diagnosis rather than assuming a migration will fix the root cause.</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><h3 className="font-semibold text-white">3. Compare work, not headline fees</h3><p className="mt-2 text-sm leading-6 text-zinc-300">Put the scoped repair beside the work required to migrate products, orders, customers, URLs, payments, shipping, tax rules, analytics, email flows, and custom integrations. Use your own quotes; this page does not estimate a repair or migration price.</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><h3 className="font-semibold text-white">4. Migrate for a structural reason</h3><p className="mt-2 text-sm leading-6 text-zinc-300">A move is easier to justify when the maintenance model itself no longer fits the team, or when a required workflow cannot be supported safely after a scoped repair. That is a fit decision, not a consequence of one failed extension.</p></div>
      </div>

      <p className="mt-5 text-sm leading-7 text-zinc-300">WooCommerce also advises testing updates on staging and checking the storefront, cart, checkout, payments, shipping, taxes, emails, and extension-specific workflows before treating an update as complete. <a href="https://woocommerce.com/document/how-to-test-for-conflicts/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Conflict-testing guidance</a> · <a href="https://woocommerce.com/document/how-to-update-woocommerce/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Update and staging guidance</a>.</p>
      <p className="mt-3 text-xs leading-6 text-zinc-400">Official WooCommerce documentation checked September 17, 2026. This is documentation-based decision guidance, not a hands-on diagnosis of your store. For the broader stay-or-switch worksheet, <Link href="/best-ecommerce-platform-for-small-business#store-decision-kit" className="underline underline-offset-4">use the small-store decision kit</Link>.</p>
    </section>
  );
}
