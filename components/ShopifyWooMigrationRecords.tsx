import Link from "next/link";

// Narrow, documentation-based migration guidance for the existing Shopify/WooCommerce comparison only.
// No affiliate links, forms, pricing claims, or hands-on migration claims are introduced here.
export function ShopifyWooMigrationRecords({ comparison }: { comparison: string }) {
  if (comparison !== "shopify-vs-woocommerce") return null;

  return (
    <section id="migration-record-gates" aria-labelledby="migration-record-gates-title" className="mt-10 scroll-mt-24 rounded-2xl border border-sky-400/20 bg-sky-400/[0.03] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Before you price a migration</p>
      <h2 id="migration-record-gates-title" className="mt-3 text-2xl font-bold text-white">Products, customers, orders and URLs are separate migration jobs</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-300">A successful product import is not proof that the business history moved. Shopify&apos;s current WooCommerce migration guide handles products, customers and historical orders through different procedures, and it calls for URL redirects when old paths will change.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-semibold text-white">Products</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-300">WooCommerce has a built-in product CSV exporter. Shopify&apos;s guide imports WooCommerce product data separately and tells you to verify fields such as variants, price, weight and inventory after import.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-semibold text-white">Customers</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-300">Customer data follows its own CSV path. Shopify says the WooCommerce export must be edited to match Shopify&apos;s customer CSV headings and notes that customer CSV import has no data-mapping support.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-semibold text-white">Historical orders</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-300">Shopify documents order history as another path: export it from WooCommerce, then use a supported third-party migration app to import it. Do not count an exported CSV as a completed order-history migration.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="font-semibold text-white">URLs and domain cutover</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-300">Shopify warns that page paths can differ from the old store. Map important old URLs to their new destinations before moving the domain, then test the redirects after launch. Shopify also supports importing redirects by CSV.</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-sky-400/20 bg-sky-400/[0.04] p-4">
        <h3 className="font-semibold text-white">Test a representative variable product before you quote the catalog migration</h3>
        <p className="mt-2 text-sm leading-7 text-zinc-300">Do not validate the catalog with one simple product. Use at least one variable product that has multiple option values, child variants, distinct SKUs, prices and stock. Shopify&apos;s WooCommerce mapping requires multiple attribute values to become separate rows with one option value per row. WooCommerce&apos;s built-in CSV format likewise represents a variable parent separately from its variation rows and links children back to the parent by ID or SKU.</p>
        <p className="mt-2 text-sm leading-7 text-zinc-300">After import, reconcile the sample row by row: option names and values, variant SKU, price, inventory, weight and images. If the Shopify store uses multiple locations, its migration guide directs inventory quantities to the separate inventory CSV rather than treating the product CSV as the whole inventory move.</p>
      </div>

      <p className="mt-5 text-sm leading-7 text-zinc-300">Treat each row above as its own acceptance gate and owner. If one gate is unresolved, keep it in the migration quote instead of hiding it inside the platform subscription. <Link href="/best-ecommerce-platform-for-small-business#store-decision-kit" className="text-sky-300 underline underline-offset-4">Use the store decision checklist</Link> to record the unresolved work.</p>
      <p className="mt-4 text-xs leading-6 text-zinc-400">Documentation checked September 17, 2026. This is a planning checklist, not a hands-on migration result or a guarantee that rankings, historical records or integrations will be preserved.</p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <a href="https://help.shopify.com/en/manual/migrating-to-shopify/migrating-from-woocommerce" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">Shopify WooCommerce migration guide</a>
        <a href="https://woocommerce.com/document/product-csv-importer-exporter/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">WooCommerce product CSV documentation</a>
      </p>
    </section>
  );
}
