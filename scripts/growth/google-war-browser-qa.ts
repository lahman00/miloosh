import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { DECISION_PATHS } from "@/data/seo/decision-paths";

const origin = new URL(process.argv[2] ?? "http://localhost:3238");
assert(
  ["localhost", "127.0.0.1"].includes(origin.hostname),
  "Local-only browser QA",
);
const output = path.resolve(process.argv[3] ?? "var/growth/google-war/browser");
fs.mkdirSync(output, { recursive: true });
const session = `google-war-qa-${process.pid}`;
function browser(...args: string[]) {
  const r = JSON.parse(
    execFileSync("agent-browser", ["--session", session, ...args, "--json"], {
      encoding: "utf8",
      maxBuffer: 8_000_000,
    }),
  );
  assert(r.success, r.error ?? args.join(" "));
  return r.data;
}
const evaluate = (code: string) => browser("eval", code).result;
const rows: unknown[] = [];
let clicks = 0;
async function main() {
  try {
    browser("open", "about:blank");
    browser(
      "network",
      "route",
      "**/api/**",
      "--body",
      '{"recorded":false,"qa":"local-only"}',
    );
    for (const width of [1440, 390, 320]) {
      browser(
        "set",
        "viewport",
        String(width),
        width === 1440 ? "1000" : "844",
      );
      for (const [source, items] of Object.entries(DECISION_PATHS)) {
        const route = new URL(source, origin).href + "?qa=1&qaRun=google-war";
        const response = await fetch(route);
        assert.equal(response.status, 200);
        browser("open", route);
        browser(
          "wait",
          "--fn",
          "!!document.querySelector('nav[aria-label=\"Related product decisions\"]')",
        );
        const before = evaluate(
          `(() => ({title:document.title,canonical:document.querySelector('link[rel=canonical]')?.href,overflow:document.documentElement.scrollWidth>innerWidth,overlay:!!document.querySelector('[data-nextjs-dialog]'),h1s:document.querySelectorAll('h1').length,links:[...document.querySelectorAll('nav[aria-label="Related product decisions"] a')].map(a=>({href:a.getAttribute('href'),text:a.textContent,height:a.getBoundingClientRect().height}))}))()`,
        );
        assert.equal(before.canonical, `https://miloosh.com${source}`);
        assert.equal(before.overflow, false);
        assert.equal(before.overlay, false);
        assert.equal(before.h1s, 1);
        assert.deepEqual(
          before.links.map((a: { href: string }) => a.href),
          items.map((i) => i.href),
        );
        assert(before.links.every((a: { height: number }) => a.height >= 44));
        evaluate(
          `document.documentElement.style.scrollBehavior='auto';document.querySelector('nav[aria-label="Related product decisions"]').scrollIntoView({block:'center',behavior:'instant'})`,
        );
        browser(
          "screenshot",
          path.join(output, `${source.slice(1)}-${width}.png`),
        );
        const targets = [];
        for (const item of items) {
          const selector = `nav[aria-label="Related product decisions"] a[href="${item.href}"]`;
          evaluate(
            `document.documentElement.style.scrollBehavior='auto';document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&new URL(a.href).origin!==location.origin)e.preventDefault();});`,
          );
          browser(
            "snapshot",
            "-i",
            "-s",
            'nav[aria-label="Related product decisions"]',
          );
          browser("click", selector);
          browser("wait", "--url", `**${item.href}`);
          const finalUrl = browser("get", "url").url;
          assert.equal(finalUrl, new URL(item.href, origin).href);
          const target = evaluate(
            `({canonical:document.querySelector('link[rel=canonical]')?.href,title:document.title,overflow:document.documentElement.scrollWidth>innerWidth})`,
          );
          assert.equal(target.canonical, `https://miloosh.com${item.href}`);
          assert.equal(target.overflow, false);
          assert.equal((await fetch(finalUrl)).status, 200);
          targets.push({ href: item.href, ...target, httpStatus: 200 });
          clicks++;
          browser("open", route);
        }
        const errors = browser("errors").errors;
        assert.deepEqual(errors, []);
        rows.push({ source, width, ...before, targets, errors });
        console.log(`${source}/${width}: PASS`);
      }
    }
    fs.writeFileSync(
      path.join(output, "browser-qa.json"),
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          origin: origin.origin,
          viewports: [1440, 390, 320],
          nativeInternalClicks: clicks,
          analyticsWrites: 0,
          merchantNavigations: 0,
          rows,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    browser("close");
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
