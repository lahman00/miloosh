import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "Corrections Policy";
const PATH = "/corrections-policy";

export const metadata: Metadata = {
  title: TITLE,
  description: `How to report a factual error on ${SITE_NAME}, and what happens next.`,
  alternates: { canonical: PATH },
};

export default function CorrectionsPolicyPage() {
  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      sections={[
        {
          heading: "How to report an error",
          body: (
            <p>
              Email{" "}
              <a href={`mailto:${SITE_EMAIL}`} className="text-white underline underline-offset-4">
                {SITE_EMAIL}
              </a>{" "}
              or use the{" "}
              <Link href="/contact" className="text-white underline underline-offset-4">
                contact page
              </Link>
              . This applies whether you&apos;re a user who spotted something wrong or someone
              from the vendor&apos;s own team.
            </p>
          ),
        },
        {
          heading: "What to include",
          body: (
            <>
              <p>To help us verify and fix it quickly, please include:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>The exact page URL where the error appears.</li>
                <li>The specific fact you believe is wrong.</li>
                <li>
                  If possible, a link to an official source supporting the correction — see our{" "}
                  <Link href="/sources-policy" className="text-white underline underline-offset-4">
                    Sources Policy
                  </Link>{" "}
                  for what counts as one.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "What happens next",
          body: (
            <p>
              We check the report against official sources before making any change. If it
              checks out, we update the relevant entry directly.
            </p>
          ),
        },
        {
          heading: "No guaranteed timeline",
          body: (
            <p>
              {SITE_NAME}{" "}
              is run by a small team, and we can&apos;t promise an immediate fix or
              a specific response time. We do review every report we receive.
            </p>
          ),
        },
        {
          heading: "Corrections are free",
          body: (
            <p>
              Factual corrections are never conditioned on payment, advertising, or any
              commercial relationship. Reporting an error costs nothing and is never used as
              leverage for a paid placement — see our{" "}
              <Link href="/editorial-policy" className="text-white underline underline-offset-4">
                Editorial Policy
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
