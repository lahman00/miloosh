import { parseLivePage, type LiveObservation } from "./live-check";
import { canonicalPageUrl } from "./urls";

/**
 * Read-only network adapter for the live page check.
 *
 * It sends plain GET requests to Miloosh's own public pages and nothing else: the host allow-list is the site's own
 * hostnames, a redirect to any other host is recorded and not followed, request bodies and custom methods do not
 * exist here, and the links found in the HTML are parsed but never requested (affiliate links are never visited).
 */

export const LIVE_CHECK_USER_AGENT = "MilooshReadOnlyCheck/1.0 (+https://miloosh.com)";
const ALLOWED_HOSTS = new Set(["miloosh.com", "www.miloosh.com"]);
const MAX_REDIRECTS = 4;
const MAX_BYTES = 4_000_000;

export type FetchResponseLike = { status: number; headers: { get(name: string): string | null }; text(): Promise<string> };
export type FetchLike = (url: string, init: { method: "GET"; redirect: "manual"; headers: Record<string, string>; signal: AbortSignal }) => Promise<FetchResponseLike>;

export class LiveCheckError extends Error {}

function assertOwnPage(url: string): string {
  const canonical = canonicalPageUrl(url);
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    throw new LiveCheckError(`not a URL: ${url}`);
  }
  if (!canonical || !ALLOWED_HOSTS.has(host)) throw new LiveCheckError(`only miloosh.com pages are checked, not ${url}`);
  return url;
}

/** Fetches one Miloosh page and parses it. Follows same-site redirects only; an off-site redirect ends the chain as the final answer. */
export async function observeLivePage(url: string, fetchImpl: FetchLike, options: { timeoutMs?: number } = {}): Promise<LiveObservation> {
  assertOwnPage(url);
  const chain: string[] = [];
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
    let response: FetchResponseLike;
    try {
      response = await fetchImpl(current, { method: "GET", redirect: "manual", headers: { "user-agent": LIVE_CHECK_USER_AGENT, accept: "text/html,application/xhtml+xml" }, signal: controller.signal });
    } catch (error) {
      throw new LiveCheckError(`GET ${current} failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
    }
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const next = new URL(location, current).toString();
      chain.push(next);
      let nextHost = "";
      try {
        nextHost = new URL(next).hostname.toLowerCase();
      } catch {
        // an unreadable Location ends the chain below
      }
      if (!ALLOWED_HOSTS.has(nextHost)) {
        return parseLivePage({ url, finalUrl: next, status: response.status, redirectChain: chain, headers: { xRobotsTag: response.headers.get("x-robots-tag"), contentType: response.headers.get("content-type") }, html: "" });
      }
      current = next;
      continue;
    }
    const body = await response.text();
    if (body.length > MAX_BYTES) throw new LiveCheckError(`${current} returned more than ${MAX_BYTES} characters; refusing to parse it`);
    return parseLivePage({
      url,
      finalUrl: current,
      status: response.status,
      redirectChain: chain,
      headers: { xRobotsTag: response.headers.get("x-robots-tag"), contentType: response.headers.get("content-type") },
      html: body,
    });
  }
  throw new LiveCheckError(`${url} redirected more than ${MAX_REDIRECTS} times`);
}
