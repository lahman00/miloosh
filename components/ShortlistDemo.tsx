"use client";

import { SoftwareMark } from "@/components/SoftwareMark";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, SlidersHorizontal } from "lucide-react";

export type ShortlistGroup = { label: string; category: string; tools: Array<{ slug: string; name: string; fit: string; alternatives: number }> };

export function ShortlistDemo({ groups }: { groups: ShortlistGroup[] }) {
  const [active, setActive] = useState(0);
  const group = groups[active];
  return (
    <div className="shortlist-stage">
      <div className="stage-top"><span>A little clarity. A better choice.</span><SlidersHorizontal size={18} strokeWidth={1.5} /></div>
      <div className="shortlist-tabs" aria-label="Explore software by need">
        {groups.map((item, index) => <button type="button" key={item.label} aria-pressed={active === index} onClick={() => setActive(index)}>{item.label}</button>)}
      </div>
      <div className="shortlist-sheet" aria-live="polite" aria-atomic="true">
        <div className="sheet-heading"><h2>Your next shortlist</h2><span>{group.tools.length} starting points</span></div>
        {group.tools.map((tool, index) => <Link className="shortlist-row" href={`/software/${tool.slug}`} key={tool.slug}>
          <SoftwareMark slug={tool.slug} name={tool.name} tone={index} />
          <span className="shortlist-detail"><strong>{tool.name}</strong><span>{tool.fit}</span></span>
          <ArrowUpRight size={18} strokeWidth={1.5} />
        </Link>)}
        <Link href={`/category/${group.category}`} className="sheet-link">Explore this category <ArrowUpRight size={16} /></Link>
      </div>
      <div className="stage-note"><span><Check size={15} /> Real tradeoffs</span><span><Check size={15} /> Linked sources</span><span><Check size={15} /> No signup</span></div>
      <span className="stage-orbit" aria-hidden="true" />
    </div>
  );
}
