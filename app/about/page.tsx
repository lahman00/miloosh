import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ReadingLayout } from "@/components/ReadingLayout";
import { JsonLd } from "@/components/JsonLd";
import { getBreadcrumbJsonLd } from "@/lib/structured-data";
import { getDataFreshness } from "@/lib/freshness";
import { formatIsoDate } from "@/lib/date";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";
import { SITE_NAME, SITE_URL, SITE_VERSION } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Why ${SITE_NAME} exists and how we choose which alternatives to compare.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const freshness = getDataFreshness();
  const sections = [
    {
      id: "how-we-pick-alternatives",
      heading: "How we pick alternatives",
      body: (
        <p>
          Every comparison on this site is built around a tool&apos;s most common,
          real-world substitutes — the products people actually consider when they&apos;re
          evaluating a switch. We focus on core use case fit: what each alternative is
          best at, and who it&apos;s a good match for.
        </p>
      ),
    },
    {
      id: "data-freshness",
      heading: "Data freshness",
      body: (
        <>
          <p>
            {SITE_NAME} currently covers {freshness.softwareCount} software tools across{" "}
            {freshness.categoryCount} categories. Every entry cites at least one official
            source, last verified {formatIsoDate(freshness.latestAccessedAt)} — see our{" "}
            <Link
              href="/sources-policy"
              className="text-white underline underline-offset-4"
            >
              Sources Policy
            </Link>{" "}
            for how that works.
          </p>
          <p className="text-sm text-zinc-500">Site version {SITE_VERSION}.</p>
        </>
      ),
    },
    {
      id: "independence",
      heading: "Independence",
      body: (
        <p>
          {SITE_NAME} is not affiliated with, sponsored by, or endorsed by any of the
          software vendors named on this site. Product names, logos, and brands mentioned
          here are the property of their respective owners.
        </p>
      ),
    },
    {
      id: "start-comparing",
      heading: "Start comparing",
      body: (
        <p>
          Search for a tool you&apos;re using today from{" "}
          <Link href="/" className="text-white underline underline-offset-4">
            the homepage
          </Link>
          , or jump straight into a comparison for{" "}
          <Link href="/software/notion" className="text-white underline underline-offset-4">
            Notion
          </Link>{" "}
          or{" "}
          <Link href="/software/slack" className="text-white underline underline-offset-4">
            Slack
          </Link>
          .
        </p>
      ),
    },
  ];

  return (
    <main className="page-shell flex-1">
      <JsonLd
        data={getBreadcrumbJsonLd([
          { name: "Home", url: SITE_URL },
          { name: "About", url: `${SITE_URL}/about` },
        ])}
      />

      <Container>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "About" }]} />

        <h1 className="page-title">About {SITE_NAME}</h1>
        <p className="page-meta">Last updated {LEGAL_LAST_UPDATED}</p>

        <p className="page-intro">
          {SITE_NAME} helps you figure out what to switch to before you actually switch —
          comparing the strongest alternatives to the software you already use, side by side.
        </p>

        <ReadingLayout sections={sections} />
      </Container>
    </main>
  );
}
