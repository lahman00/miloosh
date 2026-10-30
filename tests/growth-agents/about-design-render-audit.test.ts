import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { ABOUT_BASE_SHA, ABOUT_WIDTHS, aboutVisualVariants, auditAboutDesign } from "@/lib/growth-agents/about-design-render-audit";
import { aboutCssScopeErrors } from "@/lib/growth-agents/about-design-sources";
import { runGuardian } from "@/lib/growth-agents/guardian";
import { guardianInputs } from "./fixtures";

const hash="a".repeat(64),head="b".repeat(40);
const html=(className="old")=>`<html><head><title>T</title><meta name="robots" content="index"/><link rel="canonical" href="https://miloosh.com/x"/></head><body><main class="${className}"><h1>T</h1><a href="/go" rel="sponsored">Go</a><details><summary>FAQ</summary>Answer</details></main></body></html>`;
function fixture(){
  const protectedPaths=Array.from({length:193},(_,i)=>`/software/held-${i}`);
  const before=new Map<string,string>(protectedPaths.map(p=>[p.slice(1)+".html",html()]));
  for(let i=193;i<1788;i++)before.set(`page-${i}.html`,html());
  const after=new Map(before);after.set("page-193.html",html("page-shell"));
  return {baseSha:ABOUT_BASE_SHA,headSha:head,baseCheckoutSha:ABOUT_BASE_SHA,candidateCheckoutSha:head,baseClean:true,candidateClean:true,baseBuild:hash,candidateBuild:hash,before,after,beforeSitemap:"<urlset>same</urlset>",afterSitemap:"<urlset>same</urlset>",beforeRobots:"Allow: /",afterRobots:"Allow: /",protectedPaths,requiredProtectedPaths:[...protectedPaths],unreadProtectionSources:[] as string[],sourceErrors:[] as string[],visual:{schemaVersion:2 as const,baseSha:ABOUT_BASE_SHA,headSha:head,baseClean:true,candidateClean:true,baseBuild:hash,candidateBuild:hash,rows:protectedPaths.flatMap(path=>ABOUT_WIDTHS.flatMap(width=>aboutVisualVariants(path).map(variant=>({path,width,variant,baseStatus:200,candidateStatus:200,basePixels:hash,candidatePixels:hash,baseStyles:hash,candidateStyles:hash,baseInteraction:hash,candidateInteraction:hash,errors:[] as string[]}))))}};
}
describe("scoped About design proof",()=>{
  it("confines every rule in the shipped stylesheet to the eligible page containers",()=>expect(aboutCssScopeErrors(fs.readFileSync("app/design-system.css","utf8"))).toEqual([]));
  it("accepts a complete exact-build proof with every protected viewport unchanged",()=>expect(auditAboutDesign(fixture()).ok).toBe(true));
  it.each(["baseSha","headSha","baseCheckoutSha","candidateCheckoutSha"] as const)("rejects wrong %s",key=>{const f=fixture();f[key]="c".repeat(40);expect(auditAboutDesign(f).ok).toBe(false);});
  it("rejects dirty source and incomplete static output",()=>{const f=fixture();f.candidateClean=false;f.after.delete("page-200.html");expect(auditAboutDesign(f).errors).toContain("CHECKOUT_PROVENANCE_INVALID");expect(auditAboutDesign(f).errors).toContain("PAGE_INVENTORY_INCOMPLETE");});
  it("rejects changed protected markup even if screenshots claim equality",()=>{const f=fixture();f.after.set("software/held-0.html",html("page-shell"));expect(auditAboutDesign(f).errors).toContain("PROTECTED_MARKUP_CHANGED: /software/held-0");});
  it.each([['href="/go"','href="/other"'],['rel="sponsored"','rel=""'],['content="index"','content="noindex"'],['<h1>T</h1>','<h1>New promise</h1>']])("rejects commercial/SEO/text changes on editable pages: %s",(from,to)=>{const f=fixture();f.after.set("page-193.html",html("page-shell").replace(from,to));expect(auditAboutDesign(f).errors).toContain("CONTENT_SEO_OR_LINK_CHANGED: page-193.html");});
  it("rejects a new hold absent from the frozen manifest and unread sources",()=>{const f=fixture();f.requiredProtectedPaths.push("/software/new-hold");f.unreadProtectionSources.push("in-flight-work");const errors=auditAboutDesign(f).errors;expect(errors).toContain("HOLD_MISSING: /software/new-hold");expect(errors.join()).toContain("PROTECTION_SOURCE_UNREADABLE");});
  it.each(["basePixels","candidateStyles","candidateInteraction"] as const)("rejects unequal %s",key=>{const f=fixture();f.visual.rows[0]![key]="d".repeat(64);expect(auditAboutDesign(f).ok).toBe(false);});
  it("rejects missing, duplicate, failed, and stale browser rows",()=>{
    const f=fixture();f.visual.rows.pop();f.visual.rows.push(f.visual.rows[0]!);f.visual.rows[1]!.candidateStatus=404;f.visual.candidateBuild="stale";
    const e=auditAboutDesign(f).errors.join();expect(e).toContain("VISUAL_ROW_MISSING");expect(e).toContain("VISUAL_ROW_UNEXPECTED");expect(e).toContain("VISUAL_PAGE_ERROR");expect(e).toContain("VISUAL_PROVENANCE_INVALID");
  });
  it("requires both experiment arms and rejects treatment-only regressions",()=>{
    const missing=fixture();missing.visual.rows=missing.visual.rows.filter(r=>r.variant!=="treatment");
    expect(auditAboutDesign(missing).errors).toContain("VISUAL_ROW_MISSING: /software/held-0:390:treatment");
    const changed=fixture();changed.visual.rows.find(r=>r.variant==="treatment")!.candidatePixels="d".repeat(64);
    expect(auditAboutDesign(changed).errors).toContain("PROTECTED_VISUAL_OR_BEHAVIOR_CHANGED: /software/held-0:390:treatment");
  });
  it("rejects sitemap and robots changes",()=>{const f=fixture();f.afterSitemap="new";f.afterRobots="Disallow: /";expect(auditAboutDesign(f).errors).toEqual(expect.arrayContaining(["SITEMAP_CHANGED_OR_MISSING","ROBOTS_CHANGED_OR_MISSING"]));});
  it("rejects unscoped CSS and imports",()=>{expect(aboutCssScopeErrors(".page-shell p {color:red} @media (max-width:500px){.home-design a{color:green}}")).toEqual([]);for(const css of [":root{--a:1}","body{color:red}",".page-shell + main{color:red}","@import 'other.css';"])expect(aboutCssScopeErrors(css).length).toBeGreaterThan(0);});
  it("Guardian accepts only this proof's exact source scope and still blocks failed gates",()=>{
    const audit=auditAboutDesign(fixture());
    const original=guardianInputs();
    const args={...original,git:{...original.git,baseSha:ABOUT_BASE_SHA,headSha:head,changedFiles:["app/design-system.css"]},protection:{affectedUrls:[],affectedNonEditable:[],sharedTemplateChanged:true,aboutDesignAudit:audit}};
    expect(runGuardian(args).verdict).toBe("RELEASE_ALLOWED");
    expect(runGuardian({...args,git:{...args.git,changedFiles:["data/software/salesforce.json"]}}).verdict).toBe("RELEASE_BLOCKED");
    expect(runGuardian({...args,gates:args.gates.map(g=>({...g,status:"FAIL" as const}))}).verdict).toBe("RELEASE_BLOCKED");
    expect(runGuardian({...args,protection:{...args.protection,aboutDesignAudit:null}}).verdict).toBe("RELEASE_BLOCKED");
  });
});
