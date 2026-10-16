import type { Software } from "@/data/software";
import { describePrice } from "@/lib/pricing-display";
import { isPriceLabelHeld } from "@/lib/price-label-hold";

function evidenceFor(software: Software): Array<string | undefined> {
  const p = software.pricing;
  return [p?.startingPrice, p?.tiers?.find((t) => t.amount === p.entryPaid?.amount)?.notes];
}

/** Distinguish the price unit from the annual payment commitment. */
export function firstRevenuePriceLine(software: Software): string | null {
  const p = software.pricing;
  if (!p) return null;
  const free = p.freePlan || p.hasFreeTier ? "Free plan available. " : "";
  if (p.status === "verified" && p.entryPaid) {
    const entry = p.entryPaid;
    if (entry.billingPeriod === "annual" && !isPriceLabelHeld(software.slug)) {
      const { text } = describePrice({ amount: entry.amount, currency: entry.currency, billingPeriod: entry.billingPeriod, per: entry.perSeat ? "seat" : null, annualBillingRequired: false }, evidenceFor(software));
      return `${free}Paid-plan snapshot: ${text}.${entry.annualBillingRequired && !text.includes("billed annually") ? " Annual billing required for this rate." : ""}`;
    }
    const unit = { monthly: "/month", annual: "/year", one_time: " one-time", unknown: "" }[entry.billingPeriod];
    const seat = entry.perSeat ? " per seat" : "";
    const annual = entry.annualBillingRequired ? " Annual billing required for this rate." : "";
    return `${free}Paid-plan snapshot: ${entry.currency} ${entry.amount}${unit}${seat}.${annual}`;
  }
  if (free) return free + "Check the vendor for current paid-plan terms.";
  return p.status === "contact_sales" ? "Request a quote for your requirements." : null;
}

/** Compact but never hides the billing commitment in a sticky mobile CTA. */
export function firstRevenueCompactPrice(software: Software): string | null {
  const p = software.pricing;
  if (p?.status !== "verified" || !p.entryPaid) return null;
  const e = p.entryPaid;
  if (e.billingPeriod === "annual" && !isPriceLabelHeld(software.slug)) {
    const { text } = describePrice({ amount: e.amount, currency: e.currency, billingPeriod: e.billingPeriod, per: e.perSeat ? "seat" : null, annualBillingRequired: e.annualBillingRequired }, evidenceFor(software));
    return text.replace(" / month", "/mo").replace(" / year", "/year").replace(" / seat", " per seat");
  }
  const unit = { monthly: "/mo", annual: "/year", one_time: " one-time", unknown: "" }[e.billingPeriod];
  return `${e.currency} ${e.amount}${unit}${e.perSeat ? " per seat" : ""}${e.annualBillingRequired ? " · billed annually" : ""}`;
}
