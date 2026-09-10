import Link from "next/link";
import { Card } from "@/components/Card";
import { SectionHeading } from "@/components/SectionHeading";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { getSoftware } from "@/data/software";
import type { BuyerChecklist } from "@/data/seo/buyer-checklists";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

export function DecisionBuyerChecklist({ checklist }: { checklist: BuyerChecklist }) {
  return (
    <section className="mt-14" aria-labelledby="buyer-checklist-heading">
      <SectionHeading eyebrow="Before you switch" title={<span id="buyer-checklist-heading">{checklist.title}</span>} description={checklist.introduction} />
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {checklist.checks.map((check) => <Card key={check.question}>
          <h3 className="text-lg font-semibold text-white">{check.question}</h3>
          <p className="mt-3 text-base leading-7 text-zinc-300">{check.answer}</p>
          <a href={check.source} className="mt-4 inline-block text-sm text-zinc-400 underline underline-offset-4 hover:text-white">{check.sourceLabel}</a>
        </Card>)}
      </div>
      <p className="mt-4 text-sm text-zinc-400">Vendor sources checked {checklist.verifiedAt}. Confirm the current quote and terms for your account.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">{checklist.options.map((option) => {
        const software = getSoftware(option.slug);
        if (!software) return null;
        return <Card key={option.slug}>
          <h3 className="text-lg font-semibold text-white"><Link href={`/software/${option.slug}`} className="underline underline-offset-4">{software.name}</Link></h3>
          <p className="my-4 text-base leading-7 text-zinc-300">{option.fit}</p>
          <TrackedCtaLink slug={option.slug} href={getSoftwareCtaUrl(software)} rel={getSoftwareCtaRel(software)} target="_blank" variant="secondary" ctaLocation="buyer-checklist-cta">Visit {software.name}</TrackedCtaLink>
          {shouldShowAffiliateDisclosure(software) ? <p className="mt-3 text-sm text-zinc-400">This is an affiliate link. <Link href="/affiliate-disclosure" className="underline underline-offset-4">Affiliate disclosure</Link>.</p> : null}
        </Card>;
      })}</div>
    </section>
  );
}
