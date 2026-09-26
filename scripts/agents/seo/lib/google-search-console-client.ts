import { fetchAccessToken, parseServiceAccountEnv, type GoogleServiceAccountKey } from "@/scripts/agents/seo/lib/google-service-account-auth";

/**
 * Minimal, real REST client for the two Google Search Console API surfaces
 * this system needs:
 *  - Search Analytics: query (POST .../searchAnalytics/query) — query,
 *    page, clicks, impressions, ctr, position, date. Endpoint, scope,
 *    rowLimit range (1-25,000, default 1,000), and startRow-based
 *    pagination verified against current Google documentation before
 *    writing this (developers.google.com/webmaster-tools/v1/searchanalytics/query).
 *  - URL Inspection: index (POST .../urlInspection/index:inspect) — real
 *    DISCOVERED/CRAWLED/INDEXED state per URL, a different API surface
 *    (searchconsole.googleapis.com, not www.googleapis.com/webmasters).
 *    Full IndexStatusInspectionResult field set (verdict, coverageState,
 *    robotsTxtState, indexingState, pageFetchState, googleCanonical,
 *    userCanonical, crawledAs, lastCrawlTime) verified against current
 *    Google documentation, not assumed.
 *
 * No `googleapis` dependency — plain `fetch` against the documented REST
 * endpoints, auth via google-service-account-auth.ts. Every function here
 * makes a real HTTP call; there is no mock/fake mode. Requires:
 *   GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT — the service account's JSON
 *     key (raw or base64), with that service account added as a
 *     Search Console user (read access) on the property below.
 *   GOOGLE_SEARCH_CONSOLE_PROPERTY — the exact property as it appears in
 *     Search Console: either a URL-prefix property like
 *     "https://miloosh.com/" or a domain property like
 *     "sc-domain:miloosh.com" (the target property here). Domain
 *     properties are passed through `encodeURIComponent` exactly like
 *     URL-prefix ones — the colon becomes `%3A` in the request path
 *     (`.../sites/sc-domain%3Amiloosh.com/...`), matching Google's own
 *     documented request-path convention for both property types (no
 *     special-casing needed — confirmed against developers.google.com's
 *     Sites.get reference, which uses the identical siteUrl path
 *     parameter for both forms).
 *
 * Quota discipline (per Google's documented limits — developers.google.com/webmaster-tools/limits):
 * URL Inspection is 2,000 queries/day and 600/minute PER PROPERTY — the
 * hard constraint driving lib/agents/state.ts's inspection cooldown (this
 * client makes the calls; it does not decide which URLs to call it with —
 * that policy lives in the calling agent). Search Analytics has no
 * comparably tight documented quota but this client still paginates
 * explicitly (queryAllSearchAnalytics) rather than assuming one page
 * covers every row, and retries a real 429 with backoff rather than
 * treating a quota response as a hard failure.
 */

const SEARCH_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const MAX_ROW_LIMIT = 25_000;
const DEFAULT_ROW_LIMIT = 1_000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_000;

