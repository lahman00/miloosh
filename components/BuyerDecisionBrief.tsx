import { BUYER_DECISION_BRIEFS } from "@/data/guides/buyer-decision-briefs";

/** Server-rendered, source-linked editorial content; no tracking or outbound affiliate requests. */
export function BuyerDecisionBrief({ slug }: { slug: string }) {
  const brief = BUYER_DECISION_BRIEFS[slug];
  if (!brief) return null;
  return (
    <section id="buyer-decision-worksheet" aria-labelledby="buyer-decision-title" className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Decision worksheet · sources checked {brief.updatedAt}</p>
      <h2 id="buyer-decision-title" className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{brief.heading}</h2>
      <p className="mt-4 max-w-4xl text-base leading-7 text-zinc-300">{brief.introduction}</p>
      <div className="mt-8 space-y-8">
        {brief.sections.map((section) => (
          <div key={section.heading} className="max-w-4xl">
            <h3 className="text-lg font-semibold text-white">{section.heading}</h3>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-zinc-300">{paragraph}</p>)}
            {section.sourceIds?.length ? <p className="mt-2 text-xs leading-6 text-zinc-400">Sources: {section.sourceIds.map((id, index) => { const source = brief.sources.find((s) => s.id === id)!; return <span key={id}>{index ? " · " : ""}<a href={`#decision-source-${id}`} className="underline underline-offset-4">{source.title}</a></span>; })}</p> : null}
          </div>
        ))}
      </div>
      <div className="mt-8 overflow-x-auto rounded-xl border border-white/10" tabIndex={0} role="region" aria-label={brief.table.caption}>
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="p-4 text-left font-semibold text-zinc-200">{brief.table.caption}</caption>
          <thead className="bg-white/5 text-zinc-300"><tr>{brief.table.headers.map((header) => <th key={header} scope="col" className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead>
          <tbody>{brief.table.rows.map((row) => <tr key={row[0]} className="border-t border-white/10 text-zinc-300">{row.map((cell, i) => i === 0 ? <th key={i} scope="row" className="px-4 py-3 font-medium">{cell}</th> : <td key={i} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 max-w-4xl text-xs leading-6 text-zinc-400">{brief.table.note}</p>
      <h3 className="mt-8 text-lg font-semibold text-white">Before you choose: a buyer-run acceptance checklist</h3>
      <ul className="mt-3 max-w-4xl list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-300">{brief.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
      <h3 className="mt-8 text-base font-semibold text-white">First-party sources and verification scope</h3>
      <p className="mt-2 text-xs leading-6 text-zinc-400">The checks apply to this worksheet’s cited facts, not a fresh audit of every feature in every product profile. Vendor prices and limits can change. Arithmetic and selection criteria are Miloosh editorial analysis.</p>
      <ul className="mt-3 space-y-2 text-xs leading-6 text-zinc-300">{brief.sources.map((source) => <li id={`decision-source-${source.id}`} key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{source.title}</a></li>)}</ul>
    </section>
  );
}
