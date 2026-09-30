import { BUYER_MIGRATION_CHECKLISTS } from "@/data/guides/buyer-migration-checklists";
import { formatIsoDate } from "@/lib/date";

/** Server-rendered evidence, no extra client bundle, payment action or new CTA. */
export function BuyerMigrationChecklist({ slug }: { slug: string }) {
  const checklist = BUYER_MIGRATION_CHECKLISTS[slug];
  if (!checklist) return null;
  const sources = new Map(checklist.sources.map(source => [source.id, source]));
  return (
    <section id="migration-checks" aria-labelledby="migration-checks-heading" className="mt-5 scroll-mt-24 border-t border-white/10 pt-5">
      <h3 id="migration-checks-heading" className="text-lg font-semibold text-white">{checklist.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{checklist.scope}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-400">
        Documentation checked {formatIsoDate(checklist.checkedAt)}. These are proposed buyer checks, not a claim that Miloosh ran a migration.
      </p>
      <ol className="mt-4 space-y-5">
        {checklist.checks.map((check, index) => (
          <li key={check.title} className="rounded-lg border border-white/10 p-4">
            <h4 className="font-medium text-white">{index + 1}. {check.title}</h4>
            <p className="mt-2 text-sm leading-6 text-zinc-300"><strong className="font-medium text-zinc-200">Documented boundary:</strong> {check.documentedBoundary}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300"><strong className="font-medium text-zinc-200">Before you commit:</strong> {check.buyerAction}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              {check.sourceIds.map((id, sourceIndex) => {
                const source = sources.get(id);
                if (!source) throw new Error(`Missing buyer-check source: ${slug}/${id}`);
                return <span key={id}>{sourceIndex > 0 ? " · " : "Source: "}<a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{source.label}</a></span>;
              })}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
