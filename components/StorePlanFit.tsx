import Link from "next/link";
import { Card } from "@/components/Card";

// מידע ממקורות רשמיים, לא תוצאת ניסוי מוצר. אין יצירת קישור שותפים חדש.
export function StorePlanFit({ slug }: { slug: string }) {
  if (slug !== "wix" && slug !== "shopify") return null;
  const isWix = slug === "wix";
  return (
    <Card className="mt-14">
      <section id="store-plan-fit" aria-labelledby="store-plan-fit-title" className="scroll-mt-24">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Small-store plan check</p>
        <h2 id="store-plan-fit-title" className="mt-3 text-2xl font-semibold text-white">
          {isWix ? "Which Wix plan can run your store?" : "Will Shopify Basic cover your team and shipping?"}
        </h2>
        {isWix ? (
          <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-300">
            <p><strong className="text-white">Website only or taking payments?</strong> Light does not accept payments through your site. For selling products or services, Wix directs buyers to Core or Business. Match the payment methods and commerce features to your actual workflow, not just the lowest website-plan price. <a href="https://support.wix.com/en/article/choosing-a-premium-plan" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Wix plan guidance</a>.</p>
            <p><strong className="text-white">Quote the full term in your region.</strong> Wix prices and currency vary by location; its displayed yearly-plan prices are monthly equivalents paid upfront for the year. We have not confirmed a standard US price in this check, so we do not present the regional sample as your US quote. <a href="https://www.wix.com/plans" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Official pricing conditions</a>.</p>
            <p><strong className="text-white">Separate product import from order migration.</strong> Wix documents a DIY CSV route for importing products from another ecommerce platform. That CSV route is documented for products, not order history. For a broader migration, Wix documents Cart2Cart for data such as products, orders and coupons; available data varies by source platform, and moving store orders requires a Premium or Studio plan that accepts payments. <a href="https://support.wix.com/en/article/wix-stores-importing-products-from-another-ecommerce-platform" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Wix product-import guide</a>.</p>
            <p><strong className="text-white">Free app installation is not free migration.</strong> Wix says Cart2Cart can be added to a Wix site for free, while the migration itself is paid and a price breakdown is shown before you commit. Its documented 1,000-product and 1,000-order limits belong to that Cart2Cart route, not to Wix Stores overall. <a href="https://support.wix.com/en/article/wix-stores-migrating-from-other-ecommerce-platforms-to-wix-stores" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Wix migration guide</a>.</p>
            <p><strong className="text-white">A domain is not a mailbox.</strong> A custom email address through Google Workspace is a separate purchase. Include it in your budget only if you need it; do not assume a domain voucher includes business email.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-300">
            <p><strong className="text-white">Separate the owner from extra staff.</strong> Basic does not include additional Shopify admin staff accounts. Grow supports 5 and Advanced 15. The store owner and collaborator accounts do not count toward these staff limits; POS-only staff follow separate rules. <a href="https://help.shopify.com/en/manual/your-account/users/users-plan-requirements" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Shopify user limits</a>.</p>
            <p><strong className="text-white">Check the shipping feature, not just “shipping.”</strong> Basic does not support activating third-party carrier-calculated shipping. That does not mean Basic cannot ship orders. Verify the exact carrier-rate feature and activation requirements before upgrading. <a href="https://help.shopify.com/en/manual/intro-to-shopify/pricing-plans/plans-features/basic-shopify-plan" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Basic plan features</a>.</p>
            <p><strong className="text-white">Keep platform fees and processor fees separate.</strong> When applicable, Shopify’s third-party transaction fees are additional to the payment provider’s processing fees. Review exemptions and the rules for your payment methods instead of assuming every order has the same cost. <a href="https://help.shopify.com/en/manual/your-account/manage-billing/billing-charges/types-of-charges/third-party-charges/third-party-transaction-fees" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Transaction-fee rules</a>.</p>
            <p className="text-xs text-zinc-400">The price snapshot below retains its original check date. A monthly equivalent billed yearly is not the total annual cost or a cancel-any-month offer. Confirm the current regional quote before paying.</p>
          </div>
        )}
        <p className="mt-5 text-xs leading-6 text-zinc-400">Plan-feature sources checked September 17, 2026. This is documentation-based guidance, not hands-on testing or a refresh of every product claim. {isWix ? "These are standard website plans, not Wix Studio or Wix Headless pricing." : "Only upgrade when a required feature or verified cost comparison justifies it."}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/compare/wix-vs-shopify" className="text-emerald-300 underline underline-offset-4">Compare Wix and Shopify for your workflow</Link>
          <Link href="/best-ecommerce-platform-for-small-business#store-decision-kit" className="text-emerald-300 underline underline-offset-4">Use the free store decision checklist</Link>
        </div>
      </section>
    </Card>
  );
}
