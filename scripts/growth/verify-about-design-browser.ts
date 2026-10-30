import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright-core";
import { ABOUT_WIDTHS, type AboutVisualReceipt, type AboutVisualRow } from "@/lib/growth-agents/about-design-render-audit";
import { aboutBuildFingerprint, sha256 } from "@/lib/growth-agents/about-design-sources";

const git=(root:string,args:string[])=>execFileSync("git",["--no-optional-locks",...args],{cwd:root,encoding:"utf8"}).trim();
async function port():Promise<number>{return new Promise((resolve,reject)=>{const s=net.createServer();s.on("error",reject);s.listen(0,"127.0.0.1",()=>{const p=(s.address() as net.AddressInfo).port;s.close(()=>resolve(p));});});}
async function waitFor(url:string){for(let n=0;n<120;n++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error(`Server did not start: ${url}`);}
async function styles(page:Page):Promise<string>{
  return sha256(JSON.stringify(await page.evaluate(()=>{
    const props=["display","position","color","background-color","font-family","font-size","font-weight","line-height","letter-spacing","padding","margin","border-width","border-color","border-radius","width","height","max-width","box-shadow","text-decoration","opacity","transform","gap"];
    return Array.from(document.querySelectorAll("body,body *")).filter(el=>!["SCRIPT","LINK","STYLE"].includes(el.tagName)).map(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return [el.tagName,[r.x,r.y,r.width,r.height],props.map(p=>s.getPropertyValue(p))];
    });
  })));
}
async function behavior(page:Page):Promise<string>{
  const initial=await page.evaluate(()=>Array.from(document.querySelectorAll("a,button,input,select,textarea,summary")).map(el=>({tag:el.tagName,text:el.textContent?.trim(),href:el.getAttribute("href"),rel:el.getAttribute("rel"),type:el.getAttribute("type"),name:el.getAttribute("name"),tabindex:el.getAttribute("tabindex")})));
  const faq=page.locator("details").first();
  let openStyles:string|null=null;
  if(await faq.count()){
    await faq.locator("summary").click();
    if(!(await faq.getAttribute("open")!==null)) throw Error("FAQ did not open");
    openStyles=await styles(page);
    await faq.locator("summary").click();
    if(await faq.getAttribute("open")!==null) throw Error("FAQ did not close");
  }
  return sha256(JSON.stringify({initial,openStyles}));
}

