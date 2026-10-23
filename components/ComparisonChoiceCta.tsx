import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import type { Software } from "@/data/software";
import { getSoftwareCtaRel, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import { resolveComparisonCtaUrl, getWixContextForComparison, getWixProductLabelForComparison } from "@/lib/wix-funnels";

/**
 * CTA for a "Choose X if…" card — always renders, for every product,
 * exactly like the software page's own CTA (getSoftwareCtaUrl never
 * returns an empty string: it resolves to the affiliate link when one is
 * active, otherwise the plain official site). WAR MODE mission (2026-08-22)
 * Phase 22 fix: this used to early-return null for any non-affiliate
 * product, so a real buyer persuaded by "Choose X if…" text had no button
 * to act on it — found on 138 of 1212 published comparisons where only
 * one side had a deal (the other side's card was silently dead) and on
 * 1062 more where both sides were dead. Rendering unconditionally and
 * gating only the disclosure text on affiliate status restores parity
 * between the two sides regardless of which one Miloosh monetizes — the
 * same commission-independent-of-display principle already enforced by
 * lib/recommend and lib/comparison's editorial neutrality.
 *
 * Wix specifically routes through the funnel-aware resolver
 * (lib/wix-funnels.ts) using the OTHER product in the pairing to pick
 * the right funnel (e.g. a headless-CMS comparison routes to the
 * Headless funnel, not the generic Website Builder one) — every other
 * product just uses its own single affiliate_url, same as the software
 * page.
 */
export function ComparisonChoiceCta({
  software,
  otherSlug,
  ctaLocation = "compare-page-choose-card",
}: {
  software: Software;
  otherSlug: string;
  /** Click-tracking dimension only. The default keeps every existing placement byte-identical. */
  ctaLocation?: string;
}) {
  const href = resolveComparisonCtaUrl(software, otherSlug);
  const wixContext = software.slug === "wix" ? getWixContextForComparison(otherSlug) : undefined;
  const ctaProductName = software.slug === "wix" ? getWixProductLabelForComparison(otherSlug) : software.name;

  return (
    <div className="mt-5">
      {software.slug === "wix" && ctaProductName !== software.name ? (
        <p className="mb-3 text-sm leading-6 text-zinc-400">
          For this comparison, the relevant Wix offering is <span className="font-medium text-zinc-200">{ctaProductName}</span>.
        </p>
      ) : null}
      <TrackedCtaLink
        slug={software.slug}
        href={href}
        rel={getSoftwareCtaRel(software)}
        target="_blank"
        variant="secondary"
        className="w-full"
        ctaLocation={ctaLocation}
        wixContext={wixContext}
      >
        Visit {ctaProductName}
        <ExternalLink className="h-4 w-4" />
      </TrackedCtaLink>
      {shouldShowAffiliateDisclosure(software) ? (
        <p className="mt-2 text-center text-xs text-zinc-400">
          This is an affiliate link. See our{" "}
          <Link href="/affiliate-disclosure" className="underline underline-offset-4 hover:text-zinc-300">
            Affiliate Disclosure
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
