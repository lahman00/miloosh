import { internalPath } from "./checks";
import type { PageFacts } from "./page-facts";

/**
 * Which external URLs of the built site may be requested to see whether they still work.
 *
 * A link check must never touch a partner link: a request to an affiliate URL can register as a click with the
 * partner network. So a URL is excluded when any page marks it `rel="sponsored"` or when its query string looks
 * like a referral code. Everything excluded is returned with the reason, so the report can say what was left alone.
 */

export type ExternalTarget = { url: string; pages: string[] };
export type Excluded = { url: string; reason: string };

const REFERRAL_KEY = /^(ref|refer|referral|referrer|aff|affiliate|affid|partner|via|fpr|clickid|irclickid|sscid|sid|tag|deal|coupon|promo|campaign)$/i;

export function collectExternalTargets(pages: Iterable<PageFacts>, siteUrl: string): { checkable: ExternalTarget[]; excluded: Excluded[] } {
  const found = new Map<string, { pages: Set<string>; sponsored: boolean }>();
  for (const page of pages) {
    for (const anchor of page.anchors) {
      if (!/^https?:\/\//i.test(anchor.href) || internalPath(anchor.href, siteUrl) !== null) continue;
      const entry = found.get(anchor.href) ?? { pages: new Set<string>(), sponsored: false };
      entry.pages.add(page.path);
      if (anchor.rel.split(/\s+/).includes("sponsored")) entry.sponsored = true;
      found.set(anchor.href, entry);
    }
  }

  const hostOf = (url: string): string => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  };
  const checkable: ExternalTarget[] = [];
  const excluded: Excluded[] = [];
  for (const [url, entry] of [...found].sort((a, b) => a[0].localeCompare(b[0]))) {
    const host = hostOf(url);
    if (host === "") excluded.push({ url, reason: "not a parseable URL" });
    else if (entry.sponsored) excluded.push({ url, reason: "sponsored link" });
    else if ([...new URL(url).searchParams.keys()].some((key) => REFERRAL_KEY.test(key))) excluded.push({ url, reason: "query string looks like a referral code" });
    else checkable.push({ url, pages: [...entry.pages].sort() });
  }
  return { checkable, excluded };
}

/** Orders URLs so that consecutive requests go to different hosts whenever there is a choice (round-robin over hosts). */
export function interleaveByHost<T extends { url: string }>(targets: readonly T[]): T[] {
  const byHost = new Map<string, T[]>();
  for (const target of targets) {
    const host = new URL(target.url).hostname.toLowerCase();
    byHost.set(host, [...(byHost.get(host) ?? []), target]);
  }
  const queues = [...byHost.values()];
  const ordered: T[] = [];
  for (let round = 0; ordered.length < targets.length; round += 1) {
    for (const queue of queues) if (round < queue.length) ordered.push(queue[round]!);
  }
  return ordered;
}

export type Pace = { concurrency: number; minGapPerHostMs: number };

/**
 * Runs `check` over the targets with at most `concurrency` requests in flight and at least `minGapPerHostMs`
 * between two requests to the same host. Results come back in the order of `targets`.
 */
export async function runPaced<T extends { url: string }, R>(
  targets: readonly T[],
  check: (target: T) => Promise<R>,
  pace: Pace,
  { now = () => Date.now(), sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)) }: { now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<R[]> {
  const results = new Array<R>(targets.length);
  const lastRequestAt = new Map<string, number>();
  let next = 0;

  async function worker() {
    while (next < targets.length) {
      const index = next;
      next += 1;
      const target = targets[index]!;
      const host = new URL(target.url).hostname.toLowerCase();
      // Reserve the slot before waiting, so two workers cannot pick the same moment for one host.
      const earliest = (lastRequestAt.get(host) ?? Number.NEGATIVE_INFINITY) + pace.minGapPerHostMs;
      const start = Math.max(now(), earliest);
      lastRequestAt.set(host, start);
      if (start > now()) await sleep(start - now());
      results[index] = await check(target);
    }
  }

  await Promise.all(Array.from({ length: Math.min(pace.concurrency, targets.length) }, () => worker()));
  return results;
}