export async function main(argv:string[]):Promise<void>{
  const value=(name:string)=>{const i=argv.indexOf(name);if(i<0||!argv[i+1])throw Error(`Missing ${name}`);return path.resolve(argv[i+1]!);};
  const base=value("--base"),candidate=value("--candidate"),out=value("--out");
  const held=(JSON.parse(fs.readFileSync(path.join(candidate,"data/design/about-rollout-holds.json"),"utf8")) as {paths:string[]}).paths;
  const baseSha=git(base,["rev-parse","HEAD"]),headSha=git(candidate,["rev-parse","HEAD"]);
  const baseClean=git(base,["status","--porcelain","--untracked-files=all"])==="",candidateClean=git(candidate,["status","--porcelain","--untracked-files=all"])==="";
  if(!baseClean||!candidateClean) throw Error("Browser evidence requires clean committed checkouts.");
  const baseBuild=aboutBuildFingerprint(base),candidateBuild=aboutBuildFingerprint(candidate);
  const ports=[await port(),await port()];
  const urls=ports.map(p=>`http://127.0.0.1:${p}`);
  const servers=[base,candidate].map((root,i)=>spawn(process.execPath,[path.join(root,"node_modules/next/dist/bin/next"),"start","--hostname","127.0.0.1","--port",String(ports[i])],{cwd:root,stdio:["ignore","ignore","inherit"],env:{...process.env,NODE_ENV:"production",NEXT_TELEMETRY_DISABLED:"1"}}));
  const executable=process.env.CHROME_PATH??["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome","/usr/bin/google-chrome","/usr/bin/chromium"].find(p=>fs.existsSync(p));
  if(!executable)throw Error("No installed Chromium browser found.");
  const browser=await chromium.launch({executablePath:executable,headless:true});
  const rows:AboutVisualRow[]=[];
  const jobs=held.flatMap(p=>ABOUT_WIDTHS.map(width=>({p,width})));
  let next=0;
  try {
    await Promise.all(urls.map(waitFor));
    async function worker(){
      while(next<jobs.length){
        const job=jobs[next++]!;
        const contexts=await Promise.all(urls.map(()=>browser.newContext({viewport:{width:job.width,height:900},deviceScaleFactor:1,reducedMotion:"reduce",locale:"en-US",timezoneId:"UTC",serviceWorkers:"block"})));
        const errors:string[]=[];
        try {
          const states=await Promise.all(contexts.map(async(ctx,i)=>{
            await ctx.route("**/*",route=>{const u=new URL(route.request().url());return route.request().method()==="GET"&&u.origin===urls[i]?route.continue():route.abort();});
            const page=await ctx.newPage();
            page.on("pageerror",error=>errors.push(`${i}:${error.message}`));
            page.on("requestfailed",req=>{if(req.method()==="GET"&&req.url().startsWith(urls[i]!))errors.push(`ASSET_FAILURE:${i}:${req.url()}`);});
            const response=await page.goto(urls[i]+job.p,{waitUntil:"networkidle",timeout:45000});
            await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.decode().catch(()=>{})));});
            const computed=await styles(page);
            const pixels=await page.screenshot({fullPage:true,animations:"disabled"});
            const interactions=await behavior(page);
            return {status:response?.status()??0,computed,pixels,interactions};
          }));
          const [a,b]=states;
          rows.push({path:job.p,width:job.width,baseStatus:a!.status,candidateStatus:b!.status,basePixels:sha256(a!.pixels),candidatePixels:sha256(b!.pixels),baseStyles:a!.computed,candidateStyles:b!.computed,baseInteraction:a!.interactions,candidateInteraction:b!.interactions,errors});
          if(a!.computed!==b!.computed||sha256(a!.pixels)!==sha256(b!.pixels)||a!.interactions!==b!.interactions){
            const dir=path.join(path.dirname(out),"visual-differences");fs.mkdirSync(dir,{recursive:true});
            const name=job.p.replaceAll("/","_")+"-"+job.width;
            fs.writeFileSync(path.join(dir,name+"-base.png"),a!.pixels);fs.writeFileSync(path.join(dir,name+"-candidate.png"),b!.pixels);
            console.error(`DIFFERENCE ${job.p} ${job.width}`);
          }
        } catch(error){
          rows.push({path:job.p,width:job.width,baseStatus:0,candidateStatus:0,basePixels:"",candidatePixels:"",baseStyles:"",candidateStyles:"",baseInteraction:"",candidateInteraction:"",errors:[String(error)]});
        } finally {await Promise.all(contexts.map(c=>c.close()));}
        if(rows.length%30===0)console.log(`Verified ${rows.length}/${jobs.length} protected viewport pairs`);
      }
    }
    await Promise.all(Array.from({length:3},worker));
    if(aboutBuildFingerprint(base)!==baseBuild||aboutBuildFingerprint(candidate)!==candidateBuild||git(candidate,["rev-parse","HEAD"])!==headSha||git(base,["rev-parse","HEAD"])!==baseSha||git(candidate,["status","--porcelain","--untracked-files=all"])!==""||git(base,["status","--porcelain","--untracked-files=all"])!=="") throw Error("Build or source changed during browser verification.");
    const receipt:AboutVisualReceipt={schemaVersion:1,baseSha,headSha,baseClean,candidateClean,baseBuild,candidateBuild,rows:rows.sort((a,b)=>a.path.localeCompare(b.path)||a.width-b.width)};
    fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(receipt,null,2)+"\n");
    const failures=rows.filter(r=>r.errors.length||r.baseStatus!==200||r.candidateStatus!==200||r.basePixels!==r.candidatePixels||r.baseStyles!==r.candidateStyles||r.baseInteraction!==r.candidateInteraction);
    console.log(JSON.stringify({pairs:rows.length,failed:failures.length,out}));
    if(failures.length)process.exitCode=1;
  } finally {await browser.close();for(const server of servers)server.kill();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2)).catch(error=>{console.error(error);process.exitCode=1;});
