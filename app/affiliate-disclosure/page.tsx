import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "Affiliate Disclosure";
const PATH = "/affiliate-disclosure";

export const metadata: Metadata = {
  title: TITLE,
  description: `How affiliate relationships work on ${SITE_NAME}, how affiliate links are labeled, and how editorial independence is protected.`,
  alternates: { canonical: PATH },
};

export default function AffiliateDisclosurePage() {
  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      sections={[
        {
          heading: "Current status",
          body: (
            <p>
              Some &quot;Visit [Vendor]&quot; links on {SITE_NAME} are affiliate links.
              If you follow one of those links and sign up for or purchase a product,
              {" "}{SITE_NAME} may earn a commission <strong className="text-white">at no
              extra cost to you</strong>. Other outbound links remain ordinary links to a
              vendor&apos;s official website.
            </p>
          ),
        },
        {
          heading: "How affiliate links are identified",
          body: (
            <p>
              We place a visible affiliate disclosure beside a monetized call to action and
              mark its link with <code className="text-zinc-300">rel=&quot;sponsored noopener noreferrer&quot;</code>.
              An ordinary vendor link is not described as an affiliate link. Affiliate status
              can change as partner programs or tracking arrangements change.
            </p>
          ),
        },
        {
          heading: "Labeling commitment",
          body: (
            <p>
              We do not label a link as an affiliate link unless it actually is one, and we do
              not disguise affiliate links as ordinary links. A commercial relationship does
              not mean that a vendor sponsored the page, reviewed its copy, or paid for its
              placement.
            </p>
          ),
        },
        {
          heading: "Editorial independence",
          body: (
            <p>
              Whether or not a commercial relationship exists with a vendor never controls
              which alternatives are listed, how a product is described, or how comparisons are
              structured. Every entry goes through the same sourced, validated data pipeline
              described in our{" "}
              <Link href="/editorial-policy" className="text-white underline underline-offset-4">
                Editorial Policy
              </Link>{" "}
              and{" "}
              <Link href="/sources-policy" className="text-white underline underline-offset-4">
                Sources Policy
              </Link>
              , regardless of any affiliate status.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about this disclosure? Reach us at{" "}
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
