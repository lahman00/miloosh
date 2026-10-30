import type { Software } from "@/data/software";

/**
 * Evidence maintenance: a read-only review queue. It flags facts the Decision Room relies on that are old, missing or ambiguous, so a
 * person can re-read the vendor page. It never edits a record, a page or a protected page; fixing anything is a separate reviewed change.
 */
export type EvidenceFlag = { slug: string; flag: "pricing_stale" | "pricing_unverified" | "pricing_source_missing" | "price_scale_unrecorded" | "billing_basis_unclear" | "sources_stale" | "currency_not_supported"; detail: string };

const DAY = 86_400_000;
const age = (iso: string | undefined, today: string): number | null => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return Math.floor((Date.parse(today) - Date.parse(iso)) / DAY);
};

export function flagEvidence(all: readonly Software[], today: string, thresholds = { pricingDays: 45, sourcesDays: 120 }): EvidenceFlag[] {
  const flags: EvidenceFlag[] = [];
  for (const s of all) {
    const p = s.pricing;
    const sourceAge = age(s.accessedAt, today);
    if (sourceAge !== null && sourceAge > thresholds.sourcesDays) flags.push({ slug: s.slug, flag: "sources_stale", detail: `Sources last read ${s.accessedAt} (${sourceAge} days ago).` });
    if (!p || p.status !== "verified") { if (p?.entryPaid) flags.push({ slug: s.slug, flag: "pricing_unverified", detail: "An entry price is recorded but the pricing status is not verified." }); continue; }
    const priceAge = age(p.lastVerified, today);
    if (priceAge === null) flags.push({ slug: s.slug, flag: "pricing_stale", detail: "Verified pricing has no valid verification date." });
    else if (priceAge > thresholds.pricingDays) flags.push({ slug: s.slug, flag: "pricing_stale", detail: `Pricing last verified ${p.lastVerified} (${priceAge} days ago).` });
    if (!p.officialSource) flags.push({ slug: s.slug, flag: "pricing_source_missing", detail: "Verified pricing has no official source URL." });
    const e = p.entryPaid;
    if (e) {
      if (typeof e.perSeat !== "boolean") flags.push({ slug: s.slug, flag: "price_scale_unrecorded", detail: "The entry price does not say whether it is per seat or flat; cost estimates must stay Unknown." });
      if (e.billingPeriod !== "monthly" && e.billingPeriod !== "annual") flags.push({ slug: s.slug, flag: "billing_basis_unclear", detail: `Billing period is "${e.billingPeriod}".` });
      if (!["USD", "EUR", "GBP"].includes(e.currency)) flags.push({ slug: s.slug, flag: "currency_not_supported", detail: `Currency ${e.currency} is not one of USD, EUR or GBP.` });
    }
  }
  return flags;
}
