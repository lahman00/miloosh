import type { Software } from "@/data/software";

/** Distinguish the price unit from the annual payment commitment. */
export function firstRevenuePriceLine(software: Software): string | null {
  const p = software.pricing;
  if (!p) return null;
  const free = p.freePlan || p.hasFreeTier ? "Free plan available. " : "";
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

/** Compact but never hides the billing commitment in a sticky mobile CTA. */
export function firstRevenueCompactPrice(software: Software): string | null {
  const p = software.pricing;
  if (p?.status !== "verified" || !p.entryPaid) return null;
  const e = p.entryPaid;
  const unit = { monthly: "/mo", annual: "/year", one_time: " one-time", unknown: "" }[e.billingPeriod];
  return `${e.currency} ${e.amount}${unit}${e.perSeat ? " per seat" : ""}${e.annualBillingRequired ? " · billed annually" : ""}`;
}
