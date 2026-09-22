import fs from "node:fs";
import path from "node:path";
import { AGENTS_DIR } from "@/lib/agents/paths";
import { CHANNELS, type Channel } from "@/lib/social/types";
import { isOutboundTrackingEnabled } from "@/lib/revenue/events";

/**
 * Phase 1E (2026-08-17 growth sprint) — inbound social attribution. The
 * social system could already TAG outbound links with UTM params
 * (lib/social/utm.ts: utm_source=<channel>, utm_medium=social,
 * utm_campaign, utm_content=<queue entry id>) but nothing on the Miloosh
 * side ever read them back — so every dashboard's "social analytics"
 * section would have been fabricated without a real capture mechanism.
 * This is that mechanism: a visitor landing on any Miloosh page with
 * utm_medium=social is recorded — channel, campaign, the exact queue
 * entry that drove the click, landing page, and a server timestamp.
 * Nothing else: no IP, no user-agent, no cookie, no cross-session
 * identity. Same Blob-backed persistence as lib/social/queue.ts (works
 * correctly across Vercel's ephemeral serverless filesystem, unlike the
 * older local-file-only lib/revenue/events.ts sink) and the same
 * explicit opt-in gate as the rest of the revenue-tracking system
 * (NEXT_PUBLIC_REVENUE_TRACKING_ENABLED) — a no-op until deliberately
 * turned on.
 */

export type InboundSocialEvent = {
  channel: Channel;
  campaign: string | null;
  /** utm_content — the social queue entry id that drove this click, when present. */
  contentId: string | null;
  /** Miloosh path the visitor landed on, e.g. "/software/wix". Never a full URL (no query string, which could carry other params). */
  landingPath: string;
  timestamp: string;
  /**
   * 2026-08-31: mirrors lib/analytics/events.ts's isTest marker, sourced
   * from the SAME existing ?qa=1 mechanism (lib/analytics/synthetic.ts's
   * markAndCheckSyntheticQa) that components/SocialLandingCapture.tsx now
   * checks before firing. Optional (older stored events predate this
   * field retain UNKNOWN test provenance; false also does not establish
   * a human). Raw storage keeps every event regardless of this flag --
   * exclusion only ever happens in reporting (summarizeInboundByChannel /
   * scripts/growth/social-attribution-report.ts), never at write time,
   * matching the same immutability principle already established in
   * lib/analytics/human-classification.ts.
   */
  isTest?: boolean;
};

const BLOB_PATHNAME = "social/inbound-clicks.json";
const LOCAL_FALLBACK_PATH = path.join(AGENTS_DIR, "social-inbound-clicks.json");
const MAX_STORED_EVENTS = 5000;

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function parseEvents(text: string): InboundSocialEvent[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.some((event) =>
    !event || !isValidChannel(event.channel) || typeof event.landingPath !== "string" ||
    typeof event.timestamp !== "string" || !Number.isFinite(Date.parse(event.timestamp)) ||
    (event.campaign !== null && typeof event.campaign !== "string") ||
    (event.contentId !== null && typeof event.contentId !== "string") ||
    (event.isTest !== undefined && typeof event.isTest !== "boolean")
  )) throw new Error("Invalid social inbound ledger");
  return parsed as InboundSocialEvent[];
}

function readLocalFallback(strict: boolean): InboundSocialEvent[] {
  try {
    return parseEvents(fs.readFileSync(LOCAL_FALLBACK_PATH, "utf-8"));
  } catch (error) {
    if (strict && (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}

function writeLocalFallback(events: InboundSocialEvent[]): void {
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_FALLBACK_PATH, JSON.stringify(events, null, 2));
}

async function readEvents(strict = false): Promise<InboundSocialEvent[]> {
  if (!hasBlobToken()) return readLocalFallback(strict);
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
    // A missing object is an empty ledger; failed/partial reads are unavailable.
    if (!result) return [];
    if (result.statusCode !== 200) throw new Error("Social inbound ledger unavailable");
    const text = await new Response(result.stream).text();
    return parseEvents(text);
  } catch (error) {
    if (strict) throw error;
    return [];
  }
}

async function writeEvents(events: InboundSocialEvent[]): Promise<void> {
  if (!hasBlobToken()) {
    writeLocalFallback(events);
    return;
  }
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, JSON.stringify(events, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export function isValidChannel(value: unknown): value is Channel {
  return typeof value === "string" && (CHANNELS as readonly string[]).includes(value);
}

/**
 * The one place an inbound social landing gets recorded. A no-op unless
 * tracking is explicitly enabled — reuses the same flag as outbound
 * revenue-click tracking rather than inventing a second opt-in, since
 * both are the same "did we turn on first-party analytics" decision.
 */
export async function recordInboundSocialEvent(input: { channel: Channel; campaign: string | null; contentId: string | null; landingPath: string; isTest?: boolean }): Promise<void> {
  if (!isOutboundTrackingEnabled()) return;
  const events = await readEvents();
  events.push({ ...input, timestamp: new Date().toISOString() });
  await writeEvents(events.slice(-MAX_STORED_EVENTS));
}

export async function getInboundSocialEvents(options: { strict?: boolean } = {}): Promise<InboundSocialEvent[]> {
  return [...(await readEvents(options.strict))].reverse();
}

/** Excludes explicit tests only. Missing markers remain unknown; false does not prove a human. */
export function isExcludedSocialEvent(event: InboundSocialEvent): boolean {
  return event.isTest === true;
}

export type ChannelAttributionRow = { channel: Channel; landings: number; distinctCampaigns: number; distinctContent: number };

/**
 * Observed landings grouped by channel, busiest first, QA/
 * synthetic/operator traffic excluded via isExcludedSocialEvent. Never
 * invents a row for a channel with zero real data. Callers that need the
 * unfiltered raw event set (e.g. an internal debug view) should use
 * getInboundSocialEvents() directly instead.
 */
export function summarizeInboundByChannel(events: InboundSocialEvent[]): ChannelAttributionRow[] {
  const byChannel = new Map<Channel, { landings: number; campaigns: Set<string>; content: Set<string> }>();
  for (const e of events) {
    if (isExcludedSocialEvent(e)) continue;
    const row = byChannel.get(e.channel) ?? { landings: 0, campaigns: new Set<string>(), content: new Set<string>() };
    row.landings += 1;
    if (e.campaign) row.campaigns.add(e.campaign);
    if (e.contentId) row.content.add(e.contentId);
    byChannel.set(e.channel, row);
  }
  return [...byChannel.entries()]
    .map(([channel, r]) => ({ channel, landings: r.landings, distinctCampaigns: r.campaigns.size, distinctContent: r.content.size }))
    .sort((a, b) => b.landings - a.landings);
}
