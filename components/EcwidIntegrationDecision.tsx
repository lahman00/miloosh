// Buyer-intent support for observed Ecwid integration queries on the existing Ecwid page.
// Documentation-based only: no app ranking, affiliate link, or hands-on integration claim.
export function EcwidIntegrationDecision({ slug }: { slug: string }) {
  if (slug !== "ecwid") return null;

  return (
    <section id="ecwid-integration-decision" aria-labelledby="ecwid-integration-decision-title" className="mt-14 scroll-mt-24 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.03] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Before choosing an Ecwid integration</p>
      <h2 id="ecwid-integration-decision-title" className="mt-3 text-2xl font-bold text-white">Choose the system you need to connect before choosing the app</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-300">Ecwid&apos;s App Market covers jobs such as accounting, shipping, analytics, marketing and point of sale. A popular app is not automatically the best fit: first define which system owns the data and what must move between it and the store.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><h3 className="font-semibold text-white">Accounting and back office</h3><p className="mt-2 text-sm leading-7 text-zinc-300">List the records that must synchronize, such as orders, customers, taxes, inventory or receipts. Ecwid&apos;s QuickBooks guidance shows that plan eligibility and the exact sync path can vary by app.</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><h3 className="font-semibold text-white">Shipping and point of sale</h3><p className="mt-2 text-sm leading-7 text-zinc-300">Check whether the app only calculates or prints, or whether it also synchronizes products, inventory and orders. For POS, confirm the physical channel and online store stay aligned for the workflow you actually use.</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><h3 className="font-semibold text-white">Analytics and marketing</h3><p className="mt-2 text-sm leading-7 text-zinc-300">Verify the data the app receives, the reporting or automation you need, and the Ecwid plan required to access the app. Do not assume App Market availability means every app is included in every plan.</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><h3 className="font-semibold text-white">Billing and support</h3><p className="mt-2 text-sm leading-7 text-zinc-300">Price the app separately from the Ecwid plan. Ecwid documents both free and paid apps, including apps billed externally, and notes that many third-party developers manage their own app support and billing.</p></div>
      </div>      <p className="mt-5 text-sm leading-7 text-zinc-300">A useful shortlist therefore starts with one required data flow, one supported plan, one billing owner and one support owner. If those are still unknown, keep the integration as an unresolved operating cost instead of treating installation as proof of fit.</p>
      <p className="mt-4 text-xs leading-6 text-zinc-400">Documentation checked September 17, 2026. This is a selection checklist, not a ranking of Ecwid apps or a hands-on integration test.</p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <a href="https://support.ecwid.com/hc/en-us/articles/115005872689-Guide-to-using-Ecwid-App-Market" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">Ecwid App Market guide</a>
        <a href="https://support.ecwid.com/hc/en-us/articles/209153249-Connecting-Ecwid-with-QuickBooks" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">Ecwid QuickBooks integration</a>
        <a href="https://support.ecwid.com/hc/en-us/articles/360002520380-Analytics-and-reporting-apps-from-Ecwid-App-Market" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">Ecwid analytics apps</a>
        <a href="https://www.ecwid.com/apps/pos" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-4 hover:text-zinc-200">Ecwid POS apps</a>
      </p>
    </section>
  );
}
