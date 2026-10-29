import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "Privacy Policy";
const PATH = "/privacy";

export const metadata: Metadata = {
  title: TITLE,
  description: `How ${SITE_NAME} handles data, cookies, and third-party links.`,
  alternates: { canonical: PATH },
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      lastUpdated="September 4, 2026"
      sections={[
        {
          heading: "Overview",
          body: (
            <p>
              {SITE_NAME}{" "}
              is an informational comparison site. This page explains what happens —
              and, just as importantly, what doesn&apos;t happen — to your data when you use it.
            </p>
          ),
        },
        {
          heading: "Information we collect",
          body: (
            <>
              <p>
                {SITE_NAME}{" "}
                has no user accounts and does not require visitors to create one. Ordinary
                browsing does not require you to identify yourself. Recommendation answers may be
                processed by {SITE_NAME}&apos;s infrastructure to generate results, and limited
                recommendation context may be included in first-party anonymous telemetry when
                that telemetry is enabled.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>We do not require or collect account information.</li>
                <li>We do not ask for a name, email address, or phone number to generate recommendations.</li>
                <li>Optional free-text fields can contain whatever a visitor types; do not enter personal or sensitive information there.</li>
                <li>Our Contact page opens your own email client — we never receive form data server-side.</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Cookies",
          body: (
            <p>
              This site sets no cookies for advertising, authentication, or any other
              non-essential purpose — ever. It does use Google Analytics, but the analytics
              cookie is not set until you explicitly choose &quot;Allow analytics&quot; in the
              banner shown on your first visit. See our{" "}
              <Link href="/cookies" className="text-white underline underline-offset-4">
                Cookie Policy
              </Link>{" "}
              for the full detail on this, including how to change your choice.
            </p>
          ),
        },
        {
          heading: "Third-party links",
          body: (
            <p>
              {SITE_NAME}{" "}
              describes and compares third-party software products. Some outbound vendor links
              are affiliate links. After you choose to click one, the destination vendor or
              affiliate network may use its own cookies or equivalent attribution technology
              under its own policies. {SITE_NAME} may separately record an anonymous first-party
              outbound-click event; we do not control or set the destination&apos;s attribution
              technology. Review each destination&apos;s own privacy and cookie policies.
            </p>
          ),
        },
        {
          heading: "First-party anonymous analytics & link tracking",
          body: (
            <p>
              To understand aggregate readership and improve software comparisons, {SITE_NAME}{" "}
              operates a privacy-preserving first-party telemetry system. When you browse pages or
              click an official or affiliate product link, we record anonymous interaction events
              (such as page path, dwell time, and clicked product links). If you arrive from a
              linked community post (for example Reddit or a Facebook group) with source-tracking
              parameters in the URL, we also record which channel and campaign it came from and
              which page you landed on, so we can tell which posts are actually driving readers —
              never which specific person did. This system uses ephemeral,
              pseudonymous client-side tokens (stored in local and session storage) with zero personal
              identifiable information (PII), zero IP address storage, and zero browser fingerprinting.
              This data remains strictly on {SITE_NAME}&apos;s own secure infrastructure and is never
              sold or shared with third-party advertising networks.
            </p>
          ),
        },
        {
          heading: "Third-party platform integrations",
          body: (
            <p>
              {SITE_NAME}{" "}
              may connect to third-party platforms, such as LinkedIn, to manage and
              publish {SITE_NAME}&apos;s own content. When such an integration is enabled, {SITE_NAME}{" "}
              may receive and process limited information necessary to authenticate and operate
              it — for example, authorization credentials or tokens, account or organization
              identifiers, and information related to content managed or published through the
              integration. This information is used only to operate the relevant integration. It
              is not sold, and it is not used by {SITE_NAME}{" "}
              for advertising. Information received
              from a third-party platform is handled in accordance with that platform&apos;s own
              terms and policies.
            </p>
          ),
        },
        {
          heading: "Changes to this policy",
          body: (
            <p>
              If this policy changes, we&apos;ll update the date at the top of this page.
              Continued use of the site after a change means you accept the updated policy.
            </p>
          ),
        },
        {
          heading: "Related policies",
          body: (
            <p>
              See also our{" "}
              <Link href="/terms" className="text-white underline underline-offset-4">
                Terms of Service
              </Link>
              ,{" "}
              <Link href="/disclaimer" className="text-white underline underline-offset-4">
                Disclaimer
              </Link>
              , and{" "}
              <Link href="/cookies" className="text-white underline underline-offset-4">
                Cookie Policy
              </Link>
              .
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
