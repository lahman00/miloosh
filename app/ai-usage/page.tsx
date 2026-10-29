import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "AI Usage Disclosure";
const PATH = "/ai-usage";

export const metadata: Metadata = {
  title: TITLE,
  description: `The honest, current role automation and AI play in building and maintaining ${SITE_NAME}.`,
  alternates: { canonical: PATH },
};

export default function AiUsagePage() {
  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      sections={[
        {
          heading: "Where automation and AI are used",
          body: (
            <p>
              Automation and AI tools assist with organizing product data, drafting page copy
              and generated content (including comparison summaries and FAQ answers), validating
              entries against our data schema, and general site maintenance.
            </p>
          ),
        },
        {
          heading: "The sourcing standard doesn't change",
          body: (
            <p>
              Whether a step was automated or not, factual product information is expected to be
              based on the official sources cited on each page — see our{" "}
              <Link href="/sources-policy" className="text-white underline underline-offset-4">
                Sources Policy
              </Link>
              . Automation is used to apply that standard consistently across many pages, not to
              replace it.
            </p>
          ),
        },
        {
          heading: "We don't claim full human review of every fact",
          body: (
            <p>
              To be direct about this: we do not claim that every individual fact on every page
              of {SITE_NAME}
              {" "}has been manually re-verified by a human after being drafted.
              Content is AI-assisted and directed by the site&apos;s operator, not independently
              fact-checked line by line for every entry.
            </p>
          ),
        },
        {
          heading: "Verify critical facts yourself",
          body: (
            <p>
              Before making a decision that matters — especially a purchase — independently
              verify the facts that matter most to you directly on the vendor&apos;s own site.
              See our{" "}
              <Link href="/disclaimer" className="text-white underline underline-offset-4">
                Disclaimer
              </Link>{" "}
              for more on this.
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
