import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/Card";
import type { Category } from "@/data/categories";

export function CategoryCard({ category, count }: { category: Category; count: number }) {
  return (
    <Link href={`/category/${category.slug}`} prefetch={false} className="group block h-full">
      <Card className="flex h-full flex-col group-hover:border-white/25 group-hover:bg-white/[0.05]">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">{category.name}</h3>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-zinc-600 transition group-hover:text-white" />
        </div>
        <p className="mt-3 flex-1 text-sm leading-6 text-zinc-400">{category.description}</p>
        <p className="mt-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
          {count} {count === 1 ? "tool" : "tools"}
        </p>
      </Card>
    </Link>
  );
}
