import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { getDataFreshness } from "@/lib/freshness";
import { formatIsoDate } from "@/lib/date";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "Sources Policy";
const PATH = "/sources-policy";

export const metadata: Metadata = {
  title: TITLE,
  description: `Where ${SITE_NAME}'s product facts come from, and what we intentionally leave out.`,
  alternates: { canonical: PATH },
};

export default function SourcesPolicyPage() {
  const freshness = getDataFreshness();

  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      lastUpdated="September 4, 2026"
      sections={[
        {
          heading: "Official product pages are our primary source",
          body: (
            <p>
              For what a product is, what it does, and who it&apos;s built for, our primary
              source is that vendor&apos;s own official website. Every software page on{" "}
              {SITE_NAME} lists the exact source URLs its facts were drawn from.
            </p>
          ),
        },
        {
          heading: "How we handle pricing",
          body: (
            <p>
              {SITE_NAME} may publish specific prices, plan tiers, free-tier or trial details when
              those figures are recorded from an official vendor pricing page with a verification
              date. Pricing can change after that date, so published figures are dated snapshots,
              not guarantees. Confirm the current price, billing basis, plan limits, and offers on
              the vendor&apos;s own site before purchasing. We do not invent or extrapolate pricing
              when the official source does not support it.
            </p>
          ),
        },
        {
          heading: "Third-party sources, only when clearly identified",
          body: (
            <p>
              The large majority of facts on this site come from a direct fetch of the
              vendor&apos;s own official page. In the small number of cases where an official
              site could not be fetched directly (for example, if it blocks automated requests),
              we note that plainly rather than presenting it as an ordinary direct source.
            </p>
          ),
        },
        {
          heading: "Access dates are stored",
          body: (
            <p>
              Every entry records the date its sources were fetched and verified, and that date
              is shown right on the page next to the source links themselves — not hidden in the
              underlying data. It&apos;s also one of the signals we use when deciding an entry
              needs re-checking.
            </p>
          ),
        },
        {
          heading: "Data freshness",
          body: (
            <p>
              As of this page&apos;s last update, {freshness.softwareCount} software entries
              across {freshness.categoryCount} categories have been verified, with the most
              recent check on {formatIsoDate(freshness.latestAccessedAt)}.
            </p>
          ),
        },
        {
          heading: "Unknowns stay explicit",
          body: (
            <p>
              We do not turn missing evidence into a factual claim. When a detail cannot be
              verified from the cited material, it should remain unknown or be clearly presented
              as an editorial interpretation rather than as a vendor-stated fact.
            </p>
          ),
        },
        {
          heading: "See also",
          body: (
            <p>
              Our{" "}
              <Link href="/editorial-policy" className="text-white underline underline-offset-4">
                Editorial Policy
              </Link>{" "}
              covers how sourced facts turn into published pages, and our{" "}
              <Link href="/ai-usage" className="text-white underline underline-offset-4">
                AI Usage Disclosure
              </Link>{" "}
              covers what role automation plays in that process.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about a specific source? Reach us at{" "}
              <a href={`mailto:${SITE_EMAIL}`} className="text-white underline underline-offset-4">
                {SITE_EMAIL}
              </a>{" "}
              or via the{" "}
              <Link href="/contact" className="text-white underline underline-offset-4">
                contact page
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
