import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, ExternalLink, Users, Download } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsletterSignupForm } from "@/components/newsletter/NewsletterSignupForm";
import { ShareButton } from "@/components/ShareButton";
import { JsonLd } from "@/components/JsonLd";
import { buildCrmPlanGateDataset } from "@/lib/crm-plan-gates/build";
import { getDatasetJsonLd } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

const PAGE_PATH = "/research/crm-plan-gates-2026";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const TITLE = "CRM Plan-Gate Dataset 2026";
const DESCRIPTION =
  "Which CRM plan you actually need for two-way email sync, workflow automation, and sales sequences, across 7 vendors -- verified against each vendor's own pricing page and help documentation. Not a best-CRM ranking.";

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

function VendorLink({ row }: { row: { vendor: string; catalogSlug: string | null; officialPricingUrl: string } }) {
  if (row.catalogSlug) {
    return (
      <Link href={`/software/${row.catalogSlug}`} className="underline underline-offset-4 hover:text-white">
        {row.vendor}
      </Link>
    );
  }
  return (
    <a href={row.officialPricingUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">
      {row.vendor}
    </a>
  );
}

/** The date this dataset's vendor rows were actually researched -- distinct from `generatedAt`,
 *  which is a build-time compilation timestamp, not a source verification. */
const VERIFIED_DATE = "2026-09-27";

export default function CrmPlanGatesPage() {
  const d = buildCrmPlanGateDataset();
  const sequencesStat = d.stats.find((s) => s.label.startsWith("Sales sequences"))!;
  const emailStat = d.stats.find((s) => s.label.startsWith("Two-way email"))!;
  const automationStat = d.stats.find((s) => s.label.startsWith("Workflow automation"))!;
  const pipelineStat = d.stats.find((s) => s.label.startsWith("No disclosed cap"))!;

  const datasetJsonLd = getDatasetJsonLd({
    name: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    datePublished: "2026-09-27",
    dateModified: VERIFIED_DATE,
    distributionUrls: [
      { contentUrl: `${SITE_URL}/api/research/crm-plan-gates-2026`, encodingFormat: "application/json" },
      { contentUrl: `${SITE_URL}/api/research/crm-plan-gates-2026/csv`, encodingFormat: "text/csv" },
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
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">{TITLE}</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            {`A CRM's advertised entry price doesn't say which plan you actually need. This dataset checks ${d.sampleSize} CRM vendors -- ${d.rows.map((r) => r.vendor).join(", ")} -- against their own pricing pages and help documentation for the plan tier where two-way email sync, workflow automation, and sales sequences actually unlock. This is not a ranking: no score, no weighting, no recommended vendor.`}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ShareButton title={TITLE} url={PAGE_URL} />
            <Link href="/api/research/crm-plan-gates-2026" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
              <Download className="h-3.5 w-3.5" /> JSON dataset
            </Link>
            <Link href="/api/research/crm-plan-gates-2026/csv" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
              <Download className="h-3.5 w-3.5" /> CSV dataset
            </Link>
          </div>
        </header>

        {/* Citation block */}
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
            <p className="text-2xl font-semibold text-white">{sequencesStat.trueCount} of {d.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Include sales sequences/cadences on their entry paid plan ({sequencesStat.trueVendors.join(", ")})</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{emailStat.trueCount} of {d.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Include two-way email sync on their entry (or free) plan</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{automationStat.trueCount} of {d.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Include workflow automation on their entry paid plan</p>
          </Card>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-semibold text-white">{pipelineStat.trueCount} of {d.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Disclose no cap on the number of pipelines ({pipelineStat.trueVendors.join(", ")})</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{d.hasFreeTierCount} of {d.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Offer a genuine free tier (not just a trial)</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{d.confirmedMinimumSeatVendors.length} of {d.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Have a confirmed minimum seat count to purchase ({d.confirmedMinimumSeatVendors.join(", ") || "none"})</p>
          </Card>
        </div>

        {/* Feature-gate table */}
        <div className="mt-14">
          <h2 className="text-lg font-semibold text-white">Which plan unlocks which feature</h2>
          <p className="mt-1 text-xs text-zinc-500">
            &ldquo;Entry plan&rdquo; means each vendor&apos;s own cheapest PAID plan. A feature missing from the entry plan is not a flaw -- it is a packaging choice worth pricing into your decision before you commit to a seat count.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Entry plan</th>
                  <th className="px-4 py-3">Email sync</th>
                  <th className="px-4 py-3">Automation</th>
                  <th className="px-4 py-3">Sequences</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.key} className="border-b border-white/5 align-top">
                    <td className="px-4 py-3 text-zinc-300"><VendorLink row={r} /></td>
                    <td className="px-4 py-3 text-zinc-400">{r.entryPlanName}</td>
                    <td className="px-4 py-3 text-zinc-500">{yn(r.emailSyncOnEntryPlan)}</td>
                    <td className="px-4 py-3 text-zinc-500">{yn(r.automationOnEntryPlan)}</td>
                    <td className="px-4 py-3 text-zinc-500">{yn(r.sequencesOnEntryPlan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full gate detail, with quoted specifics */}
        <div className="mt-14">
          <h2 className="text-lg font-semibold text-white">Full gate detail</h2>
          <p className="mt-1 text-xs text-zinc-500">The exact wording and numbers behind each Yes/No/Unknown above.</p>
          <div className="mt-4 space-y-6">
            {d.rows.map((r) => (
              <Card key={r.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-white"><VendorLink row={r} /></h3>
                  <a href={r.officialPricingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-zinc-500 underline underline-offset-4 hover:text-white">
                    Official pricing <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{r.entryPlanName} -- {r.entryPlanPrice}</p>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email sync</dt>
                    <dd className="mt-1 text-zinc-400">{r.emailSyncGate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Automation</dt>
                    <dd className="mt-1 text-zinc-400">{r.automationGate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sequences</dt>
                    <dd className="mt-1 text-zinc-400">{r.sequencesGate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pipelines</dt>
                    <dd className="mt-1 text-zinc-400">{r.pipelineLimits}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Minimum seats</dt>
                    <dd className="mt-1 text-zinc-400">{r.minimumSeats ?? (r.minimumSeatsStatus === "confirmed_none" ? "Confirmed: no minimum" : "Not confirmed either way")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Contact/record scaling</dt>
                    <dd className="mt-1 text-zinc-400">{r.contactScaling}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Billing</dt>
                    <dd className="mt-1 text-zinc-400">
                      {r.annualBillingRequired === null ? "Unknown" : r.annualBillingRequired ? "Annual billing required for the advertised entry price" : "Monthly billing available at the entry price"}
                      {" -- "}
                      {r.hasFreeTier ? "genuine free tier available" : "no free tier"}, {r.hasFreeTrial ? `${r.trialDays ?? "unspecified-length"}-day free trial` : "no free trial found"}.
                    </dd>
                  </div>
                  {r.unknownFields.length > 0 ? (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Left unknown</dt>
                      <dd className="mt-1 text-zinc-500">
                        <ul className="list-disc space-y-1 pl-4">
                          {r.unknownFields.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                </dl>
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
              <dd className="mt-1 text-zinc-400">{d.inclusionRule}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Verification</dt>
              <dd className="mt-1 text-zinc-400">
                Every field was checked against that vendor&apos;s own pricing page first, falling back to the vendor&apos;s own help/knowledge-base documentation only where the pricing page itself did not state a fact (never a third-party aggregator, except for one field on Zoho CRM where the pricing page geo-redirected to a non-USD currency -- see that row&apos;s notes). Verified {VERIFIED_DATE}.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">No ranking</dt>
              <dd className="mt-1 text-zinc-400">
                This dataset computes no score, no weighting, and recommends no vendor. Every count reports how many vendors gate a named feature behind an upgrade from their entry plan -- a factual packaging question, not a quality judgment. A CRM that gates a feature is not a worse CRM; it is priced differently.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Missing data</dt>
              <dd className="mt-1 text-zinc-400">
                Every vendor row lists its own specific unknowns (see &ldquo;Left unknown&rdquo; in the full detail above) rather than presenting a single blanket disclaimer. Nothing in this dataset was estimated to fill a gap.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Limitations</dt>
              <dd className="mt-1 text-zinc-400">
                Feature names and tier structures change; this is a dated snapshot, not a live feed. &ldquo;Entry plan&rdquo; excludes free tiers by design, since a free CRM seat is rarely viable for a real sales team&apos;s full feature needs -- but where a free tier exists and includes a feature (e.g. HubSpot&apos;s email sync), that is noted. This dataset does not evaluate feature quality, only presence and plan placement.
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

        {/* Buyer implications */}
        <Card className="mt-8 max-w-3xl">
          <h2 className="text-sm font-semibold text-white">What this means for a buyer</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li>Only Zoho CRM includes sales sequences on its entry paid plan -- the other 6 require at least one upgrade beyond the cheapest paid tier, which can change the real per-seat price you should compare.</li>
            <li>&ldquo;Has email sync&rdquo; is not a single fact -- Close, HubSpot, Zoho CRM, Freshsales, and Salesforce all include it from their entry (or free) plan, while Pipedrive and monday CRM require an upgrade first.</li>
            <li>A pipeline cap you never hit is irrelevant; one you will hit (HubSpot&apos;s 15/account on Starter, Zoho&apos;s single pipeline on Standard, Freshsales&apos; single pipeline on Growth) should be checked against your actual team structure before signing an annual contract.</li>
            <li>monday CRM is the only vendor here with a confirmed purchase minimum (3 seats) -- worth knowing before pricing out a 1-2 person pilot.</li>
            <li>Annual billing is required to get the advertised entry price at 3 of 7 vendors (Close, HubSpot, Freshsales) -- budget for a yearly commitment, not a monthly one, when comparing those headline numbers.</li>
          </ul>
        </Card>

        {/* Information-gain block */}
        <Card className="mt-8 max-w-3xl">
          <h2 className="text-sm font-semibold text-white">Why &ldquo;entry price&rdquo; alone doesn&apos;t answer the question</h2>
          <div className="mt-3 space-y-4 text-sm text-zinc-400">
            <p>
              A CRM&apos;s advertised entry price describes what you pay for a seat -- not what that seat can do. Two vendors at the same $/seat/month price can require completely different tiers to reach the same real capability, because &ldquo;automation&rdquo; or &ldquo;sequences&rdquo; means a different, vendor-defined feature bundle at a different price point for each of them.
            </p>
            <div>
              <p className="text-zinc-300">Questions worth asking before signing a CRM contract:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Which named plan -- not which price -- actually includes the specific feature your team needs on day one?</li>
                <li>Does the price you were quoted require annual billing, and what happens to that price if you need to add seats mid-year?</li>
                <li>Is there a real minimum seat count, and does it match your actual team size (not the size you plan to grow into)?</li>
                <li>If a pipeline or contact cap exists on your target plan, what does upgrading past it cost -- and is that the plan you were quoted, or the next one up?</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Related reading */}
        <Card className="mt-8 max-w-3xl">
          <h2 className="text-sm font-semibold text-white">Related reading</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              { href: "/category/crm", label: "All CRM software" },
              { href: "/software/pipedrive", label: "Pipedrive pricing and review" },
              { href: "/software/hubspot", label: "HubSpot pricing and review" },
              { href: "/software/salesforce", label: "Salesforce pricing and review" },
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
            <h2 className="text-sm font-semibold text-white">Get notified when this dataset updates</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Occasional emails when the dataset materially changes. Compilation does not mean every vendor was rechecked today.
          </p>
          <div className="mt-4">
            <NewsletterSignupForm source="crm-plan-gates-dataset" />
          </div>
        </Card>
      </Container>
    </main>
  );
}
