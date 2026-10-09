"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

const links = [
  { label: "Browse software", href: "/#browse" },
  { label: "Compare", href: "/compare" },
  { label: "Guides", href: "/guides" },
  { label: "Our approach", href: "/editorial-policy" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="site-header" onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); document.getElementById("navigation-toggle")?.focus(); } }}>
      <div className="design-container nav-inner">
        <Link href="/" className="brand" aria-label="Miloosh home" onClick={() => setOpen(false)}>
          <Image src="/miloosh-wordmark.png" alt="Miloosh" width={148} height={30} priority />
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
        </nav>
        <div className="nav-actions">
          <Link href={pathname === "/" ? "/#my-shortlist" : "/recommend"} className="design-button nav-cta" onClick={() => setOpen(false)}>{pathname === "/" ? "My shortlist" : "Find software"} <ArrowUpRight size={16} /></Link>
          <button id="navigation-toggle" type="button" className="menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-nav" hidden={!open}>
        {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight size={18} /></Link>)}
      </nav>
    </header>
  );
}
