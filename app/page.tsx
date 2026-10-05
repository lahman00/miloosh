import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, CircleCheck, BookOpen, GitCompare, Layers, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { SoftwareMark } from "@/components/SoftwareMark";
import { BuyerDesk } from "@/components/BuyerDesk";
import { TrackedInternalCtaLink } from "@/components/TrackedInternalCtaLink";
import { getBuyerDeskComparisons, getBuyerDeskProducts } from "@/lib/buyer-desk-catalog";
import { SoftwareDirectory } from "@/components/SoftwareDirectory";
import { getAllSoftware, getSoftware } from "@/data/software";
import { getAllCategories, getCategoryName } from "@/data/categories";
import { getRoleGuide } from "@/data/guides/registry";
import { FIRST_REVENUE_SUPPORTING_GUIDES } from "@/data/guides/first-revenue";
import { FIRST_REVENUE_PAGES } from "@/data/revenue/first-revenue-cohort";
import { getSoftwareByCategory } from "@/lib/related";
import { getComparisonSlug } from "@/data/comparisons";
import { parseComparisonSlug } from "@/lib/comparison";
import { buildIndexationPriorityList } from "@/scripts/growth/indexation-priority";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

function HomeCta({ href, name, children, className }: { href: string; name: string; children: ReactNode; className?: string }) {
  return (
    <TrackedInternalCtaLink href={href} sourcePath="/" targetPath={href} ctaName={"home-" + name} className={className}>
      {children}
    </TrackedInternalCtaLink>
  );
}