export type SearchAnalyticsRow = {
  keys: string[]; // one per requested dimension, in order
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchAnalyticsQuery = {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dimensions: Array<"query" | "page" | "date" | "country" | "device">;
  rowLimit?: number;
  startRow?: number;
  type?: "web" | "image" | "video" | "news";
  dataState?: "final";
  dimensionFilterGroups?: Array<{ groupType: "and"; filters: Array<{ dimension: "query"; operator: "contains"; expression: string }> }>;
};

export type UrlInspectionResult = {
  url: string;
  verdict: "PASS" | "PARTIAL" | "FAIL" | "NEUTRAL" | "UNKNOWN";
  coverageState: string | null;
  indexingState: string | null;
  lastCrawlTime: string | null;
  robotsTxtState: string | null;
  pageFetchState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  crawledAs: string | null;
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries a real 429 (quota exceeded) with exponential backoff. Any other non-ok status fails immediately — only quota responses are worth retrying. */
async function fetchWithQuotaRetry(url: string, init: RequestInit): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    lastResponse = res;
    if (attempt < MAX_RETRY_ATTEMPTS) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  return lastResponse!;
}

/** Refresh this many seconds before the token's real expiry, not exactly at it — avoids a request racing an about-to-expire token. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

export class GoogleSearchConsoleClient {
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly key: GoogleServiceAccountKey,
    private readonly propertyUrl: string
  ) {}

  static fromEnv(): GoogleSearchConsoleClient | null {
    const rawKey = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT;
    const property = process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY;
    if (!rawKey || !property) return null;
    return new GoogleSearchConsoleClient(parseServiceAccountEnv(rawKey), property);
  }

  /**
   * Caches the access token for the client's lifetime instead of exchanging
   * a fresh one on every single API call. Confirmed live (2026-08-10): a
   * ~65-call batch (one full indexation-sample URL Inspection pass) hit
   * Vercel's function timeout without this — every call was paying for its
   * own JWT-sign + OAuth2 round-trip on top of the actual Search Console
   * request. Google's token is valid for `expires_in` seconds (normally
   * 3600); reused here until TOKEN_REFRESH_MARGIN_MS before that.
   */
  private async accessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.value;
    }
    const token = await fetchAccessToken(this.key, SEARCH_ANALYTICS_SCOPE);
    this.cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 - TOKEN_REFRESH_MARGIN_MS };
    return token.access_token;
  }

  /** Real POST to .../sites/{property}/searchAnalytics/query — a single page (≤25,000 rows, per Google's documented max). Retries a real 429 with backoff. */
  async querySearchAnalytics(query: SearchAnalyticsQuery): Promise<SearchAnalyticsRow[]> {
    const rowLimit = query.rowLimit ?? DEFAULT_ROW_LIMIT;
    if (rowLimit < 1 || rowLimit > MAX_ROW_LIMIT) {
      throw new Error(`rowLimit must be between 1 and ${MAX_ROW_LIMIT} (Search Console API's documented range); got ${rowLimit}.`);
    }

    const accessToken = await this.accessToken();
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.propertyUrl)}/searchAnalytics/query`;
    const res = await fetchWithQuotaRetry(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...query, rowLimit }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Search Analytics query failed: HTTP ${res.status} — ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { rows?: SearchAnalyticsRow[] };
    return json.rows ?? [];
  }

  /**
   * Pages through Search Analytics via startRow until a page returns fewer
   * rows than requested (Google's own documented end-of-results signal —
   * a startRow past the end returns 0 rows, not an error). Bounded by
   * maxRows so a runaway query can't page forever.
   */
  async queryAllSearchAnalytics(query: Omit<SearchAnalyticsQuery, "startRow">, maxRows = 5_000): Promise<SearchAnalyticsRow[]> {
    const pageSize = query.rowLimit ?? DEFAULT_ROW_LIMIT;
    const allRows: SearchAnalyticsRow[] = [];
    let startRow = 0;

    while (allRows.length < maxRows) {
      const page = await this.querySearchAnalytics({ ...query, rowLimit: pageSize, startRow });
      allRows.push(...page);
      if (page.length < pageSize) break; // last page
      startRow += pageSize;
    }

    return allRows.slice(0, maxRows);
  }

  /** Real POST to searchconsole.googleapis.com's URL Inspection API. Retries a real 429 with backoff. */
  async inspectUrl(inspectionUrl: string): Promise<UrlInspectionResult> {
    const accessToken = await this.accessToken();
    const res = await fetchWithQuotaRetry("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionUrl, siteUrl: this.propertyUrl }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`URL Inspection failed: HTTP ${res.status} — ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      inspectionResult?: {
        indexStatusResult?: {
          verdict?: string;
          coverageState?: string;
          indexingState?: string;
          lastCrawlTime?: string;
          robotsTxtState?: string;
          pageFetchState?: string;
          googleCanonical?: string;
          userCanonical?: string;
          crawledAs?: string;
        };
      };
    };
    const result = json.inspectionResult?.indexStatusResult;
    return {
      url: inspectionUrl,
      verdict: (result?.verdict as UrlInspectionResult["verdict"]) ?? "UNKNOWN",
      coverageState: result?.coverageState ?? null,
      indexingState: result?.indexingState ?? null,
      lastCrawlTime: result?.lastCrawlTime ?? null,
      robotsTxtState: result?.robotsTxtState ?? null,
      pageFetchState: result?.pageFetchState ?? null,
      googleCanonical: result?.googleCanonical ?? null,
      userCanonical: result?.userCanonical ?? null,
      crawledAs: result?.crawledAs ?? null,
    };
  }
}
