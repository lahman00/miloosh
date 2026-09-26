import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, ExternalLink, Users, Download } from "lucide-react";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NewsletterSignupForm } from "@/components/newsletter/NewsletterSignupForm";
import { ShareButton } from "@/components/ShareButton";
import { JsonLd } from "@/components/JsonLd";
import { buildSupportPricingBenchmark } from "@/lib/support-pricing-benchmark/build";
import { formatIndexMoney } from "@/lib/pricing-index/format";
import { getDatasetJsonLd } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";

const PAGE_PATH = "/research/customer-support-pricing-2026";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const TITLE = "Customer Support Pricing Benchmark 2026";
const DESCRIPTION =
  "How 16 customer support platforms bill for AI-handled conversations, verified against each vendor's own pricing page: who publishes a per-resolution AI rate, who bundles it, and where the underlying seat price is undisclosed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "article" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function fmt(v: number | null | undefined, digits = 2) {
  if (v === null || v === undefined) return "—";
  return `$${v.toFixed(digits)}`;
}

/** The date this dataset's vendor rows were most recently re-verified -- distinct from
 *  `generatedAt`, which is a build-time compilation timestamp, not a source verification. */
const VERIFIED_DATE = "2026-09-27";

export default function CustomerSupportPricingBenchmarkPage() {
  const b = buildSupportPricingBenchmark();
  const generatedDate = new Date(b.generatedAt).toISOString().slice(0, 10);
  const datasetJsonLd = getDatasetJsonLd({
    name: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    datePublished: "2026-09-26",
    dateModified: VERIFIED_DATE,
    distributionUrls: [
      { contentUrl: `${SITE_URL}/api/research/customer-support-pricing-2026`, encodingFormat: "application/json" },
      { contentUrl: `${SITE_URL}/api/research/customer-support-pricing-2026/csv`, encodingFormat: "text/csv" },
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
            {`Customer support software billing split into two families in 2025-2026: pure per-seat licensing, and seat pricing paired with a separate charge for AI-handled conversations. This benchmark checks all ${b.sampleSize} products Miloosh's own catalog classifies under Customer Support, individually, against each vendor's own pricing page, to find out how many actually price AI usage separately -- and what that costs in practice.`}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ShareButton title={TITLE} url={PAGE_URL} />
            <Link href="/api/research/customer-support-pricing-2026" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
              <Download className="h-3.5 w-3.5" /> JSON dataset
            </Link>
            <Link href="/api/research/customer-support-pricing-2026/csv" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
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

        {/* Revision transparency -- this dataset was corrected once already */}
        <Card className="mt-4 max-w-3xl border-white/10 bg-white/[0.02]">
          <p className="text-xs text-zinc-500">
            <strong className="text-zinc-400">Revised 2026-09-27:</strong> a full re-verification against every vendor&apos;s live pricing page found that the original AI-usage-pricing count (5 of 16) had missed real, publicly disclosed AI charges at 4 vendors -- corrected to 9 of 16 below. This was a gap in the original research, not a set of overnight vendor price changes. See{" "}
            <Link href="/api/research/customer-support-pricing-2026" className="underline underline-offset-4 hover:text-white">the dataset</Link>{" "}
            for the current figures.
          </p>
        </Card>

        {/* Headline findings */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-semibold text-white">{b.billingUnitStats.disclosedAiUsageUnit} of {b.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Publish a distinct, separately billed AI-usage price</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{b.billingUnitStats.perSeatOnly} of {b.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Bundle any AI features into seat tiers with no separate usage price disclosed</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{b.billingUnitStats.contactSalesForBaseSeat} of {b.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Have no public base seat price at all -- the price itself requires a sales conversation</p>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-2xl font-semibold text-white">{b.billingUnitStats.freeTierAvailable} of {b.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Offer a free tier (not just a trial)</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">{b.billingUnitStats.entryPricePublic} of {b.sampleSize}</p>
            <p className="mt-1 text-xs text-zinc-500">Publish a specific entry-tier dollar amount</p>
          </Card>
          <Card>
            <p className="text-2xl font-semibold text-white">1 of {b.billingUnitStats.disclosedAiUsageUnit}</p>
            <p className="mt-1 text-xs text-zinc-500">Disclose an AI-usage price with no undisclosed seat price or allowance offsetting it (Intercom) -- see below</p>
          </Card>
        </div>

        {/* AI usage pricing table */}
        <div className="mt-14">
          <h2 className="text-lg font-semibold text-white">Vendors that bill AI usage separately</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Every row was independently re-checked against the vendor&apos;s own pricing page on 2026-09-27. Units differ (per-resolution, per-session-block, per-conversation, per-action) and are not directly interchangeable -- see each note before comparing across rows.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">AI usage rate</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {b.disclosedAiUsageRows.map((r) => (
                  <tr key={r.slug} className="border-b border-white/5 align-top">
                    <td className="px-4 py-3 text-zinc-300">
                      <Link href={`/software/${r.slug}`} className="underline underline-offset-4 hover:text-white">{r.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 tabular-nums">{fmt(r.aiUsagePricing.unitPrice)}</td>
                    <td className="px-4 py-3 text-zinc-400">{r.aiUsagePricing.unit}</td>
                    <td className="px-4 py-3 text-zinc-500">{r.aiUsagePricing.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crossing scenario */}
        {b.crossingScenario ? (
          <div className="mt-14">
            <h2 className="text-lg font-semibold text-white">Illustrative scenario: seat cost vs. AI usage cost</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {`${b.crossingScenario.vendor} is the only vendor in the table above whose base seat price, AI usage price, and per-plan seat count are all public with no undisclosed included-usage allowance offsetting the arithmetic -- so it is the only one this scenario can be computed for from public information alone. This is arithmetic on published list prices for a hypothetical ${b.crossingScenario.seats}-seat team, not a customer invoice, a recommendation, or a claim about typical usage.`}
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">AI-resolved conversations/month</th>
                    <th className="px-4 py-3">Seat cost ({b.crossingScenario.seats} seats)</th>
                    <th className="px-4 py-3">AI usage cost</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {b.crossingScenario.rows.map((row) => (
                    <tr key={row.resolutions} className="border-b border-white/5">
                      <td className="px-4 py-3 text-zinc-300 tabular-nums">{row.resolutions}</td>
                      <td className="px-4 py-3 text-zinc-400 tabular-nums">{formatIndexMoney(row.seatCost)}</td>
                      <td className="px-4 py-3 text-zinc-400 tabular-nums">{formatIndexMoney(row.aiCost)}</td>
                      <td className="px-4 py-3 text-white tabular-nums">{formatIndexMoney(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {`The AI usage line alone crosses ${b.crossingScenario.vendor}'s ${b.crossingScenario.seats}-seat base fee (${formatIndexMoney(b.crossingScenario.seatRate * b.crossingScenario.seats)}) at ${Math.ceil((b.crossingScenario.seatRate * b.crossingScenario.seats) / b.crossingScenario.aiUnitPrice)} resolutions/month (${formatIndexMoney(b.crossingScenario.seatRate * b.crossingScenario.seats)} / ${fmt(b.crossingScenario.aiUnitPrice)}) -- a calculated threshold, not a claim that any specific business hits that volume.`}
            </p>
          </div>
        ) : null}

        {/* Full dataset table */}
        <div className="mt-14">
          <h2 className="text-lg font-semibold text-white">Full dataset -- all {b.sampleSize} products</h2>
          <p className="mt-1 text-xs text-zinc-500">Sample: {b.inclusionRule} Each row links to its vendor source.</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Recorded starting price</th>
                  <th className="px-4 py-3">Per-seat?</th>
                  <th className="px-4 py-3">AI usage priced separately?</th>
                  <th className="px-4 py-3">Free tier</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r) => (
                  <tr key={r.slug} className="border-b border-white/5">
                    <td className="px-4 py-3 text-zinc-300">
                      <Link href={`/software/${r.slug}`} className="underline underline-offset-4 hover:text-white">{r.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{r.recordedStartingPrice ?? "Unknown -- contact sales"}</td>
                    <td className="px-4 py-3 text-zinc-500">{r.entryPerSeat === null ? "Unknown" : r.entryPerSeat ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-zinc-500">{r.aiUsagePricing.disclosed ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-zinc-500">{r.hasFreeTier === null ? "Unknown" : r.hasFreeTier ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-zinc-500">{r.lastVerified ?? "Unknown"}</td>
                    <td className="px-4 py-3">
                      {r.officialSource ? (
                        <a href={r.officialSource} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-zinc-500 underline underline-offset-4 hover:text-white">
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <dd className="mt-1 text-zinc-400">{b.inclusionRule} No vendor was added or removed to fit a preferred conclusion.</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Verification</dt>
              <dd className="mt-1 text-zinc-400">
                {`Each row's price fields are checked individually against that vendor's own pricing page (never a third-party aggregator, when an official source exists). AI-usage-pricing classification (whether a distinct, separately billed AI unit is publicly disclosed) was hand-verified per vendor, not inferred from keyword matching. All ${b.sampleSize} rows were most recently re-verified on ${b.verificationWindow.latest ?? "an unrecorded date"}; this page was compiled on ${generatedDate}.`}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Missing data</dt>
              <dd className="mt-1 text-zinc-400">
                {b.unknownSlugs.length > 0
                  ? `${b.unknownSlugs.length} of ${b.sampleSize} products (${b.unknownSlugs.join(", ")}) publish no pricing figures at all as of the verification date. These rows are marked Unknown throughout -- never filled in with an estimate, and never counted as evidence that the product lacks a feature or is more or less expensive.`
                  : `All ${b.sampleSize} products in this sample now have at least some publicly verified pricing information. That was not true at first publication: HappyFox's pricing page could not be reached during the original research and was marked entirely Unknown until the 2026-09-27 re-verification found it fully priced. One product (Kayako) still has no public base seat price -- see the table above.`}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Why &ldquo;benchmark,&rdquo; not &ldquo;index&rdquo;</dt>
              <dd className="mt-1 text-zinc-400">
                This page computes no single composite score across vendors. It reports verified per-vendor facts and a small number of clearly labeled scenario calculations, which is what &ldquo;benchmark&rdquo; means. Calling it an index would imply a defensible weighted formula that does not exist here.
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Limitations</dt>
              <dd className="mt-1 text-zinc-400">
                Scenario calculations exclude annual-contract discounts, enterprise negotiated pricing, taxes, and non-USD currency conversion. Billable-unit definitions (an Intercom &ldquo;outcome,&rdquo; a Freshdesk &ldquo;session,&rdquo; a Help Scout or Re:amaze &ldquo;resolution,&rdquo; a Front &ldquo;conversation,&rdquo; a HappyFox &ldquo;action&rdquo;) are each set by that vendor and are not directly interchangeable across rows. This benchmark does not measure deflection rate, answer quality, or actual customer spend -- only published list prices and billing structures.
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
            <li>Ask every vendor with a disclosed AI-usage price what counts as a billable unit -- an Intercom &ldquo;outcome&rdquo; and a Freshdesk &ldquo;session&rdquo; are defined differently, and neither is quality-adjusted.</li>
            <li>A vendor that publishes only its AI-usage rate and not its base seat price (Kayako) still requires a sales conversation before any total cost is knowable -- the published number alone understates the bill.</li>
            <li>A vendor can also disclose the opposite way: Zendesk names a separate AI-usage billing unit (&ldquo;Automated Resolutions&rdquo;) without publishing its dollar rate -- ask for the actual number before assuming the base seat price is the whole bill.</li>
            <li>A &ldquo;starting at&rdquo; AI-usage rate (Front&apos;s Autopilot, at $0.05/conversation) is not a guaranteed flat rate the way Intercom&apos;s or Kayako&apos;s stated rate is -- confirm whether it can increase before modeling a total cost from it.</li>
            <li>Flat-workspace and conversation-volume-tiered pricing (Crisp, Tidio&apos;s base plans) cap headline exposure but shift the real decision to whether the included allowance actually covers the required volume.</li>
            <li>For a team expecting meaningful AI-resolution volume, model the AI-usage line item separately from the seat line item before comparing vendors -- collapsing them into one &ldquo;starting price&rdquo; figure hides exactly the divergence this benchmark measures.</li>
          </ul>
        </Card>

        {/* Information-gain: general buying literacy, not vendor-specific claims */}
        <Card className="mt-8 max-w-3xl">
          <h2 className="text-sm font-semibold text-white">How to compare unlike billing units</h2>
          <div className="mt-3 space-y-4 text-sm text-zinc-400">
            <p>
              A per-seat price and a per-resolution price answer different questions, so putting
              them side by side as if they were the same kind of number is the most common
              mistake in this comparison. A seat price scales with headcount; a usage price scales
              with volume. The only fair comparison is a modeled <em>total</em> at your own
              expected seat count and usage volume -- not the two headline numbers on their own.
            </p>
            <p>
              <strong className="text-zinc-300">Why per-outcome and per-seat prices aren&apos;t
              directly comparable:</strong> a vendor charging $0.99 per AI outcome is not
              &ldquo;more expensive&rdquo; than one charging $29 per seat -- those numbers measure
              different things. A team with low ticket volume and several agents may pay far more
              under a per-seat model; a team with few agents but high automated-resolution volume
              may pay far more under a per-outcome model. Neither structure is inherently cheaper.
            </p>
            <div>
              <p className="text-zinc-300">Questions worth asking before switching support platforms:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>What exactly counts as one billable unit (an &ldquo;outcome,&rdquo; a
                  &ldquo;session,&rdquo; a &ldquo;resolution&rdquo;) -- and does it fire even when
                  the customer wasn&apos;t actually helped?</li>
                <li>Is there a minimum seat count, a minimum contract term, or a required annual
                  commitment to get the advertised price?</li>
                <li>If usage spikes in a single month, is the overage rate published, or does it
                  require contacting sales after the fact?</li>
                <li>Does the plan&apos;s AI allowance reset monthly, and what happens to unused
                  allowance -- is it lost, or does it roll over?</li>
                <li>Is the base seat price itself public, or does getting a real number require a
                  sales conversation (as with Kayako in this dataset)?</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Related reading -- links back into product/comparison pages */}
        <Card className="mt-8 max-w-3xl">
          <h2 className="text-sm font-semibold text-white">Related reading</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              { href: "/category/customer-support", label: "All Customer Support software" },
              { href: "/software/intercom", label: "Intercom pricing and review" },
              { href: "/software/freshdesk", label: "Freshdesk pricing and review" },
              { href: "/software/crisp", label: "Crisp pricing and review" },
              { href: "/software/help-scout", label: "Help Scout pricing and review" },
              { href: "/compare/intercom-vs-freshdesk", label: "Intercom vs Freshdesk" },
              { href: "/compare/intercom-vs-zendesk", label: "Intercom vs Zendesk" },
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
            <h2 className="text-sm font-semibold text-white">Get notified when this benchmark updates</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Occasional emails when the dataset materially changes. Each vendor row carries its own verification date; compilation does not mean every vendor was rechecked today.
          </p>
          <div className="mt-4">
            <NewsletterSignupForm source="customer-support-pricing-benchmark" />
          </div>
        </Card>
      </Container>
    </main>
  );
}
