import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import type { ChannelVariant, PublishResult } from "@/lib/social/types";
import { type SocialAdapter, buildPublishResult, defaultFormat, envAll, missingEnvNames } from "@/lib/social/channels/types";
import { buildOAuth1Header } from "@/lib/social/channels/oauth1";

/**
 * X (Twitter) adapter — built from real, current research (2026-08-16,
 * directly fetched from docs.x.com): X retired its flat-fee developer
 * tiers on 2026-02-06 in favor of pay-per-use billing. There is no
 * approval gate to clear — any developer account with billing attached
 * can post — but every post costs money: $0.015 for a plain post,
 * $0.200 for a post containing a URL (verified directly from
 * docs.x.com/x-api/getting-started/pricing). Since virtually every
 * Miloosh post contains a link, budget on the $0.200/post figure.
 *
 * POST /2/tweets requires OAuth 1.0a User Context or OAuth 2.0
 * Authorization Code + PKCE — an app-only Bearer token is explicitly not
 * sufficient. This adapter uses OAuth 1.0a (see oauth1.ts) since it needs
 * no interactive redirect flow for a single dedicated bot account.
 *
 * DISABLED by default in data/social/social-strategy.json
 * (enabledChannels.x: false) until the owner has created a developer
 * account, attached billing, and confirmed the real per-post cost is
 * acceptable — see the account setup pack in the final report. This
 * codebase never purchases anything on the owner's behalf.
 */

const CHAR_LIMIT = 280;
const REQUIRED_ENV = ["SOCIAL_X_API_KEY", "SOCIAL_X_API_SECRET", "SOCIAL_X_ACCESS_TOKEN", "SOCIAL_X_ACCESS_TOKEN_SECRET"];
const TWEETS_URL = "https://api.x.com/2/tweets";

export const xAdapter: SocialAdapter = {
  channel: "x",
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
      return buildPublishResult({ channel: "x", status: "SETUP_REQUIRED", text: body, link, error: `missing env: ${missingEnvNames(REQUIRED_ENV).join(", ")}` });
    }
    if (dryRun) {
      return buildPublishResult({ channel: "x", status: "DRY_RUN", text: body, link });
    }

    try {
      const authHeader = buildOAuth1Header("POST", TWEETS_URL, {
        consumerKey: env.SOCIAL_X_API_KEY,
        consumerSecret: env.SOCIAL_X_API_SECRET,
        accessToken: env.SOCIAL_X_ACCESS_TOKEN,
        accessTokenSecret: env.SOCIAL_X_ACCESS_TOKEN_SECRET,
      });

      const res = await fetch(TWEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ text: body }),
      });
      if (res.status === 429) {
        return buildPublishResult({ channel: "x", status: "RATE_LIMITED", text: body, link, error: "rate limited (HTTP 429)" });
      }
      if (res.status === 401 || res.status === 403) {
        return buildPublishResult({ channel: "x", status: "FAILED", text: body, link, error: `auth failed HTTP ${res.status}` });
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return buildPublishResult({ channel: "x", status: "FAILED", text: body, link, error: `HTTP ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}` });
      }
      const created = (await res.json()) as { data?: { id?: string } };
      const postId = created.data?.id ?? null;
      const postUrl = postId ? `https://x.com/i/web/status/${postId}` : null;

      return buildPublishResult({ channel: "x", status: "PUBLISHED", text: body, link, postUrl, postId, verified: Boolean(postId) });
    } catch (err) {
      return buildPublishResult({ channel: "x", status: "FAILED", text: body, link, error: `${err instanceof Error ? err.constructor.name : "Error"}: ${err instanceof Error ? err.message : String(err)}` });
    }
  },
};
