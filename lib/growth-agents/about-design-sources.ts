import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import postcss from "postcss";
import { loadPrerenderedBuild } from "./guardian-sources";
import { auditAboutDesign, type AboutVisualReceipt, type AboutDesignAudit } from "./about-design-render-audit";
import { isAboutDesignFile } from "./about-design-scope";
import type { ProtectionSnapshot } from "./protection";

const git=(root:string,args:string[])=>execFileSync("git",["--no-optional-locks",...args],{cwd:root,encoding:"utf8",maxBuffer:64*1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS: "0"}}).trim();
export const sha256=(data:string|Buffer)=>createHash("sha256").update(data).digest("hex");
/** Binds a browser receipt to actual HTML, robots, sitemap, scripts, fonts and CSS. */
export function aboutBuildFingerprint(root:string):string {
  const hash=createHash("sha256");
  function walk(dir:string, all:boolean){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const f=path.join(dir,entry.name);
      if(entry.isDirectory()) walk(f,all);
      else if(all || /\.(html|body)$/.test(entry.name)) hash.update(path.relative(root,f)).update("\0").update(fs.readFileSync(f)).update("\0");
    }
  }
  hash.update(fs.readFileSync(path.join(root,".next/BUILD_ID")));
  walk(path.join(root,".next/static"),true);
  walk(path.join(root,".next/server/app"),false);
  return hash.digest("hex");
}

export function aboutCssScopeErrors(css:string):string[]{
  const errors:string[]=[];
  try {
    const ast=postcss.parse(css);
    ast.walkAtRules(rule=>{ if(rule.name!=="media") errors.push(`CSS_AT_RULE_NOT_SCOPED: ${rule.name}`); });
    ast.walkRules(rule=>{
      for(const selector of rule.selectors) if(!/^\.(page-shell|home-design)(?=[\s.:#\[>]|$)/.test(selector) || /^\.(page-shell|home-design)\s*[+~]/.test(selector)) errors.push(`CSS_SELECTOR_NOT_SCOPED: ${selector}`);
    });
  } catch { errors.push("CSS_PARSE_FAILED"); }
  return errors;
}

/** Reads facts, never accepts an externally asserted green audit. */
export function verifyAboutDesignBuilds(input:{baseDir:string;candidateDir:string;baseSha:string;headSha:string;visualFile:string;protection:ProtectionSnapshot}):AboutDesignAudit {
  try {
    const before=loadPrerenderedBuild(input.baseDir),after=loadPrerenderedBuild(input.candidateDir);
    const read=(root:string,file:string)=>fs.readFileSync(path.join(root,file),"utf8");
    const manifest=JSON.parse(read(input.candidateDir,"data/design/about-rollout-holds.json")) as {schemaVersion:number;baseSha:string;paths:string[]};
    const sourceErrors:string[]=[];
    if(manifest.schemaVersion!==1||manifest.baseSha!==input.baseSha||!Array.isArray(manifest.paths)) sourceErrors.push("HOLD_MANIFEST_INVALID");
    const changed=git(input.candidateDir,["diff","--name-only",input.baseSha,input.headSha]).split("\n").filter(Boolean);
    if(!changed.length) sourceErrors.push("NO_SOURCE_CHANGE");
    for(const file of changed) if(!isAboutDesignFile(file)) sourceErrors.push(`FILE_OUT_OF_SCOPE: ${file}`);
    // The only global layout change is loading the strictly scoped sheet.
    if(read(input.candidateDir,"app/layout.tsx").replace('import "./design-system.css";\n',"")!==read(input.baseDir,"app/layout.tsx")) sourceErrors.push("ROOT_LAYOUT_CHANGED_BEYOND_SCOPED_STYLESHEET");
    sourceErrors.push(...aboutCssScopeErrors(read(input.candidateDir,"app/design-system.css")));
    const pricing=JSON.parse(read(input.baseDir,"data/seo/price-label-hold.json")) as {heldSoftware:string[]};
    const requiredProtectedPaths=[...input.protection.byUrl.keys()].map(url=>new URL(url).pathname).concat(pricing.heldSoftware.map(slug=>`/software/${slug}`));
    const visual=JSON.parse(fs.readFileSync(input.visualFile,"utf8")) as AboutVisualReceipt;
    return auditAboutDesign({...input,before:before.html,after:after.html,beforeSitemap:before.sitemap,afterSitemap:after.sitemap,beforeRobots:before.robots,afterRobots:after.robots,baseCheckoutSha:git(input.baseDir,["rev-parse","HEAD"]),candidateCheckoutSha:git(input.candidateDir,["rev-parse","HEAD"]),baseClean:git(input.baseDir,["status","--porcelain","--untracked-files=all"])==="",candidateClean:git(input.candidateDir,["status","--porcelain","--untracked-files=all"])==="",baseBuild:aboutBuildFingerprint(input.baseDir),candidateBuild:aboutBuildFingerprint(input.candidateDir),protectedPaths:manifest.paths,requiredProtectedPaths,unreadProtectionSources:input.protection.sources.filter(s=>!s.ok).map(s=>s.id),sourceErrors,visual});
  } catch(error){
    return {kind:"SCOPED_ABOUT_DESIGN_FULL_BUILD_AND_BROWSER_AUDIT",ok:false,baseSha:input.baseSha,headSha:input.headSha,pagesCompared:0,protectedPagesUnchanged:0,visualPairs:0,protectedExperimentPages:0,changedPages:0,sitemapIdentical:false,robotsIdentical:false,errors:[`AUDIT_UNREADABLE: ${String(error)}`]};
  }
}
