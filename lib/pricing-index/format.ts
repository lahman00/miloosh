/** Display only: never implies an exchange-rate conversion or a billing basis. */
export function formatIndexMoney(value: number | null, currency = "USD"): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value)) * 2) * 100) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded);
}
