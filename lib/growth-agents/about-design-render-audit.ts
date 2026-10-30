import { normalizeRenderedHtml } from "./rendered-diff";

export const ABOUT_BASE_SHA = "954cfb2f943496ec31b7ccaf325d368fb2d3e765";
export const ABOUT_WIDTHS = [390, 768, 1440] as const;
export type AboutVisualRow = {
  path: string; width: number; baseStatus: number; candidateStatus: number;
  basePixels: string; candidatePixels: string; baseStyles: string; candidateStyles: string;
  baseInteraction: string; candidateInteraction: string; errors: string[];
};
export type AboutVisualReceipt = {
  schemaVersion: 1; baseSha: string; headSha: string; baseClean: boolean; candidateClean: boolean;
  baseBuild: string; candidateBuild: string; rows: AboutVisualRow[];
};
export type AboutDesignAudit = {
  kind: "SCOPED_ABOUT_DESIGN_FULL_BUILD_AND_BROWSER_AUDIT"; ok: boolean;
  baseSha: string; headSha: string; pagesCompared: number; protectedPagesUnchanged: number;
  visualPairs: number; changedPages: number; sitemapIdentical: boolean; robotsIdentical: boolean;
  errors: string[];
};

// Only asset/link transport noise is omitted. CSS is checked separately with
// source scoping, computed styles and full-page pixels for EVERY held route.
export function protectedMarkup(html: string): string {
  return normalizeRenderedHtml(html).replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, "");
}
const textOf = (html: string): string => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const cosmeticAttrs = (html: string): string => html.replace(/\s(?:class|style)="[^"]*"/g, "");
export function semanticPage(html: string): unknown {
  const normalized = normalizeRenderedHtml(html);
  return {
    title: /<title[^>]*>([\s\S]*?)<\/title>/.exec(normalized)?.[1] ?? null,
    meta: [...normalized.matchAll(/<meta\b[^>]*>/g)].map(m => m[0]),
    canonical: [...normalized.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)].map(m => m[0]),
    jsonLd: [...normalized.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g)].map(m => m[0]),
    headings: [...normalized.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m => [m[1], textOf(m[2]!)]),
    anchors: [...normalized.matchAll(/<a\b[^>]*>/g)].map(m => cosmeticAttrs(m[0])),
    mainText: textOf(/<main\b[^>]*>([\s\S]*?)<\/main>/.exec(normalized)?.[1] ?? normalized),
    controls: [...normalized.matchAll(/<(?:input|button|select|textarea|form)\b[^>]*>/g)].map(m => cosmeticAttrs(m[0])),
  };
}

