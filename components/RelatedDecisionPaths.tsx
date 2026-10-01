import { DECISION_PATHS } from "@/data/seo/decision-paths";

/** Server-rendered editorial navigation; does not alter the guide's ranked shortlist. */
export function RelatedDecisionPaths({ page }: { page: string }) {
  const paths = DECISION_PATHS[page];
  if (!paths?.length) return null;
  return (
    <nav
      aria-label="Related product decisions"
      className="mb-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
    >
      <h2 className="text-xl font-semibold text-white">
        A different buying decision?
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Keep the shortlist above focused. Use these existing guides when the
        problem you need to solve changes.
      </p>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2">
        {paths.map((item) => (
          <li key={item.href} className="min-w-0">
            <p className="text-sm leading-6 text-zinc-400">{item.question}</p>
            <a
              href={item.href}
              className="mt-2 inline-flex min-h-11 items-center rounded-md py-2 text-sm font-semibold text-blue-400 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
