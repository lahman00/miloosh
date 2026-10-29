import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { CookiePreferencesControl } from "@/components/CookiePreferencesControl";
import { SITE_EMAIL, SITE_NAME } from "@/lib/site";

const TITLE = "Cookie Policy";
const PATH = "/cookies";

export const metadata: Metadata = {
  title: TITLE,
  description: `${SITE_NAME}'s cookie usage: analytics cookies only after explicit consent, no advertising or authentication cookies, and separate downstream affiliate attribution after outbound clicks.`,
  alternates: { canonical: PATH },
};

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title={TITLE}
      path={PATH}
      lastUpdated="September 4, 2026"
      sections={[
        {
          heading: "Current status",
          body: (
            <p>
              {SITE_NAME}{" "}
              <strong className="text-white">sets no cookies for advertising or authentication</strong>.
              {" "}{SITE_NAME} uses Google Analytics (GA4) to understand how visitors use the site,
              but{" "}
              <strong className="text-white">
                the analytics tag doesn&apos;t load and no cookie is set until you explicitly
                choose &quot;Allow analytics&quot;
              </strong>{" "}
              in the banner shown on your first visit, or in the control at the bottom of this
              page. There are no accounts to log into, so nothing here needs a cookie beyond that.
            </p>
          ),
        },
        {
          heading: "How the analytics consent choice works",
          body: (
            <>
              <p>
                This site uses Google&apos;s Consent Mode, the mechanism Google Analytics itself
                provides for exactly this. Every visit starts with every consent signal
                (including <code className="text-zinc-300">analytics_storage</code>) set to{" "}
                <strong className="text-white">denied</strong>{" "}
                by default — that default is set before anything else analytics-related runs. The
                actual Google Analytics script is not loaded at all while consent is denied or
                hasn&apos;t been decided yet; it only loads, and only then can it set a cookie,
                after you click &quot;Allow analytics.&quot;
              </p>
              <p>
                Your choice itself is remembered in your browser&apos;s local storage, not a
                cookie — local storage isn&apos;t sent to any server, so recording &quot;this
                visitor already decided&quot; doesn&apos;t require consent the way a tracking
                cookie would.
              </p>
              <p>
                Declining doesn&apos;t retroactively remove a cookie Google Analytics may have
                already set if you previously allowed analytics and are now changing your mind —
                browsers and Google&apos;s own cookie-expiry rules govern that, not this site. It
                does immediately stop any new analytics activity.
              </p>
            </>
          ),
        },
        {
          heading: "Your choice",
          body: (
            <>
              <p>You can change your analytics choice at any time:</p>
              <CookiePreferencesControl />
            </>
          ),
        },
        {
          heading: "Other analytics providers supported, but not used",
          body: (
            <p>
              The codebase also includes disabled-by-default support for Plausible and PostHog as
              alternative analytics providers, switched on only by environment variable — neither
              is configured for this deployment, and neither is used alongside Google Analytics.
              Only one provider can be active at a time.
            </p>
          ),
        },
        {
          heading: "Third-party sites",
          body: (
            <p>
              {SITE_NAME} links out to official vendor websites for the products we compare,
              and some of those outbound links are affiliate links. {SITE_NAME} may record an
              anonymous first-party click event when you choose an outbound link. After the click,
              the destination vendor or affiliate network may separately use cookies or equivalent
              technology to attribute the referral under its own policy. Those downstream
              attribution technologies are not cookies set by {SITE_NAME}. See our{" "}
              <Link href="/privacy" className="text-white underline underline-offset-4">
                Privacy Policy
              </Link>{" "}
              for more on third-party links.
            </p>
          ),
        },
        {
          heading: "If this changes",
          body: (
            <p>
              If {SITE_NAME} ever adds cookies for advertising or accounts, or changes analytics
              providers, this page will be updated first, before those cookies are set.
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
