import Link from "next/link";
import { ArrowUpRight, GitCompare } from "lucide-react";
import { Card } from "@/components/Card";
import type { Software } from "@/data/software";
import { getCategoryName } from "@/data/categories";

export function SoftwareCard({ software }: { software: Software }) {
  return (
    <Link href={`/software/${software.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col group-hover:border-white/25 group-hover:bg-white/[0.05]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              {getCategoryName(software.category)}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">{software.name}</h3>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-zinc-600 transition group-hover:text-white" />
        </div>
        <p className="mt-4 flex-1 leading-6 text-zinc-400">{software.description}</p>
        <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-300">
          <GitCompare className="h-4 w-4" />
          {software.alternatives.length} alternatives
        </div>
      </Card>
    </Link>
  );
}
