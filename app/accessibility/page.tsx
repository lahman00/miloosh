import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "Accessibility Statement";
const PATH = "/accessibility";

export const metadata: Metadata = {
  title: TITLE,
  description: `Our accessibility goals for ${SITE_NAME}, and how to report a barrier.`,
  alternates: { canonical: PATH },
};

export default function AccessibilityPage() {
  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      sections={[
        {
          heading: "Our goal",
          body: (
            <p>
              We want {SITE_NAME} to be usable by as many people as possible, including people
              who use assistive technology like screen readers or navigate primarily by
              keyboard.
            </p>
          ),
        },
        {
          heading: "What we do",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Semantic HTML structure (headings, landmarks, lists) throughout the site.</li>
              <li>
                Keyboard-operable interactive elements — native links and buttons, and a
                keyboard-accessible FAQ accordion built on standard HTML disclosure widgets.
              </li>
              <li>A responsive layout designed to work at any screen size, not just desktop.</li>
              <li>A dark color theme designed with legible text contrast in mind.</li>
            </ul>
          ),
        },
        {
          heading: "What we don't claim",
          body: (
            <p>
              We have not completed a formal accessibility audit, and we do not claim
              conformance with WCAG or any other accessibility standard at this time. The items
              above describe our current approach and intent, not a certification.
            </p>
          ),
        },
        {
          heading: "Reporting a barrier",
          body: (
            <p>
              If you run into something on {SITE_NAME}
              {" "}that&apos;s hard to use with assistive
              technology, tell us — email{" "}
              <a href={`mailto:${SITE_EMAIL}`} className="text-white underline underline-offset-4">
                {SITE_EMAIL}
              </a>{" "}
              or use the{" "}
              <Link href="/contact" className="text-white underline underline-offset-4">
                contact page
              </Link>{" "}
              with the page URL and a description of the problem. We&apos;ll do our best to
              address it.
            </p>
          ),
        },
      ]}
    />
  );
}
