import { emptyCost, type CostInput, type RoomState } from "./state";
import type { RoomCurrency, RoomProduct } from "./types";

/**
 * Year-one cost model. It extends the data behind the existing SaaS cost calculator (`pricing.entryPaid`) and fixes what that
 * calculator cannot say: it never treats a price as usable unless the currency matches the buyer's, the billing basis is known and the
 * record is verified. Everything else is the buyer's own entry or Unknown. It is a planning estimate, never a vendor quote.
 *
 *   recurring per year = unit price per month x (seats if the price is per seat, else 1) x 12
 *   year one           = recurring per year + setup + training + migration + other one-time
 *
 * A blank field is Unknown and is listed in `missing`; it is never counted as zero.
 */
export type PriceBasis =
  | { kind: "verified"; amount: number; currency: string; perSeat: boolean; billing: "monthly" | "annual_term"; source: string | null; verifiedOn: string | null; note: string }
  | { kind: "user"; amount: number; currency: RoomCurrency; perSeat: boolean; note: string }
  | { kind: "unknown"; reason: string };

export type CostLine = { id: "recurring" | "setup" | "training" | "migration" | "other"; label: string; amount: number | null; formula: string };

export type CostResult = {
  slug: string;
  name: string;
  basis: PriceBasis;
  seats: number | null;
  lines: CostLine[];
  /** Sum of the lines that are known, or null when no line is known (never a false zero). Meaningful only together with `missing`. */
  knownTotal: number | null;
  complete: boolean;
  missing: string[];
  currency: RoomCurrency;
  assumptions: string[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function resolvePriceBasis(p: RoomProduct, input: CostInput, currency: RoomCurrency): PriceBasis {
  if (input.unitPrice !== null) {
    if (input.perSeat === null) return { kind: "unknown", reason: "Say whether your own price is per seat or a flat amount." };
    return { kind: "user", amount: input.unitPrice, currency, perSeat: input.perSeat, note: "Your own figure for the plan you would actually buy." };
  }
  const e = p.pricing.entryPaid;
  if (!e) return { kind: "unknown", reason: p.pricing.status === "contact_sales" ? "The vendor does not publish a price; ask for a quote or enter your own figure." : "No verified price is recorded for this product; enter your own figure." };
  if (p.pricing.status !== "verified") return { kind: "unknown", reason: "The recorded price is not verified; enter your own figure." };
  if (e.currency !== currency) return { kind: "unknown", reason: `The verified price is in ${e.currency}, not ${currency}. Miloosh does not convert currencies; enter your own figure.` };
  if (e.billingPeriod !== "monthly" && e.billingPeriod !== "annual") return { kind: "unknown", reason: "The billing basis of the recorded price is not clear; enter your own figure." };
  if (e.perSeat === null) return { kind: "unknown", reason: "The record does not say whether this price is per seat or per account, so Miloosh cannot multiply it; enter your own figure and say which it is." };
  return {
    kind: "verified", amount: e.amount, currency: e.currency, perSeat: e.perSeat,
    billing: e.billingPeriod === "annual" ? "annual_term" : "monthly",
    source: p.pricing.officialSource, verifiedOn: p.pricing.lastVerified,
    note: e.billingPeriod === "annual"
      ? "Lowest listed paid plan, per month on an annual term. Monthly billing may cost more and your required plan may cost more."
      : "Lowest listed paid plan, per month. Your required plan may cost more.",
  };
}

export function computeProductCost(p: RoomProduct, state: RoomState): CostResult {
  const input = state.costs[p.slug] ?? emptyCost();
  const currency = state.currency;
  const basis = resolvePriceBasis(p, input, currency);
  const seats = input.seats ?? state.team;
  const assumptions: string[] = [];
  const lines: CostLine[] = [];
  const missing: string[] = [];

  let recurring: number | null = null;
  let formula = "Unknown";
  if (basis.kind === "unknown") {
    missing.push(`Recurring price: ${basis.reason}`);
  } else if (basis.perSeat && seats === null) {
    missing.push("Recurring price: this price is per seat and you have not entered a team size.");
    formula = `${basis.amount} ${currency} x seats (unknown) x 12`;
  } else {
    const multiplier = basis.perSeat ? (seats as number) : 1;
    recurring = r2(basis.amount * multiplier * 12);
    formula = `${basis.amount} ${currency} per month${basis.perSeat ? ` x ${seats} seats` : ""} x 12 months`;
    assumptions.push(basis.kind === "verified" ? basis.note : basis.note);
    if (basis.kind === "verified" && basis.billing === "annual_term") assumptions.push("Assumes you accept an annual term.");
  }
  lines.push({ id: "recurring", label: "Recurring cost for 12 months", amount: recurring, formula });

  const one = (id: CostLine["id"], label: string, value: number | null) => {
    lines.push({ id, label, amount: value, formula: value === null ? "Not entered" : `${value} ${currency} (your entry)` });
    if (value === null) missing.push(`${label}: not entered`);
  };
  one("setup", "Setup", input.setup);
  one("training", "Training", input.training);
  one("migration", "Migration", input.migration);
  one("other", "Other one-time costs", input.other);

  const knownTotal = lines.some((l) => l.amount !== null) ? r2(lines.reduce((sum, l) => sum + (l.amount ?? 0), 0)) : null;
  assumptions.push("Excludes tax, usage-based charges, add-ons, discounts and any cost you did not enter.");
  return { slug: p.slug, name: p.name, basis, seats, lines, knownTotal, complete: missing.length === 0, missing, currency, assumptions };
}

export type KeepCurrent = { name: string; yearlyCost: number | null; formula: string };

/** "Stay with the current tool" is a real outcome: its yearly cost comes only from the buyer's own monthly figure. */
export function keepCurrentCost(state: RoomState): KeepCurrent {
  const m = state.currentTool.monthlyCost;
  return { name: state.currentTool.name || "Your current tool", yearlyCost: m === null ? null : r2(m * 12), formula: m === null ? "Unknown: enter what you pay today" : `${m} ${state.currency} per month x 12 months (your entry)` };
}

export function formatMoney(amount: number, currency: RoomCurrency): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount); } catch { return `${amount} ${currency}`; }
}
