"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, ArrowRightLeft, Bookmark, Check, Columns2, Pause, Play, Search, ShieldCheck, X } from "lucide-react";
import { DiscoverySearch } from "@/components/DiscoverySearch";
import { SoftwareMark } from "@/components/SoftwareMark";
import { TrackedInternalCtaLink } from "@/components/TrackedInternalCtaLink";
import { BUYER_DESK_KEY, DESK_CATEGORIES, addDeskPair, categorySaved, cleanContext, deskCategory, deskMotionAllowed, emptyDesk, hasDeskResearch, makeDeskBrief, parseDesk, toggleDeskProduct, validateDeskPair } from "@/lib/buyer-desk";
import type { DeskCategory, DeskIntent, DeskProduct, DeskState } from "@/lib/buyer-desk";
import styles from "./BuyerDesk.module.css";

const situations = [
  { id: "new", title: "I need a new tool", detail: "Find a useful starting point", Icon: Search },
  { id: "switch", title: "My current tool isn't working", detail: "Explore what could work differently", Icon: ArrowRightLeft },
  { id: "compare", title: "I'm down to a few options", detail: "Put the important tradeoffs together", Icon: Columns2 },
] as const;

function subscribeMotion(notify: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", notify);
  document.addEventListener("visibilitychange", notify);
  return () => { preference.removeEventListener("change", notify); document.removeEventListener("visibilitychange", notify); };
}
function motionSnapshot() { return `${window.matchMedia("(prefers-reduced-motion: reduce)").matches}:${document.visibilityState}`; }

function ResearchLink({ href, name, children, className }: { href: string; name: string; children: ReactNode; className?: string }) {
  return <TrackedInternalCtaLink href={href} sourcePath="/" targetPath={href} ctaName={`buyer-desk-${name}`} className={className}>{children}</TrackedInternalCtaLink>;
}

