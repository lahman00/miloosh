import Link from "next/link";
import type { Alternative, Software } from "@/data/software";
import { getSoftware } from "@/data/software";

function pricingLabel(software: Software | undefined): string {
  const pricing = software?.pricing;
  if (!pricing) return "Not documented";
  if (pricing.status === "free_only") return "Free";
  if (pricing.status === "contact_sales") return "Contact sales";
  if (pricing.startingPrice) return pricing.startingPrice;
  if (pricing.entryPaid) {
    const suffix = pricing.entryPaid.perSeat ? "/seat" : "";
    return `${pricing.entryPaid.currency} ${pricing.entryPaid.amount}${suffix}`;
  }
  return "Not documented";
}

function freeOptionLabel(software: Software | undefined): string {
  const pricing = software?.pricing;
  if (!pricing) return "Unknown";
  if (pricing.status === "free_only" || pricing.freePlan === true || pricing.hasFreeTier === true) return "Yes";
  if (pricing.freeTrial?.available) return pricing.freeTrial.days ? `${pricing.freeTrial.days}-day trial` : "Trial";
  if (pricing.freePlan === false || pricing.hasFreeTier === false) return "No";
  return "Unknown";
}

export function AlternativeComparisonTable({ alternatives }: { alternatives: Alternative[] }) {
  if (alternatives.length < 2) return null;

  const rows = alternatives.map((alternative) => ({
    alternative,
    software: getSoftware(alternative.slug),
  }));

  return (
    <div className="mt-7 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="min-w-[760px] w-full border-collapse text-left text-sm">
        <caption className="sr-only">Alternatives compared by use case and pricing</caption>
        <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-5 py-4 font-semibold">Alternative</th>
            <th className="px-5 py-4 font-semibold">Best for</th>
            <th className="px-5 py-4 font-semibold">Starting price</th>
            <th className="px-5 py-4 font-semibold">Free option</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map(({ alternative, software }, index) => (
            <tr key={alternative.slug} className="align-top">
              <td className="px-5 py-4">
                <span className="mr-2 text-xs text-zinc-600">#{index + 1}</span>
                <Link href={`/software/${alternative.slug}`} className="font-semibold text-white underline-offset-4 hover:underline">
                  {alternative.name}
                </Link>
              </td>
              <td className="max-w-md px-5 py-4 leading-6 text-zinc-300">{alternative.bestFor}</td>
              <td className="whitespace-nowrap px-5 py-4 text-zinc-300">{pricingLabel(software)}</td>
              <td className="whitespace-nowrap px-5 py-4 text-zinc-400">{freeOptionLabel(software)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-white/10 px-5 py-3 text-xs leading-5 text-zinc-500">
        Pricing is shown only when it is documented in our source-backed product data. Confirm current pricing and plan limits on the vendor&apos;s site before purchasing.
      </p>
    </div>
  );
}
