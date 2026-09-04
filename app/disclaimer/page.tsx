import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "Disclaimer";
const PATH = "/disclaimer";

export const metadata: Metadata = {
  title: TITLE,
  description: `What ${SITE_NAME} is — and isn't — and what you should verify before deciding.`,
  alternates: { canonical: PATH },
};

export default function DisclaimerPage() {
  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      lastUpdated="September 4, 2026"
      sections={[
        {
          heading: "Information may change",
          body: (
            <p>
              Software products, their features, and how they&apos;re described change over
              time. Each page on {SITE_NAME} shows the date it was last reviewed — content may
              have changed at the vendor since then.
            </p>
          ),
        },
        {
          heading: "Verify pricing and features yourself",
          body: (
            <p>
              Where {SITE_NAME} publishes pricing or plan figures, they are sourced from an
              official vendor page and shown with a verification date where available. Those
              figures can change after we verify them. Always confirm current pricing, billing
              terms, plan limits, and feature availability directly on the vendor&apos;s official
              site before making a decision. See our{" "}
              <Link href="/sources-policy" className="text-white underline underline-offset-4">
                Sources Policy
              </Link>{" "}
              for more on how we handle this.
            </p>
          ),
        },
        {
          heading: "Not professional advice",
          body: (
            <p>
              Nothing on {SITE_NAME} is legal, financial, security, procurement, or professional
              advice of any kind. Content here is general information about software products
              only, intended to help you research options — not a recommendation tailored to
              your specific situation.
            </p>
          ),
        },
        {
          heading: "You are responsible for your own decisions",
          body: (
            <p>
              You are solely responsible for evaluating and choosing the software your team or
              business uses. {SITE_NAME} is not liable for decisions made, or losses incurred,
              based on information found on this site — see our{" "}
              <Link href="/terms" className="text-white underline underline-offset-4">
                Terms of Service
              </Link>{" "}
              for the full terms.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions about this disclaimer? Reach us at{" "}
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
