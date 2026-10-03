"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";

export function SoftwareDirectory({ items }: { items: Array<{name: string; slug: string; category: string}> }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter(item => `${item.name} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="software-directory">
    <label className="directory-filter"><Search size={18}/><input type="search" placeholder="Filter the directory" aria-label="Filter the software directory" value={query} onChange={e => setQuery(e.target.value)} /><span>{filtered.length} tools</span></label>
    <div className="directory-grid">
      {(query ? filtered : filtered.slice(0,12)).map(item => <Link href={`/software/${item.slug}`} key={item.slug}><span>{item.name}<small>{item.category}</small></span><ArrowUpRight size={17} /></Link>)}
    </div>
    {!filtered.length && <p className="directory-empty" role="status">No match in this selection. Try the search at the top for the full catalogue.</p>}
    {!query && items.length > 12 && <details className="directory-details"><summary className="text-action directory-more"><span className="directory-expand-label">Show all {items.length} tools</span><span className="directory-collapse-label">Show fewer tools</span> <ArrowRightIcon /></summary><div className="directory-grid">{filtered.slice(12).map(item => <Link href={`/software/${item.slug}`} key={item.slug}><span>{item.name}<small>{item.category}</small></span><ArrowUpRight size={17}/></Link>)}</div></details>}
  </div>;
}
function ArrowRightIcon() { return <ArrowUpRight size={17} />; }