export default function Home() {
  const allSoftware = getAllSoftware();
  const allCategories = getAllCategories();

  const categoryCount = new Set(allSoftware.map((software) => software.category)).size;

  // Evidence-based selection (GOOGLE INDEXATION QUALITY WAR mission, Phase 8
  // "indexation concentration strategy"; corrected for production
  // determinism in the OVERNIGHT WAR MISSION, 2026-08-22/23, P0):
  // buildIndexationPriorityList ranks by real GSC evidence where it
  // exists, falling back to comparison-graph connectivity + freshness
  // where it doesn't. That evidence now comes from data/seo/priority-
  // snapshot.json -- a small, reviewed, GIT-COMMITTED file (see
  // scripts/growth/generate-priority-snapshot.ts), not a local/gitignored
  // cache. This section used to read var/agents/gsc-opportunity-
  // mining.json directly, which meant public rendering could silently
  // depend on whichever machine happened to run `vercel deploy` (that
  // file is gitignored, so a clean checkout never has it) -- confirmed
  // empirically during that mission. Same evidence, every build,
  // everywhere, now. Labels below are deliberately NOT "Popular" / "the
  // tools people compare most": real click-through data is still near-
  // zero site-wide, so a genuine popularity claim isn't yet supportable --
  // this is an evidence-ranked shortlist, not a usage ranking.
  const priorityList = buildIndexationPriorityList(400);

  const rankedSoftwareSlugs = priorityList
    .filter((row) => row.kind === "software")
    .map((row) => row.url.replace("/software/", ""));
  const popularSoftware = rankedSoftwareSlugs
    .slice(0, 6)
    .map((slug) => getSoftware(slug))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  const rankedSlugSet = new Set(rankedSoftwareSlugs);
  const browseSoftware = [
    ...rankedSoftwareSlugs.map((slug) => getSoftware(slug)).filter((s): s is NonNullable<typeof s> => s !== undefined),
    ...allSoftware.filter((software) => !rankedSlugSet.has(software.slug)),
  ].slice(0, 72);

  const comparisonPriorityRows = priorityList.filter((row) => row.kind === "comparison");
  const quickWinComparisonRows = comparisonPriorityRows
    .filter(
      (row) =>
        row.evidenceType === "CACHED" &&
        (row.gscImpressions ?? 0) >= 5 &&
        (row.gscPosition ?? Number.POSITIVE_INFINITY) >= 4 &&
        (row.gscPosition ?? Number.POSITIVE_INFINITY) <= 40
    )
    .sort((a, b) => {
      const opportunity = (row: typeof a) =>
        (row.gscImpressions ?? 0) * Math.max(0, 40 - (row.gscPosition ?? 40));
      return opportunity(b) - opportunity(a);
    });

  // Blend durable demand with near-page-one opportunities. The first three
  // preserve the highest-demand comparison signals; the remaining slots
  // strengthen pages Google is already testing in roughly positions 4-40.
  // Dedupe by URL because Adobe Analytics vs Segment currently qualifies
  // for both cohorts.
  const featuredComparisonRows = [
    ...comparisonPriorityRows.slice(0, 3),
    ...quickWinComparisonRows,
  ]
    .filter((row, index, rows) => rows.findIndex((candidate) => candidate.url === row.url) === index)
    .slice(0, 6);

  const popularComparisons = featuredComparisonRows
    .map((row) => {
      const parsed = parseComparisonSlug(row.url.replace("/compare/", ""));
      if (!parsed) return null;
      const softwareA = getSoftware(parsed.slugA);
      const softwareB = getSoftware(parsed.slugB);
      return softwareA && softwareB ? { softwareA, softwareB } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const firstRevenueSoftware = FIRST_REVENUE_PAGES
    .map((target) => getSoftware(target.slug))
    .filter((software): software is NonNullable<typeof software> => software !== undefined);

  const homepageGuides = FIRST_REVENUE_SUPPORTING_GUIDES
    .map((support) => getRoleGuide(support.guideSlug))
    .filter((guide): guide is NonNullable<typeof guide> => guide !== undefined);

  const briefCopy: Record<string,string> = {
    airtable: "Turn spreadsheets into workflows your whole team can use.",
    todoist: "Bring tasks, plans, and everyday work into focus.",
    close: "Keep calling, email, and your sales pipeline together.",
    setmore: "Give clients a simpler way to book time with you.",
    elevenlabs: "Explore lifelike AI voices and audio creation.",
  };
  const catalogue = allSoftware.map(tool => ({name:tool.name, slug:tool.slug, category:getCategoryName(tool.category)}));
  const categoryOrder = ["productivity","ai","crm","marketing","project-management","automation"];
  const leadCategories = categoryOrder.flatMap(slug => allCategories.filter(category => category.slug === slug));
  const otherCategories = allCategories.filter(category => !categoryOrder.includes(category.slug));

  return (
    <main className="home-design">
      <BuyerDesk products={getBuyerDeskProducts()} catalogue={catalogue} comparisons={getBuyerDeskComparisons()} />
      <section aria-label="Explore more of Miloosh">
        <div className="design-container evidence-strip">
          <p>Clarity for your next software decision.</p>
          <span><strong>{allSoftware.length}</strong> tools to explore</span><span><strong>{categoryCount}</strong> categories</span><span><Check size={16} /> Free to use. No signup.</span>
        </div>
        <div className="design-container hero-explore"><span>More research</span>{popularSoftware.slice(0,4).map(tool => <HomeCta href={`/software/${tool.slug}`} name={`research-strip-${tool.slug}`} key={tool.slug}>{tool.name}</HomeCta>)}{["notion", "hubspot", "synthesia", "jasper"].map(slug => <HomeCta href={`/software/${slug}`} name={`research-strip-${slug}`} key={slug}>{getSoftware(slug)?.name}</HomeCta>)}</div>
      </section>

      <section className="design-section" id="buyer-picks">
        <div className="design-container">
          <div className="section-intro"><h2>A good place<br />to start.</h2><div><p>Useful tools. Clear tradeoffs. Get to know the software before you make it part of your day.</p><HomeCta href="#browse" name="explore-directory" className="text-action">Explore the directory <ArrowUpRight size={17}/></HomeCta></div></div>
          <div className="buyer-editorial">
            {firstRevenueSoftware.slice(0,1).map(tool => <HomeCta className="featured-software" href={`/software/${tool.slug}`} name={`buyer-pick-${tool.slug}`} key={tool.slug}>
              <div className="featured-software-top"><SoftwareMark slug={tool.slug} name={tool.name} tone={0}/><ArrowUpRight size={24} strokeWidth={1.5}/></div>
              <h3>{tool.name}</h3><span className="product-category">{getCategoryName(tool.category)}</span>
              <p>{briefCopy[tool.slug] ?? tool.description}</p>
              <span className="featured-software-action">Explore {tool.name}<span>{tool.alternatives.length} alternatives</span></span>
            </HomeCta>)}
            <div className="buyer-tool-list">
              {firstRevenueSoftware.slice(1).map((tool,index) => <HomeCta className="buyer-tool-row" href={`/software/${tool.slug}`} name={`buyer-pick-${tool.slug}`} key={tool.slug}>
                <SoftwareMark slug={tool.slug} name={tool.name} tone={(index+1) % 5}/>
                <div className="buyer-tool-copy"><h3>{tool.name}</h3><p>{briefCopy[tool.slug] ?? tool.description}</p><span className="buyer-tool-meta">{getCategoryName(tool.category)}<span>{tool.alternatives.length} alternatives</span></span></div>
                <ArrowUpRight size={20} strokeWidth={1.5}/>
              </HomeCta>)}
            </div>
          </div>
          <div className="matcher-strip">
            <div><h3>Your needs. Your shortlist.</h3><p>A few questions about your team and budget. Recommendations with a reason.</p></div>
            <div className="matcher-strip-action"><HomeCta href="/recommend" name="matcher" className="design-button">Find my software <ArrowRight size={17}/></HomeCta><small>Free. No account needed.</small></div>
          </div>
        </div>
      </section>

      <section className="comparison-section design-section" id="compare">
        <div className="design-container"><div className="section-intro"><h2>The difference<br />is in the details.</h2><div><p>Two tools can look alike and work very differently. See where each one fits.</p><HomeCta href="/compare" name="all-comparisons" className="text-action">All comparisons <ArrowUpRight size={17}/></HomeCta></div></div>
          <div className="comparison-list">{popularComparisons.map(({softwareA,softwareB}) => <HomeCta key={`${softwareA.slug}-${softwareB.slug}`} href={`/compare/${getComparisonSlug(softwareA.slug,softwareB.slug)}`} name={`comparison-${softwareA.slug}-vs-${softwareB.slug}`}><span className="comparison-names"><strong>{softwareA.name}</strong><span className="versus">vs</span><strong>{softwareB.name}</strong></span><span className="comparison-action">Compare tools <ArrowUpRight size={19}/></span></HomeCta>)}</div>
        </div>
      </section>

      <section className="design-section" id="categories"><div className="design-container">
        <div className="section-intro"><h2>What are you<br />working on?</h2><p>Start with the job you need to do.<br />Find a tool that makes it easier.</p></div>
        <div className="category-list">{leadCategories.map((category,index) => <Link href={`/category/${category.slug}`} key={category.slug}><span className="category-symbol" aria-hidden="true">{index === 0 ? <Layers/> : index === 1 ? <CircleCheck/> : index === 2 ? <GitCompare/> : index === 3 ? <BookOpen/> : index === 4 ? <Check/> : <SlidersHorizontal/>}</span><span><strong>{category.name}</strong><small>{getSoftwareByCategory(category.slug).length} tools to explore</small></span><ArrowUpRight size={20}/></Link>)}</div>
        <details className="more-categories"><summary>Explore all {allCategories.length} categories <span>+</span></summary><div className="category-extra">{otherCategories.map(category => <Link href={`/category/${category.slug}`} key={category.slug}>{category.name}<ArrowUpRight size={15}/></Link>)}</div></details>
      </div></section>

      <section className="trust-section" id="how-it-works"><div className="design-container trust-grid">
        <div><ShieldCheck size={36} strokeWidth={1.4}/><h2>Less second-guessing.<br />More knowing.</h2><p>Good decisions need more than a feature list. We bring the options, limitations, and sources into one place so you can decide what matters.</p><Link href="/editorial-policy" className="text-action">How we research software <ArrowUpRight size={17}/></Link></div>
        <ol className="trust-steps"><li><span>1</span><div><h3>Start with your needs</h3><p>Search a tool you know, explore a category, or use the software matcher.</p></div></li><li><span>2</span><div><h3>Look at the whole picture</h3><p>Compare strengths, limitations, pricing context, and alternatives.</p></div></li><li><span>3</span><div><h3>Take the next step, informed</h3><p>Check the sources and current vendor terms before you commit.</p></div></li></ol>
      </div></section>

      <section className="design-section" id="guides"><div className="design-container"><div className="section-intro"><h2>A little research.<br />A better decision.</h2><HomeCta href="/guides" name="all-guides" className="text-action">All decision guides <ArrowUpRight size={17}/></HomeCta></div>
        <div className="guide-layout">{homepageGuides.slice(0,1).map(guide => <HomeCta href={`/${guide.slug}`} name={`guide-${guide.slug}`} key={guide.slug} className="featured-guide"><div className="guide-graphic" aria-hidden="true"><span className="guide-paper"><Layers size={38} strokeWidth={1.2}/><span>Build around<br />the way you work.</span><span className="paper-rule"/><small>THE MILOOSH FIELD GUIDE</small></span><span className="guide-tab"/></div><div className="featured-guide-copy"><h3>{guide.title}</h3><span className="text-action">Read the guide <ArrowUpRight size={17}/></span></div></HomeCta>)}
        <div className="guide-list">{homepageGuides.slice(1).map(guide => <HomeCta href={`/${guide.slug}`} name={`guide-${guide.slug}`} key={guide.slug}><h3>{guide.title}</h3><ArrowUpRight size={19}/></HomeCta>)}</div></div>
      </div></section>

      <section className="design-section directory-section" id="browse"><div className="design-container"><div className="section-intro"><h2>Know the name?<br />Start there.</h2><p>Explore {browseSoftware.length} research-priority tools below.<br />Search above to reach all {allSoftware.length}.</p></div><SoftwareDirectory items={browseSoftware.map(tool => ({name:tool.name,slug:tool.slug,category:getCategoryName(tool.category)}))}/></div></section>

      <section className="closing-section"><div className="design-container closing-inner"><div><h2>Your next tool<br />should feel right.</h2><p>Let’s find the software that fits the way you work.</p></div><div><HomeCta href="/recommend" name="closing-matcher" className="design-button button-citrine">Find my software <ArrowUpRight size={19}/></HomeCta><span>Free to explore. Yours to decide.</span></div></div></section>
      <div className="design-container affiliate-note"><ShieldCheck size={17}/><p>Some links may earn Miloosh a commission. We explain our approach so you can make an informed choice. <Link href="/affiliate-disclosure">Read our affiliate disclosure</Link>.</p></div>
    </main>
  );
}
