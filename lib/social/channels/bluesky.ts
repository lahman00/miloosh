import { assertMutationAllowed } from "@/lib/deployment/mutation-policy";
import type { ChannelVariant, PublishResult } from "@/lib/social/types";
import { type SocialAdapter, buildPublishResult, defaultFormat, envAll, missingEnvNames } from "@/lib/social/channels/types";

/**
 * Bluesky (AT Protocol) adapter — ported from Need Go Home's real, working
 * publishers/bluesky.py (~/NeeGoHome/agents/marketing-agent/publishers/bluesky.py):
 *   1. POST /xrpc/com.atproto.server.createSession (handle + app password) -> accessJwt, did
 *   2. POST /xrpc/com.atproto.repo.createRecord (Bearer accessJwt), collection app.bsky.feed.post
 * App passwords need no app review, so this runs unattended after one-time
 * setup (Settings -> App Passwords on bsky.app). No image/thumbnail
 * upload in this first pass — link-only external card, added later if
 * the visual engine needs it; the record still gets a clickable link
 * facet so the URL is a real hyperlink, not raw text.
 */

const CHAR_LIMIT = 300; // Bluesky's grapheme limit; approximated with characters.
const REQUIRED_ENV = ["SOCIAL_BLUESKY_HANDLE", "SOCIAL_BLUESKY_APP_PASSWORD"];

function pds(): string {
  return (process.env.SOCIAL_BLUESKY_PDS || "https://bsky.social").replace(/\/$/, "");
}

export const blueskyAdapter: SocialAdapter = {
  channel: "bluesky",
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
      return buildPublishResult({ channel: "bluesky", status: "SETUP_REQUIRED", text: body, link, error: `missing env: ${missingEnvNames(REQUIRED_ENV).join(", ")}` });
    }
    if (dryRun) {
      return buildPublishResult({ channel: "bluesky", status: "DRY_RUN", text: body, link });
    }

    try {
      const base = pds();
      const sessionRes = await fetch(`${base}/xrpc/com.atproto.server.createSession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: env.SOCIAL_BLUESKY_HANDLE, password: env.SOCIAL_BLUESKY_APP_PASSWORD }),
      });
      if (sessionRes.status === 429) {
        return buildPublishResult({ channel: "bluesky", status: "RATE_LIMITED", text: body, link, error: "rate limited on createSession" });
      }
      if (!sessionRes.ok) {
        return buildPublishResult({ channel: "bluesky", status: "FAILED", text: body, link, error: `auth failed HTTP ${sessionRes.status}` });
      }
      const session = (await sessionRes.json()) as { accessJwt?: string; did?: string };
      if (!session.accessJwt || !session.did) {
        return buildPublishResult({ channel: "bluesky", status: "FAILED", text: body, link, error: "no accessJwt/did in session" });
      }

      const record: Record<string, unknown> = {
        $type: "app.bsky.feed.post",
        text: body,
        langs: ["en"],
        createdAt: new Date().toISOString(),
      };
      if (link) {
        const idx = body.lastIndexOf(link);
        if (idx !== -1) {
          const start = Buffer.byteLength(body.slice(0, idx), "utf-8");
          const end = start + Buffer.byteLength(link, "utf-8");
          record.facets = [{ index: { byteStart: start, byteEnd: end }, features: [{ $type: "app.bsky.richtext.facet#link", uri: link }] }];
        }
        record.embed = {
          $type: "app.bsky.embed.external",
          external: { uri: link, title: "Miloosh", description: "Software research you can verify." },
        };
      }

      const createRes = await fetch(`${base}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessJwt}` },
        body: JSON.stringify({ repo: session.did, collection: "app.bsky.feed.post", record }),
      });
      if (createRes.status === 429) {
        return buildPublishResult({ channel: "bluesky", status: "RATE_LIMITED", text: body, link, error: "rate limited on createRecord" });
      }
      if (!createRes.ok) {
        return buildPublishResult({ channel: "bluesky", status: "FAILED", text: body, link, error: `createRecord HTTP ${createRes.status}` });
      }
      const created = (await createRes.json()) as { uri?: string };
      const uri = created.uri ?? "";
      const rkey = uri ? uri.split("/").pop() : "";
      const postUrl = rkey ? `https://bsky.app/profile/${env.SOCIAL_BLUESKY_HANDLE}/post/${rkey}` : null;

      return buildPublishResult({ channel: "bluesky", status: "PUBLISHED", text: body, link, postUrl, postId: uri || null, verified: Boolean(uri) });
    } catch (err) {
      return buildPublishResult({ channel: "bluesky", status: "FAILED", text: body, link, error: `${err instanceof Error ? err.constructor.name : "Error"}: ${err instanceof Error ? err.message : String(err)}` });
    }
  },
};
