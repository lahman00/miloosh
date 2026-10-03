import { SoftwareMark } from "@/components/SoftwareMark";
import Link from "next/link";
import { ArrowUpRight, GitCompare } from "lucide-react";
import type { Software } from "@/data/software";
import { getCategoryName } from "@/data/categories";

export function SoftwareCard({ software }: { software: Software }) {
  return <Link href={`/software/${software.slug}`} prefetch={false} className="catalogue-card">
    <div className="catalogue-card-heading"><SoftwareMark slug={software.slug} name={software.name} /><ArrowUpRight size={20}/></div>
    <h3>{software.name}</h3><p className="product-category">{getCategoryName(software.category)}</p><p className="catalogue-description">{software.description}</p>
    <span className="catalogue-card-bottom"><GitCompare size={16}/>{software.alternatives.length} alternatives</span>
  </Link>;
}
