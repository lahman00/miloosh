import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import type {
  BriefBlock,
  BriefFact,
  PairDecisionBrief as PairDecisionBriefData,
} from "@/data/seo/pair-decision-briefs";

/**
 * Renders one source-backed pair decision brief (data/seo/pair-decision-briefs.ts).
 *
 * Server component, native elements only: headings, paragraphs, tables and
 * in-page citation anchors. Citations are numbered by their position in the
 * brief's source list; every source is linked once, at the end, to its
 * primary page. The brief renders no internal links and no structured data.
 */

function citationNumbers(brief: PairDecisionBriefData): Map<string, number> {
  return new Map(brief.sources.map((source, index) => [source.id, index + 1]));
}

function Cite({ ids, numbers }: { ids?: string[]; numbers: Map<string, number> }) {
  if (!ids || ids.length === 0) return null;
  return (
    <sup className="ml-1 whitespace-nowrap text-[0.7rem] font-medium">
      {ids.map((id, index) => {
        const number = numbers.get(id);
        return (
          <span key={id}>
            {index > 0 ? " " : null}
            <a
              href={`#pair-source-${number}`}
              aria-label={`Source ${number}`}
              className="text-zinc-300 underline underline-offset-2 hover:text-white"
            >
              [{number}]
            </a>
          </span>
        );
      })}
    </sup>
  );
}

function FactText({ fact, numbers }: { fact: BriefFact; numbers: Map<string, number> }) {
  return (
    <>
      {fact.text}
      <Cite ids={fact.cite} numbers={numbers} />
    </>
  );
}

function BlockHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
      {children}
    </h2>
  );
}

function Block({
  block,
  index,
  numbers,
}: {
  block: BriefBlock;
  index: number;
  numbers: Map<string, number>;
}) {
  const headingId = `pair-brief-${index + 1}`;

  if (block.kind === "prose") {
    return (
      <section className="mt-14" aria-labelledby={headingId}>
        <BlockHeading id={headingId}>{block.heading}</BlockHeading>
        <div className="mt-6 max-w-3xl space-y-4 text-base leading-7 text-zinc-300">
          {block.paragraphs.map((paragraph) => (
            <p key={paragraph.text}>
              <FactText fact={paragraph} numbers={numbers} />
            </p>
          ))}
        </div>
      </section>
    );
  }

  if (block.kind === "definitions") {
    return (
      <section className="mt-14" aria-labelledby={headingId}>
        <BlockHeading id={headingId}>{block.heading}</BlockHeading>
        {block.intro ? (
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">
            <FactText fact={block.intro} numbers={numbers} />
          </p>
        ) : null}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {block.items.map((item) => (
            <Card key={item.term}>
              <h3 className="text-lg font-semibold text-white">{item.term}</h3>
              <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-300">
                {item.facts.map((fact) => (
                  <p key={fact.text}>
                    <FactText fact={fact} numbers={numbers} />
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-14" aria-labelledby={headingId}>
      <BlockHeading id={headingId}>{block.heading}</BlockHeading>
      {block.intro ? (
        <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">
          <FactText fact={block.intro} numbers={numbers} />
        </p>
      ) : null}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-zinc-400">
            <tr>
              {block.columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {block.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="w-1/5 px-4 py-4 align-top font-medium text-white">
                  {row.label}
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.text} className="px-4 py-4 align-top leading-6 text-zinc-300">
                    <FactText fact={cell} numbers={numbers} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.footnote ? (
        <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
          <FactText fact={block.footnote} numbers={numbers} />
        </p>
      ) : null}
    </section>
  );
}

export function PairDecisionBrief({ brief }: { brief: PairDecisionBriefData }) {
  const numbers = citationNumbers(brief);
  const sourcesId = `pair-brief-${brief.blocks.length + 1}`;

  return (
    <div data-pair-brief={brief.slug}>
      {brief.blocks.map((block, index) => (
        <Block key={block.heading} block={block} index={index} numbers={numbers} />
      ))}

      <section className="mt-14" aria-labelledby={sourcesId}>
        <BlockHeading id={sourcesId}>{brief.sourcesHeading}</BlockHeading>
        {brief.sourcesIntro ? (
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">
            <FactText fact={brief.sourcesIntro} numbers={numbers} />
          </p>
        ) : null}
        <ol className="mt-6 space-y-3 text-sm leading-6 text-zinc-300">
          {brief.sources.map((source, index) => (
            <li key={source.id} id={`pair-source-${index + 1}`} className="scroll-mt-24">
              <span className="text-zinc-400">[{index + 1}]</span>{" "}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-zinc-200 underline underline-offset-4 hover:text-white"
              >
                {source.label}
              </a>{" "}
              <span className="text-zinc-400">
                (read {source.checkedOn}
                {source.note ? `; ${source.note}` : ""})
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