export function auditAboutDesign(input: {
  baseSha: string; headSha: string; baseCheckoutSha: string | null; candidateCheckoutSha: string | null;
  baseClean: boolean; candidateClean: boolean; baseBuild: string; candidateBuild: string;
  before: ReadonlyMap<string,string>; after: ReadonlyMap<string,string>;
  beforeSitemap: string | null; afterSitemap: string | null; beforeRobots: string | null; afterRobots: string | null;
  protectedPaths: readonly string[]; requiredProtectedPaths: readonly string[]; unreadProtectionSources: readonly string[];
  sourceErrors: string[]; visual: AboutVisualReceipt | null;
}): AboutDesignAudit {
  const errors = [...input.sourceErrors];
  if(input.baseSha !== ABOUT_BASE_SHA || !/^[0-9a-f]{40}$/.test(input.headSha) || input.headSha === input.baseSha) errors.push("COMMIT_SCOPE_MISMATCH");
  if(input.baseCheckoutSha !== input.baseSha || input.candidateCheckoutSha !== input.headSha || !input.baseClean || !input.candidateClean) errors.push("CHECKOUT_PROVENANCE_INVALID");
  if(input.unreadProtectionSources.length) errors.push(`PROTECTION_SOURCE_UNREADABLE: ${input.unreadProtectionSources.join(",")}`);
  const held = new Set(input.protectedPaths);
  if(held.size < 193 || held.size !== input.protectedPaths.length) errors.push("PROTECTED_INVENTORY_INCOMPLETE_OR_DUPLICATE");
  for(const p of input.requiredProtectedPaths) if(!held.has(p)) errors.push(`HOLD_MISSING: ${p}`);
  if(input.before.size < 1788 || input.after.size !== input.before.size) errors.push("PAGE_INVENTORY_INCOMPLETE");
  for(const route of input.after.keys()) if(!input.before.has(route)) errors.push(`PAGE_ADDED: ${route}`);
  let changedPages=0, protectedPagesUnchanged=0;
  for(const [route, before] of input.before){
    const after=input.after.get(route);
    if(after===undefined){ errors.push(`PAGE_DROPPED: ${route}`); continue; }
    if(!/<html\b/.test(before)||!/<\/html>/.test(before)||!/<html\b/.test(after)||!/<\/html>/.test(after)) errors.push(`PAGE_INCOMPLETE: ${route}`);
    if(JSON.stringify(semanticPage(before))!==JSON.stringify(semanticPage(after))) errors.push(`CONTENT_SEO_OR_LINK_CHANGED: ${route}`);
    const pathname="/"+route.replace(/\.html$/,"");
    if(held.has(pathname)){
      if(protectedMarkup(before)!==protectedMarkup(after)) errors.push(`PROTECTED_MARKUP_CHANGED: ${pathname}`);
      else protectedPagesUnchanged++;
      if(/<main\b[^>]*class="[^"]*\bpage-shell\b/.test(after)) errors.push(`PROTECTED_DESIGN_ENABLED: ${pathname}`);
    } else if(/^\/(software|compare)\/[a-z0-9-]+$/.test(pathname) && !/<main\b[^>]*class="[^"]*\bpage-shell\b/.test(after)) errors.push(`EDITABLE_DESIGN_MISSING: ${pathname}`);
    if(protectedMarkup(before)!==protectedMarkup(after)) changedPages++;
  }
  for(const p of held) if(!input.before.has(p.slice(1)+".html")) errors.push(`HELD_PAGE_NOT_BUILT: ${p}`);
  const sitemapIdentical=Boolean(input.beforeSitemap && input.beforeSitemap===input.afterSitemap);
  const robotsIdentical=Boolean(input.beforeRobots && input.beforeRobots===input.afterRobots);
  if(!sitemapIdentical) errors.push("SITEMAP_CHANGED_OR_MISSING");
  if(!robotsIdentical) errors.push("ROBOTS_CHANGED_OR_MISSING");
  const v=input.visual;
  if(!v || v.schemaVersion!==1 || v.baseSha!==input.baseSha || v.headSha!==input.headSha || !v.baseClean || !v.candidateClean || v.baseBuild!==input.baseBuild || v.candidateBuild!==input.candidateBuild) errors.push("VISUAL_PROVENANCE_INVALID");
  const seen=new Set<string>();
  for(const row of v?.rows??[]){
    const key=`${row.path}:${row.width}`;
    if(seen.has(key)||!held.has(row.path)||!(ABOUT_WIDTHS as readonly number[]).includes(row.width)) errors.push(`VISUAL_ROW_UNEXPECTED: ${key}`);
    seen.add(key);
    if(row.baseStatus!==200||row.candidateStatus!==200||row.errors.length) errors.push(`VISUAL_PAGE_ERROR: ${key}`);
    for(const [a,b] of [[row.basePixels,row.candidatePixels],[row.baseStyles,row.candidateStyles],[row.baseInteraction,row.candidateInteraction]]) if(!/^[a-f0-9]{64}$/.test(a)||a!==b) errors.push(`PROTECTED_VISUAL_OR_BEHAVIOR_CHANGED: ${key}`);
  }
  for(const p of held) for(const width of ABOUT_WIDTHS) if(!seen.has(`${p}:${width}`)) errors.push(`VISUAL_ROW_MISSING: ${p}:${width}`);
  return {kind:"SCOPED_ABOUT_DESIGN_FULL_BUILD_AND_BROWSER_AUDIT",ok:errors.length===0,baseSha:input.baseSha,headSha:input.headSha,pagesCompared:input.before.size,protectedPagesUnchanged,visualPairs:seen.size,changedPages,sitemapIdentical,robotsIdentical,errors};
}
