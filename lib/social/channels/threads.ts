import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import type { ChannelVariant, PublishResult } from "@/lib/social/types";
import { type SocialAdapter, buildPublishResult, defaultFormat, envAll, missingEnvNames } from "@/lib/social/channels/types";

/**
 * Threads (Meta) adapter — built from real research (2026-08-16, directly
 * fetched from developers.facebook.com/docs/threads): two-step publish,
 *   1. POST /{threads-user-id}/threads  (create a media container)
 *   2. POST /{threads-user-id}/threads_publish  (publish that container)
 * Requires threads_basic + threads_content_publish scopes, granted only
 * after Meta App Review approves the Threads use case — until then, only
 * invited Threads Tester accounts can authorize the app at all. Real
 * working code either way: DISABLED in social-strategy.json
 * (enabledChannels.threads: false) until the owner confirms App Review
 * has actually been approved, since attempting to publish before that
 * would just return an auth failure, not silently do nothing.
 *
 * Text limit 500 characters; 250 published posts/24hr per profile
 * (verified directly from the docs).
 */

const CHAR_LIMIT = 500;
const REQUIRED_ENV = ["SOCIAL_THREADS_USER_ID", "SOCIAL_THREADS_ACCESS_TOKEN"];
const GRAPH_BASE = "https://graph.threads.net/v1.0";

export const threadsAdapter: SocialAdapter = {
  channel: "threads",
  requiredEnv: REQUIRED_ENV,
  charLimit: CHAR_LIMIT,
  isConfigured: () => envAll(REQUIRED_ENV) !== null,
  missingEnv: () => missingEnvNames(REQUIRED_ENV),
  format: (text, link) => defaultFormat(text, link, CHAR_LIMIT),

  async publish(variant: ChannelVariant, { dryRun }): Promise<PublishResult> {
    if (!dryRun) await assertMutationAllowed();
    const body = defaultFormat(variant.text, variant.link, CHAR_LIMIT);
    const link = variant.link ?? "";
    const env = envAll(REQUIRED_ENV);

    if (!env) {
      return buildPublishResult({ channel: "threads", status: "SETUP_REQUIRED", text: body, link, error: `missing env: ${missingEnvNames(REQUIRED_ENV).join(", ")}` });
    }
    if (dryRun) {
      return buildPublishResult({ channel: "threads", status: "DRY_RUN", text: body, link });
    }

    const userId = env.SOCIAL_THREADS_USER_ID;
    const token = env.SOCIAL_THREADS_ACCESS_TOKEN;

    try {
      const createRes = await fetch(`${GRAPH_BASE}/${userId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ media_type: "TEXT", text: body, access_token: token }),
      });
      if (createRes.status === 429) {
        return buildPublishResult({ channel: "threads", status: "RATE_LIMITED", text: body, link, error: "rate limited on container create" });
      }
      if (createRes.status === 401 || createRes.status === 403) {
        return buildPublishResult({ channel: "threads", status: "FAILED", text: body, link, error: `auth failed HTTP ${createRes.status} (App Review may not be approved yet)` });
      }
      if (!createRes.ok) {
        return buildPublishResult({ channel: "threads", status: "FAILED", text: body, link, error: `container create HTTP ${createRes.status}` });
      }
      const container = (await createRes.json()) as { id?: string };
      if (!container.id) {
        return buildPublishResult({ channel: "threads", status: "FAILED", text: body, link, error: "no container id in response" });
      }

      const publishRes = await fetch(`${GRAPH_BASE}/${userId}/threads_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ creation_id: container.id, access_token: token }),
      });
      if (!publishRes.ok) {
        return buildPublishResult({ channel: "threads", status: "FAILED", text: body, link, error: `publish HTTP ${publishRes.status}` });
      }
      const published = (await publishRes.json()) as { id?: string };
      const postId = published.id ?? null;

      return buildPublishResult({ channel: "threads", status: "PUBLISHED", text: body, link, postUrl: null, postId, verified: Boolean(postId), error: postId ? "" : "no post id; permalink not resolvable via this endpoint" });
    } catch (err) {
      return buildPublishResult({ channel: "threads", status: "FAILED", text: body, link, error: `${err instanceof Error ? err.constructor.name : "Error"}: ${err instanceof Error ? err.message : String(err)}` });
    }
  },
};
