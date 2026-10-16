/**
 * How a recorded price is worded on the page.
 *
 * `billing_period` in the data is the billing cadence, not always the unit of `amount`. For "annual" entries the amount
 * is usually the monthly-equivalent rate of a plan billed annually (Pipedrive: $14 per seat per month, billed annually,
 * $168 per seat per year), and for a few products it really is a yearly total (TickTick: $49.99 per year). Printing
 * "USD 14 / annual" told a buyer the first was a yearly price. This module words the price from what the record's own
 * sourced strings say about the amount, and when they say nothing it states only what is known: billed annually.
 * It never changes an amount.
 */

export type BillingPeriod = "monthly" | "annual" | "one_time" | "unknown";

export type PriceBasis = "per_month" | "per_month_billed_annually" | "per_year" | "one_time" | "billed_annually_unit_unstated" | "unstated";

export type PriceInput = {
  amount: string;
  currency: string;
  billingPeriod: BillingPeriod;
  /** Per-seat marker: "seat" or a unit name such as "user", "doc maker". */
  per?: string | null;
  annualBillingRequired?: boolean;
};

const CURRENCY_NUMBER = /(?:US)?[$€£]\s?(\d[\d,]*(?:\.\d+)?)/g;
const MONTH = /\b(?:month|mo)\b/i;
const YEAR = /\b(?:year|yearly|yr|annum)\b/i;

function numeric(text: string): number {
  return Number(text.replace(/,/g, ""));
}

/**
 * What the sourced strings say about an annual entry's amount: a per-month rate ("$14/seat/month", "$8.25/month equivalent",
 * "$12.50 ... billed annually at $150/yr"), a per-year total ("$49.99/year"), or nothing/conflicting statements.
 */
export function annualAmountMeaning(amount: string, texts: readonly (string | undefined | null)[]): "per_month" | "per_year" | "unknown" {
  const value = numeric(amount);
  if (!Number.isFinite(value)) return "unknown";
  let monthly = false;
  let yearly = false;
  for (const text of texts) {
    if (!text) continue;
    const found = [...text.matchAll(CURRENCY_NUMBER)];
    for (const [index, match] of found.entries()) {
      const figure = numeric(match[1]!);
      const end = match.index! + match[0].length;
      const next = found[index + 1]?.index ?? text.length;
      const after = text.slice(end, Math.min(next, end + 40));
      const month = MONTH.exec(after)?.index ?? Infinity;
      const year = YEAR.exec(after)?.index ?? Infinity;
      if (Math.abs(figure - value) < 0.005) {
        if (month < year) monthly = true;
        else if (year < month) yearly = true;
      } else if (year < month && Math.abs(figure - value * 12) < 0.6) {
        // "$12.50 ... billed annually at $150/yr": the yearly figure is twelve times the amount, so the amount is monthly.
        monthly = true;
      }
    }
  }
  if (monthly && !yearly) return "per_month";
  if (yearly && !monthly) return "per_year";
  return "unknown";
}

export function describePrice(price: PriceInput, evidence: readonly (string | undefined | null)[] = []): { basis: PriceBasis; text: string } {
  const money = `${price.currency} ${price.amount}`;
  const per = price.per ? ` / ${price.per}` : "";
  if (price.billingPeriod === "monthly") {
    return { basis: "per_month", text: `${money} / month${per}${price.annualBillingRequired ? " · billed annually" : ""}` };
  }
  if (price.billingPeriod === "one_time") return { basis: "one_time", text: `${money}${per} one time` };
  if (price.billingPeriod === "unknown") return { basis: "unstated", text: `${money}${per} · billing period unstated` };
  const meaning = annualAmountMeaning(price.amount, evidence);
  if (meaning === "per_month") return { basis: "per_month_billed_annually", text: `${money} / month${per} · billed annually` };
  if (meaning === "per_year") return { basis: "per_year", text: `${money} / year${per}` };
  return { basis: "billed_annually_unit_unstated", text: `${money}${per} · billed annually (price unit not stated)` };
}
