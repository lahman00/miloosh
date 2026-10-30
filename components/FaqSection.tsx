import { ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";

export function FaqSection({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <section className="mt-14">
      <SectionHeading title="Frequently asked questions" />

      <div className="mt-8 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {items.map((item) => (
          <details key={item.question} className="group p-6 sm:p-7">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white">
              {item.question}
              <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition group-open:rotate-180" />
            </summary>
            <p className="mt-4 leading-7 text-zinc-400">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
