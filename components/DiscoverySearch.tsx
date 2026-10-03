"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { resolveSoftwareSearchSlug } from "@/lib/software-search-route";

export function DiscoverySearch({ items }: { items: Array<{name: string; slug: string; category: string}> }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [error, setError] = useState("");
  const query = value.trim().toLowerCase();
  const matches = query ? items.filter(item => item.name.toLowerCase().includes(query) || item.slug.includes(query)).slice(0,5) : [];
  const visible = open && query.length > 0;
  function navigate(slug: string) { setOpen(false); router.push(`/software/${slug}`); }
  return (
    <div className="discovery-search" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <form role="search" onSubmit={e => {
        e.preventDefault();
        const exact = items.find(item => item.slug === resolveSoftwareSearchSlug(value) || item.name.toLowerCase() === query);
        const result = selected >= 0 ? matches[selected] : exact ?? matches[0];
        if (result) navigate(result.slug); else { setError("No match yet. Try another name, or browse the categories below."); setOpen(true); }
      }}>
        <Search size={20} strokeWidth={1.7} aria-hidden="true" />
        <input type="search" role="combobox" aria-label="Search software" aria-autocomplete="list" aria-expanded={visible} aria-controls={`${id}-results`} aria-activedescendant={selected >= 0 && visible ? `${id}-${selected}` : undefined} aria-describedby={error ? `${id}-error` : undefined} placeholder="Search software…" autoComplete="off" value={value} required onFocus={() => setOpen(true)} onChange={e => { setValue(e.target.value); setOpen(true); setSelected(-1); setError(""); }} onKeyDown={e => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setSelected(index => Math.min(index + 1, matches.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSelected(index => matches.length ? Math.max(index - 1, 0) : -1); }
          if (e.key === "Escape") { setOpen(false); setSelected(-1); }
        }} />
        <button type="submit" aria-label="Find software"><span>Find software</span><ArrowRight size={18} /></button>
      </form>
      <ul id={`${id}-results`} role="listbox" aria-label="Software suggestions" className="search-suggestions" hidden={!visible}>
        {matches.map((item,index) => <li key={item.slug} role="option" id={`${id}-${index}`} aria-selected={selected === index} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setSelected(index)} onClick={() => navigate(item.slug)}><span><strong>{item.name}</strong><small>{item.category}</small></span><ArrowUpRightIcon /></li>)}
        {!matches.length && <li role="presentation" className="search-empty">No software found. Try a different name.</li>}
      </ul>
      {error && <p className="search-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}

function ArrowUpRightIcon() { return <ArrowRight size={17} aria-hidden="true" />; }
