import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, ExternalLink, Users, Download } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsletterSignupForm } from "@/components/newsletter/NewsletterSignupForm";
import { ShareButton } from "@/components/ShareButton";
import { JsonLd } from "@/components/JsonLd";
import { buildCmsDecisionMatrix } from "@/lib/cms-decision-matrix/build";
import { getDatasetJsonLd } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

const PAGE_PATH = "/research/cms-buying-decision-2026";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const TITLE = "CMS Buying Decision Matrix 2026";
const DESCRIPTION =
  "Migration lock-in, hosting model, and commercial support across 8 CMS platforms, verified against each vendor's own documentation. Every vendor makes it easy to bring content in -- almost none document a path to take it back out.";
const VERIFIED_DATE = "2026-09-27";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "article" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function yn(v: boolean | null): string {
  return v === null ? "Unknown" : v ? "Yes" : "No";
}

export default function CmsBuyingDecisionPage() {
  const m = buildCmsDecisionMatrix();

  const datasetJsonLd = getDatasetJsonLd({
    name: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    datePublished: VERIFIED_DATE,
    dateModified: VERIFIED_DATE,
    distributionUrls: [
      { contentUrl: `${SITE_URL}/api/research/cms-buying-decision-2026`, encodingFormat: "application/json" },
      { contentUrl: `${SITE_URL}/api/research/cms-buying-decision-2026/csv`, encodingFormat: "text/csv" },
    ],
  });

  return (
    <main className="flex-1 py-16 sm:py-20">
      <JsonLd data={datasetJsonLd} />
      <Container>
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: TITLE }]} />

        <header className="mt-6 max-w-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
            <FileCheck2 className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-6xl">{TITLE}</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            {`A CMS decision is a migration decision you make twice -- once moving in, once (maybe, years later) moving out. This matrix checks all ${m.sampleSize} platforms -- WordPress, Umbraco, Craft CMS, Drupal, Joomla, Webflow, Contentful, and Storyblok -- against each vendor's own documentation for whether a path to import content in, and a path to export it back out, actually exists.`}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ShareButton title={TITLE} url={PAGE_URL} />
            <Link href="/api/research/cms-buying-decision-2026" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
              <Download className="h-3.5 w-3.5" /> JSON dataset
            </Link>
            <Link href="/api/research/cms-buying-decision-2026/csv" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
              <Download className="h-3.5 w-3.5" /> CSV dataset
            </Link>
          </div>
        </header>

        <Card className="mt-10 max-w-3xl border-white/15 bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Citation</p>
          <p className="mt-2 text-sm text-zinc-400">
            Miloosh Research. &ldquo;{TITLE}.&rdquo; Verified {VERIFIED_DATE}. {PAGE_URL}. Methodology: {PAGE_URL}#methodology.
            Dataset licensed CC BY 4.0 -- reuse with attribution.
          </p>
        </Card>

        {/* Headline findings */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-semibold text-white">{m.importAndExportCount} of {m.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Document a real path both INTO and OUT of the platform (WordPress only)</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{m.importOnlyCount} of {m.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Document import-in tooling but no documented export-out path to a competitor</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{m.exportOnlyCount} of {m.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Document export-out but no documented path to import an existing site in (Umbraco, Webflow)</p>
          </Card>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-semibold text-white">{m.bothHostedAndSelfHostedCount} of {m.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Offer both a self-hosted option and a vendor-hosted option</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{m.hostedOnlyCount} of {m.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Hosted-only, with no self-hosted option (Webflow, Contentful, Storyblok)</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{m.noOfficialVendorSupportCount} of {m.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Sell no official commercial support at all -- only an independent third-party ecosystem (Joomla)</p>
          </Card>
        </div>

        {/* Migration table */}
        <div className="mt-14">
          <h2 className="text-lg font-semibold text-white">Migration direction, by vendor</h2>
          <p className="mt-1 text-xs text-zinc-500">
            &ldquo;In&rdquo; and &ldquo;Out&rdquo; both mean a real, vendor-documented tool or process -- not just technical possibility. A missing export path is not necessarily a flaw in that vendor&apos;s product; it is a real cost to weigh if you might ever need to leave.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Hosting</th>
                  <th className="px-4 py-3">Import in?</th>
                  <th className="px-4 py-3">Export out?</th>
                  <th className="px-4 py-3">Official support?</th>
                </tr>
              </thead>
              <tbody>
                {m.rows.map((r) => (
                  <tr key={r.slug} className="border-b border-white/5 align-top">
                    <td className="px-4 py-3 text-zinc-300">
                      {r.ownPageEditable ? (
                        <Link href={`/software/${r.slug}`} className="underline underline-offset-4 hover:text-white">{r.name}</Link>
                      ) : (
                        <a href={r.primarySourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">{r.name}</a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{r.hostedOrSelfHosted}</td>
                    <td className="px-4 py-3 text-zinc-500">{yn(r.documentsImportIntoProduct)}</td>
                    <td className="px-4 py-3 text-zinc-500">{yn(r.documentsExportOutOfProduct)}</td>
                    <td className="px-4 py-3 text-zinc-500">{yn(r.commercialSupportAvailable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full detail cards */}
        <div className="mt-14">
          <h2 className="text-lg font-semibold text-white">Full detail, by vendor</h2>
          <div className="mt-4 space-y-6">
            {m.rows.map((r) => (
              <Card key={r.slug}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{r.name}</h3>
                  <span className="text-xs text-zinc-500">{r.recordedStartingPrice ?? "Unknown"}</span>
                </div>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Import in</dt>
                    <dd className="mt-1 text-zinc-400">{r.importNote}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Export out</dt>
                    <dd className="mt-1 text-zinc-400">{r.exportNote}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Commercial support</dt>
                    <dd className="mt-1 text-zinc-400">{r.commercialSupportNote}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Who it&apos;s positioned for</dt>
                    <dd className="mt-1 text-zinc-400">{r.developerAgencyFitNote}</dd>
                  </div>
                </dl>
                <a href={r.primarySourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-500 underline underline-offset-4 hover:text-white">
                  Official source <ExternalLink className="h-3 w-3" />
                </a>
              </Card>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <Card className="mt-14 max-w-3xl">
          <div id="methodology" className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-white">Methodology</h2>
          </div>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sample</dt>
              <dd className="mt-1 text-zinc-400">{m.inclusionRule}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Verification</dt>
              <dd className="mt-1 text-zinc-400">
                Each vendor&apos;s migration claims are checked against its own official documentation -- pricing pages, developer docs, knowledge-base articles -- never a third-party migration-tool vendor&apos;s marketing claims about compatibility. &ldquo;Documents import/export&rdquo; means a specific, named, vendor-published tool or process was found; the absence of a finding is reported as such, not treated as proof no tool exists anywhere.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Missing data</dt>
              <dd className="mt-1 text-zinc-400">
                Several vendors&apos; official pages blocked automated access during this research (notably Umbraco, which returned HTTP 403 to most direct page fetches); those rows rely on the vendor&apos;s documentation subdomain where it was reachable, and any figure that could not be independently confirmed is called out in that vendor&apos;s own notes rather than asserted.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Why &ldquo;matrix,&rdquo; not &ldquo;index&rdquo;</dt>
              <dd className="mt-1 text-zinc-400">
                This page computes no composite score or ranking across platforms. It reports a small number of verified per-vendor facts along two decision-relevant dimensions (migration direction, hosting model). &ldquo;Matrix&rdquo; describes a facts-by-vendor grid; it does not imply a winner.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Limitations</dt>
              <dd className="mt-1 text-zinc-400">
                &ldquo;Documented&rdquo; is not the same as &ldquo;easy&rdquo; or &ldquo;complete&rdquo; -- several import tools found here are limited to specific source platforms (e.g. Craft CMS and Joomla&apos;s WordPress-specific importers) and would not help migrating from a different CMS. This matrix does not evaluate migration quality, only documented existence.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Site-wide standards</dt>
              <dd className="mt-1 text-zinc-400">
                This page follows the same rules as every other page on Miloosh: see the{" "}
                <Link href="/sources-policy" className="text-zinc-300 underline underline-offset-4 hover:text-white">Sources Policy</Link>{" "}
                for how facts are sourced and dated, the{" "}
                <Link href="/editorial-policy" className="text-zinc-300 underline underline-offset-4 hover:text-white">Editorial Policy</Link>{" "}
                for how commercial relationships are kept separate from what gets published, and the{" "}
                <Link href="/corrections-policy" className="text-zinc-300 underline underline-offset-4 hover:text-white">Corrections Policy</Link>{" "}
                to report an error in this dataset.
              </dd>
            </div>
          </dl>
        </Card>

        {/* Buyer implications / info-gain */}
        <Card className="mt-8 max-w-3xl">
          <h2 className="text-sm font-semibold text-white">What to test before you commit to a CMS</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li>Before signing a contract or building real content, try the platform&apos;s own documented export path yourself -- with a throwaway test site -- rather than trusting that one exists because the vendor is popular.</li>
            <li>If a platform only documents import (not export), treat any real migration off it later as a custom engineering project, not a supported vendor workflow -- budget for that risk up front, not after you&apos;ve committed years of content.</li>
            <li>&ldquo;Hosted-only&rdquo; platforms (Webflow, Contentful, Storyblok) mean your content lives on the vendor&apos;s infrastructure by design -- that is a legitimate tradeoff for speed and reliability, but it is a different risk profile than a self-hostable option, and worth naming explicitly in a buying decision.</li>
            <li>A platform with no official vendor support (Joomla) is not automatically riskier -- but it does mean your support relationship is with an independent agency you choose and vet yourself, not with the software vendor.</li>
          </ul>
        </Card>

        {/* Related reading */}
        <Card className="mt-8 max-w-3xl">
          <h2 className="text-sm font-semibold text-white">Related reading</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              { href: "/category/cms", label: "All CMS software" },
              { href: "/software/wordpress", label: "WordPress pricing and review" },
              { href: "/software/umbraco", label: "Umbraco pricing and review" },
              { href: "/compare/craft-cms-vs-wordpress", label: "Craft CMS vs WordPress" },
              { href: "/research", label: "All Miloosh research" },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-zinc-400 underline underline-offset-4 hover:text-white">{link.label}</Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="mt-8 max-w-3xl">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-white">Get notified when this matrix updates</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Occasional emails when the dataset materially changes. Compilation does not mean every vendor was rechecked today.
          </p>
          <div className="mt-4">
            <NewsletterSignupForm source="cms-buying-decision-matrix" />
          </div>
        </Card>
      </Container>
    </main>
  );
}
