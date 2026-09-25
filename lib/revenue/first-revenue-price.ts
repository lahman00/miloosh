import type { Software } from "@/data/software";

/** Distinguish the price unit from the annual payment commitment. */
export function firstRevenuePriceLine(software: Software): string | null {
  const p = software.pricing;
  if (!p) return null;
  const free = p.freePlan || p.hasFreeTier
    ? "Free plan available. "
    : p.freeTrial?.available
      ? p.freeTrial.days
        ? `${p.freeTrial.days}-day free trial, no permanent free plan. `
        : "Free trial available, no permanent free plan. "
      : "";
  if (p.status === "verified" && p.entryPaid) {
    const entry = p.entryPaid;
    const unit = { monthly: "/month", annual: "/year", one_time: " one-time", unknown: "" }[entry.billingPeriod];
    const seat = entry.perSeat ? " per seat" : "";
    const annual = entry.annualBillingRequired ? " Annual billing required for this rate." : "";
    return `${free}Paid-plan snapshot: ${entry.currency} ${entry.amount}${unit}${seat}.${annual}`;
  }
  if (free) return free + "Check the vendor for current paid-plan terms.";
  return p.status === "contact_sales" ? "Request a quote for your requirements." : null;
}

/** The catalog tier behind the entry price, whose sourced notes carry the monthly-billing rate and plan limits. */
export function firstRevenueEntryTier(software: Software) {
  const p = software.pricing;
  if (p?.status !== "verified" || !p.entryPaid || p.entryPaid.amount === "0") return undefined;
  return p.tiers?.find((tier) => tier.amount === p.entryPaid!.amount && tier.currency === p.entryPaid!.currency && tier.notes);
}

/** Compact but never hides the billing commitment in a sticky mobile CTA. */
export function firstRevenueCompactPrice(software: Software): string | null {
  const p = software.pricing;
  if (p?.status !== "verified" || !p.entryPaid) return null;
  const e = p.entryPaid;
  const unit = { monthly: "/mo", annual: "/year", one_time: " one-time", unknown: "" }[e.billingPeriod];
  return `${e.currency} ${e.amount}${unit}${e.perSeat ? " per seat" : ""}${e.annualBillingRequired ? " · billed annually" : ""}`;
}
