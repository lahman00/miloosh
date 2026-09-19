import { TrackedInternalCtaLink } from "@/components/TrackedInternalCtaLink";
import type { EcommerceSituation } from "@/lib/recommend/types";

function DecisionLink({ href, name, children }: { href: string; name: string; children: React.ReactNode }) {
  return <TrackedInternalCtaLink href={href} sourcePath="/recommend/results" targetPath={href} ctaName={name} className="underline underline-offset-4">{children}</TrackedInternalCtaLink>;
}

/** Existing decision support, not another recommendation engine or migration assessment. */
export function EcommerceSituationGuidance({ situation, productSlugs }: { situation: EcommerceSituation; productSlugs: string[] }) {
  if (situation === "new") {
    return <p className="mt-6 max-w-2xl text-sm leading-6 text-zinc-300">Starting from scratch: these options are a starting point. Verify the plan, payments, catalog and fulfillment requirements for your new store before choosing.</p>;
  }
  const hasWooCommerce = productSlugs.includes("woocommerce");
  return (
    <div className="mt-6 max-w-2xl space-y-3 text-sm leading-6 text-zinc-300">
      {situation === "repair" ? (
        <p>Keep or repair your store if it can meet your needs. A platform shortlist is not a diagnosis.
          {hasWooCommerce ? <> For WooCommerce, start with the <DecisionLink href="/software/woocommerce#woocommerce-repair-check" name="recommend-woocommerce-repair-check">WooCommerce repair check</DecisionLink>.</> : null}
        </p>
      ) : situation === "embed" ? (
        <p>Keeping your website requires a compatibility check, not just a higher score. Use the <DecisionLink href="/software/ecwid#ecwid-integration-decision" name="recommend-ecwid-integration-decision">Ecwid integration decision check</DecisionLink>.
          {hasWooCommerce ? <> Also compare <DecisionLink href="/compare/ecwid-vs-woocommerce#store-ownership-choice" name="recommend-store-ownership-choice">embedded commerce and WooCommerce ownership</DecisionLink>.</> : null}
        </p>
      ) : situation === "migrate" ? (
        <p>A migration mention does not prove your records can move. Review the <DecisionLink href="/compare/wix-vs-shopify#small-store-buyer-checks" name="recommend-small-store-buyer-checks">small-store migration and buyer checks</DecisionLink> before choosing a platform.</p>
      ) : null}
      <p>This shortlist does not assess an existing store&apos;s catalog, SEO migration risk or fulfillment workflows. If you have a store, use the <DecisionLink href="/best-ecommerce-platform-for-small-business#store-decision-kit" name="recommend-store-decision-kit">stay, repair, embed, or migrate decision checklist</DecisionLink> before rebuilding.</p>
    </div>
  );
}
