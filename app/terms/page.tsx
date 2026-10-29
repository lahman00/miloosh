import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "Terms of Service";
const PATH = "/terms";

export const metadata: Metadata = {
  title: TITLE,
  description: `The terms that apply to using ${SITE_NAME}.`,
  alternates: { canonical: PATH },
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      sections={[
        {
          heading: "Acceptance of terms",
          body: (
            <p>
              By using {SITE_NAME}, you agree to these terms. If you don&apos;t agree, please
              don&apos;t use the site.
            </p>
          ),
        },
        {
          heading: "Use of the site",
          body: (
            <p>
              {SITE_NAME}{" "}
              provides general, informational comparisons between software products
              to help you research alternatives. It is not professional advice, and it isn&apos;t
              a substitute for verifying pricing, features, and terms directly with each vendor
              before you decide to switch. See our{" "}
              <Link href="/disclaimer" className="text-white underline underline-offset-4">
                Disclaimer
              </Link>{" "}
              for more on this.
            </p>
          ),
        },
        {
          heading: "Trademarks",
          body: (
            <p>
              All product names, logos, and brands referenced on this site — including but not
              limited to the tools and alternatives listed in our comparisons — are the
              trademarks of their respective owners. {SITE_NAME} is an independent site and is
              not affiliated with, sponsored by, or endorsed by any of them. See our full{" "}
              <Link
                href="/trademark-notice"
                className="text-white underline underline-offset-4"
              >
                Trademark Notice
              </Link>
              .
            </p>
          ),
        },
        {
          heading: "No warranty",
          body: (
            <p>
              Content on this site is provided &quot;as is,&quot; without warranty of any kind.
              We do our best to keep comparisons accurate, but software products change
              constantly — always confirm current details with the vendor before making a
              decision.
            </p>
          ),
        },
        {
          heading: "Limitation of liability",
          body: (
            <p>
              {SITE_NAME} is not liable for any decisions made, or losses incurred, based on
              information found on this site.
            </p>
          ),
        },
        {
          heading: "Changes to these terms",
          body: (
            <p>
              We may update these terms from time to time. Continued use of the site after a
              change means you accept the updated terms.
            </p>
          ),
        },
        {
          heading: "Related policies",
          body: (
            <p>
              See also our{" "}
              <Link href="/privacy" className="text-white underline underline-offset-4">
                Privacy Policy
              </Link>
              ,{" "}
              <Link href="/disclaimer" className="text-white underline underline-offset-4">
                Disclaimer
              </Link>
              , and{" "}
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
          heading: "Contact",
          body: (
            <p>
              Questions about these terms? Reach us at{" "}
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
