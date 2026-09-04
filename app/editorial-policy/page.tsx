import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { getDataFreshness } from "@/lib/freshness";
import { formatIsoDate } from "@/lib/date";
import { SITE_EMAIL, SITE_NAME, SITE_VERSION } from "@/lib/site";

const TITLE = "Editorial Policy";
const PATH = "/editorial-policy";

export const metadata: Metadata = {
  title: TITLE,
  description: `How ${SITE_NAME} researches, structures, and maintains its comparisons.`,
  alternates: { canonical: PATH },
};

export default function EditorialPolicyPage() {
  const freshness = getDataFreshness();

  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      lastUpdated="September 4, 2026"
      sections={[
        {
          heading: "Official sources first",
          body: (
            <p>
              We prefer a vendor&apos;s own official product pages over secondhand descriptions,
              review aggregators, or general knowledge. Every software page on {SITE_NAME} links
              to the specific official sources its facts came from — see our{" "}
              <Link href="/sources-policy" className="text-white underline underline-offset-4">
                Sources Policy
              </Link>{" "}
              for the full rules on that.
            </p>
          ),
        },
        {
          heading: "Structured and validated",
          body: (
            <p>
              Every entry is stored as structured data and validated against a fixed schema
              before it can be published — required fields, valid category assignments, and
              working cross-references between tools are all checked automatically, and the
              site fails to build if any entry is invalid.
            </p>
          ),
        },
        {
          heading: "How recommendations work",
          body: (
            <p>
              The recommendation tool uses deterministic rules over structured product evidence
              and the needs a visitor selects, such as the job to be done, team context, budget,
              work style, and preference for simplicity or depth where relevant evidence exists.
              A match percentage is an evidence-based fit estimate, not a guarantee that every
              stated requirement has been independently verified. The explanation shown with each
              result is part of the decision context. Affiliate status, commission, payout,
              tracking availability, or other commercial fields are excluded from product-fit
              scoring and ordering.
            </p>
          ),
        },
        {
          heading: "Data freshness",
          body: (
            <p>
              {SITE_NAME} currently covers {freshness.softwareCount} software tools across{" "}
              {freshness.categoryCount} categories, all last verified{" "}
              {formatIsoDate(freshness.latestAccessedAt)}. This page reflects site version{" "}
              {SITE_VERSION}.
            </p>
          ),
        },
        {
          heading: "No fabricated ratings or reviews",
          body: (
            <p>
              {SITE_NAME}{" "}
              does not publish star ratings, review counts, testimonials, or
              &quot;best of&quot; rankings based on anything other than the sourced facts on
              each page. We have not added any of these, and we won&apos;t add them without a
              genuine, disclosed source.
            </p>
          ),
        },
        {
          heading: "Corrections and updates",
          body: (
            <p>
              If a fact on this site is wrong or out of date, we want to know. See our{" "}
              <Link href="/corrections-policy" className="text-white underline underline-offset-4">
                Corrections Policy
              </Link>{" "}
              for exactly how to report an error and what happens after you do.
            </p>
          ),
        },
        {
          heading: "Commercial independence",
          body: (
            <p>
              Sponsorship, affiliate relationships, or featured placement (see our{" "}
              <Link
                href="/affiliate-disclosure"
                className="text-white underline underline-offset-4"
              >
                Affiliate Disclosure
              </Link>
              ) never determine which alternatives are shown or how a product is described.
              Every entry — whether or not any commercial relationship exists — goes through the
              same sourcing and validation process described above.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about this policy? Reach us at{" "}
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
