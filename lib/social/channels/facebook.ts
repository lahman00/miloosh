import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import type { ChannelVariant, PublishResult } from "@/lib/social/types";
import { type SocialAdapter, buildPublishResult, defaultFormat, envAll, missingEnvNames } from "@/lib/social/channels/types";
import { SITE_URL } from "@/lib/site";

/**
 * Facebook Page adapter — ported from Need Go Home's real, working
 * publishers/facebook.py (Graph API), extended 2026-08-17 with real image
 * posting (verified against Meta's current Graph API reference before
 * implementing — developers.facebook.com/docs/graph-api/reference/page/photos/):
 *
 *   IMAGE_POST (when the variant has a valid, Miloosh-owned image):
 *     POST /{page-id}/photos  url=<image-url>&caption=<text>&access_token=<token>
 *     -> { "id": "<photo-id>", "post_id": "<pageid>_<storyid>" }
 *     Same permission as feed posting (pages_manage_posts) — no extra
 *     scope needed. `url` must point to a photo already hosted on the
 *     public internet; Meta's own servers fetch it — this code never
 *     downloads or proxies image bytes itself. `caption` (not the
 *     deprecated `message`) is the correct field for /photos.
 *     Meta's docs do not state whether a URL inside `caption` becomes a
 *     clickable link (checked; genuinely undocumented) — so the
 *     destination URL is included in the caption as visible, copyable
 *     text for a reader, without assuming it's a real hyperlink.
 *
 *   LINK_POST (no valid image — the pre-existing behavior, unchanged):
 *     POST /{page-id}/feed  message=<text-with-link>&access_token=<token>
 *     -> { "id": "<pageid>_<storyid>" }
 *
 *   Both: GET /{post-id}?fields=id,permalink_url (read-back verification).
 *
 * A Page Access Token never expires, so this runs unattended after
 * one-time setup. The token travels in the request body (form-encoded),
 * never the URL, so it can't leak through a request line or access log.
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const CHAR_LIMIT = 2000; // Facebook allows far more; keep posts short and readable.
const REQUIRED_ENV = ["SOCIAL_FACEBOOK_PAGE_ID", "SOCIAL_FACEBOOK_PAGE_ACCESS_TOKEN"];

/**
 * Only ever trust an image URL that is Miloosh's own generated social
 * card, served from Miloosh's own domain via the one real image route
 * (app/api/social/card/route.tsx). Never pass an arbitrary/untrusted URL
 * to Meta's `url` fetch-by-reference parameter — this is the sole
 * validation gate, and it fails closed (anything that doesn't match
 * falls back to a plain link post, never an error that could be
 * mistaken for "post it anyway").
 */
function isTrustedSocialImageUrl(url: string): boolean {
  return url.startsWith(`${SITE_URL}/api/social/card?`);
}

/**
 * Graph API error object shape, per Meta's current error-handling docs
 * (developers.facebook.com/docs/graph-api/guides/error-handling/,
 * verified 2026-08-18): { message, type, code, error_subcode?,
 * error_user_msg?, error_user_title?, fbtrace_id? }. Never includes the
 * access token — the token is a request parameter we send, not something
 * Meta echoes back.
 */
type GraphApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

/**
 * 2026-08-18 — classifies a failed Graph API call into the 7 buckets the
 * daily-publish task requires, using the real `error.type`/`error.code`
 * from Meta's response body (not just the HTTP status, which alone can't
 * distinguish e.g. an expired token from a missing permission — both
 * often arrive as HTTP 401/403). Per Meta's docs: OAuthException + code
 * 190/102 = token invalid/expired; code 10 or a 200-299 code = missing
 * permission; codes 4/17/341 = app/user rate limits (on top of the HTTP
 * 429 case already handled separately); code 506 (duplicate post) or
 * 1609005 (link scraping problem) = invalid content; a network-level
 * failure (no response at all) is classified separately, in the catch
 * block below, since there's no Graph error body to read in that case.
 * The classification is prepended to the existing free-text `error`
 * field as a tag — it does not introduce a new PublishStatus, since the
 * existing status enum (FAILED/RATE_LIMITED/etc.) is unchanged.
 */
function classifyGraphError(httpStatus: number, err: GraphApiError | null): string {
  const type = err?.type ?? "";
  const code = err?.code;
  const subcode = err?.error_subcode;
  const detail = err?.message ?? `HTTP ${httpStatus}`;
  const trace = err?.fbtrace_id ? ` (fbtrace_id: ${err.fbtrace_id})` : "";

  if (type === "OAuthException" && (code === 190 || code === 102)) {
    return `AUTH_TOKEN_ERROR: ${detail}${subcode ? ` [subcode ${subcode}]` : ""}${trace}`;
  }
  if (code === 10 || (typeof code === "number" && code >= 200 && code <= 299)) {
    return `PERMISSION_ERROR: ${detail}${trace}`;
  }
  if (code === 4 || code === 17 || code === 341) {
    return `RATE_LIMIT: ${detail}${trace}`;
  }
  if (code === 506 || code === 1609005) {
    return `INVALID_CONTENT: ${detail}${trace}`;
  }
  if (httpStatus === 401 || httpStatus === 403) {
    // A 401/403 with an unrecognized error.type/code still needs a real
    // bucket — treat it as an auth/token problem by default (Meta's own
    // convention: these two HTTP statuses are reserved for auth-family
    // failures), while still surfacing the real detail for debugging.
    return `AUTH_TOKEN_ERROR: ${detail}${trace}`;
  }
  if (httpStatus === 404 || httpStatus === 400) {
    // A missing/invalid page ID, or a malformed request the Page itself
    // rejects, surfaces as 404/400 without necessarily matching one of
    // Meta's documented error codes above.
    return `PAGE_ERROR: ${detail}${trace}`;
  }
  return `UNKNOWN_API_ERROR: ${detail}${trace}`;
}

