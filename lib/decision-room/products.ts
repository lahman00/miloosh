import { getAllSoftware, getSoftware, type Software } from "@/data/software";
import { getCategoryName } from "@/data/categories";
import { getSoftwareCtaRel, getSoftwareCtaUrl, shouldShowAffiliateDisclosure } from "@/lib/affiliate";
import type { RoomIndexEntry, RoomPricing, RoomProduct } from "./types";

/** Server-side mapping from the verified dataset to the Decision Room's shapes. Read-only; no dataset value is changed or invented. */
const clip = (s: string | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function toRoomIndexEntry(s: Software): RoomIndexEntry {
  return { slug: s.slug, name: s.name, category: s.category, categoryName: getCategoryName(s.category) ?? s.category, bestFor: clip(s.bestFor, 120) };
}

function toPricing(s: Software): RoomPricing {
  const p = s.pricing;
  const e = p?.entryPaid;
  const amount = e ? Number.parseFloat(e.amount) : NaN;
  return {
    status: p?.status ?? null,
    model: p?.model ?? null,
    startingPrice: p?.startingPrice ?? null,
    freePlan: typeof p?.freePlan === "boolean" ? p.freePlan : typeof p?.hasFreeTier === "boolean" ? p.hasFreeTier : null,
    freeTrial: p?.freeTrial ? { available: p.freeTrial.available, days: p.freeTrial.days ?? null } : null,
    entryPaid: e && Number.isFinite(amount) ? { amount, currency: e.currency, billingPeriod: e.billingPeriod, perSeat: typeof e.perSeat === "boolean" ? e.perSeat : null, annualBillingRequired: Boolean(e.annualBillingRequired) } : null,
    enterpriseContactSales: typeof p?.enterpriseContactSales === "boolean" ? p.enterpriseContactSales : null,
    lastVerified: p?.lastVerified ?? null,
    officialSource: p?.officialSource ?? null,
  };
}

export function toRoomProduct(s: Software): RoomProduct {
  return {
    ...toRoomIndexEntry(s),
    description: clip(s.description, 400),
    features: s.features.slice(0, 40).map((f) => clip(f, 200)),
    pros: (s.pros ?? []).slice(0, 6).map((f) => clip(f, 220)),
    cons: (s.cons ?? []).slice(0, 6).map((f) => clip(f, 220)),
    platforms: (s.platforms ?? []).slice(0, 12).map((f) => clip(f, 40)),
    tags: (s.tags ?? []).slice(0, 12).map((f) => clip(f, 40)),
    faq: (s.faq ?? []).slice(0, 6).map((f) => ({ question: clip(f.question, 200), answer: clip(f.answer, 300) })),
    sources: s.sources.filter((u) => /^https?:\/\//.test(u)).slice(0, 6),
    accessedAt: s.accessedAt,
    website: s.website,
    pricing: toPricing(s),
    cta: { href: getSoftwareCtaUrl(s), rel: getSoftwareCtaRel(s), disclosure: shouldShowAffiliateDisclosure(s) },
  };
}

export const buildRoomIndex = (): RoomIndexEntry[] => getAllSoftware().map(toRoomIndexEntry).sort((a, b) => a.name.localeCompare(b.name));

export const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

export function getRoomProducts(slugs: readonly string[]): RoomProduct[] {
  const out: RoomProduct[] = [];
  for (const slug of slugs.slice(0, 12)) {
    if (!SLUG_PATTERN.test(slug) || out.some((p) => p.slug === slug)) continue;
    const s = getSoftware(slug);
    if (s) out.push(toRoomProduct(s));
  }
  return out;
}