export function BuyerDesk({ products, catalogue, comparisons }: { products: DeskProduct[]; catalogue: { name: string; slug: string; category: string }[]; comparisons: { a: string; b: string; href: string }[] }) {
  const [state, setState] = useState<DeskState>(emptyDesk);
  const [guided, setGuided] = useState(false);
  const [intent, setIntent] = useState<DeskIntent>("new");
  const [formCategory, setFormCategory] = useState<DeskCategory>("crm");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [differences, setDifferences] = useState(false);
  const [brief, setBrief] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [catalogueInView, setCatalogueInView] = useState(false);
  const [comparisonInView, setComparisonInView] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLElement>(null);
  const comparison = useRef<HTMLElement>(null);
  const guideHeading = useRef<HTMLHeadingElement>(null);
  const motion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => "true:hidden");
  const reduced = motion.startsWith("true:");
  const moving = deskMotionAllowed(paused, reduced, motion.endsWith(":visible"), inView);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try { setState(parseDesk(localStorage.getItem(BUYER_DESK_KEY))); }
      catch { setStorageWarning(true); }
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!stage.current || !cards.current || !comparison.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === stage.current) setInView(entry.isIntersecting);
        if (entry.target === cards.current) setCatalogueInView(entry.isIntersecting);
        if (entry.target === comparison.current) setComparisonInView(entry.isIntersecting);
      }
    }, { threshold: 0.1 });
    observer.observe(stage.current); observer.observe(cards.current); observer.observe(comparison.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (guided) guideHeading.current?.focus(); }, [guided, intent]);

  function save(next: DeskState) {
    setState(next);
    try { localStorage.setItem(BUYER_DESK_KEY, JSON.stringify(next)); }
    catch { setStorageWarning(true); }
  }
  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
  }
  function selectCategory(category: DeskCategory) { save({ ...state, category }); setBrief(false); }
  function openGuide(next: DeskIntent) { setIntent(next); setFormCategory(state.category); setError(""); setGuided(true); }
  function toggle(product: DeskProduct) {
    const saved = toggleDeskProduct(state.saved, product.slug);
    save({ ...state, saved });
    setMessage(`${product.name} ${saved.includes(product.slug) ? "added to" : "removed from"} your shortlist.`);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const category = deskCategory(data.get("category"));
    const first = String(data.get("first") ?? ""), second = String(data.get("second") ?? "");
    if (intent === "compare") { const reason = validateDeskPair(first, second); if (reason) { setError(reason); return; } }
    const context = cleanContext({ intent, team: String(data.get("team") ?? ""), current: String(data.get("current") ?? ""), concern: String(data.get("concern") ?? ""), note: String(data.get("note") ?? "") });
    save({ ...state, category, saved: intent === "compare" ? addDeskPair(state.saved, first, second) : state.saved, contexts: { ...state.contexts, [category]: context } });
    setError(""); setBrief(false);
    // Let React commit the selected category before moving focus to its results.
    setTimeout(() => { const heading = document.getElementById(intent === "compare" ? "desk-compare-title" : "desk-results-title"); heading?.focus({ preventScroll: true }); jump(intent === "compare" ? "my-shortlist" : "desk-discover"); }, 0);
  }
  const saved = categorySaved(state.saved, state.category);
  const picks = saved.flatMap(slug => products.filter(p => p.slug === slug));
  const categoryProducts = products.filter(p => p.category === state.category);
  const formProducts = products.filter(p => p.category === formCategory);
  const context = state.contexts[state.category];
  const rows: { label: string; values: string[] }[] = [
    { label: "Documented fit", values: picks.map(p => p.bestFor) },
    { label: "Key capabilities", values: picks.map(p => p.features.join(" · ")) },
    { label: "A limitation to weigh", values: picks.map(p => p.limitation) },
    { label: "Source check recorded", values: picks.map(p => p.checkedAt) },
    { label: "Before committing", values: picks.map(() => "Confirm current plan, total cost, usage limits and migration requirements.") },
  ];
  const briefText = makeDeskBrief(state, products);
  async function copyBrief() {
    try { await navigator.clipboard.writeText(briefText); setMessage("Decision brief copied."); }
    catch { setMessage("Clipboard unavailable. Select the brief text or download it instead."); }
  }
  function downloadBrief() {
    const url = URL.createObjectURL(new Blob([briefText], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `miloosh-${state.category}-decision-brief.txt`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className={styles.desk}>
    <section className={`design-container ${styles.hero}`} id="search">
      <div className="hero-copy">
        <h1>Good software.<br />A <span>better fit.</span></h1>
        <p className="hero-description">Find the tools that work for you. Understand the tradeoffs. Keep the options worth your time.</p>
        <DiscoverySearch items={catalogue} />
        <div className={styles.quick}><span>Start with</span>{DESK_CATEGORIES.map(c => <button key={c.id} onClick={() => { selectCategory(c.id); jump("desk-discover"); }}>{c.name}</button>)}</div>
        <p className="hero-assurance"><ShieldCheck size={17} /> Independent research. Sources you can check.</p>
      </div>
      <div ref={stage} className={styles.stage} data-motion-running={moving}>
        <aside className={styles.journey} aria-labelledby="desk-journey-title">
          <h2 id="desk-journey-title">Where are you{" "}<br />in the decision?</h2>
          {situations.map(({ id, title, detail, Icon }) => <button key={id} onClick={() => openGuide(id)}><Icon size={20}/><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={18}/></button>)}
          <p>You choose the direction. We make it easier to explore.</p>
        </aside>
        <div className={styles.stageBottom}>
          <button className={styles.motionToggle} onClick={() => setPaused(v => !v)} aria-label={reduced ? "Animation disabled by reduced-motion preference" : paused ? "Resume window animation" : "Pause window animation"} aria-pressed={paused} disabled={reduced}>{paused || reduced ? <Play size={17}/> : <Pause size={17}/>}</button>
          <button className={styles.preview} onClick={() => jump("my-shortlist")}><span><Bookmark size={18}/><strong>{state.saved.length ? `${state.saved.length} tool${state.saved.length === 1 ? "" : "s"} saved for later` : "Your shortlist starts here"}</strong></span><small>{picks.length ? picks.map(p => p.name).join(" · ") : "Save a few tools. See what matters."}</small><span className={styles.previewAction}>Open my shortlist <ArrowRight size={17}/></span></button>
        </div>
      </div>
    </section>

    <section className={`design-container ${styles.guide}`} hidden={!guided} aria-labelledby="desk-intent-title">
      <div className={styles.heading}><div><h2 id="desk-intent-title" tabIndex={-1} ref={guideHeading}>Find your starting point.</h2><p>Keep your priorities beside the research. No automatic winner.</p></div><button className={styles.iconButton} aria-label="Close guided choice" onClick={() => { setGuided(false); document.getElementById("desk-journey-title")?.parentElement?.querySelector("button")?.focus(); }}><X size={20}/></button></div>
      <div className={styles.tabs} role="group" aria-label="Your buying situation">{situations.map(s => <button key={s.id} aria-pressed={intent === s.id} onClick={() => { setIntent(s.id); setError(""); }}>{s.id === "new" ? "New tool" : s.id === "switch" ? "Replace a tool" : "Compare options"}</button>)}</div>
      <form key={`${intent}-${formCategory}`} onSubmit={submit}>
        <div className={styles.formGrid}>
          <label>What are you working on?<select name="category" value={formCategory} onChange={e => setFormCategory(deskCategory(e.target.value))}>{DESK_CATEGORIES.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
          {intent === "new" && <label>People who will use it<select name="team" defaultValue=""><option value="">Not sure yet</option>{["Just me", "2–5 people", "6–15 people", "16+ people"].map(v => <option key={v}>{v}</option>)}</select></label>}
          {intent === "switch" && <label>Which tool are you replacing?<input name="current" maxLength={180} placeholder="Your current tool" required/></label>}
          {intent === "compare" && <><label>First option<select name="first" defaultValue={formProducts[0]?.slug}>{formProducts.map(p => <option value={p.slug} key={p.slug}>{p.name}</option>)}</select></label><label>Second option<select name="second" defaultValue={formProducts[1]?.slug}>{formProducts.map(p => <option value={p.slug} key={p.slug}>{p.name}</option>)}</select></label></>}
          <label>Main concern<select name="concern" defaultValue=""><option value="">Not sure yet</option>{["Total cost", "Moving my existing work", "Team adoption", "A missing workflow or integration"].map(v => <option key={v}>{v}</option>)}</select></label>
        </div>
        <div className={styles.formBottom}><label>One thing your next tool must do (optional)<input name="note" maxLength={180} placeholder="e.g. Track client handoffs"/></label><button className={styles.primary} type="submit">{intent === "compare" ? "Compare my options" : "Explore my options"}<ArrowRight size={18}/></button></div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <p className={styles.note}>Answers stay in this browser; they organize your brief, not a fit score. For a broader needs-based shortlist, <ResearchLink href="/recommend" name="matcher">use the software matcher</ResearchLink>.</p>
      </form>
    </section>

    <section className={`design-container ${styles.catalogue}`} ref={cards} id="desk-discover" aria-labelledby="desk-results-title">
      <div className={styles.heading}><div><h2 id="desk-results-title" tabIndex={-1}>Start with the work you want to do.</h2><p>A few useful starting points. The tradeoffs to understand before you choose.</p></div><ResearchLink href="/#browse" name="full-directory" className={styles.textButton}>Explore all software <ArrowRight size={17}/></ResearchLink></div>
      <div className={styles.tabs} role="group" aria-label="Starting-point categories">{DESK_CATEGORIES.map(c => <button key={c.id} aria-pressed={state.category === c.id} onClick={() => selectCategory(c.id)}>{c.name}</button>)}</div>
      <div className={styles.context}><span>3 starting points · not a ranking</span><span>{context?.concern ? `Your priority: ${context.concern}` : "Save the tools you want to investigate."}</span></div>
      <div className={styles.products}>{categoryProducts.map(p => <article key={p.slug} className={styles.product}>
        <div className={styles.productTop}><SoftwareMark name={p.name} slug={p.slug}/><button className={styles.saveButton} aria-label={`${saved.includes(p.slug) ? "Remove" : "Save"} ${p.name}`} aria-pressed={saved.includes(p.slug)} onClick={() => toggle(p)}>{saved.includes(p.slug) ? <Check size={16}/> : <Bookmark size={16}/>} {saved.includes(p.slug) ? "Saved" : "Save"}</button></div>
        <h3>{p.name}</h3><p>{p.description}</p>
        <details className={styles.research}><summary>Fit & tradeoffs</summary><h4>Documented fit</h4><p>{p.bestFor}</p><h4>A limitation to weigh</h4><p>{p.limitation}</p><p className={styles.note}>Source check recorded {p.checkedAt}. Confirm current terms.</p></details>
        <div className={styles.productBottom}><ResearchLink href={`/software/${p.slug}`} name="product-research" className={styles.textButton}>Read the research <ArrowRight size={17}/></ResearchLink><span className={styles.note}>Sources in profile</span></div>
      </article>)}</div>
      <p className={styles.note}>These starting points use Miloosh’s existing research, not personalized recommendations. Check the full profiles for pricing, alternatives and linked sources. Saving a tool does not endorse it.</p>
    </section>

    <section ref={comparison} className={styles.comparison} id="my-shortlist" aria-labelledby="desk-compare-title"><div className="design-container">
      <div className={styles.heading}><div><h2 id="desk-compare-title" tabIndex={-1}>Your shortlist. In perspective.</h2><p>Keep the differences visible and the unanswered questions close.</p></div><span className={styles.note}>Saved on this browser. No account needed.</span></div>
      <div className={styles.listNav} role="group" aria-label="Saved lists">{DESK_CATEGORIES.map(c => <button key={c.id} aria-pressed={state.category === c.id} onClick={() => selectCategory(c.id)}>{c.name}<span>{categorySaved(state.saved, c.id).length}</span></button>)}</div>
      {picks.length < 2 ? <div className={styles.empty}><div><Columns2 size={30}/><h3>{picks.length ? "One saved. Add another perspective." : "Save two tools to see them side by side."}</h3><p>{picks.length ? `${picks[0].name} is waiting in your list.` : "Your research stays here while you explore."}</p></div><button className={styles.primary} onClick={() => jump("desk-discover")}>Explore the starting points <ArrowRight size={18}/></button></div> : <>
        <div className={styles.controls}><label><input type="checkbox" checked={differences} onChange={e => setDifferences(e.target.checked)}/> Show differences only</label><button className={styles.textButton} onClick={() => { save({ ...state, saved: state.saved.filter(slug => !saved.includes(slug)) }); setBrief(false); }}>Clear this list</button></div>
        <p className={styles.scrollHint}>Scroll the table horizontally to see every option.</p>
        <div className={styles.tableScroll} role="region" aria-label="Your saved software comparison, horizontally scrollable" tabIndex={0}><table><caption className="sr-only">{DESK_CATEGORIES.find(c => c.id === state.category)?.name} research shortlist</caption><thead><tr><th scope="col">What matters</th>{picks.map(p => <th scope="col" key={p.slug}><span>{p.name}</span><button className={styles.textButton} onClick={() => toggle(p)} aria-label={`Remove ${p.name} from shortlist`}>Remove <X size={14}/></button></th>)}</tr></thead><tbody>
          {rows.filter(row => !differences || new Set(row.values).size > 1).map(row => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value, index) => <td key={picks[index].slug}>{value}</td>)}</tr>)}
          <tr><th scope="row">Pricing & full research</th>{picks.map(p => <td key={p.slug}><ResearchLink href={`/software/${p.slug}`} name="shortlist-research" className={styles.textButton}>Explore {p.name}<ArrowRight size={16}/></ResearchLink></td>)}</tr>
        </tbody></table></div>
        <div className={styles.actions}>{comparisons.filter(pair => saved.includes(pair.a) && saved.includes(pair.b)).map(pair => <ResearchLink key={pair.href} href={pair.href} name="full-comparison" className={styles.textButton}>{products.find(p => p.slug === pair.a)?.name} vs {products.find(p => p.slug === pair.b)?.name}<ArrowRight size={16}/></ResearchLink>)}</div>
        <div className={styles.briefCallout}><div><h3>Turn your research into a conversation.</h3><p>Your options, priorities and questions — one decision brief.</p></div><button className={styles.primary} onClick={() => setBrief(true)}>Create my decision brief <ArrowRight size={18}/></button></div>
      </>}
      {brief && picks.length >= 2 && <section className={styles.brief} aria-labelledby="desk-brief-title"><div className={styles.heading}><div><h3 id="desk-brief-title">Your decision brief</h3><p>Take it to your team or into your next product demo.</p></div><button className={styles.textButton} onClick={() => setBrief(false)}>Close brief</button></div><pre>{briefText}</pre><div className={styles.actions}><button className={styles.primary} onClick={copyBrief}>Copy brief</button><button className={styles.secondary} onClick={downloadBrief}>Download .txt</button></div><p className={styles.note}>The brief is generated locally. Your written priorities are not sent to Miloosh or a vendor.</p></section>}
      {storageWarning && <p className={styles.error} role="status">Browser storage is unavailable. Your selections work on this page but may not survive a reload. Download your brief to keep it.</p>}
      <p className={styles.note} role="status" aria-live="polite">{message}</p>
      {hasDeskResearch(state) && <button className={styles.textButton} onClick={() => { save(emptyDesk()); setBrief(false); setMessage("Saved research and priorities cleared from this browser."); }}>Clear saved research & priorities</button>}
    </div></section>

    <section className={`design-container ${styles.checklist}`} aria-labelledby="desk-checklist-title"><div><h2 id="desk-checklist-title">Choose with your<br />eyes open.</h2><p>The right question can tell you more than another feature list.</p><button className={styles.textButton} onClick={() => openGuide("new")}>Add your priorities <ArrowRight size={17}/></button></div><div>
      <details open><summary>What will this really cost us?</summary><p>Compare the total for your team, not the starting price. Check the required plan, paid seats, billing period, usage and add-ons. Confirm renewal and cancellation terms.</p><ResearchLink href="/tools/saas-cost-calculator" name="cost-calculator" className={styles.textButton}>Work through the cost <ArrowRight size={17}/></ResearchLink></details>
      <details><summary>What happens to our existing work?</summary><p>List the records, history, files and automations you need to keep. Import and export features do not automatically mean a complete migration. Test a representative sample and keep a rollback plan.</p></details>
      <details><summary>Will the team actually use it?</summary><p>Run a real workflow with the people who will own it. Try a handoff, test permissions and identify who maintains the setup. Staying with or repairing your current tool is a valid choice.</p></details>
    </div></section>
    {saved.length > 0 && catalogueInView && !inView && !comparisonInView && <aside className={styles.shelf} aria-label="Your active saved shortlist"><span><Bookmark size={18}/><strong>{saved.length} saved</strong><small>{DESK_CATEGORIES.find(c => c.id === state.category)?.name}</small></span><button className={styles.limeButton} onClick={() => jump("my-shortlist")}>Compare choices <ArrowRight size={17}/></button></aside>}
  </div>;
}
