"use client";

import { SoftwareMark } from "@/components/SoftwareMark";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, GitCompareArrows, Pause, Play } from "lucide-react";

export type ShortlistGroup = { label: string; category: string; tools: Array<{ slug: string; name: string; fit: string; alternatives: number }> };

function subscribeMotionPreference(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function canAnimate() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches && document.visibilityState === "visible";
}

export function ShortlistDemo({ groups }: { groups: ShortlistGroup[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const motionAllowed = useSyncExternalStore(subscribeMotionPreference, canAnimate, () => false);
  const group = groups[active];
  const firstTool = group.tools[0];

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="shortlist-stage" ref={stage} data-motion-running={motionAllowed && inView && !paused}>
      <div className="stage-top">
        <span>A little clarity. A better choice.</span>
        <button className="motion-toggle" type="button" aria-label={paused ? "Resume window animation" : "Pause window animation"} aria-pressed={paused} onClick={() => setPaused(value => !value)}>
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
      <div className="shortlist-tabs" aria-label="Explore software by need">
        {groups.map((item, index) => <button type="button" key={item.label} aria-pressed={active === index} onClick={() => setActive(index)}>{item.label}</button>)}
      </div>
      <div className="shortlist-window-scene">
        <div className="shortlist-sheet motion-window motion-main" aria-live="polite" aria-atomic="true">
          <div className="sheet-heading"><h2>Your next shortlist</h2><span>{group.tools.length} starting points</span></div>
          {group.tools.map((tool, index) => <Link className="shortlist-row" href={`/software/${tool.slug}`} key={tool.slug}>
            <SoftwareMark slug={tool.slug} name={tool.name} tone={index} />
            <span className="shortlist-detail"><strong>{tool.name}</strong><span>{tool.fit}</span></span>
            <ArrowUpRight size={18} strokeWidth={1.5} />
          </Link>)}
          <Link href={`/category/${group.category}`} className="sheet-link">Explore this category <ArrowUpRight size={16} /></Link>
        </div>
        {firstTool && <Link className="shortlist-alternatives motion-window motion-alternatives" href={`/software/${firstTool.slug}`}>
          <span className="alternatives-window-title"><GitCompareArrows size={16} /> Keep your options open</span>
          <span className="alternatives-window-content"><SoftwareMark slug={firstTool.slug} name={firstTool.name}/><span><strong>{firstTool.name}</strong><small>{firstTool.alternatives} alternatives to explore</small></span><ArrowUpRight size={17}/></span>
        </Link>}
      </div>
      <div className="stage-note"><span><Check size={15} /> Real tradeoffs</span><span><Check size={15} /> Linked sources</span><span><Check size={15} /> No signup</span></div>
      <span className="stage-orbit" aria-hidden="true" />
    </div>
  );
}