async function tryParseGraphError(res: Response): Promise<GraphApiError | null> {
  try {
    const body = (await res.clone().json()) as { error?: GraphApiError };
    return body.error ?? null;
  } catch {
    return null; // response wasn't JSON, or had no body — classification falls back to HTTP status alone.
  }
}

export const facebookAdapter: SocialAdapter = {
  channel: "facebook",
  requiredEnv: REQUIRED_ENV,
  charLimit: CHAR_LIMIT,
  isConfigured: () => envAll(REQUIRED_ENV) !== null,
  missingEnv: () => missingEnvNames(REQUIRED_ENV),
  format: (text, link) => defaultFormat(text, link, CHAR_LIMIT),

  async publish(variant: ChannelVariant, { dryRun }): Promise<PublishResult> {
    if (!dryRun) await assertMutationAllowed();
    const body = defaultFormat(variant.text, variant.link, CHAR_LIMIT);
    const link = variant.link ?? "";
    const useImage = Boolean(variant.imageUrl && isTrustedSocialImageUrl(variant.imageUrl));
    const mode: PublishResult["mode"] = useImage ? "IMAGE_POST" : "LINK_POST";
    const env = envAll(REQUIRED_ENV);

    if (!env) {
      return buildPublishResult({ channel: "facebook", status: "SETUP_REQUIRED", text: body, link, mode, error: `missing env: ${missingEnvNames(REQUIRED_ENV).join(", ")}` });
    }
    if (dryRun) {
      // No network call of any kind — including no fetch of the image
      // URL itself — this is the entire point of a dry run.
      return buildPublishResult({ channel: "facebook", status: "DRY_RUN", text: body, link, mode });
    }

    const pageId = env.SOCIAL_FACEBOOK_PAGE_ID;
    const token = env.SOCIAL_FACEBOOK_PAGE_ACCESS_TOKEN;

    try {
      const createRes = useImage
        ? await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ url: variant.imageUrl!, caption: body, access_token: token }),
          })
        : await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ message: body, access_token: token }),
          });

      if (createRes.status === 429) {
        const graphErr = await tryParseGraphError(createRes);
        return buildPublishResult({ channel: "facebook", status: "RATE_LIMITED", text: body, link, mode, error: classifyGraphError(429, graphErr) });
      }
      if (!createRes.ok) {
        const graphErr = await tryParseGraphError(createRes);
        return buildPublishResult({ channel: "facebook", status: "FAILED", text: body, link, mode, error: classifyGraphError(createRes.status, graphErr) });
      }
      const created = (await createRes.json()) as { id?: string; post_id?: string };
      // /photos returns both a photo id and the actual feed post id (post_id) — the post id is what we want for the permalink read-back; /feed only ever returns id.
      const postId = created.post_id ?? created.id;
      if (!postId) {
        return buildPublishResult({ channel: "facebook", status: "FAILED", text: body, link, mode, error: "no post id in Graph response" });
      }

      let postUrl: string | null = null;
      let verified = false;
      try {
        const infoRes = await fetch(`${GRAPH_BASE}/${postId}?fields=id,permalink_url&access_token=${encodeURIComponent(token)}`);
        if (infoRes.ok) {
          const info = (await infoRes.json()) as { id?: string; permalink_url?: string };
          if (info.id) {
            verified = true;
            postUrl = info.permalink_url ?? null;
          }
        }
      } catch {
        verified = false; // read-back is best-effort only
      }
      if (!postUrl) postUrl = `https://www.facebook.com/${postId}`;

      return buildPublishResult({ channel: "facebook", status: "PUBLISHED", text: body, link, mode, postUrl, postId, verified });
    } catch (err) {
      // Reached only when the fetch itself never got a response (DNS
      // failure, connection reset, timeout) — there is no Graph error
      // body to classify against, so this is unambiguously the
      // NETWORK_ERROR bucket rather than an API-level failure.
      const detail = `${err instanceof Error ? err.constructor.name : "Error"}: ${err instanceof Error ? err.message : String(err)}`;
      return buildPublishResult({ channel: "facebook", status: "FAILED", text: body, link, mode, error: `NETWORK_ERROR: ${detail}` });
    }
  },
};
