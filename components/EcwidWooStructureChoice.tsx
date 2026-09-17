// Narrow decision support for an observed Ecwid-vs-WooCommerce query on the existing comparison URL.
// Documentation-based only: no affiliate links, pricing promises, or hands-on claims.
export function EcwidWooStructureChoice({ comparison }: { comparison: string }) {
  if (comparison !== "ecwid-vs-woocommerce") return null;

  return (
    <section id="store-ownership-choice" aria-labelledby="store-ownership-choice-title" className="mt-10 scroll-mt-24 rounded-2xl border border-violet-400/20 bg-violet-400/[0.03] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Choose the operating model first</p>
      <h2 id="store-ownership-choice-title" className="mt-3 text-2xl font-bold text-white">Embedded managed commerce or a WordPress-owned store?</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-300">Ecwid and WooCommerce can both work with WordPress, but they put different work on the merchant. The decision is less about a feature-count winner and more about who should own the commerce stack.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-semibold text-white">Keep the current website and add managed commerce</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-300">Start with Ecwid when the existing website should stay in place and commerce is being added to it. Ecwid documents storefront installation on WordPress, Wix and other sites, while store management remains in the Ecwid admin.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-semibold text-white">Keep commerce inside the WordPress stack</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-300">Start with WooCommerce when WordPress ownership and customization are the priority. WooCommerce core has no monthly platform subscription, but hosting, processing, extensions and maintenance remain separate operating costs.</p>
        </div>
      </div>      <p className="mt-5 text-sm leading-7 text-zinc-300">For the quote, keep the platform line separate from hosting, payment processing, paid extensions and ongoing maintenance. A lower platform fee does not establish a lower total operating cost.</p>
      <p className="mt-4 text-xs leading-6 text-zinc-400">Documentation checked September 17, 2026. This is a fit checklist based on vendor documentation, not a hands-on benchmark or a guarantee of lower cost.</p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <a href="https://support.ecwid.com/hc/en-us/articles/115004678945-Ecwid-for-any-website" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">Ecwid for any website</a>
        <a href="https://support.ecwid.com/hc/en-us/articles/207101259-Adding-your-Ecwid-store-to-WordPress-site" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">Ecwid on WordPress</a>
        <a href="https://woocommerce.com/pricing/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">WooCommerce pricing model</a>
        <a href="https://woocommerce.com/document/start-with-woocommerce-in-5-steps/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">WooCommerce setup and hosting</a>
      </p>
    </section>
  );
}
