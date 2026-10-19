import type { Software } from "@/data/software";
import { formatIsoDate } from "@/lib/date";

/**
 * Pieces of the v2 comparison template. Everything here is read from the two products' stored, sourced data:
 * nothing is inferred, and a value the data does not state is shown as "Not stated", never guessed.
 */

export type PricingRow = { label: string; a: string; b: string };

const NOT_STATED = "Not stated on the pricing page";

function money(amount: string, currency: string): string {
  const value = Number(amount);
  const text = Number.isFinite(value) ? (Number.isInteger(value) ? String(value) : value.toFixed(2)) : amount;
  return currency === "USD" ? `$${text}` : `${text} ${currency}`;
}

/**
 * The stored entry price. A monthly price is stated per month; an "annual" entry means the vendor bills annually and
 * its unit (per month or per year) differs between products, so it is shown as "with annual billing" and never as a
 * per-month or per-year figure the data does not state.
 */
function cheapestPaid(software: Software): string {
  const entry = software.pricing?.entryPaid;
  if (!entry) return software.pricing?.status === "contact_sales" ? "Contact sales (no public price)" : NOT_STATED;
  const price = money(entry.amount, entry.currency);
  const seat = entry.perSeat ? " per user" : "";
  if (entry.billingPeriod === "monthly") return `${price}${seat} per month${entry.annualBillingRequired ? ", billed annually" : ""}`;
  if (entry.billingPeriod === "annual") return `${price}${seat} with annual billing`;
  if (entry.billingPeriod === "one_time") return `${price}${seat}, one time`;
  return `${price}${seat}`;
}

function freePlan(software: Software): string {
  const pricing = software.pricing;
  if (pricing?.freePlan === true || pricing?.hasFreeTier === true) return "Yes";
  if (pricing?.freePlan === false || pricing?.hasFreeTier === false) return "No";
  return NOT_STATED;
}

function freeTrial(software: Software): string {
  const trial = software.pricing?.freeTrial;
  if (!trial) return NOT_STATED;
  if (!trial.available) return "None listed";
  return trial.days ? `${trial.days} days` : "Yes";
}

const MODEL_LABEL: Record<string, string> = { free: "Free", freemium: "Free plan plus paid plans", paid: "Paid", open_source: "Open source", unknown: NOT_STATED };

const modelOf = (s: Software): string => (s.pricing?.status === "contact_sales" ? "Custom pricing (contact sales)" : (MODEL_LABEL[s.pricing?.model ?? "unknown"] ?? NOT_STATED));

/** Side-by-side pricing facts. Returns null unless both products have dated, sourced pricing that is either verified or verified to be sales-only. */
export function buildPricingRows(a: Software, b: Software): PricingRow[] | null {
  const verified = (s: Software) => (s.pricing?.status === "verified" || s.pricing?.status === "contact_sales") && Boolean(s.pricing.lastVerified) && Boolean(s.pricing.officialSource);
  if (!verified(a) || !verified(b)) return null;
  return [
    { label: "Pricing model", a: modelOf(a), b: modelOf(b) },
    { label: "Free plan", a: freePlan(a), b: freePlan(b) },
    { label: "Free trial", a: freeTrial(a), b: freeTrial(b) },
    { label: "Cheapest paid plan", a: cheapestPaid(a), b: cheapestPaid(b) },
    { label: "Pricing last verified", a: formatIsoDate(a.pricing!.lastVerified!), b: formatIsoDate(b.pricing!.lastVerified!) },
  ];
}

/** The sourced strengths of a product, or an empty list. The v1 template listed the product's features here instead. */
export function sourcedPros(software: Software): string[] {
  return software.pros ?? [];
}

/** The sourced constraints of a product, or an empty list; the caller leaves the block out rather than writing a disclaimer. */
export function sourcedCons(software: Software): string[] {
  return software.cons ?? [];
}
