import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import type { ChannelVariant, PublishResult } from "@/lib/social/types";
import { contentHash } from "@/lib/social/dedup";
import { type SocialAdapter, buildPublishResult, defaultFormat, envAll, missingEnvNames } from "@/lib/social/channels/types";

/**
 * Mastodon adapter — ported from Need Go Home's real, working
 * publishers/mastodon.py:
 *   POST {base}/api/v1/statuses with Authorization: Bearer <token>
 *   (write:statuses scope). Idempotency-Key header (the content hash)
 *   prevents duplicate submissions on a retry. After creating, reads the
 *   status back (GET /api/v1/statuses/{id}) and only marks `verified`
 *   true when the post is actually retrievable — a create response alone
 *   is not proof of a live post.
 *
 * Token comes from the instance's own Preferences -> Development, so it
 * runs unattended after one-time setup. The chosen instance's rules must
 * permit automated/promotional posts — that's an owner judgment call at
 * setup time, not something this adapter can verify.
 */

const CHAR_LIMIT = 480; // default instance limit is usually 500; stay safely under.
const REQUIRED_ENV = ["SOCIAL_MASTODON_BASE_URL", "SOCIAL_MASTODON_ACCESS_TOKEN"];

export const mastodonAdapter: SocialAdapter = {
  channel: "mastodon",
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
      return buildPublishResult({ channel: "mastodon", status: "SETUP_REQUIRED", text: body, link, error: `missing env: ${missingEnvNames(REQUIRED_ENV).join(", ")}` });
    }
    if (dryRun) {
      return buildPublishResult({ channel: "mastodon", status: "DRY_RUN", text: body, link });
    }

    const baseUrl = env.SOCIAL_MASTODON_BASE_URL.replace(/\/$/, "");
    const token = env.SOCIAL_MASTODON_ACCESS_TOKEN;
    const idempotencyKey = contentHash("mastodon", body);

    try {
      const createRes = await fetch(`${baseUrl}/api/v1/statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ status: body, visibility: "public", language: "en" }),
      });
      if (createRes.status === 429) {
        return buildPublishResult({ channel: "mastodon", status: "RATE_LIMITED", text: body, link, error: "rate limited (HTTP 429)" });
      }
      if (createRes.status === 401 || createRes.status === 403) {
        return buildPublishResult({ channel: "mastodon", status: "FAILED", text: body, link, error: `auth failed HTTP ${createRes.status}` });
      }
      if (!createRes.ok) {
        return buildPublishResult({ channel: "mastodon", status: "FAILED", text: body, link, error: `HTTP ${createRes.status}` });
      }
      const created = (await createRes.json()) as { id?: string | number; url?: string };
      let postUrl = created.url ?? null;
      const postId = created.id != null ? String(created.id) : null;

      let verified = false;
      let note = "";
      if (postId) {
        try {
          const checkRes = await fetch(`${baseUrl}/api/v1/statuses/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (checkRes.ok) {
            const check = (await checkRes.json()) as { id?: string | number; url?: string };
            if (String(check.id) === postId) {
              verified = true;
              postUrl = check.url ?? postUrl;
            } else {
              note = "read-back returned no matching status id";
            }
          } else {
            note = `read-back failed HTTP ${checkRes.status}`;
          }
        } catch (err) {
          note = `read-back error ${err instanceof Error ? err.constructor.name : "Error"}`;
        }
      } else {
        note = "no post id in create response";
      }

      return buildPublishResult({
        channel: "mastodon",
        status: "PUBLISHED",
        text: body,
        link,
        postUrl,
        postId,
        verified,
        error: verified ? "" : `published but UNVERIFIED: ${note}`,
      });
    } catch (err) {
      return buildPublishResult({ channel: "mastodon", status: "FAILED", text: body, link, error: `${err instanceof Error ? err.constructor.name : "Error"}: ${err instanceof Error ? err.message : String(err)}` });
    }
  },
};
