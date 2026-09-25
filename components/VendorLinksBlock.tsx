import {
  Activity,
  Building2,
  DollarSign,
  ExternalLink,
  FileText,
  LifeBuoy,
  Plug,
  Rocket,
  Tag,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import type { Software } from "@/data/software";
import { TrackedVendorLink } from "@/components/TrackedVendorLink";
import { TrackedCtaLink } from "@/components/TrackedCtaLink";
import { getFirstRevenuePage } from "@/data/revenue/first-revenue-cohort";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";

type VendorLinkDef = {
  label: string;
  url: string;
  icon: ComponentType<LucideProps>;
};

/**
 * Sprint 6 Phase 5 — reusable vendor link block. The official website
 * already has its own dedicated CTA elsewhere on the page, so this only
 * covers the other link types (pricing, trial, docs, support,
 * integrations, status, community, deals, enterprise — the last three
 * added Sprint 20 Phase 7 as affiliate-readiness insertion points), and
 * only when at least one is actually present. Do not invent a URL here;
 * leave the field unset instead.
 *
 * Every direct vendor link now routes through TrackedVendorLink so the
 * same visitor/session/test semantics are used everywhere. This prevents
 * synthetic QA on a vendor source from being misreported as real traffic.
 */
export function VendorLinksBlock({ software }: { software: Software }) {
  // Narrow buyer-sprint scope. Editorial/source links and all other products
  // keep their existing direct behavior; no guessed deep links are introduced.
  const commercialAffiliate = Boolean(getFirstRevenuePage(software.slug)) && shouldShowAffiliateDisclosure(software);
  const candidates: Array<{ label: string; url?: string; icon: ComponentType<LucideProps> }> = [
    { label: "Pricing", url: software.links?.pricing, icon: DollarSign },
    { label: "Free trial", url: software.links?.trial, icon: Rocket },
    { label: "Documentation", url: software.links?.docs, icon: FileText },
    { label: "Support", url: software.links?.support, icon: LifeBuoy },
    { label: "Integrations", url: software.links?.integrations, icon: Plug },
    { label: "Status page", url: software.links?.status, icon: Activity },
    { label: "Community", url: software.links?.community, icon: Users },
    { label: "Current deals", url: software.links?.deals, icon: Tag },
    { label: "Enterprise contact", url: software.links?.enterprise, icon: Building2 },
  ];

  const links: VendorLinkDef[] = candidates
    .filter((link) => Boolean(link.url))
    .map((link) => ({ ...link, url: link.url as string }));

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-white/10 pt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
        More from {software.name}
      </h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => {
          const ctaLocation = `vendor-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`;
          const isCommercial = commercialAffiliate && (link.label === "Pricing" || link.label === "Free trial");
          return (
            <li key={link.label}>
              {isCommercial ? (
                <TrackedCtaLink
                  slug={software.slug}
                  href={getSoftwareCtaUrl(software, link.label === "Pricing" ? "pricing" : undefined)}
                  ctaLocation={ctaLocation}
                  target="_blank"
                  rel={getSoftwareCtaRel(software)}
                  aria-label={`${software.name} ${link.label}`}
                  variant="secondary"
                  className="w-full"
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {link.label}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </TrackedCtaLink>
              ) : (
              <TrackedVendorLink
                slug={software.slug}
                href={link.url}
                ctaLocation={ctaLocation}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white"
              >
                <link.icon className="h-4 w-4 shrink-0 text-zinc-500" />
                {link.label}
                <ExternalLink className="h-3 w-3 shrink-0 text-zinc-600" />
              </TrackedVendorLink>
              )}
            </li>
          );
        })}
      </ul>
      {commercialAffiliate && links.some((link) => link.label === "Pricing" || link.label === "Free trial") ? (
        <p className="mt-3 text-xs leading-5 text-zinc-500">Pricing and trial buttons use our affiliate referral link. Choose your plan on the vendor site; Miloosh may earn a commission.</p>
      ) : null}
    </div>
  );
}
