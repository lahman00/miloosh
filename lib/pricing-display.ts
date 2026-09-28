import type { Pricing, PricingTier, Software } from "@/data/software/types";

const ANNUAL_WORDING =
  /\b(?:annual(?:ly)?|year(?:ly)?|billed\s+(?:annually|yearly)|paid\s+(?:annually|yearly))\b/i;

export function appendAnnualBillingCondition(label: string, required: boolean): string {
  if (!required || ANNUAL_WORDING.test(label)) return label;
  return `${label} · annual billing required`;
}

export function formatStartingPrice(software: Software): string | null {
  const label = software.pricing?.startingPrice;
  if (!label) return null;
  return appendAnnualBillingCondition(
    label,
    software.pricing?.entryPaid?.annualBillingRequired === true,
  );
}

export function formatVerifiedStartingPrice(software: Software): string | null {
  if (software.pricing?.status !== "verified") return null;
  return formatStartingPrice(software);
}

export function tierRequiresAnnualBilling(tier: PricingTier): boolean {
  return (
    tier.annualBillingRequired === true ||
    ANNUAL_WORDING.test(`${tier.unit ?? ""} ${tier.notes ?? ""}`)
  );
}

export function formatTierPrice(tier: PricingTier): string | null {
  if (!tier.amount) return null;
  const currency = tier.currency ? `${tier.currency} ` : "";
  const unit = tier.unit?.trim();
  const period =
    tier.billingPeriod === "monthly"
      ? "month"
      : tier.billingPeriod === "annual"
        ? "year"
        : tier.billingPeriod === "one_time"
          ? "one time"
          : null;

  let label = `${currency}${tier.amount}`;
  if (unit) {
    const cleanedUnit = unit
      .replace(/^per\s+/i, "")
      .replace(/,?\s*(?:billed|paid)\s+(?:annually|yearly)/gi, "")
      .trim();
    label += " / " + cleanedUnit;
    if (period && !/(?:\/|\b)(?:mo|month|year|annual|monthly|yearly)\b/i.test(cleanedUnit)) {
      label += " / " + period;
    }
  } else if (period) {
    label += ` / ${period}`;
  }

  return appendAnnualBillingCondition(label, tierRequiresAnnualBilling(tier));
}

export function entryPriceRequiresAnnualBilling(pricing: Pricing | undefined): boolean {
  return pricing?.entryPaid?.annualBillingRequired === true;
}
