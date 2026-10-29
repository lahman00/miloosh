import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "Trademark Notice";
const PATH = "/trademark-notice";

export const metadata: Metadata = {
  title: TITLE,
  description: `Trademark ownership and non-affiliation notice for products listed on ${SITE_NAME}.`,
  alternates: { canonical: PATH },
};

export default function TrademarkNoticePage() {
  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      sections={[
        {
          heading: "Ownership",
          body: (
            <p>
              All product names, company names, logos, and trademarks referenced on{" "}
              {SITE_NAME} — including every software product listed in our comparisons — are
              the property of their respective owners.
            </p>
          ),
        },
        {
          heading: "No implied endorsement",
          body: (
            <p>
              Listing a product on {SITE_NAME} does not imply any endorsement, sponsorship,
              partnership, or affiliation between {SITE_NAME} and that company, unless a
              commercial relationship is explicitly and separately disclosed — see our{" "}
              <Link
                href="/affiliate-disclosure"
                className="text-white underline underline-offset-4"
              >
                Affiliate Disclosure
              </Link>
              .
            </p>
          ),
        },
        {
          heading: "Independence",
          body: (
            <p>
              {SITE_NAME} is an independent, informational comparison resource. We are not owned
              by, operated by, or officially connected to any of the software vendors we write
              about.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Trademark owner with a concern about how your product is listed? Reach us at{" "}
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
