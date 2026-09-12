import type { Channel, ChannelHealthStatus } from "@/lib/social/types";
import { getSocialStrategy } from "@/lib/social/strategy";
import type { SocialAdapter } from "@/lib/social/channels/types";
import { blueskyAdapter } from "@/lib/social/channels/bluesky";
import { mastodonAdapter } from "@/lib/social/channels/mastodon";
import { facebookAdapter } from "@/lib/social/channels/facebook";
import { xAdapter } from "@/lib/social/channels/x";
import { threadsAdapter } from "@/lib/social/channels/threads";
import { linkedinAdapter } from "@/lib/social/channels/linkedin";
import { redditAdapter } from "@/lib/social/channels/reddit";
import { pinterestAdapter, instagramAdapter, youtubeAdapter } from "@/lib/social/channels/deferred";

/** Ported concept from Need Go Home's publishers/__init__.py build_adapters() — one place that knows every channel this system understands. */
export const ADAPTERS: Record<Channel, SocialAdapter> = {
  linkedin: linkedinAdapter,
  facebook: facebookAdapter,
  x: xAdapter,
  bluesky: blueskyAdapter,
  mastodon: mastodonAdapter,
  threads: threadsAdapter,
  reddit: redditAdapter,
  pinterest: pinterestAdapter,
  youtube: youtubeAdapter,
  instagram: instagramAdapter,
};

const MANUAL_ONLY_CHANNELS: Channel[] = ["linkedin", "reddit"];
const DEFERRED_CHANNELS: Channel[] = ["pinterest", "youtube", "instagram"];

/** Phase 14 dashboard vocabulary — one status per channel, independent of any single post. */
export function getChannelHealth(channel: Channel): { status: ChannelHealthStatus; detail: string } {
  const strategy = getSocialStrategy();
  const adapter = ADAPTERS[channel];

  if (DEFERRED_CHANNELS.includes(channel)) {
    return { status: "DISABLED", detail: adapter.missingEnv()[0] ?? "Deferred." };
  }
  if (MANUAL_ONLY_CHANNELS.includes(channel)) {
    return { status: "NEEDS_OWNER_AUTH", detail: adapter.missingEnv()[0] ?? "No automatable API path — manual posting only." };
  }
  if (!strategy.enabledChannels[channel]) {
    return { status: "DISABLED", detail: "Disabled in data/social/social-strategy.json (enabledChannels)." };
  }
  if (channel === "x" && !adapter.isConfigured()) {
    return { status: "API_COST_BLOCK", detail: "X posting is pay-per-use (~$0.20/post with a link, no subscription) — needs a console.x.com developer account with billing attached, plus OAuth 1.0a credentials in env. See the setup pack." };
  }
  if (channel === "threads" && !adapter.isConfigured()) {
    return { status: "NEEDS_OWNER_AUTH", detail: "Needs Meta App Review approval for the Threads use case, then SOCIAL_THREADS_USER_ID/SOCIAL_THREADS_ACCESS_TOKEN in env. See the setup pack." };
  }
  if (!adapter.isConfigured()) {
    return { status: "NEEDS_OWNER_AUTH", detail: `Missing env: ${adapter.missingEnv().join(", ")}` };
  }
  return { status: "READY", detail: "Configured and enabled; provider authentication has not been live-verified by this synchronous check." };
}

export function getAllChannelHealth(): Record<Channel, { status: ChannelHealthStatus; detail: string }> {
  const entries = (Object.keys(ADAPTERS) as Channel[]).map((c) => [c, getChannelHealth(c)] as const);
  return Object.fromEntries(entries) as Record<Channel, { status: ChannelHealthStatus; detail: string }>;
}
